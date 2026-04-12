import { ASPECTS } from '../exploration/index.js';
import { logOracleProgress } from './discover.js';

const MODELS = ['claude-sonnet-4-5-20250929', 'claude-opus-4-6'];

export async function runAspectOracles(name, nia, indexedSourceIds = [], emit) {
  emit = emit ?? (() => {});
  console.log(`[aspects] Running ${ASPECTS.length} oracles in parallel for ${name}`);

  ASPECTS.forEach((a) => emit({ type: 'profile:aspect_start', data: { key: a.key, label: a.label } }));

  const results = await Promise.allSettled(
    ASPECTS.map((aspect) => runWithRetry(aspect, name, nia, indexedSourceIds, emit))
  );

  const profile = {};
  results.forEach((result, i) => {
    const aspect = ASPECTS[i];
    if (result.status === 'fulfilled') {
      profile[aspect.key] = { label: aspect.label, ...result.value };
      console.log(`[aspects] ✓ ${aspect.label}`);
      emit({ type: 'profile:aspect_done', data: { key: aspect.key, label: aspect.label } });
    } else {
      profile[aspect.key] = { label: aspect.label, error: result.reason?.message };
      console.error(`[aspects] ✗ ${aspect.label}: ${result.reason?.message}`);
      emit({ type: 'profile:aspect_done', data: { key: aspect.key, label: aspect.label, error: result.reason?.message } });
    }
  });

  return profile;
}

async function runWithRetry(aspect, name, nia, dataSources, emit) {
  let lastError;

  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt];
    if (attempt > 0) {
      const delay = 2000 * 2 ** (attempt - 1);
      console.log(`[aspects] Retrying "${aspect.label}" with ${model} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const { job_id } = await nia.createOracleJob(aspect.query(name), { dataSources, model });
      console.log(`[aspects] Launched: ${aspect.label} (${model}, job: ${job_id})`);
      emit({ type: 'profile:aspect_progress', data: { key: aspect.key, message: `Researching ${aspect.label}...` } });
      return await streamResult(job_id, nia, aspect.key, emit);
    } catch (err) {
      lastError = err;
      console.warn(`[aspects] Attempt ${attempt + 1} failed for "${aspect.label}": ${err.message}`);
    }
  }

  throw lastError;
}

async function streamResult(job_id, nia, label, emit) {
  let final_report = '';
  let citations = [];
  const log = logOracleProgress(label);

  await nia.streamOracleJob(job_id, (chunk) => {
    log(chunk);
    if (chunk.type === 'tool_start') {
      emit({ type: 'profile:aspect_progress', data: { key: label, message: `${chunk.action} — ${(chunk.reason ?? '').slice(0, 100)}` } });
    }
    if (chunk.type === 'complete' && chunk.result) {
      final_report = chunk.result.final_report ?? '';
      citations = chunk.result.citations ?? [];
    }
  });

  if (!final_report) throw new Error('Oracle returned no report (terminated or timed out)');
  return { final_report, citations };
}
