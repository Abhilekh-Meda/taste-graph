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

  systemPrompt: (person) => `You are analyzing how the JUDGING CONTEXT changes what "${person}" would care about when evaluating this submission.
The same person judges a hackathon project differently than a YC application differently than a cold DM.

Investigation approach:
- Read the submission AND the judging context carefully. What does this context mean for stakes, expectations, and standards?
- Search for how this person behaves specifically in this type of context. What do they look for? What standards do they apply?
- Search for their default/general standards to identify the DELTA — what's different about this context?
- Keep searching if the contrast is unclear or if you find evidence of more nuanced context-dependent behavior.

If no judging context was provided, search for what their default judging mode is and note that context wasn't specified.
The value you add: telling the user exactly which criteria shift when the context changes, so they can see what matters HERE vs in general.`,

  verdictSchema: {
    context_applied: {
      type: 'string',
      description: 'The judging context (from user input, or "general/default" if none specified)',
    },
    standard_shift: {
      type: 'string',
      enum: ['stricter', 'more_lenient', 'different_focus', 'neutral'],
      description: 'How this context changes their judgment compared to their default',
    },
    key_criteria_for_context: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criterion: { type: 'string', description: 'What they care about in this context' },
          why: { type: 'string', description: 'Why this criterion matters specifically in this context' },
        },
        required: ['criterion', 'why'],
      },
      description: 'The specific criteria they emphasize in this context, with reasoning',
    },
    submission_alignment: {
      type: 'string',
      description: 'How well the submission meets the CONTEXT-SPECIFIC criteria (not their general criteria)',
    },
    score_delta: {
      type: 'integer',
      description: 'How much this context shifts the score vs their default (+3 = more favorable in this context, -2 = less favorable). Range: -5 to +5.',
    },
    alternative_contexts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          context_name: { type: 'string', description: 'Name of this alternative context, e.g. "YC application", "cold email pitch", "public keynote"' },
          score_delta: { type: 'integer', description: 'How this context shifts the score vs default. Range: -5 to +5.' },
          key_difference: { type: 'string', description: 'The one thing that changes most in this context' },
        },
        required: ['context_name', 'score_delta', 'key_difference'],
      },
      description: '2-3 other contexts for this person and how the score would shift in each. Makes the contextual variance visible.',
    },
    note: {
      type: 'string',
      description: 'How the context specifically shifts the verdict. E.g., "At a hackathon they value ambition over polish, which benefits this submission."',
    },
  },
};
