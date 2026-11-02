const https = require('https');

module.exports = async (req, res) => {
  const targetUrl = 'https://bcdnxw.hakunaymatata.com/resource/1941ed42586b28faad32f8f3811ace9d.mp4?sign=59e000b9b52a4bcd6c22dd1f976029c6&t=1793640803';

  const testHeaders = [
    { name: 'Standard', headers: { 'Referer': 'https://movieboxph.org/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MovieBoxWindows/1.0.5', 'Range': 'bytes=0-100' } },
    { name: 'Chrome UA', headers: { 'Referer': 'https://movieboxph.org/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'Range': 'bytes=0-100', 'Accept': '*/*' } },
    { name: 'With Cookie', headers: { 'Referer': 'https://movieboxph.org/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MovieBoxWindows/1.0.5', 'Range': 'bytes=0-100', 'Cookie': 'token=anonymous' } }
  ];

  const results = [];
  for (const t of testHeaders) {
    const r = await new Promise(resolve => {
      const creq = https.get(targetUrl, { headers: t.headers }, (cres) => {
        let b = '';
        cres.on('data', chunk => b += chunk);
        cres.on('end', () => {
          resolve({ test: t.name, status: cres.statusCode, headers: cres.headers, body: b.slice(0, 100) });
        });
      });
      creq.on('error', err => resolve({ test: t.name, error: err.message }));
      creq.setTimeout(5000, () => { creq.destroy(); resolve({ test: t.name, error: 'timeout' }); });
    });
    results.push(r);
  }

  res.json({ results });
};
