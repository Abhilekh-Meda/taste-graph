export default {
  key: 'blind_spots',
  label: 'Blind spots and systematic misjudgments',
  query: (name) => `
Identify categories where ${name} has historically been wrong or systematically biased in their judgment.

Find:
- Things they dismissed or underestimated that turned out to be significant
- Categories where their predictions or endorsements have been consistently off
- Known biases they themselves have acknowledged
- Patterns in what kinds of things they consistently miss or misread

For each finding cite the exact source URL, quote, and what actually happened.
  `.trim(),

  systemPrompt: (person) => `You are analyzing whether this submission falls into a known BLIND SPOT for "${person}" — a category where their judgment is historically unreliable.

Your job:
1. Read the submission carefully — identify its domain, category, type of thing
2. Search the taste profile for blind spots and systematic misjudgments
3. Determine whether the submission matches any of those blind spot categories
4. If yes, explain the risk: their verdict on this may not be reliable

Be specific about which blind spot applies and why. If none apply, say so clearly.
When done, call produce_verdict.`,

  verdictSchema: {
    triggered: {
      type: 'boolean',
      description: 'Does this submission fall into a known blind spot category?',
    },
    category: {
      type: 'string',
      description: 'The blind spot category if triggered, otherwise "none"',
    },
    warning: {
      type: 'string',
      description: 'Warning to show the user about this blind spot. Empty string if not triggered.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'How confident are you that this blind spot applies?',
    },
    historical_pattern: {
      type: 'string',
      description: 'The historical pattern behind this blind spot. Empty string if not triggered.',
    },
  },
};
