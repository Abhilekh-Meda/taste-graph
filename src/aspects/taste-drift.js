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

  systemPrompt: (person) => `You are analyzing whether the verdict on this submission is based on "${person}"'s CURRENT taste or a STALE version of it.
This is a modifier — you are not judging the submission directly, you are assessing temporal reliability.

Investigation approach:
- Search for how the person's views on this submission's domain have changed over time.
- Look for specific reversals or shifts. Did they used to criticize things like this but now praise them? Or vice versa?
- If a shift is found, keep searching to understand its impact. If no shift found, this dimension is neutral — produce verdict.

Keep it focused. If their taste hasn't drifted in this domain, say so and move on. Don't force a finding.`,

  verdictSchema: {
    temporal_relevance: {
      type: 'string',
      enum: ['current', 'dated', 'mixed'],
      description: 'Does the evidence base for this submission reflect their current taste or an older version?',
    },
    drift_adjustment: {
      type: 'string',
      enum: ['more_positive', 'more_negative', 'neutral'],
      description: 'Accounting for how their taste has shifted, should the base score go up, down, or stay?',
    },
    key_shift: {
      type: 'string',
      description: 'The single most relevant taste shift for this submission. Empty string if no relevant drift found.',
    },
    early_position: {
      type: 'string',
      description: 'What they would have said about this submission years ago, if different from now. Empty string if no change.',
    },
    current_position: {
      type: 'string',
      description: 'What they would say now. Empty string if no change from their historical position.',
    },
    recency_note: {
      type: 'string',
      description: 'One-sentence explanation of how drift affects this verdict. "No relevant drift" if none.',
    },
  },
};
