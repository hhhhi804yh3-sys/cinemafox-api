module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>لوحة تحكم سينما فوكس المحمية • Cinema Fox Master Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #0B0E14;
      --card: #151921;
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #E50914;
      --primary-glow: rgba(229, 9, 20, 0.35);
      --success: #00E069;
      --warning: #FFA000;
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Almarai', sans-serif;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Login Modal Overlay */
    #loginOverlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(11, 14, 20, 0.95);
      backdrop-filter: blur(20px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .login-box {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 36px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }

    .login-logo {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #E50914, #990000);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 26px;
      color: white;
      margin: 0 auto 16px;
      box-shadow: 0 4px 16px var(--primary-glow);
    }

    .login-box h2 {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 6px;
    }

    .login-box p {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    .login-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      padding: 14px 16px;
      border-radius: 12px;
      color: white;
      font-size: 15px;
      margin-bottom: 16px;
      outline: none;
      text-align: center;
      letter-spacing: 2px;
    }

    .login-input:focus {
      border-color: var(--primary);
    }

    .btn-login {
      width: 100%;
      background: var(--primary);
      color: white;
      border: none;
      padding: 14px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 14px var(--primary-glow);
      transition: opacity 0.2s;
    }

    .btn-login:hover {
      opacity: 0.9;
    }

    .login-err {
      color: var(--primary);
      font-size: 12px;
      margin-top: 12px;
      display: none;
      font-weight: 700;
    }

    /* Top Navigation */
    header {
      background: rgba(21, 25, 33, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #E50914, #990000);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 20px;
      color: white;
      box-shadow: 0 4px 14px var(--primary-glow);
    }

    .brand h1 {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .brand span {
      font-size: 12px;
      color: var(--text-muted);
      display: block;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .server-status {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 224, 105, 0.12);
      border: 1px solid rgba(0, 224, 105, 0.3);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      color: var(--success);
    }

    .btn-logout {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 10px var(--success);
      animation: pulseAnim 2s infinite;
    }

    @keyframes pulseAnim {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.3); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* Main Container */
    main {
      flex: 1;
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    /* Ad Network Strip */
    .ads-notice-strip {
      background: rgba(0, 224, 105, 0.08);
      border: 1px solid rgba(0, 224, 105, 0.25);
      border-radius: 14px;
      padding: 12px 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
    }

    .ads-notice-strip a {
      color: var(--success);
      font-weight: 700;
      text-decoration: underline;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .kpi-title {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 12px;
      font-weight: 600;
    }

    .kpi-value {
      font-size: 32px;
      font-weight: 800;
      color: white;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .kpi-sub {
      font-size: 12px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .text-success { color: var(--success); }
    .text-primary { color: var(--primary); }
    .text-warning { color: var(--warning); }

    /* Charts Section */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }

    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    .panel {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .panel-header h2 {
      font-size: 16px;
      font-weight: 800;
    }

    /* Live Requests List */
    .event-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 380px;
      overflow-y: auto;
    }

    .event-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 13px;
    }

    .event-name {
      font-weight: 700;
      color: white;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-meta {
      font-size: 11px;
      color: var(--text-muted);
    }

    .event-tag {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(0, 224, 105, 0.15);
      color: var(--success);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Action Controls */
    .controls-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }

    .control-item {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-muted);
    }

    input, select {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      padding: 12px 16px;
      border-radius: 10px;
      color: white;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    input:focus {
      border-color: var(--primary);
    }

    .btn {
      background: var(--primary);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px var(--primary-glow);
      transition: opacity 0.2s;
    }

    .btn:hover {
      opacity: 0.9;
    }

    footer {
      padding: 24px;
      text-align: center;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--card-border);
    }
  </style>
</head>
<body>

  <!-- Password Protected Login Modal -->
  <div id="loginOverlay">
    <div class="login-box">
      <div class="login-logo">CF</div>
      <h2>دخول لوحة تحكم سينما فوكس</h2>
      <p>هذه المنطقة محمية ومخصصة لإدارة السيرفر والتطبيق فقط</p>
      
      <input type="password" id="passInput" class="login-input" placeholder="أدخل كلمة المرور (PIN)" onkeypress="if(event.key==='Enter') login();">
      <button class="btn-login" onclick="login()">فتح لوحة التحكم</button>
      
      <div id="loginErr" class="login-err">كلمة المرور غير صحيحة، حاول مجدداً!</div>
    </div>
  </div>

  <!-- Dashboard Interface -->
  <header>
    <div class="brand">
      <div class="brand-logo">CF</div>
      <div>
        <h1>سينما فوكس • Cinema Fox Master Dashboard</h1>
        <span>Vercel Edge Global Production • القياسات الحية المباشرة</span>
      </div>
    </div>
    <div class="header-actions">
      <div class="server-status">
        <div class="pulse"></div>
        بيانات حية مباشرة من هواتف المستخدمين
      </div>
      <button class="btn-logout" onclick="logout()">تسجيل خروج</button>
    </div>
  </header>

  <main>
    <!-- Start.io Ads.txt Verified Banner -->
    <div class="ads-notice-strip">
      <div>
        <strong>✓ تم تفعيل app-ads.txt الرسمي لشبكة Start.io بنجاح:</strong>
        معرّف الناشر <code>138268466</code> متاح لجميع شبكات الإعلانات العالمية.
      </div>
      <a href="/app-ads.txt" target="_blank">معاينة الملف المباشر (app-ads.txt) ↗</a>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">المستخدمون النشطون الآن (Live Active Users)</div>
        <div class="kpi-value" id="kpiUsers">-- <span style="font-size: 14px; color: var(--success);">🔴 متصل</span></div>
        <div class="kpi-sub text-success">✓ أجهزة نشطة متصلة بالسيرفر خلال الـ 5 دقائق الماضية</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">سرعة استجابة التطبيق الحقيقية (Response Time)</div>
        <div class="kpi-value text-success" id="kpiLatency">-- ms <span style="font-size: 14px; color: var(--text-muted);">فائق السرعة</span></div>
        <div class="kpi-sub text-success">✓ قياس حقيقي لزمن معالجة الطلبات في سيرفر Vercel Edge</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">إجمالي طلبات البث والمواسم (Total Requests)</div>
        <div class="kpi-value" id="kpiRequests">--</div>
        <div class="kpi-sub text-primary">المسلسلات والأفلام مرتبة تلقائياً بدون أخطاء</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">المحتوى الإباحي المحجوب تلقائياً</div>
        <div class="kpi-value text-primary" id="kpiBlocked">--</div>
        <div class="kpi-sub text-muted">حماية كاملة وحظر للمحتوى غير اللائق (Adult Filter)</div>
      </div>
    </div>

    <!-- Charts & Realtime Events -->
    <div class="dashboard-grid">
      <div class="panel">
        <div class="panel-header">
          <h2>معدل سرعة الاستجابة الحقيقية (Latency Monitor)</h2>
          <span style="font-size: 12px; color: var(--text-muted);">تحديث تلقائي كل 3 ثواني من السيرفر</span>
        </div>
        <canvas id="trafficChart" height="120"></canvas>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h2>سجل الطلبات الحية الحقيقية (Live Requests Stream)</h2>
          <span style="font-size: 12px; color: var(--success);">🔴 حي من التطبيق</span>
        </div>
        <div class="event-list" id="eventsList">
          <div style="text-align: center; color: var(--text-muted); padding: 20px;">جاري سحب أحدث الطلبات الحية...</div>
        </div>
      </div>
    </div>

    <!-- Live Controls Panel -->
    <div class="panel">
      <div class="panel-header">
        <h2>لوحة التحكم المباشرة في التطبيق عن بُعد (Remote Config)</h2>
        <span style="font-size: 12px; color: var(--text-muted);">تنعكس فوراً على هواتف جميع المستخدمين بدون تحديث APK</span>
      </div>

      <div class="controls-grid">
        <div class="control-item">
          <label>رابط قناة التليجرام الرسمية للتطبيق</label>
          <input type="text" id="tgInput" value="https://t.me/Cinemifox">
        </div>

        <div class="control-item">
          <label>معرّف إعلانات Start.io (App ID) ومطابقة app-ads.txt</label>
          <input type="text" id="adInput" value="210571679 (Publisher ID: 138268466)" disabled>
        </div>

        <div class="control-item">
          <label>إعلان / شريط تنبيه يظهر أعلى الشاشة الرئيسية لكل المستخدمين</label>
          <input type="text" id="announcementInput" placeholder="اكتب هنا إشعاراً سيظهر لكل المستخدمين فوراً...">
        </div>
      </div>

      <div style="margin-top: 20px; display: flex; gap: 12px;">
        <button class="btn" onclick="saveSettings()">حفظ التعديلات ونشرها للتطبيق</button>
        <span id="saveNotice" style="align-self: center; font-size: 13px; color: var(--success); display: none;">✓ تم الحفظ بنجاح وتحديث هواتف المستخدمين</span>
      </div>
    </div>
  </main>

  <footer>
    منصة سينما فوكس الرقمية • Cinema Fox Production Server • استضافة سحابية فائقة السرعة على شبكة Vercel العالمية
  </footer>

  <script>
    let currentAuthToken = localStorage.getItem('cf_admin_token') || '';

    // Check if previously logged in
    if (currentAuthToken) {
      document.getElementById('loginOverlay').style.display = 'none';
      fetchRealStats();
      setInterval(fetchRealStats, 3000);
    }

    async function login() {
      const pass = document.getElementById('passInput').value.trim();
      const err = document.getElementById('loginErr');
      if (!pass) return;

      try {
        const res = await fetch('/api/stats?password=' + encodeURIComponent(pass));
        if (res.status === 200) {
          currentAuthToken = pass;
          localStorage.setItem('cf_admin_token', pass);
          document.getElementById('loginOverlay').style.display = 'none';
          fetchRealStats();
          setInterval(fetchRealStats, 3000);
        } else {
          err.style.display = 'block';
        }
      } catch (e) {
        err.style.display = 'block';
      }
    }

    function logout() {
      localStorage.removeItem('cf_admin_token');
      location.reload();
    }

    // Chart.js Live Latency
    const ctx = document.getElementById('trafficChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'سرعة الاستجابة الحقيقية (ms)',
          data: [],
          borderColor: '#00E069',
          backgroundColor: 'rgba(0, 224, 105, 0.1)',
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#9CA3AF' } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF' }, min: 0 }
        }
      }
    });

    async function fetchRealStats() {
      if (!currentAuthToken) return;
      try {
        const res = await fetch('/api/stats?password=' + encodeURIComponent(currentAuthToken));
        if (res.status === 401) {
          logout();
          return;
        }
        const json = await res.json();
        const d = json.data;
        if (!d) return;

        // Update KPIs
        document.getElementById('kpiUsers').innerHTML = d.activeUsers.toLocaleString() + ' <span style="font-size: 14px; color: var(--success);">🔴 متصل</span>';
        document.getElementById('kpiLatency').innerHTML = d.avgResponseTimeMs + ' ms <span style="font-size: 14px; color: var(--text-muted);">فائق السرعة</span>';
        document.getElementById('kpiRequests').innerText = d.totalRequests.toLocaleString();
        document.getElementById('kpiBlocked').innerText = d.blockedAdultCount.toLocaleString();

        if (d.announcement && !document.getElementById('announcementInput').value) {
          document.getElementById('announcementInput').value = d.announcement;
        }

        // Update Chart
        const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (chart.data.labels.length > 12) {
          chart.data.labels.shift();
          chart.data.datasets[0].data.shift();
        }
        chart.data.labels.push(nowTime);
        chart.data.datasets[0].data.push(d.avgResponseTimeMs);
        chart.update('none');

        // Update Recent Events
        const listEl = document.getElementById('eventsList');
        if (Array.isArray(d.recentEvents) && d.recentEvents.length > 0) {
          listEl.innerHTML = d.recentEvents.map(ev => {
            return '<div class="event-item">' +
              '<div>' +
                '<div class="event-name">' + (ev.title || 'طلب') + '</div>' +
                '<div class="event-meta">' + ev.type + ' • ' + ev.time + '</div>' +
              '</div>' +
              '<div class="event-tag">' + ev.durationMs + 'ms</div>' +
            '</div>';
          }).join('');
        } else {
          listEl.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">في انتظار أولى طلبات البث من التطبيق...</div>';
        }

      } catch (_) {}
    }

    async function saveSettings() {
      const ann = document.getElementById('announcementInput').value.trim();
      const notice = document.getElementById('saveNotice');

      try {
        await fetch('/api/stats?password=' + encodeURIComponent(currentAuthToken), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcement: ann })
        });
        notice.style.display = 'inline';
        setTimeout(() => notice.style.display = 'none', 4000);
      } catch (_) {}
    }
  </script>
</body>
</html>`;

  res.status(200).send(html);
};
