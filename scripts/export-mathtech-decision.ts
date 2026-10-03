// Read-only adapter over the existing article/revision and analysis schema.
// Use a dedicated shadow DB; no scheduler, worker, public routes or company connection.
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { researchDecision } from "../industry/mathtech-evidence.ts";
const { values } = parseArgs({ options: { article: { type: "string" }, evidence: { type: "string" }, review: { type: "string" }, output: { type: "string" } } });
if (!values.article || !values.evidence || !values.review || !values.output) throw new Error("Require --article --evidence --review --output");
if (!/_(ci|test|shadow)$/.test(new URL(process.env.DATABASE_URL ?? "postgres://invalid/invalid").pathname)) throw new Error("Use an isolated MathTech database");
const { sql, closeDb } = await import("@aihot/backend/db");
try {
  const [row] = await sql`SELECT a.id, a.revision, a.content_hash, x.selected, x.relevance
    FROM articles a LEFT JOIN LATERAL (SELECT selected,relevance FROM analyses
      WHERE article_id = a.id AND input_revision = a.revision ORDER BY id DESC LIMIT 1) x ON true WHERE a.id = ${values.article}`;
  if (!row) throw new Error("Article not found");
  const identity = { articleId: row.id, inputRevision: row.revision, contentHash: row.content_hash };
  const out = researchDecision(identity, JSON.parse(readFileSync(values.evidence, "utf8")), JSON.parse(readFileSync(values.review, "utf8")),
    typeof row.selected === "boolean" ? { selected: row.selected, relevance: row.relevance } : null);
  writeFileSync(values.output, JSON.stringify({ identity, ...out }, null, 2) + "\n");
  console.log(JSON.stringify({ decision: out.decision, output: values.output }));
} finally { await closeDb(); }
