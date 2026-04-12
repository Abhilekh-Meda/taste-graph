import { discoverPerson } from './discover.js';
import { indexSources } from './index-sources.js';
import { runAspectOracles } from './aspects.js';

export async function buildTasteProfile(name, nia) {
  console.log(`\n=== Building taste profile for: ${name} ===\n`);

  // Phase 1: Discover all URLs
  const discovery = await discoverPerson(name, nia);
  console.log(`\n[pipeline] Discovered ${discovery.sources?.length ?? 0} sources`);
  console.log('[pipeline] Summary:', discovery.summary);

  // Phase 2: Index everything
  const { succeeded, failed } = await indexSources(discovery.sources ?? [], name, nia);
  const indexedSourceIds = succeeded
    .map((s) => s.niasource?.id || s.niasource?.source_id)
    .filter(Boolean);

  console.log(`[pipeline] Indexed ${indexedSourceIds.length} sources`);

  // Phase 3: Run aspect oracles across indexed corpus
  const tasteProfile = await runAspectOracles(name, nia, indexedSourceIds);

  return {
    person: name,
    discovery,
    indexing: { succeeded: succeeded.length, failed: failed.length },
    profile: tasteProfile,
  };
}
