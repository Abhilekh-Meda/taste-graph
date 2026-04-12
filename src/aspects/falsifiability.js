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
};
