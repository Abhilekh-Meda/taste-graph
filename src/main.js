import 'dotenv/config';
import { writeFile } from 'fs/promises';
import { NiaClient } from './nia.js';
import { buildTasteProfile } from './pipeline.js';

const name = process.argv[2];
if (!name) { console.error('Usage: node src/main.js "Person Name"'); process.exit(1); }
if (!process.env.NIA_API_KEY) { console.error('Missing NIA_API_KEY in .env'); process.exit(1); }

const nia = new NiaClient(process.env.NIA_API_KEY);
const result = await buildTasteProfile(name, nia);

const outFile = `${name.toLowerCase().replace(/\s+/g, '-')}-profile.json`;
await writeFile(outFile, JSON.stringify(result, null, 2));
console.log(`\n=== Done. Profile saved to ${outFile} ===`);
