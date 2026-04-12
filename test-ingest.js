// Exercises every ingestion path: plain text, image, web URL, GitHub repo, PDF
// Run: node test-ingest.js
import 'dotenv/config';
import { NiaClient } from './src/nia.js';
import { ingestSubmission } from './src/ingestion/ingest-submission.js';

if (!process.env.NIA_API_KEY) { console.error('Missing NIA_API_KEY'); process.exit(1); }
const nia = new NiaClient(process.env.NIA_API_KEY);

const TESTS = [
  {
    label: 'Plain text',
    items: [
      'We are building a B2B SaaS that uses ML to help restaurants reduce food waste by 40%. We have 3 pilots running and $12k MRR. Looking for seed funding.',
    ],
  },
  {
    label: 'Image URL',
    items: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png',
    ],
  },
  {
    label: 'Web URL',
    items: ['https://paulgraham.com/ds.html'],
  },
  {
    label: 'GitHub repo',
    items: ['https://github.com/antirez/redis'],
  },
  {
    label: 'PDF URL',
    items: ['https://arxiv.org/pdf/1706.03762'],  // "Attention is All You Need"
  },
  {
    label: 'Mixed bundle (text + web URL)',
    items: [
      'This is our demo deck summary: we are building AI-powered code review for enterprise teams.',
      'https://github.com/vercel/next.js',
    ],
  },
];

let passed = 0;
let failed = 0;

for (const test of TESTS) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${test.label}`);
  console.log('='.repeat(60));
  const t0 = Date.now();
  try {
    const result = await ingestSubmission(test.items, test.label, nia);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n✓ ${test.label} — ${result.blocks.length} blocks, ${result.sources.length} Nia sources, text: ${result.text.length} chars [${elapsed}s]`);
    console.log(`  Text preview: ${result.text.slice(0, 300).replace(/\n/g, ' ')}`);
    passed++;
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`\n✗ ${test.label} — FAILED [${elapsed}s]: ${err.message}`);
    console.error(err.stack?.split('\n').slice(1, 4).join('\n'));
    failed++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
