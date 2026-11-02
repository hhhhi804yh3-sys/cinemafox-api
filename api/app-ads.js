const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  
  try {
    const filePath = path.join(__dirname, '..', 'public', 'app-ads.txt');
    const content = fs.readFileSync(filePath, 'utf8');
    res.status(200).send(content);
  } catch (e) {
    res.status(500).send('Error loading app-ads.txt');
  }
};
