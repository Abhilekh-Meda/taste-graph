const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
const GITHUB_REPO_RE = /^https?:\/\/github\.com\/([^/]+\/[^/]+)\/?/;
const DOC_AGENT_QUERY = 'Describe everything in this document comprehensively — all content, structure, key claims, data, and purpose. Miss nothing.';

// Ingests a bundle of user-submitted items into content blocks for GPT-5 and a text summary.
//
// items:  array of strings — each is a URL, image URL, PDF URL, or plain text
// label:  string — user-provided description ("pitch deck", "hackathon project", etc.)
// nia:    NiaClient instance
//
// Returns { blocks: ContentBlock[], text: string, sources: SourceMeta[] }
export async function ingestSubmission(items, label, nia, onProgress) {
  const emit = onProgress ?? (() => {});
  console.log(`\n[ingest] Processing ${items.length} item(s)${label ? ` — "${label}"` : ''}`);
  const results = await Promise.all(items.map((item, i) => {
    emit({ type: 'verdict:ingest_item', data: { index: i, total: items.length, item: item.trim().slice(0, 100) } });
    return ingestOne(item.trim(), nia, emit);
  }));

  const blocks = [];
  const textParts = [];
  const sources = [];

  if (label) {
    blocks.push({ type: 'text', text: `[Submission type: ${label}]` });
    textParts.push(`Submission type: ${label}`);
  }

  for (const r of results) {
    blocks.push(...r.blocks);
    textParts.push(r.text);
    if (r.source) sources.push(r.source);
  }

  console.log(`[ingest] Done — ${blocks.length} blocks, ${sources.length} Nia sources`);
  return { blocks, text: textParts.join('\n\n---\n\n'), sources };
}

async function ingestOne(input, nia, emit) {
  emit = emit ?? (() => {});
  console.log(`[ingest] Item: "${input.slice(0, 80)}${input.length > 80 ? '...' : ''}"`);

  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    console.log(`[ingest] → plain text (${input.length} chars)`);
    emit({ type: 'verdict:ingest_progress', data: { message: `Reading text (${input.length} chars)` } });
    return { blocks: [{ type: 'text', text: input }], text: input };
  }

  if (IMAGE_EXTENSIONS.test(input)) {
    console.log(`[ingest] → image (extension match)`);
    emit({ type: 'verdict:ingest_progress', data: { message: `Attaching image: ${input.slice(0, 60)}` } });
    return ingestImage(input);
  }

  const githubMatch = input.match(GITHUB_REPO_RE);
  if (githubMatch) {
    console.log(`[ingest] → GitHub repo: ${githubMatch[1]}`);
    emit({ type: 'verdict:ingest_progress', data: { message: `Analyzing GitHub repo: ${githubMatch[1]}` } });
    return ingestGitHub(input, githubMatch[1], nia, emit);
  }

  emit({ type: 'verdict:ingest_progress', data: { message: `Checking content type: ${input.slice(0, 60)}` } });
  console.log(`[ingest] HEAD check: ${input}`);
  const headRes = await fetch(input, { method: 'HEAD', signal: AbortSignal.timeout(10_000) }).catch(() => null);
  const contentType = headRes?.headers.get('content-type') ?? '';
  console.log(`[ingest] Content-Type: ${contentType || '(none)'}`);

  if (/^image\//.test(contentType)) {
    console.log(`[ingest] → image (content-type)`);
    emit({ type: 'verdict:ingest_progress', data: { message: `Attaching image: ${input.slice(0, 60)}` } });
    return ingestImage(input);
  }

  if (contentType.includes('application/pdf')) {
    console.log(`[ingest] → PDF`);
    emit({ type: 'verdict:ingest_progress', data: { message: `Parsing PDF: ${input.slice(0, 60)}` } });
    return ingestPdf(input, nia, emit);
  }

  console.log(`[ingest] → web URL`);
  emit({ type: 'verdict:ingest_progress', data: { message: `Indexing page: ${input.slice(0, 60)}` } });
  return ingestUrl(input, nia, emit);
}

function ingestImage(url) {
  return {
    blocks: [
      { type: 'text', text: `[Image: ${url}]` },
      { type: 'image_url', image_url: { url } },
    ],
    text: `[Image: ${url}]`,
  };
}

