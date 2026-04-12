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
export async function ingestSubmission(items, label, nia) {
  console.log(`\n[ingest] Processing ${items.length} item(s)${label ? ` — "${label}"` : ''}`);
  const results = await Promise.all(items.map((item) => ingestOne(item.trim(), nia)));

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

async function ingestOne(input, nia) {
  console.log(`[ingest] Item: "${input.slice(0, 80)}${input.length > 80 ? '...' : ''}"`);

  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    console.log(`[ingest] → plain text (${input.length} chars)`);
    return { blocks: [{ type: 'text', text: input }], text: input };
  }

  if (IMAGE_EXTENSIONS.test(input)) {
    console.log(`[ingest] → image (extension match)`);
    return ingestImage(input);
  }

  const githubMatch = input.match(GITHUB_REPO_RE);
  if (githubMatch) {
    console.log(`[ingest] → GitHub repo: ${githubMatch[1]}`);
    return ingestGitHub(input, githubMatch[1], nia);
  }

  console.log(`[ingest] HEAD check: ${input}`);
  const headRes = await fetch(input, { method: 'HEAD', signal: AbortSignal.timeout(10_000) }).catch(() => null);
  const contentType = headRes?.headers.get('content-type') ?? '';
  console.log(`[ingest] Content-Type: ${contentType || '(none)'}`);

  if (/^image\//.test(contentType)) {
    console.log(`[ingest] → image (content-type)`);
    return ingestImage(input);
  }

  if (contentType.includes('application/pdf')) {
    console.log(`[ingest] → PDF`);
    return ingestPdf(input, nia);
  }

  console.log(`[ingest] → web URL`);
  return ingestUrl(input, nia);
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

async function ingestUrl(url, nia) {
  console.log(`[ingest] Indexing URL in Nia: ${url}`);

  const source = await nia.createSource({
    type: 'documentation',
    url,
    include_screenshot: true,
    only_main_content: true,
  });

  await nia.waitForSource(source.id);
  console.log(`[ingest] Source ready: ${source.id}`);

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

async function ingestPdf(url, nia) {
  console.log(`[ingest] Uploading PDF to Nia: ${url}`);

  const filename = url.split('/').pop()?.split('?')[0] || 'submission.pdf';
  const { upload_url, gcs_path } = await nia.getUploadUrl(filename);

  const pdfRes = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!pdfRes.ok) throw new Error(`Failed to download PDF [${pdfRes.status}]: ${url}`);
  const pdfBytes = await pdfRes.arrayBuffer();

  await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: pdfBytes,
    signal: AbortSignal.timeout(60_000),
  });

  const source = await nia.createSource({
    type: 'research_paper',
    is_pdf: true,
    gcs_path,
    display_name: filename,
  });

  await nia.waitForSource(source.id);
  console.log(`[ingest] PDF source ready: ${source.id}`);

  const doc = await nia.runDocumentAgent(source.id, DOC_AGENT_QUERY);
  const summary = doc.answer ?? '';
  const citations = formatCitations(doc.citations);
  const fullText = citations ? `${summary}\n\nCitations:\n${citations}` : summary;

  return {
    blocks: [
      { type: 'text', text: `[PDF: ${filename}]\n\n${fullText}` },
    ],
    text: `[PDF: ${filename}]\n\n${fullText}`,
    source: { id: source.id, type: 'research_paper', url },
  };
}

async function ingestGitHub(url, repoSlug, nia) {
  console.log(`[ingest] Indexing GitHub repo: ${repoSlug}`);

  const [source, readme] = await Promise.all([
    nia.createSource({ type: 'repository', repository: repoSlug }),
    fetchReadme(repoSlug),
  ]);

  await nia.waitForSource(source.id);
  console.log(`[ingest] Repo source ready: ${source.id}`);

  const doc = await nia.runDocumentAgent(
    source.id,
    'What is this project? Summarize the README, key features, architecture, tech stack, and purpose.',
  );

  const agentSummary = doc.answer ?? '';
  const text = readme
    ? `[GitHub: ${repoSlug}]\n\nREADME:\n${readme}\n\nDeep analysis:\n${agentSummary}`
    : `[GitHub: ${repoSlug}]\n\n${agentSummary}`;

  return {
    blocks: [{ type: 'text', text }],
    text,
    source: { id: source.id, type: 'repository', url },
  };
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
