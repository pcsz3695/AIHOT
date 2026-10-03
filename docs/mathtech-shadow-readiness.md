# MathTech Intel v0 — B2/B3 closure and shadow readiness

## Current decision
STATUS=EXTERNAL_BLOCKED. B2 is executable and tested. The existing SelectBench framework now supports the four research outcomes, evidence diagnostics, bounded model calls, receipt reuse and readiness evidence. Real calibration has **not** run; SHADOW_RUN_READY=false.

Start: `067e8765b704a1d0af864f1b54b048e204477340`.
Validated code checkpoint: `bdd2adfcb8e5390f0d32e1dd5c3b7be2e358f567` (CI result recorded in `mathtech-checkpoint.json`).
Branch: `prototype/mathtech-intel-v0`, repository: `pcsz3695/AIHOT`.
Documentation-only descendants retain this code checkpoint. Resolve the current branch tip with `git rev-parse HEAD`.

## Frozen evidence reused
B1 PostgreSQL 17.11, empty DB initialization, 38 migrations, app access, mock pipeline, readback, dedup and idempotency remain PASS from [B1 Actions](https://github.com/pcsz3695/AIHOT/actions/runs/37101179066). B1 was not rerun.
The prior 46 targeted cases, static audit, full typecheck and web build remain valid; none was rerun. The six official-source configurations and 2026-10-02 authority/feed records were unchanged and carried forward; no new claim of live feed freshness is made.

## B2 — executable evidence boundary
`industry/mathtech-evidence.ts` validates unknown input, article ID/revision/content hash, typed candidate metadata, source-document hashes, original-text quotes/locators and an independent operator review of the exact envelope hash. Metadata cannot approve itself through an article's raw JSON, model tags or confidence.

Missing authority, date, version/channel, applicability, verification or source references yields NEEDS_EVIDENCE. Dates keep publication/release/effective/update separate. A version containing RC/beta/nightly markers cannot be called stable. Unsupported scopes cannot authorize an experiment. A warning cannot invent a compliance contract. An affected boundary requires an explicit public baseline; fullRevalidation is always false.

Only the dedicated research output uses these guarantees:
- `scripts/export-mathtech-decision.ts` reads current article/revision and matching analysis from the existing DB and applies the evidence gate.
- `scripts/mathtech-decision.ts` handles an already trusted local export with the same gate.
- SelectBench's optional MathTech mode applies the same adapter to existing production prefilter/score results.

The upstream public website, RSS, worker and model prose are unchanged and **must not be used as gated research decisions**. No worker, scheduler or company integration is enabled. This is a deliberate adapter boundary, not a claim that every upstream publication route now enforces evidence.

The trust file is controlled by the operator. `human-source-review` attests factual interpretation of exact source bytes; hash/quote checks verify integrity, not truth. `synthetic-regression` approvals are accepted only by the explicit loopback regression mode, never the live decision exporters. Six existing fixtures were reused unchanged; new mutation tests cover previously absent adapter, provenance, cache and budget boundaries.

## B3 — existing framework, no second evaluator
`scripts/eval-selection.ts` still runs the original prefilter, double score, source-tier thresholds, receipts and SelectBench import. Optional `--mathtech-evidence` / `--mathtech-review` attach the four-way projection and metrics. Binary selection metrics remain in the report; four-way metrics are under `summary.mathtech`. SelectBench stores the four-way case decision using its existing text columns and the additional metrics in existing JSONB. No migration is needed.

Report fields include confusion matrix, each class's precision/recall/FP/FN, experiment precision/recall, error count, evidence-gate violations, date/version errors, channel errors, unsupported-scope promotion and unnecessary regression triggers. Undefined denominators are null. These assess the structured decision output; they do not claim to evaluate free-form model prose.

Real calibration requires an independent human approval bound to the exact public gold corpus. Synthetic fixtures and model-generated self-labels are rejected as live calibration. The corpus follows existing GoldRow fields plus `mathtech.expected`; the evidence bundle maps caseId to envelopes. `goldIdentity(row)` specifies the content binding. No real human corpus was found in the repository or project data; both example datasets and the six MathTech rows are synthetic.

The existing selection contract calls for human samples and development/holdout separation. The readiness checker requires at least 100 corpus rows (the lower end of the existing 100–200 guidance), measured holdout coverage and independently approved per-class minimum precision, recall and support. No acceptance targets or model accuracy were invented. Small paid batches are exploratory until the approved holdout support is met.

## Cost and repeat behavior
MathTech mode is restricted to one existing OpenAI-compatible `default` route, concurrency 1, at most 8 cases per invocation, 24 HTTP requests per invocation and a cumulative 24/day receipt budget (minute/hour ceilings also 24; stricter existing limits are preserved). Requests are capped at 100,000 characters and at most 2,048 output tokens, including alternate token-limit fields. This is a request/token ceiling, **not a guaranteed currency ceiling**; provider pricing must be known before paid execution.

Only the configured HTTPS provider origin/path is permitted; redirects are rejected. Regression permits only the 127.0.0.1 stub. Any failed/uncertain send stops subsequent sends. Pending/unknown/failed llm receipts prevent a new MathTech run until operator reconciliation. No worker or `ops.recover` runs, so upstream automatic unknown-receipt release is not invoked by this path.

The new integration test observed 18 local mock requests on a cold six-case run and 0 on the cached repeat. Successful receipts and their cumulative usage remain reusable. PAID_API_CALLS=0; real model cost/token usage=0. Synthetic usage counters are test values, not real token usage.

## Readiness checks
| Check | Result |
|---|---|
| B1 PostgreSQL evidence | PASS, carried forward |
| Evidence execution adapter | PASS |
| Production selection functions via existing evaluator | PASS with loopback mocks |
| Real human-gold model calibration | EXTERNAL_BLOCKED |
| Six official source configurations | Valid unchanged snapshot; all disabled, summary-only |
| Safe defaults / private boundary | PASS; no deployment or company/private data |
| Paid-call and retry limits | Implemented and regression-tested |
| Four output classes | Executable; 6 regressions plus IGNORE boundary test |
| SHADOW_RUN_READY | false, fail closed |

## External inputs still required
1. One OpenAI-compatible provider: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`. No project credential file or corresponding process environment was configured. Do not paste secrets into reports or Git.
2. Public human-labelled development/holdout gold, source evidence reviews and public applicability context. The six synthetic rows cannot supply this.
3. An operator-approved quantitative acceptance record for the measured holdout report. Current repository guidance has no approved precision/recall/support numbers.

These are evidence/authorization inputs, not code defects. B2 remains PASS.

## Resume without revalidation
Keep all sources and external switches off while preparing calibration. In an isolated *_shadow database with retained receipts, supply one provider through a local untracked environment file, set prefilter and score to default, and invoke the existing evaluator in small batches:

    node --env-file=.data/mathtech-calibration.env scripts/eval-selection.ts --gold .data/mathtech-human-gold.jsonl --split development --models default --concurrency 1 --n 8 --mathtech-evidence .data/mathtech-evidence.json --mathtech-review .data/mathtech-review.json

Use holdout only after development choices are fixed; retain reports, corpus identity, prompts, thresholds and receipts. Do not repeatedly score unchanged successful inputs. Approve targets and coverage independently, then run `scripts/mathtech-readiness.ts` with the measured `summary.mathtech`, current prompt/selection identities and its acceptance hash. The checker never automatically turns model metrics into human acceptance.

After readiness actually passes, the shortest shadow plan is a bounded offline batch of public materials → existing selection → evidence adapter → local research JSON, with no scheduler, public publication, company integration or automatic recovery. Enable source collection only after a current endpoint/metadata check and a bounded acquisition plan. No shadow run or production deployment was started here.

## Change scope
CORE_MODIFIED=false (no apps/, packages/, schema or migration modifications).
DB_SCHEMA_CHANGED=false. MIGRATION_ADDED=false.
New industry adapter modules, optional evaluation-script mode, local exporters, narrow tests and CI only. Existing prompts and selection thresholds are unchanged.

Root causes closed: candidate lacked integrity/provenance enforcement; tags lacked a mandatory four-way decision exit; SelectBench had only binary projection; the isolated calibration path had no enforced small budget or unknown-outcome stop; readiness lacked a measured-and-approved holdout requirement.
