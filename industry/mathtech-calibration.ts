// SelectBench's optional MathTech projection. No second model runner or score calculation.
import { DECISIONS, type Decision } from "./mathtech-policy.ts";
import { canonical, digest, researchDecision } from "./mathtech-evidence.ts";

export const goldIdentity = (row: any) => ({ articleId: `gold-${row.caseId}`, inputRevision: 1, contentHash: digest(canonical({ material: row.material, sourceFacts: row.sourceFacts })) });
export function validateMathtechGold(rows: any[], review: any, regression: boolean) {
  if (!rows.length || new Set(rows.map(r => r.caseId)).size !== rows.length) throw new Error("MathTech gold requires nonempty unique case IDs");
  for (const r of rows) {
    const g = r.mathtech?.expected;
    if (!r.material || !r.sourceFacts || !["select", "reject", "either"].includes(r.gold?.decision) || !g || !DECISIONS.includes(g.decision)
      || typeof g.newRelease !== "boolean" || typeof g.releaseChannel !== "string" || typeof g.complianceGate !== "boolean"
      || !(g.invalidatedBoundary === null || typeof g.invalidatedBoundary === "string")) throw new Error("MathTech gold requires independent four-way and safety labels");
  }
  if (regression) return { kind: "SYNTHETIC_REGRESSION", calibrationRuntime: "NOT_CALIBRATION", datasetHash: digest(canonical(rows)) };
  const a = review?.goldApproval;
  if (!a || a.method !== "human-labelled-public-corpus" || !a.reviewer?.trim() || !Number.isFinite(Date.parse(a.reviewedAt))
    || a.datasetHash !== digest(canonical(rows)) || rows.some(r => /synthetic|made.up/i.test(canonical(r.material)))) throw new Error("EXTERNAL_BLOCKED: exact public corpus needs independent human labels and approval; synthetic fixtures are regression only");
  return { kind: "HUMAN_LABELLED_PUBLIC_CORPUS", calibrationRuntime: "MEASURED_NOT_ACCEPTED", datasetHash: a.datasetHash };
}
export function mathtechCase(row: any, out: { selected: boolean; relevance: string } | null, bundle: any, review: any, regression: boolean) {
  return researchDecision(goldIdentity(row), bundle?.cases?.[row.caseId], review, out, regression);
}
export function mathtechMetrics(cases: Array<{ row: any; output: ReturnType<typeof researchDecision>; error: string | null }>) {
  const confusion = Object.fromEntries(DECISIONS.map(g => [g, Object.fromEntries(DECISIONS.map(p => [p, 0]))])) as Record<Decision, Record<Decision, number>>;
  let dateVersionMistakes = 0, prereleaseMistakes = 0, scopeOverclaim = 0, unnecessaryRegressionTrigger = 0, evidenceGateViolations = 0;
  for (const { row, output: o, error } of cases) {
    if (error) continue;
    const g = row.mathtech.expected;
    confusion[g.decision as Decision][o.decision]++;
    if (o.newRelease !== g.newRelease || g.version !== undefined && o.version !== g.version) dateVersionMistakes++;
    if (o.releaseChannel !== g.releaseChannel) prereleaseMistakes++;
    if (o.decision === "EXPERIMENT" && (!o.evidenceVerified || o.unsupportedClaims.length || g.decision === "NEEDS_EVIDENCE")) evidenceGateViolations++;
    if (g.unsupportedClaims?.some((id: string) => o.supportedClaims.includes(id))) scopeOverclaim++;
    if (o.fullRevalidation || o.invalidatedBoundary !== g.invalidatedBoundary || o.complianceGate && !g.complianceGate) unnecessaryRegressionTrigger++;
  }
  const ratio = (a: number, b: number) => b ? a / b : null;
  const perClass = Object.fromEntries(DECISIONS.map(label => {
    const tp = confusion[label][label], fp = DECISIONS.reduce((n, g) => n + (g === label ? 0 : confusion[g][label]), 0);
    const fn = DECISIONS.reduce((n, p) => n + (p === label ? 0 : confusion[label][p]), 0);
    return [label, { tp, fp, fn, precision: ratio(tp, tp + fp), recall: ratio(tp, tp + fn) }];
  }));
  return { n: cases.length, errors: cases.filter(c => c.error).length, confusion, perClass,
    precision: perClass.EXPERIMENT!.precision, recall: perClass.EXPERIMENT!.recall,
    falsePositives: perClass.EXPERIMENT!.fp, falseNegatives: perClass.EXPERIMENT!.fn,
    evidenceGateViolations, dateVersionMistakes, prereleaseMistakes, scopeOverclaim, unnecessaryRegressionTrigger };
}
