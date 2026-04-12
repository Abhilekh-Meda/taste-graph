export default {
  key: 'stated_vs_actual',
  label: 'Stated values vs actual reactions',
  query: (name) => `
Analyze ${name}'s taste by finding the gap between what they SAY they value and what they ACTUALLY respond well to.

Find:
- Their explicitly stated values, principles, and aesthetic criteria from essays, interviews, and talks
- Specific things they have publicly praised, endorsed, or expressed excitement about
- Specific things they have publicly criticized, dismissed, or expressed skepticism about
- Cases where their actual reactions contradict their stated principles
- The most revealing contradictions — where their gut reaction diverged from their stated framework

For each finding cite the exact source URL and quote where possible.
  `.trim(),
};
