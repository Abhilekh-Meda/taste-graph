import 'dotenv/config';
import { writeFile, mkdir } from 'fs/promises';
import { NiaClient } from './nia.js';
import { buildTasteProfile } from './retrieval/pipeline.js';

const name = process.argv[2];
if (!name) { console.error('Usage: node src/main.js "Person Name"'); process.exit(1); }
if (!process.env.NIA_API_KEY) { console.error('Missing NIA_API_KEY in .env'); process.exit(1); }

const nia = new NiaClient(process.env.NIA_API_KEY);
const result = await buildTasteProfile(name, nia);

const slug = name.toLowerCase().replace(/\s+/g, '-');
const outDir = `profiles/${slug}`;
await mkdir(outDir, { recursive: true });

await writeFile(`${outDir}/profile.json`, JSON.stringify(result, null, 2));
await writeFile(`${outDir}/contexts.json`, JSON.stringify(result.contextIds, null, 2));

if (result.discovery.oracle_report) {
  await writeFile(`${outDir}/discovery.md`, result.discovery.oracle_report);
}

for (const [key, val] of Object.entries(result.profile)) {
  if (val.final_report) {
    await writeFile(`${outDir}/${key}.md`, val.final_report);
  }
}

console.log(`\n=== Done. Saved to ${outDir}/ ===`);
