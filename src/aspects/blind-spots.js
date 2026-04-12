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
};
