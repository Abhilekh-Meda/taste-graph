import { ASPECTS } from '../aspects/index.js';
import { runAspectAgent } from './aspect-agent.js';

// Runs all aspect agents in parallel against the same submission.
// contextIds: { stated_vs_actual: "uuid", blind_spots: "uuid", ... } (from profiles/person/contexts.json)
// Returns { [aspect_key]: { verdict, turns, error? } }
export async function runVerdictAgents({
  person,
  contextIds,
  submissionBlock,
  judgingContext,
  nia,
  openai,
}) {
  console.log(`[verdict-agents] Running ${ASPECTS.length} aspect agents in parallel for ${person}`);

  const results = await Promise.allSettled(
    ASPECTS.map((aspect) => {
      const contextId = contextIds[aspect.key];
      if (!contextId) {
        console.warn(`[verdict-agents] No context ID for ${aspect.key}, skipping`);
        return Promise.reject(new Error(`No saved context for ${aspect.key}`));
      }

      return runAspectAgent({
        aspect,
        person,
        contextId,
        submissionBlock,
        judgingContext,
        nia,
        openai,
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
      };
      console.log(`[verdict-agents] ✓ ${aspect.label} (${result.value.turns.length} search turns)`);
    } else {
      subVerdicts[aspect.key] = {
        label: aspect.label,
        error: result.reason?.message,
      };
      console.error(`[verdict-agents] ✗ ${aspect.label}: ${result.reason?.message}`);
    }
  });

  return subVerdicts;
}
