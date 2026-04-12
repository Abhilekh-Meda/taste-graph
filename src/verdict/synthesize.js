import { withRetry } from '../retry.js';

export async function synthesizeVerdict({ person, submissionText, subVerdicts, judgingContext, openai }) {
  const succeeded = Object.values(subVerdicts).filter((v) => !v.error).length;
  const failed = Object.values(subVerdicts).filter((v) => v.error).length;
  console.log(`\n[synthesize] Starting synthesis for ${person} — ${succeeded} sub-verdicts OK, ${failed} failed`);

  const prompt = buildSynthesisPrompt({ person, submissionText, subVerdicts, judgingContext });
  console.log(`[synthesize] Prompt length: ${prompt.length} chars`);

  const response = await withRetry(
    () => openai.chat.completions.create({
      model: 'gpt-5.4',
      messages: [
        {
          role: 'system',
          content: `You synthesize a final verdict for how "${person}" would judge a submission.
You receive pre-analyzed sub-verdicts from 7 taste dimensions. Synthesize them into one coherent verdict.

RULES:
- Do NOT introduce new information. Reason only from what the dimension analyses found.
- The base score comes from stated_vs_actual.match_score
- taste_drift adjusts it: if drift_adjustment is "more_positive" add 1, "more_negative" subtract 1
- If falsifiability anchors disagree with the base score, shift toward the anchors
- If blind_spots is triggered, note it but do NOT change the score (it's a warning, not a modifier)
- confidence_score comes from linguistic_tells.confidence_level: high=8-10, medium=5-7, low=1-4
- Return valid JSON matching the schema exactly.`,
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
    'synthesize'
  );

  try {
    const verdict = JSON.parse(response.choices[0].message.content);
    console.log(`[synthesize] Done — score: ${verdict.score}/10, confidence: ${verdict.confidence_score}/10`);
    return verdict;
  } catch {
    throw new Error('Synthesis returned invalid JSON');
  }
}

function buildSynthesisPrompt({ person, submissionText, subVerdicts, judgingContext }) {
  const sections = Object.entries(subVerdicts)
    .map(([key, val]) => {
      if (val.error) return `### ${val.label}\nERROR: ${val.error}`;
      const parts = [`### ${val.label}`];
      if (val.final_reasoning) parts.push(`**Agent reasoning:** ${val.final_reasoning}`);
      parts.push(`**Verdict:**\n${JSON.stringify(val.verdict, null, 2)}`);
      return parts.join('\n');
    })
    .join('\n\n');

  return `
## Submission
${submissionText}

## Judging Context
${judgingContext || 'General'}

## Dimension Analysis Results
${sections}

---

Produce the final verdict JSON:

{
  "person": "${person}",
  "score": <integer 1-10>,
  "summary": <string — the person's reaction in their own voice, drawn from linguistic_tells.predicted_language and stated_vs_actual.summary>,
  "loves": [<strings — specific things they'd praise, from stated_vs_actual.loves>],
  "hates": [<strings — specific things they'd criticize, from stated_vs_actual.hates>],
  "would_change": [<strings — actionable suggestions, from stated_vs_actual.would_change>],
  "contradiction_callout": <string or null — from stated_vs_actual.contradiction. Format: "[person] says they value [X] but has publicly [Y]. For this submission, that means [Z].">,
  "blind_spot_warning": <string or null — from blind_spots.warning, only if triggered>,
  "influence_lineage_note": <string — from influence_graph. "[person]'s view here is shaped by [primary_influence], who would [stance] because [reason].">,
  "context_note": <string — from contextual_variation.note>,
  "confidence_score": <integer 1-10>,
  "confidence_explanation": <string — from linguistic_tells. "High confidence: [tells]. They'd probably say: '[predicted_language]'">,
  "falsifiability_anchor": <string or null — from falsifiability. "When [person] saw [analogous thing], they [reacted]. This submission is similar because [reason], predicting a [sentiment] reaction.">,
  "temporal_weight_note": <string — from taste_drift.recency_note>,
  "score_breakdown": {
    "base_from_stated_vs_actual": <integer — the raw match_score>,
    "drift_adjustment": <integer — +1, -1, or 0>,
    "anchor_adjustment": <integer — shift toward falsifiability anchor if it disagrees, otherwise 0>,
    "final": <integer — the computed score>
  }
}
`.trim();
}
