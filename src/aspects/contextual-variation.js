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
};
