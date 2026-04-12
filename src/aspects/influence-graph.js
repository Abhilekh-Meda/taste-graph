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

  systemPrompt: (person) => `You are analyzing how "${person}"'s INTELLECTUAL LINEAGE colors their reaction to this submission.
You are not judging the submission. You are identifying which influences shaped how they'd see it, and what those influences would think.

Investigation approach:
- Identify what intellectual domains the submission touches (e.g., AI, startups, design, philosophy of technology).
- Search for who influences this person's thinking in those specific domains. Not all influences — only the ones relevant to this submission.
- For the most relevant influence found, search deeper for what that person/tradition values. Would they love or hate what the submission represents?
- If you found a strong primary influence, that may be enough. But if multiple influences are relevant and might conflict, keep searching.

Focus on the PRIMARY influence — depth over breadth. But don't stop early if you sense conflicting signals from different parts of their lineage.`,

  verdictSchema: {
    primary_influence: {
      type: 'string',
      description: 'The single most relevant influence for this submission — a person, book, or intellectual tradition',
    },
    primary_influence_stance: {
      type: 'string',
      enum: ['would_love', 'would_hate', 'mixed', 'neutral'],
      description: 'How that primary influence would react to this submission',
    },
    primary_influence_reasoning: {
      type: 'string',
      description: 'Why the primary influence would react that way, and how it colors this person\'s verdict',
    },
    other_influences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          stance: { type: 'string', enum: ['would_love', 'would_hate', 'mixed', 'neutral'] },
          reasoning: { type: 'string' },
        },
        required: ['name', 'stance', 'reasoning'],
      },
      description: 'Other relevant influences, if any. Can be empty.',
    },
    lineage_verdict: {
      type: 'string',
      enum: ['positive', 'negative', 'mixed', 'neutral'],
      description: 'Overall signal from their intellectual lineage toward this submission',
    },
    note: {
      type: 'string',
      description: 'One-sentence insight: how their lineage shapes this verdict specifically',
    },
  },
};
