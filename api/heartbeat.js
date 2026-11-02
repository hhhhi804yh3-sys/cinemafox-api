const { recordHeartbeat, getStats } = require('../lib/telemetry');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const deviceId = req.query.deviceId || '';
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '';

  recordHeartbeat(deviceId, ip);

  const stats = getStats();

  res.status(200).json({
    status: 'ok',
    announcement: stats.announcement || ''
  });
};
