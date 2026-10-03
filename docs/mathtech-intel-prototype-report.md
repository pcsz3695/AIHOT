# MathTech Intel v0 — current prototype report

## Final decision
STATUS=EXTERNAL_BLOCKED
SHADOW_RUN_READY=false

B2 Evidence Execution Gate is implemented and regression-tested. B3 code-side calibration preparation uses the existing SelectBench evaluator and storage. Real model calibration remains unavailable because no provider credential, independently human-labelled public corpus, or approved quantitative acceptance record is present. No synthetic result is reported as model accuracy.

- Start checkpoint: `067e8765b704a1d0af864f1b54b048e204477340`.
- Validated code: `bdd2adfcb8e5390f0d32e1dd5c3b7be2e358f567`; documentation-only descendants retain this code.
- Branch: `prototype/mathtech-intel-v0` in `pcsz3695/AIHOT`.
- B1: PostgreSQL 17.11 runtime PASS, reused from [Actions run 37101179066](https://github.com/pcsz3695/AIHOT/actions/runs/37101179066).
- Prior industry/static audit/46 targeted cases/full typecheck/web build: retained; not rerun.
- CORE_MODIFIED=false; DB_SCHEMA_CHANGED=false; MIGRATION_ADDED=false.
- PAID_API_CALLS=0; MODEL_COST_OR_USAGE=0 real model usage; PRIVATE_DATA_USED=false.

## What is executable now
The evidence adapter requires exact article/revision/content binding, independently reviewed source bytes, authority/date/version/channel/scope/applicability/verification metadata and original-text locators. Missing or stale evidence produces NEEDS_EVIDENCE. EXPERIMENT / OBSERVE / IGNORE / NEEDS_EVIDENCE are mutually exclusive at the supported research output.

The live DB exporter reads current article identity and matching analysis from the existing schema; an offline exporter uses the same gate. Upstream public publication and workers remain unchanged and disabled for this research workflow. Model-generated tags alone cannot authorize research action.

The existing `scripts/eval-selection.ts` optionally projects its production prefilter and double-score result through the gate. Existing SelectBench JSONB/text columns store four-way metrics and decisions. The integration regression used 6 unchanged synthetic cases, 18 cold local mock requests and 0 new requests on a cached replay. This proves integration and reuse, not real model calibration.

The bounded evaluator permits one configured default provider, concurrency 1, at most 8 cases, at most 24 new HTTP requests per invocation and 24/day cumulative receipt attempts, and at most 2,048 output tokens per request. Uncertain outcomes stop further sends and require reconciliation before another run. No automatic recovery worker is started.

## Remaining external inputs
1. One OpenAI-compatible provider configured locally with LLM_BASE_URL / LLM_MODEL / LLM_API_KEY.
2. Independent human-labelled public development/holdout data, source reviews and public applicability context. Existing synthetic rows cannot substitute.
3. Approved per-class precision, recall and support targets bound to the measured holdout report; the existing project did not define numeric acceptance values.

PRECISION / RECALL / FALSE_POSITIVES / FALSE_NEGATIVES are NOT_MEASURED for real calibration.
Readiness remains false until those dependencies are satisfied and the checker passes.

## Evidence and continuation
See [closure and bounded resume instructions](mathtech-shadow-readiness.md) and [machine-readable checkpoint](mathtech-checkpoint.json).
The checkpoint records the exact code commits and successful selective CI runs. The final delivery receipt outside Git records the current branch tip.

No production deployment, public launch, source enablement, company integration or shadow run occurred.
