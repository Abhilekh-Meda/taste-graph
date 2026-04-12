const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 5 * 60_000;

const SOURCE_TYPE = {
  pdf: 'research_paper',
  github: 'repository',
};

export async function indexSources(sources, personName, nia) {
  const indexable = sources.filter((s) => s.url);
  console.log(`[index] Indexing ${indexable.length} sources for ${personName}`);

  const results = await Promise.allSettled(
    indexable.map((source) => indexAndWait(source, personName, nia))
  );

  const succeeded = [];
  const failed = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      succeeded.push({ source: indexable[i], niasource: result.value });
    } else {
      failed.push({ source: indexable[i], error: result.reason?.message });
      console.error(`[index] Failed: ${indexable[i].url} — ${result.reason?.message}`);
    }
  });

  console.log(`[index] Done: ${succeeded.length} ready, ${failed.length} failed`);
  return { succeeded, failed };
}

async function indexAndWait(source, personName, nia) {
  const type = SOURCE_TYPE[source.type] ?? 'documentation';
  const shouldCrawl = ['blog', 'substack', 'essay'].includes(source.type);

  console.log(`[index] → ${source.type} | ${source.url}`);

  const created = await nia.createSource(type, source.url, {
    displayName: `${personName} — ${source.description || source.type}`,
    crawlEntireDomain: shouldCrawl,
    maxDepth: shouldCrawl ? 3 : 1,
  });

  if (created.status === 'completed') return created;

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const updated = await nia.getSource(created.id);
    console.log(`[index] ${source.url} — status: ${updated.status}`);
    if (updated.status === 'completed') return updated;
    if (updated.status === 'failed') throw new Error(`Indexing failed for ${source.url}`);
  }

  throw new Error(`Indexing timed out for ${source.url}`);
}
