const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const fs = require('fs');
const { EmbedBuilder, Events } = require('discord.js');

// Utamakan ffmpeg sistem (kalau ada), lalu fallback ke paket ffmpeg-static.
// Di panel (Pterodactyl, dll) biasanya tidak ada ffmpeg sistem, jadi ffmpeg-static
// dipakai. Kalau dua-duanya tidak ada, biarkan DisTube mencari ffmpeg di PATH.
function resolveFfmpegPath() {
  const sys = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'].find((p) => fs.existsSync(p));
  if (sys) return sys;
  try {
    return require('ffmpeg-static') || null;
  } catch {
    return null;
  }
}
const ffmpegPath = resolveFfmpegPath();

// Waktu tunggu sebelum bot keluar otomatis (bisa di-override lewat .env).
const EMPTY_LEAVE_MS = Number(process.env.EMPTY_LEAVE_MS ?? 3 * 60_000); // voice channel kosong
const IDLE_LEAVE_MS = Number(process.env.IDLE_LEAVE_MS ?? 5 * 60_000); // tidak ada lagu yang diputar

/**
 * Membuat instance DisTube dan memasang event handler-nya.
 * @param {import('discord.js').Client} client
 * @returns {DisTube}
 */
function setupDistube(client) {
  const distube = new DisTube(client, {
    // Hanya emit event 'playSong' untuk lagu baru (bukan saat di-seek/loop).
    emitNewSongOnly: true,
    // Konfigurasi ffmpeg. Selain reconnect bawaan DisTube, tambahkan reconnect
    // saat HTTP error (403) & network error — YouTube sering throttle di tengah
    // stream dan tanpa ini ffmpeg langsung exit 1 (FFMPEG_EXITED) → lagu ke-skip.
    ffmpeg: {
      ...(ffmpegPath ? { path: ffmpegPath } : {}),
      args: {
        input: {
          reconnect_on_network_error: 1,
          reconnect_on_http_error: '4xx,5xx',
          reconnect_delay_max: 10,
        },
      },
    },
    // Plugin yt-dlp untuk ekstraksi audio YouTube (dan ratusan situs lain).
    plugins: [new YtDlpPlugin({ update: false })],
  });

  // Helper: ambil text channel tempat command dijalankan.
  const channelOf = (queue) => queue.textChannel ?? queue.metadata?.interaction?.channel;

  // ── Auto-leave: timer per-guild ──────────────────────────────────────────
  // Dua timer terpisah: 'empty' (channel kosong) & 'idle' (tidak ada lagu).
  const emptyTimers = new Map(); // guildId -> Timeout
  const idleTimers = new Map(); // guildId -> Timeout
  const lastTextChannel = new Map(); // guildId -> text channel (untuk notifikasi)

  const clearTimer = (map, guildId) => {
    const t = map.get(guildId);
    if (t) {
      clearTimeout(t);
      map.delete(guildId);
    }
  };

  const cancelAllTimers = (guildId) => {
    clearTimer(emptyTimers, guildId);
    clearTimer(idleTimers, guildId);
  };

  const leaveVoice = (guildId, message) => {
    cancelAllTimers(guildId);
    const ch = lastTextChannel.get(guildId);
    if (ch && message) ch.send(message).catch(() => {});
    lastTextChannel.delete(guildId);
    try {
      distube.voices.leave(guildId);
    } catch {
      /* sudah tidak di voice */
    }
  };

  const scheduleLeave = (map, guildId, ms, message) => {
    clearTimer(map, guildId);
    if (!(ms > 0)) return;
    const timeout = setTimeout(() => {
      map.delete(guildId);
      leaveVoice(guildId, message);
    }, ms);
    timeout.unref?.();
    map.set(guildId, timeout);
  };

  // Keluar kalau voice channel bot kosong (tanpa manusia) selama EMPTY_LEAVE_MS.
  client.on(Events.VoiceStateUpdate, (_oldState, newState) => {
    const guild = newState.guild;
    if (!guild) return;
    const voice = distube.voices.get(guild.id);
    const botChannel = guild.members.me?.voice?.channel;
    if (!voice || !botChannel) return;

    const humans = botChannel.members.filter((m) => !m.user.bot).size;
    if (humans === 0) {
      const mins = Math.round(EMPTY_LEAVE_MS / 60_000);
      scheduleLeave(
        emptyTimers,
        guild.id,
        EMPTY_LEAVE_MS,
        `🔇 Voice channel kosong selama ${mins} menit, keluar dulu ya.`,
      );
    } else {
      clearTimer(emptyTimers, guild.id);
    }
  });

  distube
    .on('playSong', (queue, song) => {
      // Ada lagu yang diputar → batalkan timer idle.
      clearTimer(idleTimers, queue.id);
      lastTextChannel.set(queue.id, channelOf(queue));
      const ch = channelOf(queue);
      if (!ch) return;
      const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle('🎶 Sedang diputar')
        .setDescription(`**[${song.name}](${song.url})**`)
        .addFields(
          { name: 'Durasi', value: song.formattedDuration, inline: true },
          { name: 'Diminta oleh', value: `${song.user}`, inline: true },
        )
        .setThumbnail(song.thumbnail ?? null);
      ch.send({ embeds: [embed] }).catch(() => {});
    })
    .on('addSong', (queue, song) => {
      clearTimer(idleTimers, queue.id);
      lastTextChannel.set(queue.id, channelOf(queue));
      // Lagu dari bulk-add (mis. playlist Spotify) tidak diumumkan satu-satu.
      if (song.metadata?.silent) return;
      const ch = channelOf(queue);
      if (!ch) return;
      ch.send(`✅ Ditambahkan ke antrian: **${song.name}** \`(${song.formattedDuration})\``).catch(() => {});
    })
    .on('addList', (queue, playlist) => {
      clearTimer(idleTimers, queue.id);
      lastTextChannel.set(queue.id, channelOf(queue));
      const ch = channelOf(queue);
      if (!ch) return;
      ch.send(`✅ Ditambahkan playlist **${playlist.name}** (${playlist.songs.length} lagu) ke antrian.`).catch(() => {});
    })
    .on('finishSong', (_queue, song) => {
      // Setiap lagu selesai, buang URL stream yang ter-cache. Saat lagu diputar
      // ulang (loop lagu / loop antrian), DisTube akan resolve URL baru lewat
      // yt-dlp alih-alih memakai URL YouTube lama yang sudah kedaluwarsa —
      // penyebab error FFMPEG_EXITED (ffmpeg exited with code 1).
      const s = song?.stream;
      if (!s) return;
      if (s.playFromSource) delete s.url;
      else if (s.song?.stream) delete s.song.stream.url;
    })
    .on('finish', (queue) => {
      // Antrian habis: bot tetap di voice. Pasang timer keluar kalau tetap idle.
      lastTextChannel.set(queue.id, channelOf(queue));
      const mins = Math.round(IDLE_LEAVE_MS / 60_000);
      scheduleLeave(
        idleTimers,
        queue.id,
        IDLE_LEAVE_MS,
        `🏁 Antrian selesai. Tidak ada lagu selama ${mins} menit, keluar dulu ya.`,
      );
      const ch = channelOf(queue);
      if (ch) ch.send('🏁 Antrian selesai.').catch(() => {});
    })
    .on('disconnect', (queue) => {
      // Sudah keluar dari voice (manual /stop, kick, atau auto-leave): bersihkan timer.
      cancelAllTimers(queue.id);
      lastTextChannel.delete(queue.id);
      const ch = channelOf(queue);
      if (!ch) return;
      ch.send('👋 Terputus dari voice channel.').catch(() => {});
    })
    .on('error', (error, queue) => {
      console.error('[DisTube error]', error);
      const ch = queue && channelOf(queue);
      if (ch) ch.send(`❌ Terjadi error: ${String(error).slice(0, 1800)}`).catch(() => {});
    });

  return distube;
}

module.exports = { setupDistube };
