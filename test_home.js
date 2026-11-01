const https = require('https');
const { BASE_URL, USER_AGENT, ensureAuthToken, isAdultOrInappropriate, cleanShowTitle, mapShelfTitle } = require('./lib/moviebox');

async function testHome() {
  const token = await ensureAuthToken();
  const req = https.request(`${BASE_URL}/wefeed-h5api-bff/home`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': `${BASE_URL}/`,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }, (res) => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      const data = JSON.parse(b);
      const ops = data.data?.operatingList || [];
      console.log('Operating list count:', ops.length);
      ops.forEach(op => {
        console.log(`- type: ${op.type} | title: "${op.title}" | bannerItems: ${op.banner?.items?.length} | subjects: ${op.subjects?.length}`);
      });
    });
  });
  req.end();
}

testHome();
