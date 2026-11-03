const https = require('https');
const http = require('http');
const http2 = require('http2');

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

    // -------------------------------------------------------------
    // 1. Subtitle Fetching & Automatic WebVTT Conversion
    // -------------------------------------------------------------
    if (isVtt) {
      const client = parsedTarget.protocol === 'https:' ? https : http;
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
    // 2. High-Speed Video Stream Chunking via HTTP/2 (Zero-Buffer)
    // -------------------------------------------------------------
    if (parsedTarget.protocol === 'https:') {
      let clientClosed = false;
      const client = http2.connect(parsedTarget.origin);

      const closeClient = () => {
        if (!clientClosed) {
          clientClosed = true;
          try { client.close(); } catch (_) {}
        }
      };

      client.on('error', (err) => {
        console.error('H2 Client connection error:', err.message);
        closeClient();
        if (!res.headersSent) {
          res.setHeader('X-H2-Error', err.message || 'unknown');
          fallbackHttp1(targetUrl, req, res);
        }
      });

      const h2Headers = {
        ':method': 'GET',
        ':path': parsedTarget.pathname + parsedTarget.search,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'referer': 'https://movieboxph.org/',
        'accept': '*/*'
      };

      // Forward browser video range header
      if (req.headers.range) {
        h2Headers['range'] = req.headers.range;
      }

      const h2Req = client.request(h2Headers);

      h2Req.on('response', (headers) => {
        const statusCode = parseInt(headers[':status'] || '200', 10);

        const responseHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type, X-Upstream-H2-Status, X-Upstream-Server',
          'Content-Type': headers['content-type'] || 'video/mp4',
          'Accept-Ranges': 'bytes',
          'X-Upstream-H2-Status': String(headers[':status'] || ''),
          'X-Upstream-Server': String(headers['server'] || '')
        };

        if (headers['content-range']) {
          responseHeaders['Content-Range'] = headers['content-range'];
        }
        if (headers['content-length']) {
          responseHeaders['Content-Length'] = headers['content-length'];
        }

        res.writeHead(statusCode, responseHeaders);
        h2Req.pipe(res);
      });

      h2Req.on('end', closeClient);
      h2Req.on('error', (err) => {
        console.error('H2 stream error:', err.message);
        closeClient();
        if (!res.headersSent) {
          res.status(502).send('Error streaming media: ' + err.message);
        }
      });

      req.on('close', () => {
        try { h2Req.close(); } catch (_) {}
        closeClient();
      });

      return;
    }

    // HTTP/1 Fallback
    fallbackHttp1(targetUrl, req, res);

  } catch (err) {
    console.error('Stream proxy error:', err);
    if (!res.headersSent) {
      res.status(500).send(err.message || 'Stream proxy failed');
    }
  }
};

function fallbackHttp1(targetUrl, req, res) {
  const parsed = new URL(targetUrl);
  const client = parsed.protocol === 'https:' ? https : http;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://movieboxph.org/',
    'Accept': '*/*'
  };

  if (req.headers.range) {
    headers['Range'] = req.headers.range;
  }

  const pReq = client.get(targetUrl, { headers }, (upstream) => {
    const responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': upstream.headers['content-type'] || 'video/mp4',
      'Accept-Ranges': 'bytes'
    };

    if (upstream.headers['content-length']) responseHeaders['Content-Length'] = upstream.headers['content-length'];
    if (upstream.headers['content-range']) responseHeaders['Content-Range'] = upstream.headers['content-range'];

    res.writeHead(upstream.statusCode, responseHeaders);
    upstream.pipe(res);
  });

  pReq.on('error', (err) => {
    if (!res.headersSent) res.status(502).send('Proxy fallback error: ' + err.message);
  });

  req.on('close', () => {
    pReq.destroy();
  });
}
