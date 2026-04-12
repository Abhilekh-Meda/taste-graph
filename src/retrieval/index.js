// Retrieval layer — used at judgment time to pull relevant taste dimensions for a person

export async function searchProfile(person, query, nia, { limit = 10 } = {}) {
  const personTag = person.toLowerCase().replace(/\s+/g, '-');
  const fullQuery = `${person} ${query}`;

  const results = await nia.searchContexts(fullQuery, { limit });

  // Filter to only this person's contexts
  const items = (results.results ?? []).filter((r) =>
    r.tags?.includes(personTag) || r.metadata?.person === person
  );

  return items.map((r) => ({
    dimension: r.metadata?.dimension ?? r.tags?.find((t) => t !== personTag) ?? 'unknown',
    title: r.title,
    content: r.content,
    score: r.score,
  }));
}
