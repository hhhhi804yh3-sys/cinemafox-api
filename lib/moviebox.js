const https = require('https');

const BASE_URL = "https://movieboxph.org";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MovieBoxWindows/1.0.5";

let cachedToken = "";
let tokenExpiry = 0;

/**
 * Ensure active JWT token from MovieBox session with caching
 */
async function ensureAuthToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  return new Promise((resolve) => {
    const req = https.request(`${BASE_URL}/wefeed-h5api-bff/home`, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": `${BASE_URL}/`
      }
    }, (res) => {
      let token = "";
      if (res.headers['x-user']) {
        try {
          const uj = JSON.parse(res.headers['x-user']);
          if (uj && uj.token) token = uj.token;
        } catch (_) {}
      }
      if (!token && res.headers['set-cookie']) {
        const cookies = Array.isArray(res.headers['set-cookie'])
          ? res.headers['set-cookie'].join(';')
          : res.headers['set-cookie'];
        const m = cookies.match(/token=([^;]+)/);
        if (m) token = m[1];
      }

      if (token) {
        cachedToken = token;
        tokenExpiry = now + (30 * 60 * 1000); // 30 minutes cache
      }
      resolve(cachedToken);
    });

    req.on('error', () => resolve(cachedToken));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(cachedToken);
    });
    req.end();
  });
}

/**
 * Check if an item contains adult, erotic, or inappropriate content
 */
function isAdultOrInappropriate(item) {
  if (!item) return false;
  if (item.isPornographic === true) return true;

  const genreStr = ((item.genre || '') + ' ' + (Array.isArray(item.genres) ? item.genres.join(' ') : '')).toLowerCase();
  if (
    genreStr.includes('erotic') ||
    genreStr.includes('adult') ||
    genreStr.includes('18+') ||
    genreStr.includes('porn') ||
    genreStr.includes('xxx') ||
    (genreStr.includes('hot') && genreStr.includes('romance'))
  ) {
    return true;
  }

  const titleStr = ((item.title || '') + ' ' + (item.titleAr || '')).toLowerCase();
  const bannedKeywords = [
    'chacha 420', 'erotic', 'porn', 'xxx', 'lust story',
    'wife swap', 'on sex', 'lesbian', 'bhabhi', 'tatak jenn',
    'palang tod', 'gaon ki garmi', 'budhe ki jawani', 'emmanuelle'
  ];

  for (const kw of bannedKeywords) {
    if (titleStr.includes(kw)) return true;
  }

  return false;
}

/**
 * Clean show title to remove season tags, ranges, and brackets
 */
function cleanShowTitle(rawTitle) {
  if (!rawTitle) return '';
  let clean = rawTitle;
  clean = clean.replace(/\[.*?\]/g, ' ');
  clean = clean.replace(/\(.*?\)/g, ' ');
  clean = clean.replace(/\bS\d+\s*[-~–]\s*S?\d+\b/gi, ' ');
  clean = clean.replace(/\bS\d+\b/gi, ' ');
  clean = clean.replace(/\bSeason\s*\d+\b/gi, ' ');
  clean = clean.replace(/الموسم\s*\d+/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

/**
 * Map MovieBox shelf titles to clean Arabic titles for the app
 */
function mapShelfTitle(rawTitle) {
  const map = {
    'Popular TV': 'مسلسلات متصدرة المشاهدة',
    'Trending Movies': 'أفلام رائجة الآن',
    'Popular Movies': 'الأفلام الأكثر شعبية',
    'Top 100 TV': 'أفضل 100 مسلسل عالمي',
    'Top 100 Movies': 'أفضل 100 فيلم في التاريخ',
    'Arabic Movies': 'أفلام عربية حصرية',
    'Ramadan 2026': 'مسلسلات رمضان 2026',
    'Arabic Dubbed': 'أعمال مدبلجة للعربية',
    'K-Drama': 'مسلسلات كورية مميزة',
    'Anime': 'أقوى مسلسلات الأنمي',
    'Hollywood': 'سينما هوليوود العالمية',
    'Action & Adventure': 'أكشن ومغامرات وحماس',
    'Horror': 'أفلام الرعب والتشويق',
    'Sci-Fi': 'خيال علمي وإثارة',
    'Romance': 'أفلام رومانسية ودراما',
    'Comedy': 'أفلام كوميدية',
    'Coming Soon': 'قريباً في صالات السينما'
  };

  for (const [key, ar] of Object.entries(map)) {
    if (rawTitle.toLowerCase().includes(key.toLowerCase())) return ar;
  }
  return rawTitle;
}

module.exports = {
  BASE_URL,
  USER_AGENT,
  ensureAuthToken,
  isAdultOrInappropriate,
  cleanShowTitle,
  mapShelfTitle
};
