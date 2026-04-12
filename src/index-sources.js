// Phase 2: Index discovered URLs into Nia

// Map our discovery types to Nia source types
function niaSoureType(discoveryType) {
  switch (discoveryType) {
    case 'blog':
    case 'substack':
    case 'interview':
    case 'essay':
    case 'news':
    case 'youtube':
    case 'other':
      return 'documentation';
    case 'pdf':
      return 'research_paper';
    case 'github':
      return 'repository';
    default:
      return 'documentation';
  }
}

function crawlOptions(source) {
  // For blogs/substacks, crawl the whole domain to get all posts
  const shouldCrawl = ['blog', 'substack', 'essay'].includes(source.type);
  return {
    crawlEntireDomain: shouldCrawl,
    maxDepth: shouldCrawl ? 3 : 1,
  };
}

export async function indexSources(sources, personName, nia) {
  // Skip Twitter/LinkedIn — those go through connectors, not source indexing
  const indexable = sources.filter(
    (s) => !['twitter', 'linkedin'].includes(s.type) && s.url
  );

  console.log(`[index] Indexing ${indexable.length} sources for ${personName}`);

  const results = await Promise.allSettled(
    indexable.map((source) => indexOne(source, personName, nia))
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

  console.log(`[index] Done: ${succeeded.length} indexed, ${failed.length} failed`);
  return { succeeded, failed };
}

async function indexOne(source, personName, nia) {
  const sourceType = niaSoureType(source.type);
  const { crawlEntireDomain, maxDepth } = crawlOptions(source);

  console.log(`[index] → ${source.type} | ${source.url}`);

  const result = await nia.createSource(sourceType, source.url, {
    displayName: `${personName} — ${source.description || source.type}`,
    crawlEntireDomain,
    maxDepth,
  });

  return result;
}
