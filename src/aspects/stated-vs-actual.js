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

  systemPrompt: (person) => `You are analyzing how "${person}" would react to a submission based on the GAP between what they SAY they value vs what they ACTUALLY respond well to.

Your job:
1. Read the submission carefully
2. Search the taste profile to find: their stated principles, things they have praised, things they have criticized, and known contradictions
3. Determine how well the submission matches their ACTUAL endorsement patterns (not just stated principles)
4. Identify any contradiction — where their stated values say one thing but their actual reaction pattern suggests another

Search iteratively. Start broad, then drill into specifics that match the submission's domain.
When you have enough evidence, call produce_verdict with your analysis.`,

  verdictSchema: {
    match_score: {
      type: 'integer',
      minimum: 1,
      maximum: 10,
      description: 'How well does the submission match their actual endorsement patterns? 1=strong mismatch, 10=strong match',
    },
    loves: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          aspect: { type: 'string' },
          because: { type: 'string' },
          citation: { type: 'string' },
        },
        required: ['aspect', 'because'],
      },
      description: 'Specific things about the submission they would genuinely praise, with evidence',
    },
    hates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          aspect: { type: 'string' },
          because: { type: 'string' },
          citation: { type: 'string' },
        },
        required: ['aspect', 'because'],
      },
      description: 'Specific things about the submission they would criticize, with evidence',
    },
    contradiction: {
      type: 'object',
      properties: {
        present: { type: 'boolean' },
        stated_principle: { type: 'string' },
        actual_pattern: { type: 'string' },
        tension: { type: 'string', description: 'How the contradiction affects the verdict' },
      },
      required: ['present'],
      description: 'Whether their stated values conflict with what they actually endorse here',
    },
  },
};
