import { discoverPerson } from './steps/discover.js';
import { indexSources } from './steps/index-sources.js';
import { runAspectOracles } from './steps/run-aspects.js';
import { saveToContexts } from './steps/save-contexts.js';

export async function buildTasteProfile(name, nia) {
  console.log(`\n=== Building taste profile for: ${name} ===\n`);

  const discovery = await discoverPerson(name, nia);
  console.log(`[pipeline] Discovered ${discovery.sources.length} sources | comparison:`, discovery.comparison);

  const { succeeded, failed } = await indexSources(discovery.sources, name, nia);
  const indexedSourceIds = succeeded.map((s) => s.niasource?.id).filter(Boolean);
  console.log(`[pipeline] Indexed ${indexedSourceIds.length} sources (${failed.length} failed)`);

  const tasteProfile = await runAspectOracles(name, nia, indexedSourceIds);

  await saveToContexts(name, discovery, tasteProfile, nia);

  return {
    person: name,
    discovery,
    indexing: { succeeded: succeeded.length, failed: failed.length },
    profile: tasteProfile,
  };
}
