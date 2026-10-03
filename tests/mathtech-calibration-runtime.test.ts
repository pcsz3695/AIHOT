import { stub } from "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { closeDb, sql } from "@aihot/backend/db";
import { fixtures, reviewedFixture } from "./mathtech-fixture-helper.ts";
import { EVIDENCE_POLICY } from "../industry/mathtech-evidence.ts";
const exec = promisify(execFile);
after(closeDb);
test("existing SelectBench evaluator runs gated four-way regression, imports it and reuses receipts", async () => {
  const rows = fixtures();
  const envelopes = rows.map(reviewedFixture);
  const provider = await stub((_hit, req) => {
    const system = JSON.parse(req.body).messages[0].content;
    // Deliberately selects every fixture: the gate must still suppress unsafe action.
    const content = system.includes("相关性预筛") ? { label: "PASS", reason: "synthetic transport test" } : { attentionScore: 80 };
    return { choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
  });
  const dir = mkdtempSync(path.join(tmpdir(), "mathtech-selectbench-"));
  const reports: string[] = [];
  try {
    const gold = path.join(dir, "gold.jsonl"), evidence = path.join(dir, "evidence.json"), review = path.join(dir, "review.json");
    writeFileSync(gold, rows.map(r => JSON.stringify(r)).join("\n"));
    writeFileSync(evidence, JSON.stringify({ cases: Object.fromEntries(rows.map((r, i) => [r.caseId, envelopes[i]!.envelope])) }));
    writeFileSync(review, JSON.stringify({ policyVersion: EVIDENCE_POLICY, approvals: envelopes.flatMap(e => e.review.approvals) }));
    const run = async () => {
      const { stdout } = await exec(process.execPath, ["scripts/eval-selection.ts", "--gold", gold, "--models", "default", "--concurrency", "1", "--n", "6",
        "--mathtech-evidence", evidence, "--mathtech-review", review, "--mathtech-regression", "--label", "SYNTHETIC MathTech regression, not calibration"], {
        env: { ...process.env, MODEL_CALLS_ENABLED: "true", PREFILTER_MODEL: "default", SCORE_MODEL: "default", LLM_BASE_URL: `${provider.url}/v1`, LLM_MODEL: "mathtech-test-stub", LLM_API_KEY: "synthetic-local-stub" }, timeout: 30_000,
      });
      const file = stdout.split("\n").find(l => l.startsWith("report: "))!.slice(8);
      reports.push(file);
      const report = JSON.parse(readFileSync(file, "utf8"));
      const runId = stdout.split("\n").find(l => l.startsWith("SelectBench run: "))!.slice(17);
      return { model: report.models.default, runId };
    };
    const cold = await run();
    assert.equal(cold.model.summary.mathtech.calibrationRuntime, "NOT_CALIBRATION");
    assert.equal(cold.model.summary.mathtech.acceptance, "NOT_APPROVED");
    assert.deepEqual(cold.model.cases.map((c: any) => [c.caseId, c.decision]).sort(), rows.map(r => [r.caseId, r.mathtech.expected.decision]).sort());
    assert.equal(cold.model.summary.mathtech.evidenceGateViolations, 0);
    assert.equal(cold.model.summary.mathtech.newHttpRequests, 18);
    const warm = await run();
    assert.equal(warm.model.summary.mathtech.newHttpRequests, 0);
    assert.equal(provider.hits(), 18);
    const [saved] = await sql`SELECT summary FROM selectbench_runs WHERE id = ${cold.runId}`;
    assert.equal(saved!.summary.default.mathtech.calibrationRuntime, "NOT_CALIBRATION");
    const stored = await sql`SELECT case_id,decision FROM selectbench_results WHERE run_id = ${cold.runId} ORDER BY case_id`;
    assert.deepEqual(stored.map(r => [r.case_id, r.decision]), rows.map(r => [r.caseId, r.mathtech.expected.decision]));
    console.log(JSON.stringify({ SELECTBENCH_ADAPTER_RUNTIME: "PASS", cases: rows.length, coldMockRequests: 18, warmMockRequests: 0, CALIBRATION_RUNTIME: "NOT_CALIBRATION", PAID_API_CALLS: 0 }));
  } finally {
    await provider.close();
    for (const file of reports) rmSync(file, { force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});
