// Research-output boundary only. Source/model payloads cannot approve their own evidence.
import { createHash } from "node:crypto";
import { assessEvidence, BOUNDARIES, type EvidenceCandidate, type Decision } from "./mathtech-policy.ts";

export const EVIDENCE_POLICY = "mathtech-evidence-v1";
export const digest = (text: string) => createHash("sha256").update(text).digest("hex");
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export interface ArticleIdentity { articleId: string; inputRevision: number; contentHash: string }
export interface EvidenceDocument { id: string; sourceUrl: string; text: string; contentHash: string }
export interface Citation { documentId: string; locator: string; quote: string }
export interface EvidenceEnvelope {
  policyVersion: typeof EVIDENCE_POLICY;
  identity: ArticleIdentity;
  candidate: EvidenceCandidate;
  documents: EvidenceDocument[];
  // Every non-null factual field and every claim must have an original-text locator.
  citations: Record<string, Citation[]>;
  baseline: { publicReference: string; boundaries: string[] } | null;
}
export interface EvidenceReview {
  // Operator-controlled file, never sourced from article raw/LLM output.
  policyVersion: typeof EVIDENCE_POLICY;
  approvals: Array<{ envelopeHash: string; reviewer: string; reviewedAt: string; method: "human-source-review" | "synthetic-regression" }>;
}
const object = (x: unknown): x is Record<string, any> => !!x && typeof x === "object" && !Array.isArray(x);
const text = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;
const hash = (x: unknown) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const date = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(`${x.slice(0, 10)}T00:00:00Z`).toISOString().startsWith(x.slice(0, 10));
const strings = (x: unknown): x is string[] => Array.isArray(x) && x.length > 0 && x.every(text) && new Set(x).size === x.length;
const https = (x: unknown) => { try { const u = new URL(String(x)); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } };
export function identityValid(x: unknown): x is ArticleIdentity {
  return object(x) && text(x.articleId) && Number.isSafeInteger(x.inputRevision) && x.inputRevision > 0 && hash(x.contentHash);
}
export function candidateValid(x: unknown): x is EvidenceCandidate {
  if (!object(x)) return false;
  return ["release", "benchmark", "validator_warning", "patch"].includes(x.kind)
    && ["OFFICIAL_RELEASE", "OFFICIAL_CHANGELOG", "OFFICIAL_SPEC", "ORIGINAL_PAPER", "UNVERIFIED"].includes(x.sourceAuthority)
    && ["VERIFIED", "UNVERIFIED", "CONFLICT"].includes(x.verificationState)
    && ["publicationDate", "releaseDate", "effectiveDate", "articleUpdatedDate"].every(k => x[k] === null || date(x[k]))
    && object(x.period) && date(x.period.start) && date(x.period.end) && Date.parse(x.period.start) < Date.parse(x.period.end)
    && (x.version === null || text(x.version))
    && ["stable", "pre-release", "beta", "RC", "nightly", "experimental", "unknown"].includes(x.releaseChannel)
    && [true, false, null].includes(x.relevant) && ["NEW", "KNOWN", "UNKNOWN"].includes(x.novelty)
    && ["APPLICABLE", "UNRELATED", "UNKNOWN"].includes(x.applicability)
    && (x.confidence === null || typeof x.confidence === "number" && Number.isFinite(x.confidence) && x.confidence >= 0 && x.confidence <= 1)
    && (x.invalidatedBoundary === null || (BOUNDARIES as readonly string[]).includes(x.invalidatedBoundary))
    && (x.experimentPlan === null || text(x.experimentPlan)) && typeof x.existingComplianceContract === "boolean"
    && Array.isArray(x.claims) && x.claims.length > 0 && new Set(x.claims.map((c: any) => c?.id)).size === x.claims.length
    && x.claims.every((c: any) => object(c) && text(c.id) && strings(c.scope) && strings(c.evidenceScope) && typeof c.evidenceVerified === "boolean");
}
export function executeEvidence(identity: unknown, envelope: unknown, review: unknown, regression = false) {
  const fail = (reason: string) => ({ policyVersion: EVIDENCE_POLICY, decision: "NEEDS_EVIDENCE" as Decision, reason,
    newRelease: false, releaseChannel: "unknown", version: null as string | null, publicationDate: null as string | null,
    releaseDate: null as string | null, supportedClaims: [] as string[], unsupportedClaims: [] as string[],
    complianceGate: false, invalidatedBoundary: null as string | null, fullRevalidation: false as const, evidenceVerified: false });
  if (!identityValid(identity) || !object(envelope) || envelope.policyVersion !== EVIDENCE_POLICY || !identityValid(envelope.identity)
    || canonical(identity) !== canonical(envelope.identity)) return fail("missing or stale article/revision/content binding");
  if (!candidateValid(envelope.candidate)) return fail("invalid or missing typed evidence metadata");
  const c = envelope.candidate;
  if (!object(review) || review.policyVersion !== EVIDENCE_POLICY || !Array.isArray(review.approvals)
    || !review.approvals.some((a: any) => object(a) && a.envelopeHash === digest(canonical(envelope)) && text(a.reviewer) && date(a.reviewedAt)
      && (a.method === "human-source-review" || regression && a.method === "synthetic-regression"))) return fail("no independent approval of these exact evidence bytes");
  if (!Array.isArray(envelope.documents) || !envelope.documents.length || !object(envelope.citations)) return fail("missing original evidence documents or locators");
  const docs = new Map<string, EvidenceDocument>();
  for (const d of envelope.documents) {
    if (!object(d) || !text(d.id) || docs.has(d.id) || !https(d.sourceUrl) || !text(d.text) || digest(d.text) !== d.contentHash) return fail("invalid evidence document or changed content hash");
    docs.set(d.id, d as EvidenceDocument);
  }
  const required = ["sourceAuthority", "publicationDate", "relevant", "novelty", "applicability", "verificationState", ...c.claims.map(claim => `claim:${claim.id}`)];
  for (const key of ["releaseDate", "effectiveDate", "articleUpdatedDate", "version", "invalidatedBoundary", "experimentPlan"] as const) if (c[key] !== null) required.push(key);
  if (c.kind === "release" || c.kind === "patch") required.push("releaseChannel");
  if (c.existingComplianceContract) required.push("existingComplianceContract");
  for (const key of required) {
    const refs = envelope.citations[key];
    if (!Array.isArray(refs) || !refs.length || refs.some((r: any) => !object(r) || !text(r.locator) || !text(r.quote) || !docs.get(r.documentId)?.text.includes(r.quote))) return fail(`missing or changed source locator: ${key}`);
  }
  if (!date(c.publicationDate) || c.sourceAuthority === "UNVERIFIED" || c.verificationState !== "VERIFIED") return fail("publication date or verified authority is missing");
  if (c.releaseChannel === "stable" && c.version && /(?:^|[.\-+\d])(alpha|beta|rc|pre|dev|nightly|experimental)/i.test(c.version)) return fail("version and stable channel conflict");
  if (c.applicability === "UNKNOWN" || c.novelty === "UNKNOWN") return fail("baseline-relative applicability or novelty is unknown");
  if (c.applicability === "APPLICABLE" || c.invalidatedBoundary !== null || c.existingComplianceContract) {
    const b = envelope.baseline;
    if (!object(b) || !https(b.publicReference) || !strings(b.boundaries) || b.boundaries.some((x: string) => !(BOUNDARIES as readonly string[]).includes(x))
      || c.invalidatedBoundary && !b.boundaries.includes(c.invalidatedBoundary)) return fail("missing public baseline and affected boundary evidence");
  }
  const result = assessEvidence(c);
  return { ...result, policyVersion: EVIDENCE_POLICY, version: c.version, publicationDate: c.publicationDate, releaseDate: c.releaseDate,
    newRelease: result.decision !== "NEEDS_EVIDENCE" && result.newRelease, evidenceVerified: result.decision !== "NEEDS_EVIDENCE" };
}
export function researchDecision(identity: unknown, envelope: unknown, review: unknown, selection: { selected: boolean; relevance: string } | null, regression = false) {
  const gate = executeEvidence(identity, envelope, review, regression);
  if (gate.decision === "NEEDS_EVIDENCE" || gate.decision === "IGNORE") return gate;
  if (!selection || typeof selection.selected !== "boolean" || !["pass", "block"].includes(selection.relevance)) return { ...gate, decision: "NEEDS_EVIDENCE" as Decision, reason: "selection result unavailable", invalidatedBoundary: null, complianceGate: false };
  if (selection.relevance === "block") return { ...gate, decision: "IGNORE" as Decision, reason: "production prefilter rejected material", invalidatedBoundary: null };
  if (!selection.selected && gate.decision === "EXPERIMENT") return { ...gate, decision: "OBSERVE" as Decision, reason: "evidence permits an experiment but selection threshold was not met", invalidatedBoundary: null };
  return gate;
}
