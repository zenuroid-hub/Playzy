# 🎵 Discord Music Bot

Bot musik Discord berbasis **discord.js v14** + **DisTube v5** + **yt-dlp**.
Kontrol pakai **slash command**. Sumber audio: YouTube (judul atau URL) & ratusan situs lain yang didukung yt-dlp.

> ⚠️ **Catatan legal:** Streaming dari YouTube melanggar Terms of Service YouTube. Bot ini untuk
> tujuan belajar / server pribadi. Gunakan dengan tanggung jawab sendiri.

## Fitur (slash commands)

| Command | Fungsi |
|---|---|
| `/play <query>` | Putar lagu / playlist dari judul atau URL |
| `/skip` | Lewati lagu sekarang |
| `/stop` | Hentikan & kosongkan antrian |
| `/pause` `/resume` | Jeda / lanjutkan |
| `/queue` | Lihat antrian |
| `/nowplaying` | Lagu yang sedang diputar + bar progres |
| `/volume <0-150>` | Atur volume |
| `/loop <mode>` | Off / ulangi lagu / ulangi antrian |
| `/shuffle` | Acak antrian |

## Prasyarat

- **Node.js ≥ 22.12.0** (DisTube v5 mewajibkan ini)
- **yt-dlp** terpasang di PATH (`yt-dlp --version`)
- **ffmpeg** — sudah otomatis lewat paket `ffmpeg-static`, tidak perlu install manual

## 1. Setup aplikasi Discord

1. Buka <https://discord.com/developers/applications> → **New Application**.
2. Menu **Bot** → **Reset Token** → salin token → simpan ke `.env` (`DISCORD_TOKEN`).
3. Menu **General Information** → salin **Application ID** → `.env` (`CLIENT_ID`).
4. Undang bot ke server. Buat URL invite (ganti `CLIENT_ID`):
   ```
   https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=3148800&scope=bot%20applications.commands
   ```
   Permission `3148800` = Connect + Speak + View Channel + Send Messages.

## 2. Konfigurasi

```bash
cp .env.example .env
# lalu isi DISCORD_TOKEN, CLIENT_ID, (opsional) GUILD_ID
```

Isi `GUILD_ID` dengan ID server untuk testing → slash command langsung muncul.
Kosongkan untuk registrasi global (bisa butuh hingga ~1 jam tersebar).

## 3. Install & jalankan

```bash
npm install            # pasang dependensi
npm run deploy         # daftarkan slash command (jalankan tiap kali command berubah)
npm start              # jalankan bot
```

Untuk development dengan auto-reload:
```bash
npm run dev
```

## Struktur proyek

```
src/
├── index.js            # entry point: client, intents, handler interaksi
├── config.js           # baca & validasi .env
├── music.js            # setup DisTube + event (playSong, addSong, error, dll)
├── loadCommands.js     # memuat semua command dari folder commands/
├── deploy-commands.js  # registrasi slash command ke Discord
└── commands/           # satu file per command
    ├── play.js   skip.js   stop.js   pause.js   resume.js
    └── queue.js  nowplaying.js   volume.js   loop.js   shuffle.js
```

## Troubleshooting

- **Slash command tidak muncul** → jalankan `npm run deploy`. Pakai `GUILD_ID` agar instan.
- **Bot join tapi tidak ada suara** → pastikan `yt-dlp` ada di PATH & versinya baru (`yt-dlp -U`).
- **Error "Sign in to confirm you're not a bot" dari YouTube** → update yt-dlp (`yt-dlp -U`), atau
  tambahkan cookies. Ini batasan dari sisi YouTube, bukan bug bot.
- **`Cannot find ffmpeg`** → pastikan paket `ffmpeg-static` ikut ter-install (`npm install`).
