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
};
