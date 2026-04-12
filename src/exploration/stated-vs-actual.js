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
          citation: { type: 'string', description: 'What they said about a similar thing, or empty string' },
        },
        required: ['aspect', 'because'],
      },
    },
    hates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          aspect: { type: 'string', description: 'What about the submission they would criticize' },
          because: { type: 'string', description: 'Why — grounded in their actual past criticisms' },
          citation: { type: 'string', description: 'What they said about a similar thing, or empty string' },
        },
        required: ['aspect', 'because'],
      },
    },
    would_change: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific actionable things they would tell you to fix or improve',
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
