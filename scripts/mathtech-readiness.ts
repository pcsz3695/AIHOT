import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { shadowReadiness } from "../industry/mathtech-readiness.ts";
const { values } = parseArgs({ options: { input: { type: "string" }, output: { type: "string" } } });
if (!values.input || !values.output) throw new Error("Require --input and --output");
const result = shadowReadiness(JSON.parse(readFileSync(values.input, "utf8")));
writeFileSync(values.output, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
if (!result.SHADOW_RUN_READY) process.exitCode = 2;
