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
};
