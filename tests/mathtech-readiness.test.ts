import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shadowReadiness } from "../industry/mathtech-readiness.ts";
import { canonical, digest, EVIDENCE_POLICY } from "../industry/mathtech-evidence.ts";
import { DECISIONS } from "../industry/mathtech-policy.ts";
test("B1 and deterministic fixture success never substitute for real calibration", () => {
  const result = shadowReadiness({ b1: { status: "PASS", head: "067e8765b704a1d0af864f1b54b048e204477340" }, evidenceGate: "PASS", selectionAdapter: "PASS",
    sources: JSON.parse(readFileSync(new URL("../industry/sources.json", import.meta.url), "utf8")).sources,
    publicDeployment: false, privateDataUsed: false, workersEnabled: false, autoRecoveryEnabled: false,
    budget: { maxHttpRequests: 24, maxOutputTokens: 2048, perDay: 24 }, calibration: { kind: "SYNTHETIC_REGRESSION" } });
  assert.equal(result.SHADOW_RUN_READY, false);
  assert.deepEqual(result.blockers, ["independent human-labelled holdout calibration unavailable or stale"]);
});
test("readiness requires approved targets, adequate holdout support and unchanged prompt/selection", () => {
  // Arithmetic-only checker test, deliberately not a claim of measured model quality.
  const calibration = { kind: "HUMAN_LABELLED_PUBLIC_CORPUS", split: "holdout", errors: 0, policyVersion: EVIDENCE_POLICY,
    promptVersion: "test-prompt", selectionHash: "test-selection", datasetSize: 100, n: 8,
    perClass: Object.fromEntries(DECISIONS.map(d => [d, { tp: 2, fp: 0, fn: 0, precision: 1, recall: 1 }])),
    evidenceGateViolations: 0, dateVersionMistakes: 0, prereleaseMistakes: 0, scopeOverclaim: 0, unnecessaryRegressionTrigger: 0 };
  const input = { b1: { status: "PASS", head: "067e8765b704a1d0af864f1b54b048e204477340" }, evidenceGate: "PASS", selectionAdapter: "PASS",
    sources: JSON.parse(readFileSync(new URL("../industry/sources.json", import.meta.url), "utf8")).sources,
    publicDeployment: false, privateDataUsed: false, workersEnabled: false, autoRecoveryEnabled: false,
    budget: { maxHttpRequests: 24, maxOutputTokens: 2048, perDay: 24 }, currentPromptVersion: "test-prompt", currentSelectionHash: "test-selection", calibration,
    acceptance: { method: "human-calibration-acceptance", reviewer: "TEST ONLY", reviewedAt: "2026-10-03T00:00:00Z", reportHash: digest(canonical(calibration)),
      thresholds: Object.fromEntries(DECISIONS.map(d => [d, { minPrecision: 0.9, minRecall: 0.9, minSupport: 2 }])) } };
  assert.equal(shadowReadiness(input).SHADOW_RUN_READY, true);
  for (const patch of [{ currentPromptVersion: "changed" }, { acceptance: null }, { workersEnabled: true }, { calibration: { ...calibration, datasetSize: 6 } }]) assert.equal(shadowReadiness({ ...input, ...patch }).SHADOW_RUN_READY, false);
  const bad = { ...calibration, scopeOverclaim: 1 };
  assert.equal(shadowReadiness({ ...input, calibration: bad, acceptance: { ...input.acceptance, reportHash: digest(canonical(bad)) } }).SHADOW_RUN_READY, false);
});
