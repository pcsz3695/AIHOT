// Offline contract tests using the upstream gold-row format. No second benchmark runner,
// no setup.ts, DB, secrets, network, or assertion that a mocked answer proves model quality.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { SITE } from "@aihot/industry/site";
import { FEATURES } from "@aihot/industry/features";
import { CATEGORIES, CATEGORY_TAGS, TOPIC_TAGS } from "@aihot/industry/taxonomy";
import { assessEvidence, type EvidenceCandidate } from "@aihot/industry/mathtech-policy";
import { SELECTION } from "@aihot/industry/selection";
import { promptText, promptVersion } from "@aihot/backend/editorial/prompts";
import { normalizeTags } from "@aihot/backend/editorial/vocabulary";
import { assertSupportedConfig } from "@aihot/backend/sources/config-keys";
import { ScoreSchema, buildScoreInput, normalizeAnalysis, type AnalysisRun, type AnalyzeInputArticle } from "@aihot/backend/editorial/analyze";
const ROOT = path.resolve(import.meta.dirname, "..");
const fixtures = readFileSync(path.join(ROOT, "industry/mathtech.gold.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
for (const f of fixtures) {
  test(`${f.caseId}: ${f.material.title}`, () => {
    const result = assessEvidence(f.mathtech.candidate);
    for (const [key, value] of Object.entries(f.mathtech.expected)) assert.deepEqual(result[key as keyof typeof result], value, key);
    assert.equal(result.fullRevalidation, false);
    assert.ok(["select", "reject", "either"].includes(f.gold.decision));
    assert.equal(f.samplingContext.benchmarkSplit, "development");
    // Feed the same case through upstream score-input and selection normalization.
    // Controlled answers validate schema/threshold wiring only, not semantic LLM performance.
    const input: AnalyzeInputArticle = { id: f.caseId, revision: 1, title: f.material.title, url: "https://example.invalid/fixture", author: null, publishedAt: new Date(f.material.publishedAt), bodyStatus: "ok", bodyText: f.material.bodyOriginal, excerpt: null, media: [], xPost: null, source: { name: f.material.sourceName, kind: "rss", tier: "T1", firstParty: true } };
    assert.ok(buildScoreInput(input).includes(f.material.bodyOriginal));
    const score = ScoreSchema.parse({ attentionScore: f.gold.decision === "select" ? 80 : 20 }).attentionScore;
    const run: AnalysisRun = { prefilter: { label: "PASS", reason: "fixture", model: "mock", receiptId: 0, reused: true }, scores: { model: "mock", threshold: SELECTION.thresholds.T1!, values: [score, score], receiptIds: [], reused: true }, writing: null, structure: null };
    assert.equal(normalizeAnalysis(run).selected, f.gold.decision === "select");
  });
}
test("evidence guard fails closed when authority, channel, dates or applicability are missing", () => {
  const base = fixtures[5].mathtech.candidate as EvidenceCandidate;
  for (const change of [{ verificationState: "UNVERIFIED" }, { releaseChannel: "unknown" }, { releaseDate: null }, { applicability: "UNKNOWN" }, { novelty: "UNKNOWN" }, { confidence: NaN }, { period: { start: "bad", end: "bad" } }]) assert.equal(assessEvidence({ ...base, ...change } as EvidenceCandidate).decision, "NEEDS_EVIDENCE");
  assert.equal(assessEvidence({ ...base, relevant: false }).decision, "IGNORE");
});
test("industry identity, nine categories and decision tags fit existing contracts", () => {
  assert.equal(SITE.name, "MathTech Intel");
  assert.deepEqual(FEATURES, { leaderboard: false, codexResetMonitor: false });
  assert.equal(CATEGORIES.length, 9);
  assert.equal(new Set(CATEGORIES.map((c) => c.key)).size, 9);
  assert.equal(CATEGORIES.find((c) => c.label === "智能体工具")?.key, "tip");
  assert.deepEqual(normalizeTags(["OCR", "NEEDS_EVIDENCE", "surya"]), ["OCR", "NEEDS_EVIDENCE", "surya"]);
  const topics = JSON.parse(readFileSync(path.join(ROOT, "industry/topics.json"), "utf8"));
  const allowed = new Set<string>([...CATEGORY_TAGS, ...TOPIC_TAGS]);
  for (const topic of topics.topics) for (const tag of topic.tags) assert.ok(allowed.has(tag));
});
test("source pack is verified first-party, disabled, summary-only and supported by collectors", () => {
  const pack = JSON.parse(readFileSync(path.join(ROOT, "industry/sources.json"), "utf8"));
  const verification = JSON.parse(readFileSync(path.join(ROOT, "industry/source-verification.json"), "utf8"));
  assert.equal(pack.sources.length, 6);
  for (const s of pack.sources) {
    assertSupportedConfig(s.kind, s.config);
    assert.equal(s.tier, "T1"); assert.equal(s.first_party, true);
    assert.equal(s.enabled, false); assert.equal(s.site_fulltext, false); assert.equal(s.syndicate_fulltext, false);
    assert.ok(verification.sources.some((v: { feedUrl: string; status: number; atom: boolean }) => v.feedUrl === s.config.feedUrl && v.status === 200 && v.atom));
  }
});
test("all prompt templates expand with upstream renderer and include hashes", () => {
  const values: Record<string, string> = {};
  for (const other of readdirSync(path.join(ROOT, "industry/prompts"))) {
    for (const match of readFileSync(path.join(ROOT, "industry/prompts", other), "utf8").matchAll(/\{\{([A-Za-z][\w.-]*)\s*\}\}/g)) values[match[1]!] = match[1] === "siteName" ? SITE.name : "fixture";
  }
  for (const file of readdirSync(path.join(ROOT, "industry/prompts"))) {
    const name = file.replace(/\.md$/, "");
    // Discover the caller variables in all files, then exercise the real include renderer.
    assert.doesNotMatch(promptText(name, values), /\{\{/);
    assert.match(promptVersion(name), /@[a-f0-9]{10}$/);
  }
  for (const name of ["prefilter", "selection-score", "understand", "structure", "group-batch", "group-pair", "story-digest", "report-period", "report-daily-lead", "translate-body", "summarize-article"]) {
    const text = promptText(name, values);
    assert.ok(text.includes("Warning ≠ Gate"), name);
    assert.ok(text.includes("No Revalidation Without Invalidation"), name);
    assert.ok(text.includes("release_date"), name);
  }
});
