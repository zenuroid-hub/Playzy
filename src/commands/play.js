const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { resolveQuery } = require('../search');
const { isSpotifyURL, resolveSpotify } = require('../spotify');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Putar lagu dari judul atau URL (YouTube / SoundCloud / Spotify / dll).')
    .addStringOption((o) =>
      o
        .setName('query')
        .setDescription('Judul lagu atau URL (YouTube, SoundCloud, Spotify, playlist, dll).')
        .setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName('source')
        .setDescription('Sumber pemutaran saat memakai judul/Spotify (default: YouTube).')
        .addChoices(
          { name: 'YouTube', value: 'youtube' },
          { name: 'SoundCloud', value: 'soundcloud' },
        ),
    ),

  async execute(interaction, distube) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ Kamu harus berada di voice channel dulu!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const query = interaction.options.getString('query');
    const source = interaction.options.getString('source') ?? 'youtube';
    await interaction.deferReply();

    try {
      // Spotify ber-DRM: ambil judul+artis lalu cari padanannya di YouTube/SoundCloud.
      if (isSpotifyURL(query)) {
        return await playSpotify(interaction, distube, voiceChannel, query, source);
      }

      // URL diputar langsung; judul/teks di-resolve dulu jadi URL lewat yt-dlp search.
      const { url, fromSearch } = await resolveQuery(query, source);
      if (fromSearch) {
        const label = source === 'soundcloud' ? 'SoundCloud' : 'YouTube';
        await interaction.editReply(`🔎 Mencari di ${label}: \`${query}\``);
      } else {
        await interaction.editReply(`🔗 Memproses tautan: \`${query}\``);
      }

      await distube.play(voiceChannel, url, {
        member: interaction.member,
        textChannel: interaction.channel,
        metadata: { interaction },
      });
    } catch (err) {
      console.error('[play]', err);
      await interaction.editReply(`❌ Gagal memutar: ${String(err.message ?? err).slice(0, 1800)}`);
    }
  },
};

/**
 * Putar dari Spotify: resolusi metadata → cari di YouTube/SoundCloud → putar.
 * Track tunggal langsung; playlist/album: lagu pertama diputar, sisanya
 * ditambahkan ke antrian di background (tanpa spam pesan per-lagu).
 */
async function playSpotify(interaction, distube, voiceChannel, url, source) {
  const label = source === 'soundcloud' ? 'SoundCloud' : 'YouTube';
  const sp = await resolveSpotify(url);
  if (!sp.tracks.length) {
    return interaction.editReply('❌ Spotify: tidak ada lagu yang bisa dibaca.');
  }

  const baseOpts = {
    member: interaction.member,
    textChannel: interaction.channel,
  };

  // Lagu pertama: putar segera.
  const first = sp.tracks[0];
  const firstUrl = (await resolveQuery(first.query, source)).url;
  await distube.play(voiceChannel, firstUrl, { ...baseOpts, metadata: { interaction } });

  if (sp.tracks.length === 1) {
    return interaction.editReply(`🎧 Spotify → ${label}: **${first.artist} - ${first.title}**`);
  }

  const rest = sp.tracks.slice(1);
  await interaction.editReply(
    `🎧 Spotify ${sp.type} **${sp.name}** — memutar **${first.title}**, menambahkan ${rest.length} lagu lain ke antrian (cari di ${label})...`,
  );

  // Sisa lagu: tambahkan di background biar respons cepat & tanpa spam.
  (async () => {
    let added = 0;
    for (const t of rest) {
      try {
        const u = (await resolveQuery(t.query, source)).url;
        await distube.play(voiceChannel, u, { ...baseOpts, metadata: { interaction, silent: true } });
        added += 1;
      } catch (e) {
        console.warn('[spotify] lewati:', t.query, '-', e.message);
      }
    }
    interaction.channel
      .send(`✅ Selesai menambahkan **${added}/${rest.length}** lagu dari Spotify ${sp.type} **${sp.name}**.`)
      .catch(() => {});
  })().catch((e) => console.error('[spotify bulk]', e));
}
