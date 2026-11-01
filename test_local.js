const homeHandler = require('./api/home');
const detailHandler = require('./api/detail');
const searchHandler = require('./api/search');
const configHandler = require('./api/config');

function createMockReqRes(query = {}) {
  const req = { method: 'GET', query };
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) {
      this.data = data;
      return this;
    },
    end() {}
  };
  return { req, res };
}

async function runTests() {
  console.log("=== Testing Config ===");
  const { req: rConfig, res: sConfig } = createMockReqRes();
  configHandler(rConfig, sConfig);
  console.log("Config app name:", sConfig.data?.app?.name, "| Telegram:", sConfig.data?.app?.telegramChannelUrl);

  console.log("\n=== Testing Search Filter on Adult (Chacha 420) ===");
  const { req: rSearch, res: sSearch } = createMockReqRes({ q: 'Chacha 420' });
  await searchHandler(rSearch, sSearch);
  console.log("Search results for Chacha 420 count:", sSearch.data?.results?.length);

  console.log("\n=== Testing Detail for Dexter: Resurrection ===");
  const { req: rDexter, res: sDexter } = createMockReqRes({
    subjectId: '4622284752710778936',
    detailPath: 'dexter-resurrection-kkXwea17sv5'
  });
  await detailHandler(rDexter, sDexter);
  console.log("Dexter: Resurrection title:", sDexter.data?.data?.title);
  console.log("Seasons count:", sDexter.data?.data?.totalSeasons);
  sDexter.data?.data?.seasons?.forEach(s => {
    console.log(`- ${s.title}: ${s.episodeCount} episodes`);
  });

  console.log("\n=== Testing Detail for Breaking Bad ===");
  const { req: rBB, res: sBB } = createMockReqRes({
    subjectId: '6207982430134357800',
    detailPath: 'breaking-bad-ej6Bp0MCAo7'
  });
  await detailHandler(rBB, sBB);
  console.log("Breaking Bad title:", sBB.data?.data?.title);
  console.log("Seasons count:", sBB.data?.data?.totalSeasons);
  sBB.data?.data?.seasons?.forEach(s => {
    console.log(`- ${s.title}: ${s.episodeCount} episodes`);
  });

  console.log("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===");
}

runTests();
