const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
  // Full CORS Headers for cross-origin web playback
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin, User-Agent');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Missing or invalid url parameter');
  }

  // Check if subtitle conversion to WebVTT is requested
  const isVtt = req.query.vtt === 'true' || targetUrl.includes('.srt') || targetUrl.includes('.vtt');

  try {
    const parsedTarget = new URL(targetUrl);
    const client = parsedTarget.protocol === 'https:' ? https : http;

    // -------------------------------------------------------------
    // 1. Subtitle Fetching & Automatic WebVTT Conversion
    // -------------------------------------------------------------
    if (isVtt) {
      const subReq = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://movieboxph.org/',
          'Accept': '*/*'
        }
      }, (upstream) => {
        let rawBody = '';
        upstream.setEncoding('utf-8');
        upstream.on('data', chunk => rawBody += chunk);
        upstream.on('end', () => {
          let vtt = 'WEBVTT\n\n' + rawBody
            .replace(/\r\n/g, '\n')
            .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/vtt; charset=utf-8',
            'Cache-Control': 'public, max-age=86400'
          });
          res.end(vtt);
        });
      });
      subReq.on('error', (err) => {
        if (!res.headersSent) res.status(500).send('Subtitle error: ' + err.message);
      });
      return;
    }

    // -------------------------------------------------------------
    // 2. High-Speed Video Stream Chunking & Range Proxy
    // -------------------------------------------------------------
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://movieboxph.org/',
      'Accept': '*/*'
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const proxyReq = client.request(targetUrl, {
      method: req.method || 'GET',
      headers
    }, (upstream) => {
      if (upstream.statusCode !== 200 && upstream.statusCode !== 206) {
        let errBody = '';
        upstream.on('data', d => errBody += d);
        upstream.on('end', () => {
          res.writeHead(upstream.statusCode, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            status: upstream.statusCode,
            headers: upstream.headers,
            body: errBody
          }));
        });
        return;
      }

      if (upstream.headers['content-length']) {
        responseHeaders['Content-Length'] = upstream.headers['content-length'];
      }
      if (upstream.headers['content-range']) {
        responseHeaders['Content-Range'] = upstream.headers['content-range'];
      }

      res.writeHead(upstream.statusCode, responseHeaders);
      upstream.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy upstream error:', err);
      if (!res.headersSent) {
        res.status(502).send('Error streaming media: ' + err.message);
      }
    });

    req.on('close', () => {
      proxyReq.destroy();
    });

    proxyReq.end();

  } catch (err) {
    console.error('Stream proxy error:', err);
    if (!res.headersSent) {
      res.status(500).send(err.message || 'Stream proxy failed');
    }
  }
};
