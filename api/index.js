module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    status: 'online',
    service: 'Cinema Fox Cloud API',
    version: '3.0.0-production',
    endpoints: {
      home: '/api/home',
      detail: '/api/detail?subjectId={id}&detailPath={slug}',
      search: '/api/search?q={query}',
      streams: '/api/streams?subjectId={id}&se={se}&ep={ep}&detailPath={slug}',
      subtitles: '/api/subtitles?subjectId={id}&se={se}&ep={ep}',
      config: '/api/config'
    },
    message: 'Welcome to Cinema Fox Ultra-Fast Vercel Edge Service.'
  });
};
