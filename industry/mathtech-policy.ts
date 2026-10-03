// Offline evidence guard for the candidate layer. Not wired into worker/publication;
// does not replace upstream SelectBench scoring, call a model or read a company baseline.
export const DECISIONS = ["EXPERIMENT", "OBSERVE", "IGNORE", "NEEDS_EVIDENCE"] as const;
export type Decision = (typeof DECISIONS)[number];
export type ReleaseChannel = "stable" | "pre-release" | "beta" | "RC" | "nightly" | "experimental" | "unknown";
export const BOUNDARIES = ["provider", "contract", "schema", "runtime", "backend", "output_semantics", "accepted_qa_boundary"] as const;
export type Boundary = (typeof BOUNDARIES)[number];
export interface EvidenceCandidate {
  kind: "release" | "benchmark" | "validator_warning" | "patch";
  sourceAuthority: "OFFICIAL_RELEASE" | "OFFICIAL_CHANGELOG" | "OFFICIAL_SPEC" | "ORIGINAL_PAPER" | "UNVERIFIED";
  verificationState: "VERIFIED" | "UNVERIFIED" | "CONFLICT";
  publicationDate: string | null;
  releaseDate: string | null;
  effectiveDate: string | null;
  articleUpdatedDate: string | null;
  period: { start: string; end: string }; // half-open, explicit; never use the wall clock
  version: string | null;
  releaseChannel: ReleaseChannel;
  relevant: boolean | null;
  novelty: "NEW" | "KNOWN" | "UNKNOWN";
  applicability: "APPLICABLE" | "UNRELATED" | "UNKNOWN";
  claims: Array<{ id: string; scope: string[]; evidenceScope: string[]; evidenceVerified: boolean }>;
  confidence: number | null; // evidence annotation, never proof of applicability or downstream quality
  invalidatedBoundary: Boundary | null;
  experimentPlan: string | null;
  existingComplianceContract: boolean;
}
const LABELS: Record<Decision, string> = { EXPERIMENT: "值得试验", OBSERVE: "仅观察", IGNORE: "可忽略", NEEDS_EVIDENCE: "证据不足" };
const validDate = (value: string | null) => value !== null && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().startsWith(value.slice(0, 10));
export function assessEvidence(c: EvidenceCandidate) {
  const unsupportedClaims = c.claims.filter((claim) => !claim.evidenceVerified || !claim.scope.length || claim.scope.some((scope) => !claim.evidenceScope.includes(scope))).map((claim) => claim.id);
  const supportedClaims = c.claims.filter((claim) => !unsupportedClaims.includes(claim.id)).map((claim) => claim.id);
  const release = c.kind === "release" || c.kind === "patch";
  const eventDate = release ? c.releaseDate : c.publicationDate;
  const periodValid = validDate(c.period.start) && validDate(c.period.end) && Date.parse(c.period.start) < Date.parse(c.period.end);
  const datesValid = [c.publicationDate, c.releaseDate, c.effectiveDate, c.articleUpdatedDate].every((date) => date === null || validDate(date));
  const inPeriod = periodValid && validDate(eventDate) && Date.parse(eventDate!) >= Date.parse(c.period.start) && Date.parse(eventDate!) < Date.parse(c.period.end);
  const newRelease = release && inPeriod && c.novelty === "NEW";
  const result = (decision: Decision, reason: string) => ({
    decision, label: LABELS[decision], reason, newRelease,
    releaseChannel: c.releaseChannel, supportedClaims, unsupportedClaims,
    // A warning alone cannot create a gate; explicit applicability and existing contract are required.
    complianceGate: c.kind === "validator_warning" && c.existingComplianceContract && c.applicability === "APPLICABLE" && decision !== "NEEDS_EVIDENCE",
    invalidatedBoundary: decision === "EXPERIMENT" ? c.invalidatedBoundary : null,
    fullRevalidation: false as const,
  });
  if (!periodValid || !datesValid || !["stable", "pre-release", "beta", "RC", "nightly", "experimental", "unknown"].includes(c.releaseChannel) || (c.confidence !== null && (!Number.isFinite(c.confidence) || c.confidence < 0 || c.confidence > 1))) return result("NEEDS_EVIDENCE", "invalid candidate metadata");
  if (c.relevant === false) return result("IGNORE", "no reasonable document-production impact");
  if (c.relevant === null || c.verificationState !== "VERIFIED" || !["OFFICIAL_RELEASE", "OFFICIAL_CHANGELOG", "OFFICIAL_SPEC", "ORIGINAL_PAPER"].includes(c.sourceAuthority) || !c.claims.length || unsupportedClaims.length || !validDate(eventDate)) return result("NEEDS_EVIDENCE", "missing authority, event date or claim-scoped evidence");
  if (release && (!c.version?.trim() || c.releaseChannel === "unknown")) return result("NEEDS_EVIDENCE", "version or release channel is unverified");
  if (c.novelty === "UNKNOWN") return result("NEEDS_EVIDENCE", "baseline-relative novelty unknown");
  if (!inPeriod || c.novelty === "KNOWN") return result("OBSERVE", "historical or already-known event, not a new release this period");
  if (c.applicability === "UNKNOWN") return result("NEEDS_EVIDENCE", "actual task applicability unknown");
  if (c.applicability === "UNRELATED") return result("OBSERVE", "related project, no current subsystem invalidation");
  if (c.kind === "validator_warning" && !c.existingComplianceContract) return result("OBSERVE", "warning does not establish a release gate");
  if (c.invalidatedBoundary !== null && !(BOUNDARIES as readonly string[]).includes(c.invalidatedBoundary)) return result("NEEDS_EVIDENCE", "invalidated boundary not in the accepted candidate vocabulary");
  if (!c.experimentPlan?.trim()) return result("OBSERVE", "no bounded experiment plan");
  return result("EXPERIMENT", "verified new information with an applicable bounded experiment");
}
