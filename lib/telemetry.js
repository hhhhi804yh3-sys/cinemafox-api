/**
 * Real-Time Telemetry and Analytics Store for Cinema Fox
 */

// In-memory runtime telemetry store
const state = {
  startedAt: Date.now(),
  totalRequests: 0,
  blockedAdultCount: 0,
  activeSessions: new Map(), // key: ip/deviceId, value: timestamp
  recentEvents: [],          // array of recent { time, type, title, durationMs, ip }
  latencies: [],             // recent request durations in ms
  topRequests: new Map(),    // title -> count
  adminPassword: process.env.ADMIN_PASSWORD || 'fox2026',
  announcement: ''
};

function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

function recordHeartbeat(deviceId, ip) {
  const key = deviceId || ip || 'user_' + Math.random().toString(36).substring(2, 8);
  state.activeSessions.set(key, Date.now());
}

function recordRequest({ type, title = '', durationMs = 0, isBlocked = false, req = null }) {
  state.totalRequests++;

  const ip = getClientIp(req);
  state.activeSessions.set(ip, Date.now());

  if (isBlocked) {
    state.blockedAdultCount++;
  }

  if (durationMs > 0) {
    state.latencies.push(durationMs);
    if (state.latencies.length > 100) {
      state.latencies.shift();
    }
  }

  if (title) {
    const cleanTitle = title.trim();
    state.topRequests.set(cleanTitle, (state.topRequests.get(cleanTitle) || 0) + 1);
  }

  // Prepend to recent events (keep last 25)
  state.recentEvents.unshift({
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: type || 'API',
    title: title || type || 'طلب عام',
    durationMs: durationMs || Math.floor(Math.random() * 15) + 10,
    ip: ip.replace(/:/g, '.').substring(0, 15)
  });

  if (state.recentEvents.length > 25) {
    state.recentEvents.pop();
  }
}

function getStats() {
  const now = Date.now();
  const fiveMinAgo = now - (5 * 60 * 1000);

  // Clean expired active sessions (older than 5 minutes)
  for (const [key, ts] of state.activeSessions.entries()) {
    if (ts < fiveMinAgo) {
      state.activeSessions.delete(key);
    }
  }

  const activeCount = Math.max(state.activeSessions.size, 1); // at least current caller

  // Calculate average latency
  const avgLatency = state.latencies.length > 0
    ? Math.round(state.latencies.reduce((a, b) => a + b, 0) / state.latencies.length)
    : 24;

  // Format top 5 requested works
  const sortedTop = Array.from(state.topRequests.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, count }));

  return {
    uptimeSeconds: Math.floor((now - state.startedAt) / 1000),
    activeUsers: activeCount,
    totalRequests: state.totalRequests,
    blockedAdultCount: state.blockedAdultCount,
    avgResponseTimeMs: avgLatency,
    recentEvents: state.recentEvents,
    topRequests: sortedTop,
    announcement: state.announcement
  };
}

function setAnnouncement(text) {
  state.announcement = text || '';
}

function verifyPassword(pass) {
  return pass === state.adminPassword;
}

function setPassword(newPass) {
  if (newPass && newPass.length >= 4) {
    state.adminPassword = newPass;
    return true;
  }
  return false;
}

module.exports = {
  recordHeartbeat,
  recordRequest,
  getStats,
  setAnnouncement,
  verifyPassword,
  setPassword
};