async function ingestUrl(url, nia, emit) {
  emit = emit ?? (() => {});
  console.log(`[ingest] Indexing URL in Nia: ${url}`);
  emit({ type: 'verdict:ingest_progress', data: { message: `Indexing page content...` } });

  const source = await nia.createSource({
    type: 'documentation',
    url,
    include_screenshot: true,
    only_main_content: true,
  });

  emit({ type: 'verdict:ingest_progress', data: { message: `Waiting for page to be indexed...` } });
  await nia.waitForSource(source.id);
  console.log(`[ingest] Source ready: ${source.id}`);

  emit({ type: 'verdict:ingest_progress', data: { message: `Reading and analyzing page content...` } });
  const doc = await nia.runDocumentAgent(source.id, DOC_AGENT_QUERY);
  const summary = doc.answer ?? '';
  const citations = formatCitations(doc.citations);
  const fullText = citations ? `${summary}\n\nCitations:\n${citations}` : summary;

  return {
    blocks: [
      { type: 'text', text: `[Web page: ${url}]\n\n${fullText}` },
    ],
    text: `[Web page: ${url}]\n\n${fullText}`,
    source: { id: source.id, type: 'documentation', url },
  };
}

async function ingestPdf(url, nia, emit) {
  emit = emit ?? (() => {});
  console.log(`[ingest] Indexing PDF via Nia: ${url}`);
  emit({ type: 'verdict:ingest_progress', data: { message: `Uploading PDF for analysis...` } });

  const source = await nia.createSource({
    type: 'documentation',
    url,
    is_pdf: true,
    only_main_content: false,
  });

  emit({ type: 'verdict:ingest_progress', data: { message: `Parsing PDF pages...` } });
  await nia.waitForSource(source.id);
  console.log(`[ingest] PDF source ready: ${source.id}`);

  emit({ type: 'verdict:ingest_progress', data: { message: `Extracting content from PDF...` } });
  const doc = await nia.runDocumentAgent(source.id, DOC_AGENT_QUERY);
  const summary = doc.answer ?? '';
  const citations = formatCitations(doc.citations);
  const fullText = citations ? `${summary}\n\nCitations:\n${citations}` : summary;

  const filename = url.split('/').pop()?.split('?')[0] || 'document.pdf';
  return {
    blocks: [{ type: 'text', text: `[PDF: ${filename}]\n\n${fullText}` }],
    text: `[PDF: ${filename}]\n\n${fullText}`,
    source: { id: source.id, type: 'documentation', url },
  };
}

async function ingestGitHub(url, repoSlug, nia, emit) {
  emit = emit ?? (() => {});
  console.log(`[ingest] Indexing GitHub repo: ${repoSlug}`);

  emit({ type: 'verdict:ingest_progress', data: { message: `Fetching README and metadata for ${repoSlug}...` } });
  const githubToken = process.env.NIA_GITHUB_TOKEN;
  const [readme, repoMeta] = await Promise.all([fetchReadme(repoSlug), fetchRepoMeta(repoSlug)]);

  // Try Nia deep indexing — requires a GitHub token. Skip gracefully if unavailable.
  let agentSummary = null;
  if (githubToken) {
    try {
      const source = await nia.createSource({ type: 'repository', repository: repoSlug, github_token: githubToken });
      await nia.waitForSource(source.id);
      console.log(`[ingest] Repo source ready: ${source.id}`);
      const doc = await nia.runDocumentAgent(
        source.id,
        'What is this project? Summarize the README, key features, architecture, tech stack, and purpose.',
      );
      agentSummary = doc.answer ?? null;
      const text = buildGitHubText(repoSlug, readme, repoMeta, agentSummary);
      return { blocks: [{ type: 'text', text }], text, source: { id: source.id, type: 'repository', url } };
    } catch (err) {
      console.warn(`[ingest] Nia GitHub indexing failed: ${err.message} — falling back to README-only`);
    }
  } else {
    console.log(`[ingest] No NIA_GITHUB_TOKEN — using README + GitHub API fallback`);
  }

  const text = buildGitHubText(repoSlug, readme, repoMeta, agentSummary);
  return { blocks: [{ type: 'text', text }], text };
}

function buildGitHubText(repoSlug, readme, repoMeta, agentSummary) {
  const parts = [`[GitHub: ${repoSlug}]`];
  if (repoMeta) parts.push(`Description: ${repoMeta.description ?? 'n/a'} | Stars: ${repoMeta.stargazers_count ?? '?'} | Language: ${repoMeta.language ?? 'n/a'} | Topics: ${(repoMeta.topics ?? []).join(', ') || 'none'}`);
  if (readme) parts.push(`\nREADME:\n${readme}`);
  if (agentSummary) parts.push(`\nDeep analysis:\n${agentSummary}`);
  return parts.join('\n');
}

async function fetchRepoMeta(repoSlug) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoSlug}`, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function fetchReadme(repoSlug) {
  for (const branch of ['main', 'master']) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${repoSlug}/${branch}/README.md`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return (await res.text()).slice(0, 8_000);
    } catch { /* try next */ }
  }
  return null;
}

function formatCitations(citations) {
  if (!citations?.length) return '';
  return citations
    .map((c, i) => {
      const loc = c.page_number ? `p.${c.page_number}` : c.section_title ?? '';
      return `[${i + 1}] ${loc ? `(${loc}) ` : ''}${c.content}`;
    })
    .join('\n');
}
