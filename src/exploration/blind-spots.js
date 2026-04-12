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

  systemPrompt: (person) => `You are checking whether this submission falls into a known BLIND SPOT for "${person}".
This is a binary check with severity. Either the submission is in a category where their judgment is historically unreliable, or it isn't.

Investigation approach:
- Identify every category the submission could fall into (domain, approach, audience, business model, technology type).
- Search for blind spots matching those categories. Has the person historically misjudged things like this?
- If a match is found, keep searching for the specific historical pattern — what they got wrong, how many times, whether they've acknowledged it. Build a strong case.
- If no match after a couple of searches, produce verdict as "not triggered."

Be honest. If no blind spot applies, say so. Don't stretch a weak match into a warning — false warnings are worse than none.`,

  verdictSchema: {
    triggered: {
      type: 'boolean',
      description: 'Does this submission fall into a known blind spot category?',
    },
    category: {
      type: 'string',
      description: 'The blind spot category if triggered. "none" if not.',
    },
    warning: {
      type: 'string',
      description: 'User-facing warning about this blind spot. Written as: "Known blind spot: [person] has historically [pattern]. Apply a correction if your submission is in this category." Empty string if not triggered.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'How strongly the submission matches the blind spot category',
    },
    historical_pattern: {
      type: 'string',
      description: 'What they got wrong and how many times, with specifics. Empty string if not triggered.',
    },
    correction_suggested: {
      type: 'string',
      description: 'How the user should adjust for this blind spot, e.g. "Their score on this type of thing is typically 2 points too low." Empty string if not triggered.',
    },
  },
};
