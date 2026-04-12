import { parse } from 'node-html-parser';

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
const IMAGE_MIME = /^image\//;
const PDF_MIME = 'application/pdf';

// Returns an OpenAI content block: { type: 'text', text } or { type: 'image_url', image_url: { url } }
// Plus a plain-text summary for passing to non-multimodal steps.
export async function ingestSubmission(input) {
  const trimmed = input.trim();

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { block: { type: 'text', text: trimmed }, text: trimmed, kind: 'text' };
  }

  if (IMAGE_EXTENSIONS.test(trimmed)) {
    return {
      block: { type: 'image_url', image_url: { url: trimmed } },
      text: `[Image: ${trimmed}]`,
      kind: 'image',
    };
  }

  // Probe content-type before fetching body
  const headRes = await fetch(trimmed, { method: 'HEAD', signal: AbortSignal.timeout(10_000) }).catch(() => null);
  const contentType = headRes?.headers.get('content-type') ?? '';

  if (IMAGE_MIME.test(contentType)) {
    return {
      block: { type: 'image_url', image_url: { url: trimmed } },
      text: `[Image: ${trimmed}]`,
      kind: 'image',
    };
  }

  if (contentType.includes(PDF_MIME)) {
    // Return the URL as-is — caller can optionally run document agent on this
    return {
      block: { type: 'text', text: `[PDF at ${trimmed} — full content requires document agent processing]` },
      text: `[PDF: ${trimmed}]`,
      kind: 'pdf',
      url: trimmed,
    };
  }

  // Default: fetch HTML and strip to readable text
  const res = await fetch(trimmed, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Failed to fetch URL [${res.status}]: ${trimmed}`);

  const html = await res.text();
  const text = extractText(html, trimmed);

  return { block: { type: 'text', text }, text, kind: 'url', url: trimmed };
}

function extractText(html, url) {
  try {
    const root = parse(html);

    // Remove noise nodes
    for (const tag of ['script', 'style', 'nav', 'footer', 'header', 'noscript', 'svg']) {
      root.querySelectorAll(tag).forEach((n) => n.remove());
    }

    const title = root.querySelector('title')?.text?.trim() ?? '';

    // Prefer main content areas
    const main =
      root.querySelector('main') ??
      root.querySelector('article') ??
      root.querySelector('[role="main"]') ??
      root.querySelector('.content') ??
      root.querySelector('#content') ??
      root;

    const body = main.text
      .replace(/\s{3,}/g, '\n\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
      .slice(0, 12_000); // cap at ~3k tokens

    return title ? `${title}\n\n${body}` : body;
  } catch {
    // If parse fails, strip tags with regex
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12_000);
  }
}
