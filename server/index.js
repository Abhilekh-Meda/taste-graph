import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { NiaClient } from '../src/nia.js';
import { buildTasteProfile } from '../src/retrieval/pipeline.js';
import { judge } from '../src/verdict/judge.js';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const ROOT = resolve(__dirname, '..');

function getClients() {
  if (!process.env.NIA_API_KEY || !process.env.OPENAI_API_KEY) {
    throw new Error('Missing NIA_API_KEY or OPENAI_API_KEY in .env');
  }
  return {
    nia: new NiaClient(process.env.NIA_API_KEY),
    openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  };
}

function sendSSE(res, event) {
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch { /* client disconnected */ }
}

app.post('/api/judge', async (req, res) => {
  const { person, items, label, judgingContext } = req.body;

  if (!person || !items?.length) {
    return res.status(400).json({ error: 'person and items[] are required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let aborted = false;
  req.on('close', () => { aborted = true; });

  const emit = (event) => {
    if (!aborted) sendSSE(res, event);
  };

  let nia, openai;
  try {
    ({ nia, openai } = getClients());
  } catch (err) {
    emit({ type: 'error', data: { message: err.message } });
    res.end();
    return;
  }

  try {
    const slug = person.toLowerCase().replace(/\s+/g, '-');
    const profileDir = resolve(ROOT, 'profiles', slug);
    const contextsPath = resolve(profileDir, 'contexts.json');

    if (!existsSync(contextsPath)) {
      emit({ type: 'status', data: { phase: 'profile', message: `Building taste profile for ${person}...` } });
      const profile = await buildTasteProfile(person, nia, emit);

      await mkdir(profileDir, { recursive: true });
      await writeFile(resolve(profileDir, 'profile.json'), JSON.stringify(profile, null, 2));
      await writeFile(contextsPath, JSON.stringify(profile.contextIds, null, 2));

      if (profile.discovery.oracle_report) {
        await writeFile(resolve(profileDir, 'discovery.md'), profile.discovery.oracle_report);
      }
      for (const [key, val] of Object.entries(profile.profile)) {
        if (val.final_report) {
          await writeFile(resolve(profileDir, `${key}.md`), val.final_report);
        }
      }
    } else {
      emit({ type: 'profile:cached', data: { person, message: `Taste profile for ${person} already exists` } });
      emit({ type: 'profile:done', data: { dimensions: 7, cached: true } });
    }

    if (aborted) return;

    emit({ type: 'status', data: { phase: 'verdict', message: 'Judging submission...' } });
    const result = await judge({
      person,
      items,
      label: label || null,
      judgingContext: judgingContext || 'general',
      profileDir,
      nia,
      openai,
      onProgress: emit,
    });

    emit({ type: 'complete', data: result });
  } catch (err) {
    console.error('[server] Error:', err);
    emit({ type: 'error', data: { message: err.message } });
  } finally {
    if (!aborted) res.end();
  }
});

app.get('/api/profiles/:slug', async (req, res) => {
  const profilePath = resolve(ROOT, 'profiles', req.params.slug, 'profile.json');
  try {
    const data = await readFile(profilePath, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: 'Profile not found' });
  }
});

app.listen(PORT, () => {
  console.log(`TasteGraph server running on http://localhost:${PORT}`);
});
