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

  systemPrompt: (person) => `You are finding the CLOSEST KNOWN PUBLIC REACTION from "${person}" to anchor the verdict on this submission.

Your job:
1. Read the submission carefully — what category, what type of thing, what claims does it make
2. Search the taste profile for documented reactions to similar things — things they praised, funded, dismissed, or predicted on
3. Find the most analogous known reaction: something similar in domain, approach, or type to this submission
4. Use that anchor to ground the verdict — the prediction should be consistent with how they actually responded to the most similar thing

The anchor prevents hallucination. Ground the verdict in something real.
When done, call produce_verdict.`,

  verdictSchema: {
    analogous_subject: {
      type: 'string',
      description: 'The most similar known thing they publicly reacted to. "none found" if nothing matches.',
    },
    their_known_reaction: {
      type: 'string',
      description: 'What they actually said or did about that analogous thing',
    },
    similarity: {
      type: 'string',
      enum: ['high', 'medium', 'low', 'none'],
      description: 'How similar the analogy is to the current submission',
    },
    anchored_sentiment: {
      type: 'string',
      enum: ['positive', 'negative', 'mixed', 'unknown'],
      description: 'What sentiment the anchor implies for this submission',
    },
    anchor_note: {
      type: 'string',
      description: 'How the analogy applies and what it predicts about this submission',
    },
  },
};
