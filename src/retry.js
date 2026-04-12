const RETRYABLE_HTTP = new Set([429, 500, 502, 503, 504]);

// Retries an async fn with exponential backoff.
// fn:      () => Promise
// label:   string for logging
// opts.maxAttempts:  default 4
// opts.baseDelayMs:  default 1000
// opts.maxDelayMs:   default 30000
export async function withRetry(fn, label, { maxAttempts = 4, baseDelayMs = 1_000, maxDelayMs = 30_000 } = {}) {
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err.status ?? err.statusCode ?? parseStatus(err.message);
      const retryable = !status || RETRYABLE_HTTP.has(status);

      if (!retryable || attempt === maxAttempts) {
        console.error(`[retry/${label}] Failed permanently after ${attempt} attempt(s): ${err.message}`);
        throw err;
      }

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      console.warn(`[retry/${label}] Attempt ${attempt} failed (${err.message.slice(0, 120)}). Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastErr;
}

function parseStatus(msg) {
  const m = msg?.match(/\[(\d{3})\]/);
  return m ? parseInt(m[1]) : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
