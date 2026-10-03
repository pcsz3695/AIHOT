import { canonical, digest, EVIDENCE_POLICY } from "./mathtech-evidence.ts";
import { DECISIONS } from "./mathtech-policy.ts";
export function shadowReadiness(input: any) {
  const blockers: string[] = [];
  if (input.b1?.status !== "PASS" || input.b1?.head !== "067e8765b704a1d0af864f1b54b048e204477340") blockers.push("B1 checkpoint evidence missing");
  if (input.evidenceGate !== "PASS" || input.selectionAdapter !== "PASS") blockers.push("adapter runtime evidence incomplete");
  if (!input.sources || input.sources.length !== 6 || input.sources.some((s: any) => s.enabled !== false || s.site_fulltext !== false || s.syndicate_fulltext !== false || !s.first_party || s.kind !== "rss")) blockers.push("source safety configuration invalid");
  if (input.publicDeployment !== false || input.privateDataUsed !== false || input.workersEnabled !== false || input.autoRecoveryEnabled !== false) blockers.push("safe defaults/private boundary/unknown receipt policy invalid");
  if (input.budget?.maxHttpRequests !== 24 || input.budget?.maxOutputTokens !== 2048 || input.budget?.perDay !== 24) blockers.push("bounded request/receipt budget missing");
  const c = input.calibration, a = input.acceptance;
  if (!c || c.kind !== "HUMAN_LABELLED_PUBLIC_CORPUS" || c.split !== "holdout" || c.errors !== 0 || c.policyVersion !== EVIDENCE_POLICY
    || !input.currentPromptVersion || c.promptVersion !== input.currentPromptVersion || !input.currentSelectionHash || c.selectionHash !== input.currentSelectionHash
    || !Number.isInteger(c.datasetSize) || c.datasetSize < 100 || !Number.isInteger(c.n) || c.n < 1) blockers.push("independent human-labelled holdout calibration unavailable or stale");
  else if (!a || a.method !== "human-calibration-acceptance" || !a.reviewer || !Number.isFinite(Date.parse(a.reviewedAt)) || a.reportHash !== digest(canonical(c))) blockers.push("quantitative calibration acceptance is not approved");
  else {
    for (const d of DECISIONS) {
      const m = c.perClass?.[d], t = a.thresholds?.[d];
      if (!m || !t || ![m.precision, m.recall, t.minPrecision, t.minRecall].every(x => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1)
        || m.precision < t.minPrecision || m.recall < t.minRecall || !Number.isInteger(t.minSupport) || t.minSupport < 1 || m.tp + m.fn < t.minSupport) blockers.push(`calibration target/coverage unmet: ${d}`);
    }
    for (const key of ["evidenceGateViolations", "dateVersionMistakes", "prereleaseMistakes", "scopeOverclaim", "unnecessaryRegressionTrigger"]) if (c[key] !== 0) blockers.push(`safety metric failed: ${key}`);
  }
  return { STATUS: blockers.length ? "EXTERNAL_BLOCKED" : "SHADOW_RUN_READY", SHADOW_RUN_READY: blockers.length === 0, blockers };
}
