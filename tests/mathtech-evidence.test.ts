import assert from "node:assert/strict";
import { test } from "node:test";
import { executeEvidence, researchDecision } from "../industry/mathtech-evidence.ts";
import { goldIdentity, mathtechMetrics, validateMathtechGold } from "../industry/mathtech-calibration.ts";
import { fixtures, reviewedFixture, approve } from "./mathtech-fixture-helper.ts";
const rows = fixtures();
for (const row of rows) test(`adapter ${row.caseId}: existing synthetic regression`, () => {
  const { envelope, review } = reviewedFixture(row);
  const out = researchDecision(goldIdentity(row), envelope, review, { selected: true, relevance: "pass" }, true);
  for (const [key, value] of Object.entries(row.mathtech.expected)) assert.deepEqual(out[key as keyof typeof out], value);
  assert.equal(out.fullRevalidation, false);
});
test("unreviewed, self-approved and synthetic evidence cannot authorize live research output", () => {
  const row = rows[5], { envelope, review } = reviewedFixture(row);
  for (const r of [null, {}, review]) assert.equal(executeEvidence(goldIdentity(row), envelope, r).decision, "NEEDS_EVIDENCE");
});
test("changed article revision, evidence bytes, metadata or review hash invalidate only this envelope", () => {
  const row = rows[5], { envelope, review } = reviewedFixture(row);
  for (const change of [{ inputRevision: 2 }, { contentHash: "0".repeat(64) }, { articleId: "other" }]) assert.equal(executeEvidence({ ...goldIdentity(row), ...change }, envelope, review, true).decision, "NEEDS_EVIDENCE");
  for (const mutate of [(e: any) => { e.candidate.releaseDate = "2026-10-04T00:00:00Z"; }, (e: any) => { e.documents[0].text += "altered"; }]) {
    const e = structuredClone(envelope); mutate(e);
    assert.equal(executeEvidence(goldIdentity(row), e, review, true).decision, "NEEDS_EVIDENCE");
  }
});
test("approved but malformed evidence fails closed without throwing or inventing dates", () => {
  const row = rows[5], { envelope } = reviewedFixture(row);
  for (const patch of [{ claims: null }, { kind: "invented" }, { relevant: "yes" }, { publicationDate: null }, { releaseDate: "2026-02-30T00:00:00Z" }, { version: null }, { releaseChannel: "unknown" }, { verificationState: "CONFLICT" }, { applicability: "UNKNOWN" }, { novelty: "UNKNOWN" }]) {
    const e = { ...envelope, candidate: { ...envelope.candidate, ...patch } };
    assert.equal(executeEvidence(goldIdentity(row), e, approve(e), true).decision, "NEEDS_EVIDENCE");
  }
});
test("a stable label cannot conceal an RC version", () => {
  const row = rows[2], { envelope } = reviewedFixture(row);
  envelope.candidate.releaseChannel = "stable";
  assert.equal(executeEvidence(goldIdentity(row), envelope, approve(envelope), true).decision, "NEEDS_EVIDENCE");
});
test("citations and public baseline are enforced even with an approval", () => {
  const row = rows[5], { envelope } = reviewedFixture(row);
  for (const mutate of [(e: any) => { delete e.citations.sourceAuthority; }, (e: any) => { e.citations.version[0].quote = "not in source"; }, (e: any) => { e.baseline = null; }, (e: any) => { e.baseline.boundaries = ["runtime"]; }]) {
    const e = structuredClone(envelope); mutate(e);
    assert.equal(executeEvidence(goldIdentity(row), e, approve(e), true).decision, "NEEDS_EVIDENCE");
  }
});
test("research exit is mutually exclusive and cannot elevate missing evidence using a score", () => {
  const row = rows[5], { envelope, review } = reviewedFixture(row);
  assert.equal(researchDecision(goldIdentity(row), null, review, { selected: true, relevance: "pass" }, true).decision, "NEEDS_EVIDENCE");
  assert.equal(researchDecision(goldIdentity(row), envelope, review, { selected: false, relevance: "pass" }, true).decision, "OBSERVE");
  assert.equal(researchDecision(goldIdentity(row), envelope, review, { selected: false, relevance: "block" }, true).decision, "IGNORE");
  assert.equal(researchDecision(goldIdentity(row), envelope, review, null, true).decision, "NEEDS_EVIDENCE");
});
test("gold provenance rejects self-labelled fixtures and duplicate cases", () => {
  assert.throws(() => validateMathtechGold(rows, {}, false), /EXTERNAL_BLOCKED/);
  assert.equal(validateMathtechGold(rows, {}, true).calibrationRuntime, "NOT_CALIBRATION");
  assert.throws(() => validateMathtechGold([rows[0], rows[0]], {}, true), /unique/);
});
test("four-way metric arithmetic includes FP/FN and no-denominator values are unavailable", () => {
  const row = rows[5], { envelope, review } = reviewedFixture(row);
  const output = researchDecision(goldIdentity(row), envelope, review, { selected: true, relevance: "pass" }, true);
  const m = mathtechMetrics([{ row, output: { ...output, decision: "OBSERVE" }, error: null }, { row: { ...row, mathtech: { expected: { ...row.mathtech.expected, decision: "OBSERVE" } } }, output, error: null }]);
  assert.deepEqual([m.falsePositives, m.falseNegatives, m.precision, m.recall], [1, 1, 0, 0]);
  assert.equal(mathtechMetrics([]).precision, null);
});
