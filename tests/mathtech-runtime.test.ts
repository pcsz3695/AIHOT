// One fresh-DB smoke, using the upstream setup/stub and production ingest/process/read paths.
// This verifies persistence and reuse, not model semantics or the future evidence execution gate.
import { stub, tag } from "./setup.ts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { after, test } from "node:test";
import Fastify from "fastify";

const calls: string[] = [];
const provider = await stub((_hit, request) => {
  const body = JSON.parse(request.body);
  const system = String(body.messages[0]?.content ?? "");
  const step = system.includes("数学数字化与数学文档生产相关性预筛") ? "prefilter"
    : system.includes("数学文档生产技术情报评分器") ? "score"
    : system.includes("资料结构化助手") ? "structure"
    : system.includes("数学文档生产技术情报编辑") ? "understand" : "unexpected";
  assert.notEqual(step, "unexpected", "only the five expected mock calls are allowed");
  calls.push(step);
  const content = step === "prefilter" ? { label: "PASS", reason: "synthetic runtime fixture" }
    : step === "score" ? { attentionScore: 80 }
    : step === "structure" ? { category: "OCR", tags: ["OCR", "marker"], subjects: ["datalab"], fact: null }
    : { itemType: "model_release", authorRole: "principal", tags: ["OCR", "OBSERVE", "marker"],
        editorialJudgment: "仅验证合成材料持久化，不提供工程升级建议。",
        titleZh: "Marker 合成 runtime fixture", summaryZh: "此为合成测试材料，验证数学 OCR 情报处理与数据库读回。不是实际软件发布。" };
  return { choices: [{ message: { content: JSON.stringify(content) } }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
});
for (const name of ["PREFILTER_MODEL", "SCORE_MODEL", "STRUCTURE_MODEL", "UNDERSTAND_MODEL", "SUMMARIZE_MODEL"]) process.env[name] = "default";
process.env.LLM_BASE_URL = `${provider.url}/v1`;
process.env.LLM_MODEL = "mathtech-loopback-mock";
process.env.LLM_API_KEY = randomUUID(); // transient stub value, not an external credential
process.env.INGEST_TOKEN = randomUUID();
process.env.COLLECT_ENABLED = "false";
process.env.MODEL_CALLS_ENABLED = "true"; // this test process calls only the guarded loopback mock
process.env.JINA_BODY_FALLBACK = "false";
process.env.FEISHU_INTERNAL_ENABLED = "false";
process.env.FEISHU_LOGIN_ENABLED = "false";
process.env.ALLOW_PRIVATE_NETWORK_FETCH = "false";

// Fail closed if any HTTP path tries to escape the one existing upstream loopback stub.
const originalFetch = globalThis.fetch;
globalThis.fetch = ((input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  assert.equal(url.origin, provider.url, "external HTTP is forbidden during this smoke");
  return originalFetch(input, init);
}) as typeof fetch;

// Load config only after the mock environment and fail-closed HTTP guard are ready.
const { closeDb, sql } = await import("@aihot/backend/db");
const { upsertMaterial } = await import("@aihot/backend/content/materials");
const { processArticle } = await import("@aihot/backend/jobs/content");
const { stopBoss } = await import("@aihot/backend/jobs/queue");
const { registerIngest } = await import("../apps/api/src/routes/ingest.ts");
const { registerV1 } = await import("../apps/api/src/routes/v1.ts");

const app = Fastify();
registerIngest(app);
registerV1(app);
after(async () => {
  await app.close();
  await stopBoss();
  await provider.close();
  globalThis.fetch = originalFetch;
  await closeDb();
});

test("PostgreSQL 17: migrated empty DB → ingest → mock processing → public readback → identical replay", { timeout: 30_000 }, async () => {
  const [runtime] = await sql`SELECT current_setting('server_version') AS version, current_setting('server_version_num')::int AS version_num, current_database() AS db`;
  assert.equal(Math.floor(runtime!.version_num / 10000), 17);
  assert.match(runtime!.db, /_(test|ci)$/);
  const migrations = readdirSync(new URL("../database/migrations/", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();
  assert.deepEqual((await sql`SELECT name FROM schema_migrations ORDER BY name`).map((row) => row.name), migrations);
  assert.equal((await sql`SELECT count(*) AS n FROM articles`)[0]!.n, 0, "use a fresh database, not a company/test corpus");
  const sourceId = `mathtech-runtime-${tag()}`;
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, first_party, next_fetch_at)
    VALUES (${sourceId}, 'SYNTHETIC MathTech runtime source', 'external', 'T1', 'editorial', false, '2100-01-01')`;
  const fixture = { sourceId, items: [{ title: "Marker SYNTHETIC runtime fixture", url: `https://example.org/${sourceId}`,
    publishedAt: new Date().toISOString(), raw: { synthetic: true } }] };
  const push = () => app.inject({ method: "POST", url: "/api/ingest/items",
    headers: { authorization: `Bearer ${process.env.INGEST_TOKEN}` }, payload: fixture });
  const first = await push();
  assert.equal(first.statusCode, 200, first.body);
  assert.deepEqual(first.json(), { ok: true, created: 1 });
  const [article] = await sql`SELECT id FROM articles WHERE source_id = ${sourceId}`;
  assert.ok(article?.id);
  const id = String(article.id);

  // ingest/items accepts metadata, not body text. Reuse the upstream test pattern for the
  // collector/extraction handoff via upsertMaterial; do not fetch a public page or forge an analysis.
  const hydrated = await upsertMaterial({ sourceId, url: fixture.items[0]!.url, title: fixture.items[0]!.title,
    publishedAt: new Date(fixture.items[0]!.publishedAt), language: "en", via: "fetch", bodyStatus: "ok",
    bodyText: "SYNTHETIC Marker document OCR fixture with Datalab attribution. ".repeat(12) });
  assert.equal(hydrated.articleId, id);
  assert.equal(hydrated.created, false);
  assert.equal(hydrated.revised, true);
  assert.deepEqual(await processArticle(id), { state: "pass" });
  assert.deepEqual([...calls].sort(), ["prefilter", "score", "score", "structure", "understand"]);
  const snapshot = async () => ({
    article: { ...(await sql`SELECT id, revision, content_hash, processing_state FROM articles WHERE id = ${id}`)[0] },
    analyses: (await sql`SELECT id, input_revision, relevance, selected, score, category, receipt_ids, output FROM analyses WHERE article_id = ${id} ORDER BY id`).map((r) => ({ ...r })),
    receipts: (await sql`SELECT id, status, purpose FROM receipts WHERE subject = ${`article:${id}@${(await sql`SELECT revision FROM articles WHERE id = ${id}`)[0]!.revision}`} ORDER BY id`).map((r) => ({ ...r })),
    publication: { ...(await sql`SELECT article_id, analysis_id, revision, title, summary, category, score, selected, eligible, visibility, selected_ready_at, visible_after FROM publications WHERE article_id = ${id}`)[0] },
    ledger: (await sql`SELECT seq, op, payload, visible_at FROM selected_ledger WHERE article_id = ${id} ORDER BY seq`).map((r) => ({ ...r })),
    jobs: (await sql`SELECT id, name, data FROM pgboss.job WHERE data->>'articleId' = ${id} ORDER BY id`).map((r) => ({ ...r })),
  });
  const saved = await snapshot();
  assert.equal(saved.analyses.length, 1);
  assert.deepEqual([saved.analyses[0]!.relevance, saved.analyses[0]!.selected, saved.analyses[0]!.score, saved.analyses[0]!.category], ["pass", true, 80, "OCR"]);
  assert.equal(saved.receipts.length, 5);
  assert.ok(saved.receipts.every((r) => r.status === "completed"));
  assert.equal(saved.publication.visibility, "public");
  assert.equal(saved.publication.eligible, true);
  assert.equal(saved.ledger.length, 1);

  // Respect the existing 180-second release gate. Advance only the reader's test clock;
  // do not mutate release state, sleep, call grouping models, or bypass publication rules.
  const { v1Items } = await import("@aihot/backend/publication/v1");
  const query = { mode: "selected" as const, window: "24h" as const, by: "timeline" as const,
    category: null, q: null, limit: 10, cursor: null };
  const immediate = await app.inject({ method: "GET", url: "/api/v1/items?mode=selected" });
  assert.equal(immediate.statusCode, 200, immediate.body);
  assert.equal(immediate.json().items.length, 0, "release gate remains effective");
  const afterRelease = new Date(saved.publication.visible_after.getTime() + 1);
  const readback = await v1Items(query, afterRelease);
  assert.equal(readback.items.length, 1);
  assert.equal(readback.items[0]!.id, id);
  assert.equal(readback.items[0]!.title, saved.publication.title);

  // Exactly one replay through the real entrance. Unchanged material must NOT enqueue another
  // evaluation. Explicitly calling processArticle again would be a different contract: upstream
  // reuses model receipts but appends an analysis audit row, so strict row identity is not promised.
  const repeated = await push();
  assert.deepEqual(repeated.json(), { ok: true, created: 0 });
  assert.equal(repeated.statusCode, 200);
  assert.equal(provider.hits(), 5, "duplicate ingest produces no additional model request");
  assert.equal((await sql`SELECT count(*) AS n FROM articles WHERE source_id = ${sourceId}`)[0]!.n, 1);
  assert.deepEqual(await snapshot(), saved, "no new revision, analysis, receipt, publication change, selected-ledger entry or job");
  assert.deepEqual(await v1Items(query, afterRelease), readback);
  console.log(JSON.stringify({ POSTGRES_VERSION: runtime!.version, APP_DB_ACCESS: "PASS", MIGRATION_BOOTSTRAP: "PASS",
    MOCK_PIPELINE_SMOKE: "PASS", PERSISTENCE_READBACK: "PASS", DEDUP_CHECK: "PASS", IDEMPOTENCY_CHECK: "PASS",
    migrations: migrations.length, articleId: id, revision: saved.article.revision, analyses: saved.analyses.length,
    completedMockReceipts: saved.receipts.length, mockHttpCalls: provider.hits(), publications: 1, selectedLedgerEntries: saved.ledger.length,
    PAID_API_CALLS: 0, PRIVATE_DATA_USED: false }));
});
