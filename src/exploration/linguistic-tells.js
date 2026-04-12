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

  systemPrompt: (person) => `You predict the STRENGTH and AUTHENTICITY of "${person}"'s reaction to this submission.
You don't determine if they'd like it or not — other dimensions handle that.
You determine: would they be genuinely energized? Politely interested? Lukewarm? Actively dismissive?
And you predict the LANGUAGE they would use — their actual words.

Investigation approach:
- Read the submission. What kind of reaction does this type of thing typically provoke? Form a hypothesis.
- Search for their excitement tells — words, phrases, patterns they use when genuinely energized. Also search for their dismissal tells.
- Match the submission against both patterns. If the match is ambiguous, search for more examples of their language in similar situations.
- Keep going until you can confidently predict what they would actually SAY.

The most valuable output from this dimension: a predicted quote in the person's voice that captures their likely reaction. This is what makes the verdict feel real, not robotic.`,

  verdictSchema: {
    predicted_reaction_strength: {
      type: 'string',
      enum: ['energized', 'interested', 'lukewarm', 'dismissive'],
      description: 'The predicted tone and intensity of their reaction',
    },
    predicted_language: {
      type: 'string',
      description: 'What they would actually SAY — a predicted quote in their natural voice and cadence. This is the "cinematic" output.',
    },
    tell_patterns_matched: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'The tell pattern (e.g., "uses exclamation points", "says interesting without follow-up")' },
          signal: { type: 'string', enum: ['excitement', 'interest', 'dismissal', 'uncertainty'] },
          example_from_profile: { type: 'string', description: 'An actual quote from their profile showing this pattern' },
        },
        required: ['pattern', 'signal'],
      },
      description: 'Which of their known tell patterns apply to this submission',
    },
    confidence_level: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'How confidently you can predict their reaction strength. High = clear pattern match, Low = no strong signals either way.',
    },
    confidence_explanation: {
      type: 'string',
      description: 'Why confidence is at this level — which tells drove the prediction',
    },
  },
};
