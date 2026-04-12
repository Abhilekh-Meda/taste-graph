import { readFile } from 'fs/promises';
import { ingestSubmission } from './ingest-submission.js';
import { runVerdictAgents } from './run-verdict-agents.js';
import { synthesizeVerdict } from './synthesize.js';

// Main entry point for judging a submission against a person's taste profile.
//
// person:         "Paul Graham"
// submissionInput: URL, image URL, or plain text
// judgingContext:  e.g. "hackathon judge", "YC application decision", "cold DM"
// profileDir:     path to the profile folder (e.g. "./profiles/paul-graham")
// nia:            NiaClient instance
// openai:         OpenAI instance
export async function judge({ person, submissionInput, judgingContext, profileDir, nia, openai }) {
  console.log(`\n=== Judging submission for ${person} ===`);
  console.log(`Context: ${judgingContext || 'general'}`);
  console.log(`Input: ${submissionInput.slice(0, 120)}...\n`);

  // Load context IDs for this person's taste profile
  const contextIds = await loadContextIds(profileDir, person);

  // Ingest the submission into a content block + plain text
  console.log('[judge] Ingesting submission...');
  const submission = await ingestSubmission(submissionInput);
  console.log(`[judge] Ingested as: ${submission.kind}`);

  // Run 7 aspect agents in parallel
  const subVerdicts = await runVerdictAgents({
    person,
    contextIds,
    submissionBlock: submission.block,
    judgingContext,
    nia,
    openai,
  });

  // Synthesize into final verdict
  console.log('[judge] Synthesizing final verdict...');
  const verdict = await synthesizeVerdict({
    person,
    submissionText: submission.text,
    subVerdicts,
    judgingContext,
    openai,
  });

  return {
    person,
    submission: { input: submissionInput, kind: submission.kind },
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
