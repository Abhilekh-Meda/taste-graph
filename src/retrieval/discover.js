const ORACLE_QUERY = (name) => `
Find every publicly available URL where "${name}" has published content or been documented.
Include: personal blog/website, Twitter/X, LinkedIn, GitHub, Substack, podcast appearances,
long-form interviews, essays on third-party platforms, news profiles, conference talks,
YouTube, PDFs of their writing.
Prioritize sources containing their own words. Include actual content pages, not just homepages.
`.trim();

const MODELS = ['claude-sonnet-4-5-20250929', 'claude-opus-4-6'];

export async function discoverPerson(name, nia, emit) {
  emit = emit ?? (() => {});
  console.log(`[discover] Running oracle discovery for: ${name}`);
  emit({ type: 'profile:discovery', data: { message: `Searching for ${name}'s public presence...` } });

  let lastError;
  let final_report, citations;

  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt];
    if (attempt > 0) {
      const delay = 2000 * 2 ** (attempt - 1);
      console.log(`[discover] Retrying oracle with ${model} in ${delay}ms`);
      emit({ type: 'profile:discovery', data: { message: `Retrying discovery with different model...` } });
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      emit({ type: 'profile:discovery', data: { message: `Deep-searching blogs, interviews, essays, tweets...` } });
      const result = await nia.runOracle(ORACLE_QUERY(name), { model }, oracleProgressEmitter('discover', emit));
      final_report = result.final_report;
      citations = result.citations;
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

  console.log(`[discover] Found ${sources.length} sources`);
  emit({ type: 'profile:discovery', data: { message: `Found ${sources.length} sources`, sources_found: sources.length } });

  return { sources, oracle_report: final_report, oracle_citations: citations };
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

export function oracleProgressEmitter(label, emit) {
  const log = logOracleProgress(label);
  return (chunk) => {
    log(chunk);
    if (chunk.type === 'tool_start') {
      emit({ type: 'profile:discovery', data: { message: `${chunk.action}: ${(chunk.reason ?? '').slice(0, 80)}` } });
    }
    if (chunk.type === 'tool_complete') {
      emit({ type: 'profile:discovery', data: { message: `Completed: ${chunk.action}` } });
    }
    if (chunk.type === 'generating_report') {
      emit({ type: 'profile:discovery', data: { message: 'Compiling discovery report...' } });
    }
  };
}
