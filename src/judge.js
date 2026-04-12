import 'dotenv/config';
import { writeFile, mkdir } from 'fs/promises';
import { NiaClient } from './nia.js';
import { openai } from './openai.js';
import { judge } from './verdict/judge.js';

// Usage: node src/judge.js "Person Name" "[judging context]" "[label]" item1 item2 ...
const [,, person, judgingContext, label, ...items] = process.argv;

if (!person || items.length === 0) {
  console.error('Usage: node src/judge.js "Person" "context" "label" <item1> [item2] ...');
  process.exit(1);
}
if (!process.env.NIA_API_KEY) { console.error('Missing NIA_API_KEY in .env'); process.exit(1); }

const nia = new NiaClient(process.env.NIA_API_KEY);

const slug = person.toLowerCase().replace(/\s+/g, '-');
const result = await judge({
  person,
  items,
  label: label || null,
  judgingContext: judgingContext || 'general',
  profileDir: `./profiles/${slug}`,
  nia,
  openai,
});

const verdictsDir = `profiles/${slug}/verdicts`;
await mkdir(verdictsDir, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outFile = `${verdictsDir}/${ts}.json`;
await writeFile(outFile, JSON.stringify(result, null, 2));

console.log('\n=== VERDICT ===');
console.log(`Score: ${result.verdict.score}/10`);
console.log(`Confidence: ${result.verdict.confidence_score}/10 — ${result.verdict.confidence_explanation}`);
if (result.verdict.contradiction_callout) console.log(`⚠ Contradiction: ${result.verdict.contradiction_callout}`);
if (result.verdict.blind_spot_warning) console.log(`⚡ Blind spot: ${result.verdict.blind_spot_warning}`);
console.log(`\nFull result saved to ${outFile}`);
