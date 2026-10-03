// The only supported MathTech research-decision export; never export model tags as decisions.
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { researchDecision } from "../industry/mathtech-evidence.ts";
const { values } = parseArgs({ options: { input: { type: "string" }, evidence: { type: "string" }, review: { type: "string" }, output: { type: "string" } } });
if (!values.input || !values.evidence || !values.review || !values.output) throw new Error("Require --input --evidence --review --output; use a trusted operator review file");
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const input = read(values.input);
const decision = researchDecision(input.identity, read(values.evidence), read(values.review), input.selection);
writeFileSync(values.output, JSON.stringify({ identity: input.identity, ...decision }, null, 2) + "\n");
console.log(JSON.stringify({ decision: decision.decision, output: values.output }));
