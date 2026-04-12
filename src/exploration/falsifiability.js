export default {
  key: 'falsifiability',
  label: 'Known public reactions for model testing',
  query: (name) => `
Find specific documented cases where ${name} publicly reacted to something — praised it, criticized it, funded it, rejected it, or made a prediction about it. These will be used to test a taste model against known ground truth.

Find as many concrete, verifiable reactions as possible:
- Investments they made or passed on with stated reasoning
- Public endorsements of specific products, companies, or ideas
- Explicit predictions they made about specific things
- Public dismissals of things that became successful (or vice versa)

For each reaction: what was it, what did they say, what actually happened, and cite the exact source URL.
  `.trim(),

  systemPrompt: (person) => `You are the GROUNDING mechanism. You find the closest KNOWN PUBLIC REACTION from "${person}" to anchor the verdict.
Without you, the verdict is speculation. With you, it's anchored in something real — how they actually responded to something similar.

Investigation approach:
- Break the submission into matchable properties: domain, approach, audience, business model, claims. Form a hypothesis about what known reactions might be analogous.
- Search for known reactions in the submission's domain. Things they praised, funded, dismissed, or predicted on that are similar.
- Evaluate candidates for similarity. Search for additional anchors until you have 2-3 or exhaust the search space.
- If anchors conflict, that's valuable — keep searching to understand where the taste boundary lies.

Multiple anchors are better than one. Keep searching as long as you're finding new relevant reactions. The more anchors you find, the stronger the grounding.`,

  verdictSchema: {
    anchors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'The thing they publicly reacted to' },
          their_reaction: { type: 'string', description: 'What they said or did' },
          outcome: { type: 'string', description: 'What actually happened, if known' },
          similarity_to_submission: { type: 'string', enum: ['high', 'medium', 'low'] },
          what_matches: { type: 'string', description: 'Specifically what the submission has in common with this anchor' },
        },
        required: ['subject', 'their_reaction', 'similarity_to_submission'],
      },
      description: 'Known reactions that anchor the prediction. Aim for 2-3 if possible.',
    },
    anchors_agree: {
      type: 'boolean',
      description: 'Do the anchors point in the same direction? If false, the person is near a taste boundary.',
    },
    anchored_sentiment: {
      type: 'string',
      enum: ['positive', 'negative', 'mixed', 'unknown'],
      description: 'What the anchors collectively predict for this submission',
    },
    anchor_confidence: {
      type: 'string',
      enum: ['strong', 'moderate', 'weak', 'no_anchor'],
      description: 'How strongly the anchors ground the prediction. Strong = high similarity + agreeing anchors.',
    },
    anchor_note: {
      type: 'string',
      description: 'What the anchors predict and why. If anchors conflict, explain what the boundary is.',
    },
  },
};
