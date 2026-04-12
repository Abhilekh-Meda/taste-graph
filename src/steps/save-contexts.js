function citationUrls(citations) {
  return (citations ?? []).flatMap((c) => {
    try {
      return Object.values(JSON.parse(c.summary || '{}')).flat().map((x) => x.url).filter(Boolean);
    } catch { return []; }
  });
}

export async function saveToContexts(name, discovery, tasteProfile, nia) {
  console.log('\n[contexts] Saving to Nia Contexts...');
  const personTag = name.toLowerCase().replace(/\s+/g, '-');
  const jobs = [];

  if (discovery.oracle_report) {
    jobs.push(
      nia.saveContext({
        title: `${name} — Online Presence Discovery`,
        summary: `All public URLs and online presence found for ${name}`,
        content: discovery.oracle_report,
        tags: [personTag, 'discovery'],
        metadata: { person: name, type: 'discovery', source_count: discovery.sources.length },
      })
      .then(() => console.log(`[contexts] ✓ discovery`))
      .catch((e) => console.error(`[contexts] ✗ discovery: ${e.message}`))
    );
  }

  for (const [key, val] of Object.entries(tasteProfile)) {
    if (!val.final_report) continue;

    const urls = citationUrls(val.citations);
    const content = val.final_report
      + (urls.length ? `\n\n## Sources\n${urls.map((u) => `- ${u}`).join('\n')}` : '');

    jobs.push(
      nia.saveContext({
        title: `${name} — ${val.label}`,
        summary: `${val.label} for ${name}'s taste profile`,
        content,
        tags: [personTag, key],
        metadata: { person: name, type: 'taste_dimension', dimension: key, citation_count: urls.length },
      })
      .then(() => console.log(`[contexts] ✓ ${key} (${urls.length} citations)`))
      .catch((e) => console.error(`[contexts] ✗ ${key}: ${e.message}`))
    );
  }

  await Promise.allSettled(jobs);
  console.log('[contexts] Done');
}
