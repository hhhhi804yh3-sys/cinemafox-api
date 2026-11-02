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

  const { subjectId, detailPath, title } = req.query;

  if (!subjectId && !detailPath) {
    return res.status(400).json({ success: false, error: 'subjectId or detailPath is required' });
  }

  try {
    const token = await ensureAuthToken();

    const url = `${BASE_URL}/wefeed-h5api-bff/detail?subjectId=${encodeURIComponent(subjectId || '')}&detailPath=${encodeURIComponent(detailPath || '')}&se=1`;

    const detailData = await new Promise((resolve, reject) => {
      const request = https.request(url, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": `${BASE_URL}/movies/${encodeURIComponent(detailPath || '')}`,
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

    const subject = detailData?.data?.subject || {};
    const resource = detailData?.data?.resource || {};

    // 1. Adult Content Filter
    if (subject.isPornographic === true || isAdultOrInappropriate(subject)) {
      recordRequest({
        type: 'حظر محتوى غير لائق',
        title: subject.title || title || 'عمل محجوب',
        durationMs: Date.now() - startTime,
        isBlocked: true,
        req
      });
      return res.status(403).json({
        success: false,
        blocked: true,
        error: 'This content is restricted and blocked in Cinema Fox.'
      });
    }

    const rawTitle = subject.title || title || '';
    const cleanTitle = cleanShowTitle(rawTitle);
    const isSeries = subject.subjectType === 2;

    // 2. Extract Authentic Seasons and Episodes from resource.seasons
    const seasonsList = [];
    if (isSeries) {
      if (Array.isArray(resource.seasons) && resource.seasons.length > 0) {
        for (const s of resource.seasons) {
          const sNum = parseInt(s.se, 10) || 1;
          const maxEp = parseInt(s.maxEp, 10) || 10;

          const episodes = [];
          for (let ep = 1; ep <= maxEp; ep++) {
            episodes.push({
              id: `${subject.subjectId || subjectId}_s${sNum}_ep${ep}`,
              number: ep,
              seasonNumber: sNum,
              title: `الحلقة ${ep}`,
              titleAr: `الموسم ${sNum} : الحلقة ${ep}`,
              duration: '45 دقيقة'
            });
          }

          seasonsList.push({
            seasonNumber: sNum,
            title: `الموسم ${sNum}`,
            episodeCount: maxEp,
            episodes: episodes
          });
        }
      } else {
        // Fallback: Check title for season range e.g. S1-S2, S1-S5
        const rangeMatch = rawTitle.match(/\bS(\d+)\s*[-~–]\s*S?(\d+)\b/i);
        const start = rangeMatch ? parseInt(rangeMatch[1], 10) : 1;
        const end = rangeMatch ? parseInt(rangeMatch[2], 10) : start;

        for (let sNum = start; sNum <= end; sNum++) {
          const epCount = 10;
          const episodes = [];
          for (let ep = 1; ep <= epCount; ep++) {
            episodes.push({
              id: `${subject.subjectId || subjectId}_s${sNum}_ep${ep}`,
              number: ep,
              seasonNumber: sNum,
              title: `الحلقة ${ep}`,
              titleAr: `الموسم ${sNum} : الحلقة ${ep}`,
              duration: '45 دقيقة'
            });
          }

          seasonsList.push({
            seasonNumber: sNum,
            title: `الموسم ${sNum}`,
            episodeCount: epCount,
            episodes: episodes
          });
        }
      }
    }

    // Sort seasons ascending
    seasonsList.sort((a, b) => a.seasonNumber - b.seasonNumber);

    // Cache detail for 1 hour on Vercel Edge
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

    recordRequest({
      type: isSeries ? 'تفاصيل مسلسل' : 'تفاصيل فيلم',
      title: cleanTitle || rawTitle,
      durationMs: Date.now() - startTime,
      req
    });

    res.status(200).json({
      success: true,
      data: {
        subjectId: String(subject.subjectId || subjectId),
        detailPath: subject.detailPath || detailPath || '',
        title: cleanTitle || rawTitle,
        titleAr: cleanTitle || rawTitle,
        rawTitle: rawTitle,
        synopsis: subject.description || '',
        rating: parseFloat(subject.imdbRatingValue || '8.0') || 8.0,
        releaseYear: subject.releaseDate ? subject.releaseDate.substring(0, 4) : '2026',
        genre: subject.genre || (isSeries ? 'مسلسلات' : 'أفلام'),
        isSeries: isSeries,
        poster: subject.cover?.url || '',
        backdrop: subject.stills?.url || subject.cover?.url || '',
        trailerUrl: subject.trailer?.videoAddress?.url || '',
        totalSeasons: seasonsList.length,
        seasons: seasonsList,
        dubs: Array.isArray(subject.dubs) ? subject.dubs : []
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch detail'
    });
  }
};
