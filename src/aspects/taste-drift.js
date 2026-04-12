export default {
  key: 'taste_drift',
  label: 'Taste drift over time',
  query: (name) => `
Map how ${name}'s taste and judgment has evolved over time.

Find:
- Early positions or opinions they later reversed or softened
- Topics where their view has clearly shifted
- What they valued at different stages of their career
- Whether their standards have gotten stricter or more relaxed over time
- Any public acknowledgments of having been wrong

For each finding cite the exact source URL, quote, and approximate date.
  `.trim(),

  systemPrompt: (person) => `You are analyzing how "${person}"'s taste has DRIFTED over time and what that means for judging this submission.

Your job:
1. Read the submission carefully
2. Search the taste profile to find: how their values have shifted, what they valued early vs now, any reversals
3. Determine whether the submission aligns more with their current taste or an outdated version of it
4. Assess whether recent signals should amplify or discount the overall verdict

Recent signals matter more than old ones. Flag if the submission is being evaluated against stale taste.
When you have enough, call produce_verdict.`,

  verdictSchema: {
    temporal_relevance: {
      type: 'string',
      enum: ['current', 'dated', 'mixed'],
      description: 'Does this submission align with their current taste or an older version of it?',
    },
    recency_note: {
      type: 'string',
      description: 'Explanation of how their taste drift affects this verdict',
    },
    drift_adjustment: {
      type: 'string',
      enum: ['more_positive', 'more_negative', 'neutral'],
      description: 'Does accounting for drift make the verdict better or worse for this submission?',
    },
    key_shift: {
      type: 'string',
      description: 'The most relevant taste shift to this submission, if any. Empty string if none.',
    },
  },
};
