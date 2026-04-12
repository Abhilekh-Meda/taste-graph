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

export async function discoverPerson(name, nia, emit) {
  emit = emit ?? (() => {});
  console.log(`[discover] Running web search and oracle discovery for: ${name}`);
  emit({ type: 'profile:discovery', data: { message: `Searching the web for ${name}...` } });

  const [webResult, oracleResult] = await Promise.allSettled([
    discoverViaWebSearch(name, nia),
    discoverViaOracle(name, nia),
  ]);

  const web = webResult.status === 'fulfilled' ? webResult.value : { sources: [], error: webResult.reason?.message };
  const oracle = oracleResult.status === 'fulfilled' ? oracleResult.value : { sources: [], error: oracleResult.reason?.message };

  const seen = new Set();
  const merged = [];
  for (const source of [...web.sources, ...oracle.sources]) {
    if (!seen.has(source.url)) {
      seen.add(source.url);
      merged.push(source);
    }
  }

  console.log(`[discover] Web: ${web.sources.length} | Oracle: ${oracle.sources.length} | Merged: ${merged.length}`);
  emit({ type: 'profile:discovery', data: { message: `Found ${merged.length} sources`, sources_found: merged.length } });

  return {
    sources: merged,
    oracle_report: oracle.oracle_report ?? null,
    oracle_citations: oracle.oracle_citations ?? [],
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
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);

  const data = await res.json();
  return (data.results || data.items || [])
    .filter((item) => item.url)
    .map((item) => ({
      url: item.url,
      type: category === 'tweet' ? 'twitter' : category,
      description: item.title || item.description || '',
    }));
}

const DISCOVER_MODELS = ['claude-sonnet-4-5-20250929', 'claude-opus-4-6'];

async function discoverViaOracle(name, nia) {
  let lastError;
  let final_report, oracleCitations;

  for (let attempt = 0; attempt < DISCOVER_MODELS.length; attempt++) {
    const model = DISCOVER_MODELS[attempt];
    if (attempt > 0) {
      const delay = 2000 * 2 ** (attempt - 1);
      console.log(`[discover] Retrying oracle with ${model} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      const result = await nia.runOracle(ORACLE_QUERY(name), { model }, logOracleProgress('discover'));
      final_report = result.final_report;
      oracleCitations = result.citations;
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[discover] Oracle attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  if (!final_report) throw lastError;

  const sources = extractUrls(final_report).map((url) => ({
    url,
    type: 'other',
    description: '',
    discovery: 'oracle',
  }));

  return { sources, oracle_report: final_report, oracle_citations: oracleCitations };
}


function extractUrls(text) {
  const matches = text.match(/https?:\/\/[^\s\)\]\>"]+/g) || [];
  return [...new Set(matches)];
}

export function logOracleProgress(label) {
  return (chunk) => {
    if (chunk.type === 'tool_start') console.log(`  [oracle/${label}] ${chunk.action} — ${chunk.reason?.slice(0, 100)}`);
    if (chunk.type === 'tool_complete') console.log(`  [oracle/${label}] ✓ ${chunk.action}`);
    if (chunk.type === 'generating_report') console.log(`  [oracle/${label}] synthesizing...`);
  };
}
