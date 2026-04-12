export default {
  key: 'contextual_variation',
  label: 'How judgment shifts by context',
  query: (name) => `
Analyze how ${name}'s standards and judgment change depending on context — stakes, audience, domain, or framing.

Find:
- How they judge differently in high-stakes vs low-stakes situations
- Whether they apply different standards in different domains
- How their public statements differ from their revealed preferences
- Evidence of code-switching between contexts (formal vs informal, public vs private)

For each finding cite the exact source URL and quote.
  `.trim(),

  systemPrompt: (person) => `You are analyzing how the JUDGING CONTEXT shifts "${person}"'s standards for this submission.

Your job:
1. Read the submission carefully
2. Note the judging context provided (e.g. "hackathon judge", "YC decision", "cold DM")
3. Search the taste profile for how their standards change by context — what they care about in different situations
4. Determine what criteria they would apply in THIS specific context, and how that differs from their default
5. Assess whether the context makes their verdict stricter or more lenient for this submission

Context changes everything. Make sure the verdict reflects how they'd judge in THIS situation.
When done, call produce_verdict.`,

  verdictSchema: {
    context_applied: {
      type: 'string',
      description: 'The judging context being evaluated in (from user input)',
    },
    standard_shift: {
      type: 'string',
      enum: ['stricter', 'more_lenient', 'neutral'],
      description: 'Does this context make their judgment stricter or more lenient than their default?',
    },
    key_criteria_for_context: {
      type: 'array',
      items: { type: 'string' },
      description: 'The specific criteria they emphasize in this context',
    },
    note: {
      type: 'string',
      description: 'How the context specifically shifts their verdict on this submission',
    },
  },
};
