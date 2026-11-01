module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  res.status(200).json({
    success: true,
    app: {
      name: "سينما فوكس",
      nameEn: "Cinema Fox",
      latestVersion: "3.0.0",
      minSupportedVersion: "1.0.0",
      telegramChannelUrl: "https://t.me/Cinemifox",
      telegramUsername: "@Cinemifox",
      supportEmail: "support@cinemafox.app"
    },
    ads: {
      provider: "start.io",
      appId: "210571679",
      publisherId: "138268466",
      interstitialOnPlay: true,
      interstitialOnDownload: true,
      bannerOnHome: true,
      bannerOnDetails: true
    },
    features: {
      smartArabicSubtitles: true,
      highSpeedEdgeStreaming: true,
      adultContentFilter: true
    }
  });
};
