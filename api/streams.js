const https = require('https');
const { BASE_URL, USER_AGENT, ensureAuthToken, cleanShowTitle } = require('../lib/moviebox');
const { recordRequest } = require('../lib/telemetry');

async function requestPlayStreams(subjectId, se, ep, detailPath, token) {
  const url = `${BASE_URL}/wefeed-h5api-bff/subject/play?subjectId=${encodeURIComponent(subjectId)}&se=${encodeURIComponent(se || 0)}&ep=${encodeURIComponent(ep || 0)}&detailPath=${encodeURIComponent(detailPath || '')}`;

  return new Promise((resolve) => {
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
          const json = JSON.parse(body);
          resolve(json?.data?.streams || []);
        } catch (_) {
          resolve([]);
        }
      });
    });

    request.on("error", () => resolve([]));
    request.setTimeout(8000, () => {
      request.destroy();
      resolve([]);
    });
    request.end();
  });
}

module.exports = async (req, res) => {
  const startTime = Date.now();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { subjectId, se = 0, ep = 0, detailPath = '', title = '' } = req.query;

  if (!subjectId) {
    return res.status(400).json({ success: false, error: 'subjectId is required' });
  }

  try {
    const token = await ensureAuthToken();

    let streams = await requestPlayStreams(subjectId, se, ep, detailPath, token);

    // Smart Fallback if 0 streams returned (placeholder item)
    if ((!streams || streams.length === 0) && title) {
      const clean = cleanShowTitle(title);
      const postData = JSON.stringify({ keyword: clean, page: 1, perPage: 10, subjectType: 0 });

      const searchItems = await new Promise((resolve) => {
        const sr = https.request(`${BASE_URL}/wefeed-h5api-bff/subject/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            "Referer": `${BASE_URL}/search/${encodeURIComponent(clean)}`,
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...(token ? { "Cookie": `moviebox_web_tk=${token}; token=${token}` } : {})
          }
        }, (resp) => {
          let b = "";
          resp.on("data", c => b += c);
          resp.on("end", () => {
            try {
              resolve(JSON.parse(b)?.data?.items || []);
            } catch (_) {
              resolve([]);
            }
          });
        });
        sr.on("error", () => resolve([]));
        sr.setTimeout(5000, () => { sr.destroy(); resolve([]); });
        sr.write(postData);
        sr.end();
      });

      for (const it of searchItems) {
        if (it && String(it.subjectId) !== String(subjectId)) {
          const altStreams = await requestPlayStreams(it.subjectId, se, ep, it.detailPath, token);
          if (altStreams && altStreams.length > 0) {
            streams = altStreams;
            break;
          }
        }
      }
    }

    // Sort resolution descending (1080p first, then 720p, etc.)
    streams.sort((a, b) => (b.resolutions || 0) - (a.resolutions || 0));

    recordRequest({
      type: 'تشغيل وبث فيديو',
      title: title ? `${title} (S${se}E${ep})` : `بث فيديو S${se}E${ep}`,
      durationMs: Date.now() - startTime,
      req
    });

    res.status(200).json({
      success: true,
      subjectId: subjectId,
      se: parseInt(se, 10) || 0,
      ep: parseInt(ep, 10) || 0,
      streamsCount: streams.length,
      headers: {
        "Referer": `${BASE_URL}/`,
        "User-Agent": USER_AGENT
      },
      streams: streams.map(s => ({
        id: String(s.id || ''),
        format: s.format || 'm3u8',
        resolution: `${s.resolutions || 1080}p`,
        resolutionsNumber: s.resolutions || 1080,
        url: s.url || '',
        size: s.size || 0
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch streams'
    });
  }
};
