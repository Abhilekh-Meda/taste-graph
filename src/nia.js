const BASE_URL = 'https://apigcp.trynia.ai/v2';

// Oracle with output_format:'json' wraps output in ```json ... ``` fences.
// This strips them and parses, returning null on failure.
export function parseJsonReport(finalReport) {
  const fenced = finalReport.match(/```json\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : finalReport.match(/\{[\s\S]*\}/)?.[0];
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export class NiaClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createOracleJob(query, { dataSources = [], outputFormat = null, model = 'claude-opus-4-6-1m' } = {}) {
    const body = { query, model };
    if (dataSources.length) body.data_sources = dataSources;
    if (outputFormat) body.output_format = outputFormat;

    const res = await fetch(`${BASE_URL}/oracle/jobs`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Oracle job creation failed [${res.status}]: ${text}`);
    }

    return res.json();
  }

  async streamOracleJob(jobId, onChunk) {
    const res = await fetch(`${BASE_URL}/oracle/jobs/${jobId}/stream`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Oracle stream failed [${res.status}]: ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;
        try {
          onChunk(JSON.parse(raw));
        } catch {
          // non-JSON line, ignore
        }
      }
    }
  }

  // Runs an oracle job end-to-end, streaming progress
  // Returns { final_report: string, citations: array }
  async runOracle(query, options = {}, onProgress = null) {
    const { job_id } = await this.createOracleJob(query, options);
    let finalReport = '';
    let citations = [];

    await this.streamOracleJob(job_id, (chunk) => {
      if (onProgress) onProgress(chunk);

      if (chunk.type === 'complete' && chunk.result) {
        finalReport = chunk.result.final_report ?? '';
        citations = chunk.result.citations ?? [];
      }
    });

    return { final_report: finalReport, citations };
  }

  async createSource(type, url, { displayName, crawlEntireDomain = false, maxDepth } = {}) {
    const body = { type, url };
    if (displayName) body.display_name = displayName;
    if (crawlEntireDomain) body.crawl_entire_domain = true;
    if (maxDepth != null) body.max_depth = maxDepth;

    const res = await fetch(`${BASE_URL}/sources`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Create source failed [${res.status}]: ${text}`);
    }

    return res.json();
  }

  async listSources() {
    const res = await fetch(`${BASE_URL}/sources`, { headers: this.headers });
    if (!res.ok) throw new Error(`List sources failed [${res.status}]`);
    return res.json();
  }

  async getSource(sourceId) {
    const res = await fetch(`${BASE_URL}/sources/${sourceId}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Get source failed [${res.status}]`);
    return res.json();
  }
}
