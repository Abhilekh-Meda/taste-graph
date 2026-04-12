// Takes all 7 sub-verdicts and synthesizes them into the final structured verdict.
// One OpenAI call — pure reasoning, no retrieval needed here.
export async function synthesizeVerdict({ person, submissionText, subVerdicts, judgingContext, openai }) {
  const prompt = buildSynthesisPrompt({ person, submissionText, subVerdicts, judgingContext });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are synthesizing a final verdict for how "${person}" would judge a submission.
You have been given pre-analyzed sub-verdicts from 7 taste dimensions. Your job is to synthesize them into one coherent, well-reasoned verdict.
Do not introduce new information — reason only from what the dimension analyses found.
Return valid JSON matching the schema exactly.`,
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    throw new Error('Synthesis returned invalid JSON');
  }
}

function buildSynthesisPrompt({ person, submissionText, subVerdicts, judgingContext }) {
  const dimensionSummaries = Object.entries(subVerdicts)
    .map(([key, val]) => {
      if (val.error) return `### ${val.label}\nERROR: ${val.error}`;
      return `### ${val.label}\n${JSON.stringify(val.verdict, null, 2)}`;
    })
    .join('\n\n');

  return `
## Submission
${submissionText}

## Judging Context
${judgingContext || 'General'}

## Dimension Analysis Results
${dimensionSummaries}

---

Synthesize these into a final verdict JSON with exactly this shape:

{
  "person": "${person}",
  "score": <integer 1-10, weighted by stated_vs_actual match_score, adjusted by drift, anchored by falsifiability>,
  "loves": [<strings — specific things they would genuinely praise, drawn from stated_vs_actual>],
  "hates": [<strings — specific things they would criticize>],
  "would_change": [<strings — concrete suggestions they would make>],
  "contradiction_callout": <string — the key contradiction if present, otherwise null>,
  "blind_spot_warning": <string — the blind spot warning if triggered, otherwise null>,
  "influence_lineage_note": <string — how their intellectual lineage colors this verdict>,
  "context_note": <string — how the judging context shifts this verdict>,
  "confidence_score": <integer 1-10, driven by linguistic_tells confidence_level>,
  "confidence_explanation": <string — why confidence is high/medium/low based on their tells>,
  "falsifiability_anchor": <string — the analogous known reaction and what it implies, or null>,
  "temporal_weight_note": <string — whether this verdict reflects current vs dated taste>
}
`.trim();
}
