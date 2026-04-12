const MAX_CONCURRENT = 8;

const SOURCE_TYPE = {
  pdf: 'research_paper',
  github: 'repository',
};

export async function indexSources(sources, personName, nia, emit) {
  emit = emit ?? (() => {});
  const indexable = sources.filter((s) => s.url);
  console.log(`[index] Indexing ${indexable.length} sources for ${personName} (max ${MAX_CONCURRENT} concurrent)`);

  const tasks = indexable.map((source) => () => indexAndWait(source, personName, nia));
  const results = await withConcurrencyLimit(tasks, MAX_CONCURRENT);

  const succeeded = [];
  const failed = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      succeeded.push({ source: indexable[i], niasource: result.value });
      emit({ type: 'profile:source_indexed', data: { url: indexable[i].url, type: indexable[i].type } });
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

  const created = await nia.createSource({
    type,
    url: source.url,
    display_name: `${personName} — ${source.description || source.type}`,
    crawl_entire_domain: shouldCrawl,
    max_depth: shouldCrawl ? 3 : 1,
  });

  return nia.waitForSource(created.id, { maxWaitMs: 5 * 60_000 });
}

async function withConcurrencyLimit(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (err) {
        results[i] = { status: 'rejected', reason: err };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
