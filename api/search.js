const https = require('https');
const { BASE_URL, USER_AGENT, ensureAuthToken, isAdultOrInappropriate, cleanShowTitle } = require('../lib/moviebox');
const { recordRequest } = require('../lib/telemetry');

module.exports = async (req, res) => {
  const startTime = Date.now();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q || req.query.query || '').trim();
  if (!query) {
    return res.status(200).json({ success: true, results: [] });
  }

  try {
    const token = await ensureAuthToken();

    const postData = JSON.stringify({
      keyword: query,
      page: 1,
      perPage: 30,
      subjectType: 0
    });

    const searchData = await new Promise((resolve, reject) => {
      const request = https.request(`${BASE_URL}/wefeed-h5api-bff/subject/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          "Referer": `${BASE_URL}/search/${encodeURIComponent(query)}`,
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(token ? { "Cookie": `moviebox_web_tk=${token}; token=${token}` } : {})
        }
      }, (response) => {
        let body = "";
        response.on("data", chunk => body += chunk);
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });

      request.on("error", reject);
      request.setTimeout(9000, () => {
        request.destroy();
        reject(new Error("Timeout"));
      });
      request.write(postData);
      request.end();
    });

    const rawItems = searchData?.data?.items || [];
    const results = [];
    const seriesMap = new Map();

    for (const it of rawItems) {
      if (!it) continue;

      if (isAdultOrInappropriate(it)) continue;

      const rawTitle = it.title || '';
      const isSeries = it.subjectType === 2;
      const clean = cleanShowTitle(rawTitle);

      const item = {
        id: String(it.subjectId || it.id || Math.random()),
        subjectId: String(it.subjectId || ''),
        title: clean || rawTitle,
        titleAr: clean || rawTitle,
        rawTitle: rawTitle,
        poster: it.cover?.url || it.poster || '',
        backdrop: it.stills?.url || it.backdrop || it.cover?.url || '',
        rating: parseFloat(it.imdbRatingValue || '8.0') || 8.0,
        releaseYear: it.releaseDate ? it.releaseDate.substring(0, 4) : '2026',
        genre: it.genre || (isSeries ? 'مسلسلات' : 'أفلام'),
        isSeries: isSeries,
        detailPath: it.detailPath || ''
      };

      if (!isSeries) {
        results.push(item);
      } else {
        const key = clean.toLowerCase();
        if (!seriesMap.has(key)) {
          seriesMap.set(key, item);
          results.push(item);
        }
      }
    }

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');

    recordRequest({
      type: 'بحث الكتالوج',
      title: `بحث: ${query} (${results.length} نتيجة)`,
      durationMs: Date.now() - startTime,
      req
    });

    res.status(200).json({
      success: true,
      query: query,
      total: results.length,
      results: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search'
    });
  }
};
