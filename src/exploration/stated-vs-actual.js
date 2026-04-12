export default {
  key: 'stated_vs_actual',
  label: 'Stated values vs actual reactions',
  query: (name) => `
Analyze ${name}'s taste by finding the gap between what they SAY they value and what they ACTUALLY respond well to.

Find:
- Their explicitly stated values, principles, and aesthetic criteria from essays, interviews, and talks
- Specific things they have publicly praised, endorsed, or expressed excitement about
- Specific things they have publicly criticized, dismissed, or expressed skepticism about
- Cases where their actual reactions contradict their stated principles
- The most revealing contradictions — where their gut reaction diverged from their stated framework

For each finding cite the exact source URL and quote where possible.
  `.trim(),

  systemPrompt: (person) => `You are the primary verdict engine analyzing how "${person}" would react to a submission.
You determine the MATCH between the submission and their ACTUAL endorsement patterns — not their stated principles.

Investigation approach:
- Start by identifying the submission's domain, approach, and key properties. Search broadly for what they actually praise and criticize in this domain.
- Then drill into the specific properties of the submission. Search for reactions to things with similar characteristics.
- Hunt for contradictions — cases where their stated values conflict with their actual reactions relevant to this submission.
- Keep going until you have both loves AND hates with evidence. If you only found one side, search for the other.

You are the most important dimension. Your match_score is the base score for the entire verdict. Be thorough — take as many turns as you need.`,

  verdictSchema: {
    match_score: {
      type: 'integer',
      description: '1-10. How well the submission matches their ACTUAL endorsement patterns (not stated principles). This is the base score for the entire verdict.',
    },
    summary: {
      type: 'string',
      description: 'A 1-2 sentence reaction in the person\'s voice — what they would actually say about this submission if asked. Use their natural tone.',
    },
    loves: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          aspect: { type: 'string', description: 'What about the submission they would praise' },
          because: { type: 'string', description: 'Why — grounded in their actual past endorsements' },
          evidence: {
            type: 'array',
            description: 'Evidence items supporting this claim. More items = higher confidence. Multiple inferred items add up.',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['direct_quote', 'documented_reaction', 'consistent_pattern', 'single_source', 'inferred', 'extrapolated'],
                  description: 'direct_quote=1.0, documented_reaction=0.8, consistent_pattern=0.7, single_source=0.4, inferred=0.25, extrapolated=0.1. Multiple items add up.',
                },
                source: { type: 'string', description: 'Essay name, interview, tweet, funding decision, etc.' },
                quote: { type: 'string', description: 'Exact words if available, or description of the documented reaction. Empty string if none.' },
              },
              required: ['type', 'source'],
            },
          },
        },
        required: ['aspect', 'because', 'evidence'],
      },
    },
    hates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          aspect: { type: 'string', description: 'What about the submission they would criticize' },
          because: { type: 'string', description: 'Why — grounded in their actual past criticisms' },
          evidence: {
            type: 'array',
            description: 'Evidence items. Multiple inferred items add up to higher confidence.',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['direct_quote', 'documented_reaction', 'consistent_pattern', 'single_source', 'inferred', 'extrapolated'],
                },
                source: { type: 'string' },
                quote: { type: 'string', description: 'Exact words or description of the reaction.' },
              },
              required: ['type', 'source'],
            },
          },
        },
        required: ['aspect', 'because', 'evidence'],
      },
    },
    would_change: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          suggestion: { type: 'string', description: 'Specific actionable thing they would tell you to fix or improve' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['direct_quote', 'documented_reaction', 'consistent_pattern', 'single_source', 'inferred', 'extrapolated'] },
                source: { type: 'string' },
                quote: { type: 'string' },
              },
              required: ['type', 'source'],
            },
          },
        },
        required: ['suggestion', 'evidence'],
      },
      description: 'Actionable suggestions, each backed by evidence.',
    },
    contradiction: {
      type: 'object',
      properties: {
        present: { type: 'boolean' },
        stated_principle: { type: 'string', description: 'What they claim to value' },
        actual_pattern: { type: 'string', description: 'What they actually endorse that conflicts' },
        tension: { type: 'string', description: 'How this contradiction specifically affects the verdict on this submission' },
      },
      required: ['present'],
    },
  },
};
