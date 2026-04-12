import { ASPECTS } from '../exploration/index.js';
import { runAspectAgent } from './aspect-agent.js';

// Runs all aspect agents in parallel against the same submission.
// contextIds: { stated_vs_actual: "uuid", blind_spots: "uuid", ... } (from profiles/person/contexts.json)
// Returns { [aspect_key]: { verdict, turns, error? } }
export async function runVerdictAgents({
  person,
  contextIds,
  submissionBlocks,
  judgingContext,
  nia,
  openai,
  onProgress,
}) {
  const emit = onProgress ?? (() => {});
  console.log(`[verdict-agents] Running ${ASPECTS.length} aspect agents in parallel for ${person}`);

  const results = await Promise.allSettled(
    ASPECTS.map((aspect) => {
      const contextId = contextIds[aspect.key];
      if (!contextId) {
        console.warn(`[verdict-agents] No context ID for ${aspect.key}, skipping`);
        return Promise.reject(new Error(`No saved context for ${aspect.key}`));
      }

      emit({ type: 'verdict:agent_start', data: { key: aspect.key, label: aspect.label } });

      return runAspectAgent({
        aspect,
        person,
        contextId,
        submissionBlocks,
        judgingContext,
        nia,
        openai,
        onProgress: emit,
      });
    })
  );

  const subVerdicts = {};

  results.forEach((result, i) => {
    const aspect = ASPECTS[i];
    if (result.status === 'fulfilled') {
      subVerdicts[aspect.key] = {
        label: aspect.label,
        verdict: result.value.verdict,
        turns: result.value.turns,
        forced: result.value.forced ?? false,
        final_reasoning: result.value.final_reasoning ?? null,
      };
      console.log(`[verdict-agents] ✓ ${aspect.label} (${result.value.turns.length} search turns)`);
      emit({ type: 'verdict:agent_done', data: { key: aspect.key, label: aspect.label } });
    } else {
      subVerdicts[aspect.key] = {
        label: aspect.label,
        error: result.reason?.message,
      };
      console.error(`[verdict-agents] ✗ ${aspect.label}: ${result.reason?.message}`);
      emit({ type: 'verdict:agent_done', data: { key: aspect.key, label: aspect.label, error: result.reason?.message } });
    }
  });

  return subVerdicts;
}
