const https = require('https');
const { BASE_URL, USER_AGENT, ensureAuthToken, isAdultOrInappropriate, cleanShowTitle, mapShelfTitle } = require('../lib/moviebox');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = await ensureAuthToken();

    const homeData = await new Promise((resolve, reject) => {
      const request = https.request(`${BASE_URL}/wefeed-h5api-bff/home`, {
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
      request.end();
    });

    const banners = [];
    const shelves = [];
    const seenIds = new Set();

    // 1. Process Banners
    if (homeData.data && Array.isArray(homeData.data.banners)) {
      for (const b of homeData.data.banners) {
        if (!b) continue;
        const rawTitle = b.title || '';
        const isSeries = b.subjectType === 2;
        const clean = cleanShowTitle(rawTitle);

        const bannerItem = {
          id: String(b.subjectId || b.id || Math.random()),
          subjectId: String(b.subjectId || ''),
          title: clean || rawTitle,
          titleAr: clean || rawTitle,
          poster: b.cover?.url || b.poster || '',
          backdrop: b.stills?.url || b.backdrop || b.cover?.url || '',
          rating: parseFloat(b.imdbRatingValue || '8.5') || 8.5,
          releaseYear: b.releaseDate ? b.releaseDate.substring(0, 4) : '2026',
          genre: b.genre || (isSeries ? 'مسلسلات' : 'أفلام'),
          isSeries: isSeries,
          isPornographic: b.isPornographic || false,
          detailPath: b.detailPath || ''
        };

        if (!isAdultOrInappropriate(bannerItem)) {
          banners.push(bannerItem);
          seenIds.add(bannerItem.subjectId);
        }
      }
    }

    // 2. Process Shelves
    if (homeData.data && Array.isArray(homeData.data.operatingList)) {
      for (const op of homeData.data.operatingList) {
        if (!op || !Array.isArray(op.items) || op.items.length === 0) continue;

        const shelfTitle = mapShelfTitle(op.title || op.name || 'أعمال مميزة');
        const shelfItems = [];

        for (const it of op.items) {
          if (!it) continue;
          const isSeries = it.subjectType === 2;
          const clean = cleanShowTitle(it.title || '');

          const item = {
            id: String(it.subjectId || it.id || Math.random()),
            subjectId: String(it.subjectId || ''),
            title: clean || it.title || '',
            titleAr: clean || it.title || '',
            poster: it.cover?.url || it.poster || '',
            backdrop: it.stills?.url || it.backdrop || it.cover?.url || '',
            rating: parseFloat(it.imdbRatingValue || '8.0') || 8.0,
            releaseYear: it.releaseDate ? it.releaseDate.substring(0, 4) : '2026',
            genre: it.genre || (isSeries ? 'مسلسلات' : 'أفلام'),
            isSeries: isSeries,
            isPornographic: it.isPornographic || false,
            detailPath: it.detailPath || ''
          };

          if (!isAdultOrInappropriate(item)) {
            shelfItems.push(item);
          }
        }

        if (shelfItems.length > 0) {
          shelves.push({
            id: String(op.id || Math.random()),
            title: shelfTitle,
            items: shelfItems
          });
        }
      }
    }

    // Edge cache on Vercel: 10 minutes cache, serve stale for 1 hour
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');

    res.status(200).json({
      success: true,
      banners,
      shelves,
      count: shelves.reduce((acc, s) => acc + s.items.length, 0)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch home feed'
    });
  }
};
