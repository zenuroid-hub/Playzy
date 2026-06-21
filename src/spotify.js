// Dukungan Spotify TANPA API key.
// Lagu Spotify ber-DRM, jadi tidak bisa di-stream langsung. Modul ini cuma
// mengambil METADATA (judul + artis) dari halaman embed publik Spotify, lalu
// di src/search.js dicari padanannya di YouTube/SoundCloud untuk diputar.

const SPOTIFY_RE = /(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?|spotify:)(track|playlist|album)[/:]([A-Za-z0-9]+)/i;

const isSpotifyURL = (s) => SPOTIFY_RE.test(String(s));

function parseSpotifyURL(url) {
  const m = String(url).match(SPOTIFY_RE);
  if (!m) return null;
  return { type: m[1].toLowerCase(), id: m[2] };
}

// Ambil blok JSON __NEXT_DATA__ dari HTML embed.
function extractNextData(html) {
  const marker = 'id="__NEXT_DATA__"';
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const start = html.indexOf('>', i);
  const end = html.indexOf('</script>', start);
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(html.slice(start + 1, end));
  } catch {
    return null;
  }
}

/**
 * Resolusi URL Spotify menjadi daftar lagu (judul + artis) untuk dicari di YT/SC.
 * @param {string} url
 * @returns {Promise<{ type: string, name: string, tracks: Array<{ title: string, artist: string, query: string }> }>}
 */
async function resolveSpotify(url) {
  const parsed = parseSpotifyURL(url);
  if (!parsed) throw new Error('URL Spotify tidak valid.');

  const embed = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;
  const res = await fetch(embed, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Gagal ambil data Spotify (HTTP ${res.status}).`);
  const html = await res.text();

  const data = extractNextData(html);
  const entity = data?.props?.pageProps?.state?.data?.entity;
  if (!entity) throw new Error('Tidak bisa membaca data Spotify (format embed berubah?).');

  const mkTrack = (title, artist) => ({
    title,
    artist,
    query: [artist, title].filter(Boolean).join(' ').trim(),
  });

  // Track tunggal
  if (entity.type === 'track' || (!entity.trackList?.length && entity.name)) {
    const artist = (entity.artists || []).map((a) => a.name).join(', ');
    return { type: 'track', name: entity.name, tracks: [mkTrack(entity.name, artist)] };
  }

  // Playlist / album: ambil dari trackList (subtitle = artis)
  const list = entity.trackList || [];
  const tracks = list
    .map((t) => mkTrack(t.title, t.subtitle))
    .filter((t) => t.query);
  if (!tracks.length) throw new Error('Playlist/album Spotify kosong atau tidak terbaca.');
  return { type: entity.type || 'playlist', name: entity.name, tracks };
}

module.exports = { isSpotifyURL, resolveSpotify };
