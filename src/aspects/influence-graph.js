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

  systemPrompt: (person) => `You are analyzing how "${person}"'s INTELLECTUAL LINEAGE — the people and ideas that shaped them — would color their reaction to this submission.

Your job:
1. Read the submission carefully
2. Search the taste profile for key influences: mentors, thinkers they defer to, intellectual traditions they belong to
3. Determine which influences are most relevant to this submission's domain
4. Assess whether those influences would react positively or negatively — and how that colors this person's likely verdict

Think: which of their influences does this submission resonate with, and which does it clash with?
When done, call produce_verdict.`,

  verdictSchema: {
    relevant_influences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          stance: { type: 'string', enum: ['would_love', 'would_hate', 'neutral'] },
          reasoning: { type: 'string' },
        },
        required: ['name', 'stance', 'reasoning'],
      },
      description: 'Influences most relevant to this submission and how they would react',
    },
    lineage_verdict: {
      type: 'string',
      enum: ['positive', 'negative', 'mixed', 'neutral'],
      description: 'Overall signal from their intellectual lineage toward this submission',
    },
    note: {
      type: 'string',
      description: 'Key insight about how their lineage shapes this specific verdict',
    },
  },
};
