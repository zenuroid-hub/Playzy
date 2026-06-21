const { execFile } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

// Lokasi binary yt-dlp yang sudah dibundel plugin @distube/yt-dlp.
// Fallback ke yt-dlp sistem kalau ada.
function resolveYtDlpBin() {
  const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  try {
    // require.resolve('@distube/yt-dlp') -> .../@distube/yt-dlp/dist/index.js
    // Naik dua level ke root paket, lalu masuk ke bin/.
    const pkgRoot = path.resolve(path.dirname(require.resolve('@distube/yt-dlp')), '..');
    const bundled = path.join(pkgRoot, 'bin', binName);
    if (fs.existsSync(bundled)) return bundled;
  } catch {
    /* ignore */
  }
  return 'yt-dlp'; // andalkan PATH
}

const YTDLP_BIN = resolveYtDlpBin();

const URL_RE = /^https?:\/\//i;
const isURL = (s) => URL_RE.test(s.trim());

// Prefix pencarian yt-dlp per sumber.
const SEARCH_PREFIX = {
  youtube: 'ytsearch1:',
  soundcloud: 'scsearch1:',
};

/**
 * Ubah query teks menjadi URL lagu asli memakai yt-dlp.
 * Kalau input sudah berupa URL, dikembalikan apa adanya.
 *
 * @param {string} query  Judul lagu atau URL.
 * @param {'youtube'|'soundcloud'} [source='youtube']  Sumber pencarian teks.
 * @returns {Promise<{ url: string, title: string|null, fromSearch: boolean }>}
 */
function resolveQuery(query, source = 'youtube') {
  const q = String(query).trim();
  if (isURL(q)) return Promise.resolve({ url: q, title: null, fromSearch: false });

  const prefix = SEARCH_PREFIX[source] ?? SEARCH_PREFIX.youtube;
  const searchTerm = `${prefix}${q}`;

  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_BIN,
      [
        '--no-warnings',
        '--flat-playlist',
        '--no-playlist',
        '--print', '%(webpage_url)s\t%(title)s',
        searchTerm,
      ],
      { timeout: 45_000, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err);
        const line = stdout.split('\n').map((l) => l.trim()).find(Boolean);
        if (!line) return reject(new Error(`Tidak ada hasil untuk "${q}".`));
        const [url, ...titleParts] = line.split('\t');
        if (!url) return reject(new Error(`Tidak ada hasil untuk "${q}".`));
        resolve({ url, title: titleParts.join('\t') || null, fromSearch: true });
      },
    );
  });
}

module.exports = { resolveQuery, isURL };
