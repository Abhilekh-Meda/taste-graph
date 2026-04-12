import 'dotenv/config';
import { writeFile } from 'fs/promises';
import OpenAI from 'openai';
import { NiaClient } from './nia.js';
import { judge } from './verdict/judge.js';

const [,, person, submissionInput, judgingContext] = process.argv;

if (!person || !submissionInput) {
  console.error('Usage: node src/judge.js "Person Name" "<url or text>" "[judging context]"');
  process.exit(1);
}
if (!process.env.NIA_API_KEY) { console.error('Missing NIA_API_KEY in .env'); process.exit(1); }
if (!process.env.OPENAI_API_KEY) { console.error('Missing OPENAI_API_KEY in .env'); process.exit(1); }

const nia = new NiaClient(process.env.NIA_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const slug = person.toLowerCase().replace(/\s+/g, '-');
const result = await judge({
  person,
  submissionInput,
  judgingContext: judgingContext ?? 'general',
  profileDir: `./profiles/${slug}`,
  nia,
  openai,
});

const outFile = `${slug}-verdict.json`;
await writeFile(outFile, JSON.stringify(result, null, 2));

console.log('\n=== VERDICT ===');
console.log(`Score: ${result.verdict.score}/10`);
console.log(`Confidence: ${result.verdict.confidence_score}/10 — ${result.verdict.confidence_explanation}`);
if (result.verdict.contradiction_callout) console.log(`⚠ Contradiction: ${result.verdict.contradiction_callout}`);
if (result.verdict.blind_spot_warning) console.log(`⚡ Blind spot: ${result.verdict.blind_spot_warning}`);
console.log(`\nFull result saved to ${outFile}`);
