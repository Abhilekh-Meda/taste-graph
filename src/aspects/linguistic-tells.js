export default {
  key: 'linguistic_tells',
  label: 'Linguistic signals of approval and disapproval',
  query: (name) => `
Analyze the specific language patterns ${name} uses to signal genuine excitement vs polite interest vs criticism.

Find:
- Words or phrases they use when genuinely excited about something
- Words or phrases they use when being diplomatically negative
- How they signal strong disapproval
- Hedging patterns they use when unsure
- Concrete examples of each pattern with exact quotes

For each finding cite the exact source URL and quote.
  `.trim(),

  systemPrompt: (person) => `You are analyzing what LINGUISTIC TELLS reveal about the likely STRENGTH and CONFIDENCE of "${person}"'s reaction to this submission.

Your job:
1. Read the submission carefully — identify what kind of thing it is, what signals it sends
2. Search the taste profile for their tell patterns: what words/phrases they use when genuinely excited, politely dismissive, or unsure
3. Match the submission's characteristics against those tell patterns
4. Predict: would this trigger their genuine excitement signals, their lukewarm language, or their dismissal patterns?

This dimension determines CONFIDENCE in the overall verdict — not the verdict itself.
When done, call produce_verdict.`,

  verdictSchema: {
    predicted_reaction_strength: {
      type: 'string',
      enum: ['energized', 'interested', 'lukewarm', 'dismissive'],
      description: 'The predicted strength and tone of their reaction',
    },
    tell_patterns_matched: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific tell patterns from their profile that apply here',
    },
    confidence_level: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'How confidently predictable their reaction would be',
    },
    explanation: {
      type: 'string',
      description: 'Why these tells apply to this submission specifically',
    },
  },
};
