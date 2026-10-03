// Installed only by the bounded MathTech mode of the existing evaluator.
// It neither launches workers nor invokes ops.recover; unknown/failed receipts require review.
export function installMathtechTransport(base: string, regression: boolean, maxRequests = 24) {
  const origin = new URL(base);
  const local = origin.protocol === "http:" && origin.hostname === "127.0.0.1";
  if (regression ? !local : origin.protocol !== "https:" || !!origin.username || !!origin.password) throw new Error("MathTech provider must be configured HTTPS (regression: loopback HTTP only)");
  const original = globalThis.fetch;
  let requests = 0, stopped = false;
  globalThis.fetch = (async (input, init) => {
    if (stopped || requests >= maxRequests) throw new Error("MathTech invocation stopped or request cap exhausted");
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== origin.origin || !url.pathname.startsWith(origin.pathname.replace(/\/$/, "") + "/")) { stopped = true; throw new Error("MathTech provider boundary rejected request"); }
    if (typeof init?.body !== "string" || init.body.length > 100_000) { stopped = true; throw new Error("MathTech request size cap exceeded"); }
    const body = JSON.parse(init.body);
    if (!Number.isFinite(body.max_tokens) || body.max_tokens < 1 || body.max_tokens > 2048
      || [body.max_completion_tokens, body.max_output_tokens].some(n => n !== undefined && (!Number.isFinite(n) || n < 1 || n > 2048))) { stopped = true; throw new Error("MathTech output token cap exceeded"); }
    requests++;
    try {
      const response = await original(input, { ...init, redirect: "error" });
      if (!response.ok) stopped = true;
      return response;
    } catch (error) { stopped = true; throw error; }
  }) as typeof fetch;
  return { requests: () => requests, stop: () => { stopped = true; }, restore: () => { globalThis.fetch = original; } };
}
