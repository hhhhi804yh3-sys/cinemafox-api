const https = require('https');
const { BASE_URL, USER_AGENT, ensureAuthToken } = require('../lib/moviebox');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { subjectId, se = 0, ep = 0, streamId = '', detailPath = '' } = req.query;

  if (!subjectId) {
    return res.status(400).json({ success: false, error: 'subjectId is required' });
  }

  try {
    const token = await ensureAuthToken();
    let resolvedStreamId = streamId;

    // 1. If streamId is missing, resolve it from subject/play API
    if (!resolvedStreamId) {
      const playPath = detailPath || `subject-${subjectId}`;
      const playUrl = `${BASE_URL}/wefeed-h5api-bff/subject/play?subjectId=${encodeURIComponent(subjectId)}&se=${encodeURIComponent(se)}&ep=${encodeURIComponent(ep)}&detailPath=${encodeURIComponent(playPath)}`;
      
      const playData = await new Promise((resolve) => {
        const preq = https.get(playUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            "Referer": `${BASE_URL}/movies/${encodeURIComponent(playPath)}`,
            "Accept": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        }, (pres) => {
          let pb = "";
          pres.on("data", c => pb += c);
          pres.on("end", () => {
            try {
              const j = JSON.parse(pb);
              const streams = j?.data?.streams || [];
              if (streams.length > 0 && streams[0].id) {
                resolve(String(streams[0].id));
                return;
              }
            } catch (_) {}
            resolve('');
          });
        });
        preq.on('error', () => resolve(''));
        preq.setTimeout(6000, () => { preq.destroy(); resolve(''); });
      });

      resolvedStreamId = playData;
    }

    // 2. Request Captions from MovieBox with guaranteed id
    let captionsData = [];
    if (resolvedStreamId) {
      const captionUrl = `${BASE_URL}/wefeed-h5api-bff/subject/caption?subjectId=${encodeURIComponent(subjectId)}&id=${encodeURIComponent(resolvedStreamId)}`;
      captionsData = await new Promise((resolve) => {
        const creq = https.get(captionUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            "Referer": `${BASE_URL}/`,
            "Accept": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        }, (cres) => {
          let cb = "";
          cres.on("data", c => cb += c);
          cres.on("end", () => {
            try {
              const j = JSON.parse(cb);
              resolve(j?.data?.captions || []);
            } catch (_) {
              resolve([]);
            }
          });
        });
        creq.on('error', () => resolve([]));
        creq.setTimeout(6000, () => { creq.destroy(); resolve([]); });
      });
    }

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
        label: isArabic ? 'العربية (الافتراضية)' : (isEnglish ? 'English' : lanName),
        url: subUrl,
        proxyVttUrl: `https://cinemafox-api.vercel.app/api/proxy?url=${encodeURIComponent(subUrl)}&vtt=true`,
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
      streamId: resolvedStreamId,
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
