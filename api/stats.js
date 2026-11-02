const { getStats, verifyPassword, setAnnouncement, setPassword } = require('../lib/telemetry');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract auth password from query or Authorization header
  let authPass = (req.query && req.query.password) || '';
  const authHeader = req.headers ? req.headers['authorization'] : null;
  if (!authPass && authHeader) {
    authPass = authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  if (!verifyPassword(authPass)) {
    return res.status(401).json({
      success: false,
      error: 'كلمة مرور لوحة التحكم غير صحيحة (Unauthorized)'
    });
  }

  if (req.method === 'POST') {
    const { announcement, newPassword } = req.body || {};
    if (typeof announcement === 'string') {
      setAnnouncement(announcement);
    }
    if (newPassword) {
      setPassword(newPassword);
    }
    return res.status(200).json({
      success: true,
      message: 'تم حفظ التعديلات بنجاح'
    });
  }

  const stats = getStats();
  res.status(200).json({
    success: true,
    data: stats
  });
};
