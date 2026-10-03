import assert from "node:assert/strict";
import { test } from "node:test";
import { installMathtechTransport } from "../scripts/mathtech-budget.ts";
test("transport rejects external regression endpoints and cross-origin requests before sending", async () => {
  assert.throws(() => installMathtechTransport("https://example.org/v1", true));
  const guard = installMathtechTransport("http://127.0.0.1:1234/v1", true);
  try { await assert.rejects(fetch("https://example.org/v1/chat/completions"), /boundary/); assert.equal(guard.requests(), 0); } finally { guard.restore(); }
});
test("request and output-token caps fail closed and uncertain sends are not retried", async () => {
  const original = globalThis.fetch;
  let sent = 0;
  globalThis.fetch = (async () => { sent++; throw new Error("uncertain transport outcome"); }) as typeof fetch;
  const guard = installMathtechTransport("http://127.0.0.1:1234/v1", true);
  const request = () => fetch("http://127.0.0.1:1234/v1/chat/completions", { method: "POST", body: JSON.stringify({ max_tokens: 1024 }) });
  try { await assert.rejects(request()); await assert.rejects(request(), /stopped/); assert.equal(sent, 1); } finally { guard.restore(); globalThis.fetch = original; }
});
test("successful sends stop at the per-invocation ceiling", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}")) as typeof fetch;
  const guard = installMathtechTransport("http://127.0.0.1:1234/v1", true, 1);
  try {
    await fetch("http://127.0.0.1:1234/v1/chat/completions", { body: JSON.stringify({ max_tokens: 1024 }) });
    await assert.rejects(fetch("http://127.0.0.1:1234/v1/chat/completions", { body: JSON.stringify({ max_tokens: 1024 }) }), /cap/);
    assert.equal(guard.requests(), 1);
  } finally { guard.restore(); globalThis.fetch = original; }
});
