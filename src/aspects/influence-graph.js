export default {
  key: 'influence_graph',
  label: 'Intellectual lineage and influences',
  query: (name) => `
Map who and what has shaped ${name}'s taste and worldview.

Find:
- People they explicitly cite as influences or mentors
- Books, ideas, or movements they frequently reference
- Who they defer to or quote approvingly
- The intellectual traditions or schools of thought they belong to
- People they have publicly disagreed with and why

For each finding cite the exact source URL and quote.
  `.trim(),
};
