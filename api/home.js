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

    const operatingList = homeData?.data?.operatingList || [];
    const banners = [];
    const shelves = [];
    const seenIds = new Set();

    for (const op of operatingList) {
      if (!op) continue;
      const opType = op.type || '';
      const rawTitle = op.title || op.name || '';

      // Skip undesirable shelves
      if (rawTitle.includes("Boys' Love") || rawTitle.includes("Hot Short")) {
        continue;
      }

      // 1. Process Banner Carousel items
      if (opType === 'BANNER' && op.banner && Array.isArray(op.banner.items)) {
        for (const bItem of op.banner.items) {
          const sub = bItem?.subject;
          if (!sub) continue;

          if (isAdultOrInappropriate(sub)) continue;

          const rawSubTitle = sub.title || '';
          const isSeries = sub.subjectType === 2;
          const clean = cleanShowTitle(rawSubTitle);
          const landscapeUrl = bItem.image?.url || sub.stills?.url || sub.cover?.url || '';

          const bannerItem = {
            id: String(sub.subjectId || Math.random()),
            subjectId: String(sub.subjectId || ''),
            title: clean || rawSubTitle,
            titleAr: clean || rawSubTitle,
            poster: sub.cover?.url || '',
            backdrop: landscapeUrl,
            rating: parseFloat(sub.imdbRatingValue || '8.5') || 8.5,
            releaseYear: sub.releaseDate ? sub.releaseDate.substring(0, 4) : '2026',
            genre: sub.genre || (isSeries ? 'مسلسلات' : 'أفلام'),
            isSeries: isSeries,
            detailPath: sub.detailPath || ''
          };

          if (!seenIds.has(bannerItem.subjectId)) {
            seenIds.add(bannerItem.subjectId);
            banners.push(bannerItem);
          }
        }
      }

      // 2. Process Shelves
      if (Array.isArray(op.subjects) && op.subjects.length > 0) {
        const shelfTitle = mapShelfTitle(rawTitle);
        const shelfItems = [];

        for (const sub of op.subjects) {
          if (!sub) continue;
          if (isAdultOrInappropriate(sub)) continue;

          const rawSubTitle = sub.title || '';
          const isSeries = sub.subjectType === 2;
          const clean = cleanShowTitle(rawSubTitle);

          const item = {
            id: String(sub.subjectId || Math.random()),
            subjectId: String(sub.subjectId || ''),
            title: clean || rawSubTitle,
            titleAr: clean || rawSubTitle,
            poster: sub.cover?.url || '',
            backdrop: sub.stills?.url || sub.cover?.url || '',
            rating: parseFloat(sub.imdbRatingValue || '8.0') || 8.0,
            releaseYear: sub.releaseDate ? sub.releaseDate.substring(0, 4) : '2026',
            genre: sub.genre || (isSeries ? 'مسلسلات' : 'أفلام'),
            isSeries: isSeries,
            detailPath: sub.detailPath || ''
          };

          shelfItems.push(item);
        }

        if (shelfItems.length > 0) {
          shelves.push({
            id: String(op.id || Math.random()),
            type: opType,
            title: shelfTitle,
            items: shelfItems
          });
        }
      }
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');

    res.status(200).json({
      success: true,
      bannersCount: banners.length,
      shelvesCount: shelves.length,
      banners: banners,
      shelves: shelves
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch home feed'
    });
  }
};
