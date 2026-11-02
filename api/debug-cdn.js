const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url');

  const headers = {
    'Referer': 'https://movieboxph.org/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Range': 'bytes=0-100'
  };

  https.get(targetUrl, { headers }, (upstream) => {
    let b = '';
    upstream.on('data', c => b += c);
    upstream.on('end', () => {
      res.json({
        statusCode: upstream.statusCode,
        headers: upstream.headers,
        body: b.slice(0, 200)
      });
    });
  }).on('error', err => {
    res.json({ error: err.message });
  });
};
