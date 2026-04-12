import { withRetry } from './retry.js';

const BASE_URL = 'https://apigcp.trynia.ai/v2';

export class NiaClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createOracleJob(query, { dataSources = [], model = 'claude-sonnet-4-5-20250929' } = {}) {
    return withRetry(async () => {
      const body = { query, model };
      if (dataSources.length) body.data_sources = dataSources;
      const res = await fetch(`${BASE_URL}/oracle/jobs`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`Oracle job creation failed [${res.status}]: ${await res.text()}`);
      return res.json();
    }, 'nia.createOracleJob');
  }

  async streamOracleJob(jobId, onChunk) {
    const res = await fetch(`${BASE_URL}/oracle/jobs/${jobId}/stream`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(35 * 60_000),
    });

    if (!res.ok) throw new Error(`Oracle stream failed [${res.status}]: ${await res.text()}`);

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
        try { onChunk(JSON.parse(raw)); } catch { /* non-JSON line */ }
      }
    }
  }

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

    if (!finalReport) throw new Error('Oracle returned no report (terminated or timed out)');
    return { final_report: finalReport, citations };
  }

  async createSource(body) {
    return withRetry(async () => {
      const res = await fetch(`${BASE_URL}/sources`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Create source failed [${res.status}]: ${await res.text()}`);
      return res.json();
    }, 'nia.createSource');
  }

  async getSource(sourceId) {
    return withRetry(async () => {
      const res = await fetch(`${BASE_URL}/sources/${sourceId}`, {
        headers: this.headers,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Get source failed [${res.status}]: ${await res.text()}`);
      return res.json();
    }, 'nia.getSource');
  }

  async waitForSource(sourceId, { maxWaitMs = 300_000, pollMs = 3_000 } = {}) {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      const source = await this.getSource(sourceId);
      if (source.status === 'ready' || source.status === 'completed') return source;
      if (source.status === 'failed' || source.status === 'error') {
        throw new Error(`Source ${sourceId} failed: ${JSON.stringify(source.metadata)}`);
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
    throw new Error(`Source ${sourceId} not ready after ${maxWaitMs}ms`);
  }

  async getUploadUrl(filename, contentType = 'application/pdf') {
    return withRetry(async () => {
      const res = await fetch(`${BASE_URL}/sources/upload-url`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ filename, content_type: contentType }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Get upload URL failed [${res.status}]: ${await res.text()}`);
      return res.json();
    }, 'nia.getUploadUrl');
  }

  async runDocumentAgent(sourceId, query, { jsonSchema, model } = {}) {
    return withRetry(async () => {
      const body = { source_id: sourceId, query };
      if (jsonSchema) body.json_schema = jsonSchema;
      if (model) body.model = model;
      const res = await fetch(`${BASE_URL}/document/agent`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(300_000),
      });
      if (!res.ok) throw new Error(`Document agent failed [${res.status}]: ${await res.text()}`);
      return res.json();
    }, 'nia.runDocumentAgent', { baseDelayMs: 2_000, maxDelayMs: 60_000 });
  }

  async getContext(contextId) {
    return withRetry(async () => {
      const res = await fetch(`${BASE_URL}/contexts/${contextId}`, {
        headers: this.headers,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Get context failed [${res.status}]: ${await res.text()}`);
      return res.json();
    }, 'nia.getContext');
  }

  async saveContext({ title, summary, content, tags = [], metadata = {} }) {
    return withRetry(async () => {
      const res = await fetch(`${BASE_URL}/contexts`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ title, summary, content, agent_source: 'taste-graph', memory_type: 'fact', tags, metadata }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Save context failed [${res.status}]: ${await res.text()}`);
      return res.json();
    }, 'nia.saveContext');
  }

  async searchContexts(query, { limit = 20 } = {}) {
    return withRetry(async () => {
      const params = new URLSearchParams({ q: query, limit });
      const res = await fetch(`${BASE_URL}/contexts/semantic-search?${params}`, {
        headers: this.headers,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Search contexts failed [${res.status}]: ${await res.text()}`);
      return res.json();
    }, 'nia.searchContexts');
  }
}
