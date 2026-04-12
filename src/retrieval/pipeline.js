import { discoverPerson } from './discover.js';
import { indexSources } from './index-sources.js';
import { runAspectOracles } from './run-aspects.js';
import { saveToContexts } from './save-contexts.js';

export async function buildTasteProfile(name, nia) {
  console.log(`\n=== Building taste profile for: ${name} ===\n`);

  const discovery = await discoverPerson(name, nia);
  console.log(`[pipeline] Discovered ${discovery.sources.length} sources | comparison:`, discovery.comparison);

  const { succeeded, failed } = await indexSources(discovery.sources, name, nia);
  const indexedSourceIds = succeeded.map((s) => s.niasource?.id).filter(Boolean);
  console.log(`[pipeline] Indexed ${indexedSourceIds.length} sources (${failed.length} failed)`);

  const tasteProfile = await runAspectOracles(name, nia, indexedSourceIds);

  const contextIds = await saveToContexts(name, discovery, tasteProfile, nia);

  return {
    person: name,
    discovery,
    indexing: { succeeded: succeeded.length, failed: failed.length },
    profile: tasteProfile,
    contextIds,
  };
}
