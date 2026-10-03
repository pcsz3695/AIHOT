// In-memory regression envelopes only; never human gold or real evidence attestations.
import { readFileSync } from "node:fs";
import { canonical, digest, EVIDENCE_POLICY } from "../industry/mathtech-evidence.ts";
import { goldIdentity } from "../industry/mathtech-calibration.ts";
export const fixtures = () => readFileSync(new URL("../industry/mathtech.gold.jsonl", import.meta.url), "utf8").trim().split("\n").map(l => JSON.parse(l));
export function reviewedFixture(row: any) {
  const c = structuredClone(row.mathtech.candidate);
  const text = `SYNTHETIC REGRESSION ONLY\n${row.material.bodyOriginal}\n${canonical(c)}`;
  const refs = [{ documentId: "fixture", locator: "synthetic metadata", quote: text }];
  const envelope = { policyVersion: EVIDENCE_POLICY, identity: goldIdentity(row), candidate: c,
    documents: [{ id: "fixture", sourceUrl: "https://example.org/synthetic", text, contentHash: digest(text) }],
    citations: Object.fromEntries([...Object.keys(c), ...c.claims.map((x: any) => `claim:${x.id}`)].map(k => [k, refs])),
    baseline: { publicReference: "https://example.org/synthetic-baseline", boundaries: ["output_semantics"] } };
  return { envelope, review: approve(envelope) };
}
export function approve(envelope: unknown) {
  return { policyVersion: EVIDENCE_POLICY, approvals: [{ envelopeHash: digest(canonical(envelope)), reviewer: "synthetic-test-harness", reviewedAt: "2026-10-03T00:00:00Z", method: "synthetic-regression" }] };
}
