import { discoverPerson } from './discover.js';
import { indexSources } from './index-sources.js';
import { runAspectOracles } from './run-aspects.js';
import { saveToContexts } from './save-contexts.js';

export async function buildTasteProfile(name, nia, onProgress) {
  const emit = onProgress ?? (() => {});
  console.log(`\n=== Building taste profile for: ${name} ===\n`);
  emit({ type: 'profile:start', data: { person: name } });

  const discovery = await discoverPerson(name, nia, emit);
  console.log(`[pipeline] Discovered ${discovery.sources.length} sources`);
  emit({ type: 'profile:discovery_done', data: { sources_found: discovery.sources.length, comparison: discovery.comparison } });

  emit({ type: 'profile:indexing', data: { count: discovery.sources.length } });
  const { succeeded, failed } = await indexSources(discovery.sources, name, nia, emit);
  const indexedSourceIds = succeeded.map((s) => s.niasource?.id).filter(Boolean);
  console.log(`[pipeline] Indexed ${indexedSourceIds.length} sources (${failed.length} failed)`);
  emit({ type: 'profile:indexing_done', data: { indexed: indexedSourceIds.length, failed: failed.length } });

  const tasteProfile = await runAspectOracles(name, nia, indexedSourceIds, emit);

  emit({ type: 'profile:saving', data: { message: 'Saving taste profile to memory...' } });
  const contextIds = await saveToContexts(name, discovery, tasteProfile, nia);

  emit({ type: 'profile:done', data: { dimensions: Object.keys(tasteProfile).length } });
  return {
    person: name,
    discovery,
    indexing: { succeeded: succeeded.length, failed: failed.length },
    profile: tasteProfile,
    contextIds,
  };
}
