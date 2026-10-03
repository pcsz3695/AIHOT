import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shadowReadiness } from "../industry/mathtech-readiness.ts";
test("B1 and deterministic fixture success never substitute for real calibration", () => {
  const result = shadowReadiness({ b1: { status: "PASS", head: "067e8765b704a1d0af864f1b54b048e204477340" }, evidenceGate: "PASS", selectionAdapter: "PASS",
    sources: JSON.parse(readFileSync(new URL("../industry/sources.json", import.meta.url), "utf8")).sources,
    publicDeployment: false, privateDataUsed: false, workersEnabled: false, autoRecoveryEnabled: false,
    budget: { maxHttpRequests: 24, maxOutputTokens: 2048, perDay: 24 }, calibration: { kind: "SYNTHETIC_REGRESSION" } });
  assert.equal(result.SHADOW_RUN_READY, false);
  assert.deepEqual(result.blockers, ["independent human-labelled holdout calibration unavailable or stale"]);
});
