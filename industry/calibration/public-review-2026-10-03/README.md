# MathTech public human review

Start checkpoint: 9670f25273ae1441458dad3f70908a816c1252f3.
40 real public source records, 4 restored human labels, 36 unlabelled.
These files are separate from the six synthetic regression fixtures.

## One consolidated review

Edit only human_label in review.json or the accompanying workbook.
Use EXPERIMENT / OBSERVE / IGNORE / NEEDS_EVIDENCE.
The workbook's amber cells are editable. Four populated labels restore explicit prior human judgments.
Review source, date, channel, claim and proposed_context together. If a factual field is wrong, correct it in the same submission.
Do not change a label later to improve calibration scores.

The corpus includes historical sources as research inputs. Its dates are not a claim that all records are new this week.
Assess research value as of 2026-10-03. A historical method may still be useful; age alone does not determine the class.
No source establishes an invalidation of a frozen production boundary.
For MT001/MT002, the evaluation context specifically concerns old releases rementioned in the 2026-10-01 report.

## Restored human provenance

Human source: the user's explicit correction in the existing 数学数字化周报 conversation.
Only the public-source decisions below are carried forward; no private manuscript or production data is included.

- MT003: "Mathpix先保留为小样本审核排序实验候选" maps to EXPERIMENT with upload/cost and human review constraints retained.
- MT004: "最值得吸收的是手稿QA方法" plus the current user's explicit priority-experiment direction maps to EXPERIMENT, for method evaluation only.
- MT005 and MT006: "MinerU、Geoparsing先观察" maps to OBSERVE.
- Marker and Quarto historical corrections establish safety facts but not an unambiguous four-way class. Their labels remain blank.
- The earlier assistant's original recommendations are not human gold.
- The subsequent Mathpix 201p1 assistant-only recommendation is not reused as human gold.

Public dates and versions were re-fetched. GitHub published_at is a publication date, not silently substituted for a different release date in the body.
veraPDF date/version conflicts are preserved for human assessment.
Quarto's warning explanation is supporting documentation with unknown publication date; it is not a newly dated release.

## Sampling and limitations

Seven historical-source records plus 33 release records from the existing configured official sources.
The Asymptote releases API returned an empty list; no release was invented.
The other five official repositories supplied dated public records.
Release notes with sparse detail or conflicting metadata are retained.
This is a targeted, retrospective v0 corpus, not an unbiased production-accuracy sample.
Current confirmed label support: EXPERIMENT 2, OBSERVE 2, IGNORE 0, NEEDS_EVIDENCE 0.
CLASS_UNDERREPRESENTED applies to all four classes until labels are complete.
Do not force labels to hit a quota; insufficient real support leaves readiness closed.

## Controlled resume

Receive the complete reviewed pack once, freeze its hash and human reviewer/time, then convert to the existing evaluator's GoldRow and evidence-envelope formats.
The review pack itself is not an executable trusted evidence approval and is not a calibration PASS.
Keep labels and human decision provenance out of model inputs.
Reuse the existing SelectBench evaluator and successful receipts.
The supplied v0 target and thresholds supersede the previous 100-row/per-class acceptance proposal.
Existing runtime caps of 8 samples and 24 calls remain unchanged until the human-review dependency is resolved; update only the affected calibration controls on resume.
B1, B2, the 25 effective tests and six synthetic fixtures remain frozen.

First cold pass: at most 40 prefilter + 80 scoring requests = 120.
Retry allowance: floor(0.20 * 120) = 24. First-pass maximum: 144.
Calls can be lower if prefilter blocks or matching successful receipts exist.
Before a repair iteration, calculate only invalidated input/prompt/model/version keys, remaining necessary calls and retry allowance.
Never exceed 250 total HTTP attempts across the campaign, never reset the ledger between iterations, and stop on unknown receipts.
Three full cold passes would require 360 requests and are prohibited.
Maximum three iterations is a ceiling, not authorization to exceed the paid-call cap.
No digest, translation, report, embeddings or paid fetching.

The one remaining human action is completion of the 36 blank labels and confirmation of this pack's factual fields/context.
