const https = require('https');
const { BASE_URL, USER_AGENT, ensureAuthToken } = require('../lib/moviebox');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { subjectId, se = 0, ep = 0 } = req.query;

  if (!subjectId) {
    return res.status(400).json({ success: false, error: 'subjectId is required' });
  }

  try {
    const token = await ensureAuthToken();

    const url = `${BASE_URL}/wefeed-h5api-bff/subject/caption?subjectId=${encodeURIComponent(subjectId)}&se=${encodeURIComponent(se)}&ep=${encodeURIComponent(ep)}`;

    const captionsData = await new Promise((resolve) => {
      const request = https.request(url, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": `${BASE_URL}/`,
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(token ? { "Cookie": `moviebox_web_tk=${token}; token=${token}` } : {})
        }
      }, (response) => {
        let body = "";
        response.on("data", chunk => body += chunk);
        response.on("end", () => {
          try {
            resolve(JSON.parse(body)?.data?.captions || []);
          } catch (_) {
            resolve([]);
          }
        });
      });

      request.on("error", () => resolve([]));
      request.setTimeout(7000, () => {
        request.destroy();
        resolve([]);
      });
      request.end();
    });

    const tracks = [];
    for (const c of captionsData) {
      if (!c) continue;
      const lanCode = (c.lan || c.language || '').toLowerCase();
      const lanName = c.lanName || c.name || lanCode;
      const subUrl = c.url || c.fileUrl || '';

      if (!subUrl) continue;

      const isArabic = lanCode === 'ar' || lanCode === 'ara' || lanName.includes('العربية') || lanName.toLowerCase().includes('arabic');
      const isEnglish = lanCode === 'en' || lanCode === 'eng' || lanName.toLowerCase().includes('english');

      tracks.push({
        id: String(c.id || Math.random()),
        language: isArabic ? 'ar' : (isEnglish ? 'en' : lanCode),
        label: lanName,
        url: subUrl,
        isArabic: isArabic,
        isEnglish: isEnglish
      });
    }

    // Sort: Arabic first, then English, then others
    tracks.sort((a, b) => {
      if (a.isArabic && !b.isArabic) return -1;
      if (!a.isArabic && b.isArabic) return 1;
      if (a.isEnglish && !b.isEnglish) return -1;
      if (!a.isEnglish && b.isEnglish) return 1;
      return a.label.localeCompare(b.label);
    });

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');

    res.status(200).json({
      success: true,
      subjectId: subjectId,
      se: parseInt(se, 10) || 0,
      ep: parseInt(ep, 10) || 0,
      hasArabic: tracks.some(t => t.isArabic),
      count: tracks.length,
      subtitles: tracks
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subtitles'
    });
  }
};
