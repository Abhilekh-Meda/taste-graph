import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

import { NiaClient } from './src/nia.js';
import { judge } from './src/verdict/judge.js';
import OpenAI from 'openai';

const person = 'Arlan Rakhmetzhanov';
const judgingContext = 'hackathon judge';
const profileDir = resolve(__dirname, 'profiles', 'arlan-rakhmetzhanov');
const submissionPath = resolve(__dirname, 'test_submission.txt');
const outputDir = resolve(__dirname, 'demo-data');

const nia = new NiaClient(process.env.NIA_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const capturedEvents = [];
const startTime = Date.now();

function emit(event) {
  const entry = { ...event, _ms: Date.now() - startTime };
  capturedEvents.push(entry);
  const tag = event.type?.padEnd(30) ?? '???';
  const preview = event.data?.message?.slice(0, 80) ?? JSON.stringify(event.data ?? {}).slice(0, 80);
  console.log(`[${String(entry._ms).padStart(7)}ms] ${tag} ${preview}`);
}

async function main() {
  const submissionText = await readFile(submissionPath, 'utf8');

  emit({ type: 'profile:cached', data: { person, message: `Taste profile for ${person} already exists` } });
  emit({ type: 'profile:done', data: { dimensions: 7, cached: true } });
  emit({ type: 'status', data: { phase: 'verdict', message: 'Judging submission...' } });

  const result = await judge({
    person,
    items: [submissionText],
    label: 'TasteGraph hackathon submission',
    judgingContext,
    profileDir,
    nia,
    openai,
    onProgress: emit,
  });

  emit({ type: 'complete', data: result });

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'events.json'), JSON.stringify(capturedEvents, null, 2));
  await writeFile(resolve(outputDir, 'result.json'), JSON.stringify(result, null, 2));

  console.log(`\nDone. ${capturedEvents.length} events captured in ${Date.now() - startTime}ms`);
  console.log(`Saved to ${outputDir}/events.json and ${outputDir}/result.json`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
