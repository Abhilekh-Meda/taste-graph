import { readFile } from 'fs/promises';
import { ingestSubmission } from '../ingestion/ingest-submission.js';
import { runVerdictAgents } from './run-verdict-agents.js';
import { synthesizeVerdict } from './synthesize.js';

// Main entry point for judging a submission against a person's taste profile.
//
// person:         "Paul Graham"
// items:          ["https://example.com", "https://example.com/deck.pdf", "some text"]
// label:          "hackathon project" — user-provided description of what this is
// judgingContext:  "hackathon judge", "YC application decision", "cold DM"
// profileDir:     path to the profile folder (e.g. "./profiles/paul-graham")
// nia:            NiaClient instance
// openai:         OpenAI instance
export async function judge({ person, items, label, judgingContext, profileDir, nia, openai, onProgress }) {
  const emit = onProgress ?? (() => {});
  console.log(`\n=== Judging submission for ${person} ===`);
  console.log(`Label: ${label || 'none'}`);
  console.log(`Context: ${judgingContext || 'general'}`);
  console.log(`Items: ${items.length}\n`);

  const contextIds = await loadContextIds(profileDir, person);

  emit({ type: 'verdict:ingesting', data: { item_count: items.length } });
  console.log('[judge] Ingesting submission...');
  const submission = await ingestSubmission(items, label, nia);
  console.log(`[judge] Ingested ${submission.blocks.length} content blocks, ${submission.sources.length} Nia sources`);
  emit({ type: 'verdict:ingested', data: { blocks: submission.blocks.length, sources: submission.sources.length } });

  const subVerdicts = await runVerdictAgents({
    person,
    contextIds,
    submissionBlocks: submission.blocks,
    judgingContext,
    nia,
    openai,
    onProgress: emit,
  });

  emit({ type: 'verdict:synthesizing' });
  console.log('[judge] Synthesizing final verdict...');
  const verdict = await synthesizeVerdict({
    person,
    submissionText: submission.text,
    subVerdicts,
    judgingContext,
    openai,
  });

  emit({ type: 'verdict:done', data: { verdict } });
  return {
    person,
    submission: { items, label, sources: submission.sources },
    judging_context: judgingContext ?? null,
    sub_verdicts: subVerdicts,
    verdict,
  };
}

async function loadContextIds(profileDir, person) {
  try {
    const raw = await readFile(`${profileDir}/contexts.json`, 'utf8');
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `No saved context IDs found for ${person} at ${profileDir}/contexts.json. Run buildTasteProfile first.`
    );
  }
}
