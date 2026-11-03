const http2 = require('http2');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const targetUrl = req.query.url || 'https://bcdnxw.hakunaymatata.com/resource/ccf5e3c50a0ddb2cc94973d2a21c6a35.mp4?sign=3f9e85c78623ebf513116858edfe42ed&t=1793721045';

  try {
    const url = new URL(targetUrl);
    let resolved = false;

    const client = http2.connect(url.origin);

    client.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        res.json({ success: false, phase: 'connect_error', error: err.message, code: err.code });
      }
    });

    const h2Req = client.request({
      ':method': 'GET',
      ':path': url.pathname + url.search,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'referer': 'https://movieboxph.org/',
      'range': 'bytes=0-100'
    });

    h2Req.on('response', (headers) => {
      if (!resolved) {
        resolved = true;
        const status = headers[':status'];
        client.close();
        res.json({ success: true, status, headers });
      }
    });

    h2Req.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        client.close();
        res.json({ success: false, phase: 'request_error', error: err.message });
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { client.close(); } catch (_) {}
        res.json({ success: false, phase: 'timeout' });
      }
    }, 6000);

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
