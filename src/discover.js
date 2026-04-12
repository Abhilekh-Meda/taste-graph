// Phase 1: Discover all public URLs for a person
// Supports two modes: 'web' (parallel web searches) and 'oracle' (autonomous deep research)
// Run both via discoverPerson to compare coverage

import { parseJsonReport } from './nia.js';

const WEB_SEARCHES = (name) => [
  { query: name, category: 'blog' },
  { query: name, category: 'news' },
  { query: name, category: 'tweet' },
  { query: name, category: 'pdf' },
  { query: name, category: 'github' },
  { query: `${name} interview`, category: 'news' },
  { query: `${name} podcast`, category: 'news' },
  { query: `${name} essay`, category: 'blog' },
  { query: `${name} talk transcript`, category: 'news' },
  { query: `${name} newsletter`, category: 'blog' },
];

const ORACLE_QUERY = (name) => `
Find every publicly available URL where "${name}" has published content or been documented.
Include: personal blog/website, Twitter/X, LinkedIn, GitHub, Substack, podcast appearances,
long-form interviews, essays on third-party platforms, news profiles, conference talks,
YouTube, PDFs of their writing.
Prioritize sources containing their own words. Include actual content pages, not just homepages.
`.trim();

export async function discoverPerson(name, nia) {
  console.log(`[discover] Running both web search and oracle discovery for: ${name}`);

  const [webResult, oracleResult] = await Promise.allSettled([
    discoverViaWebSearch(name, nia),
    discoverViaOracle(name, nia),
  ]);

  const web = webResult.status === 'fulfilled' ? webResult.value : { sources: [], error: webResult.reason?.message };
  const oracle = oracleResult.status === 'fulfilled' ? oracleResult.value : { sources: [], error: oracleResult.reason?.message };

  // Merge and deduplicate, tagging each source with its origin
  const seen = new Set();
  const merged = [];

  for (const source of [...web.sources, ...oracle.sources]) {
    if (!seen.has(source.url)) {
      seen.add(source.url);
      merged.push(source);
    }
  }

  console.log(`[discover] Web search: ${web.sources.length} sources`);
  console.log(`[discover] Oracle: ${oracle.sources.length} sources`);
  console.log(`[discover] Merged (unique): ${merged.length} sources`);

  return {
    sources: merged,
    comparison: {
      web_count: web.sources.length,
      oracle_count: oracle.sources.length,
      merged_count: merged.length,
      web_error: web.error ?? null,
      oracle_error: oracle.error ?? null,
    },
  };
}

async function discoverViaWebSearch(name, nia) {
  const searches = WEB_SEARCHES(name);
  const results = await Promise.allSettled(searches.map((s) => runWebSearch(s, nia)));

  const sources = [];
  const seen = new Set();

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(`[discover/web] Failed (${searches[i].category}): ${result.reason?.message}`);
      return;
    }
    result.value.forEach((source) => {
      if (!seen.has(source.url)) {
        seen.add(source.url);
        sources.push({ ...source, discovery: 'web' });
      }
    });
  });

  return { sources };
}

async function runWebSearch({ query, category }, nia) {
  const res = await fetch('https://apigcp.trynia.ai/v2/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${nia.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'web', query, category, num_results: 10 }),
  });

  if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);

  const data = await res.json();
  const items = data.results || data.items || [];
  return items
    .filter((item) => item.url)
    .map((item) => ({
      url: item.url,
      type: category === 'tweet' ? 'twitter' : category,
      description: item.title || item.description || '',
    }));
}

async function discoverViaOracle(name, nia) {
  const { final_report, citations } = await nia.runOracle(
    ORACLE_QUERY(name),
    { model: 'claude-opus-4-6-1m', outputFormat: 'json' },
    (chunk) => {
      if (chunk.type === 'tool_start') {
        process.stdout.write(`  [oracle] ${chunk.action}: ${chunk.reason?.slice(0, 80)}\n`);
      }
    }
  );

  // Try to parse structured JSON first
  const parsed = parseJsonReport(final_report);
  if (parsed?.sources?.length) {
    return {
      sources: parsed.sources.map((s) => ({ ...s, discovery: 'oracle' })),
    };
  }

  // Fall back: extract URLs from citations (Oracle always cites its sources)
  const sources = citations
    .flatMap((c) => {
      try {
        const summary = JSON.parse(c.summary || '{}');
        return [
          ...(summary.other_content || []),
          ...(summary.documentation || []),
        ].map((item) => ({
          url: item.url,
          type: 'other',
          description: item.title || '',
          discovery: 'oracle',
        }));
      } catch {
        return [];
      }
    })
    .filter((s) => s.url);

  return { sources };
}
