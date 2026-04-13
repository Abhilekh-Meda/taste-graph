import { withRetry } from '../retry.js';
import { deriveConfidence, deriveOverallConfidence, deriveFalsifiabilityAccuracy } from '../confidence.js';

export async function synthesizeVerdict({ person, submissionText, subVerdicts, judgingContext, openai, onProgress }) {
  const emit = onProgress ?? (() => {});
  const succeeded = Object.values(subVerdicts).filter((v) => !v.error).length;
  const failed = Object.values(subVerdicts).filter((v) => v.error).length;
  console.log(`\n[synthesize] Starting synthesis for ${person} — ${succeeded} sub-verdicts OK, ${failed} failed`);

  // Pull structured loves/hates/would_change from stated_vs_actual and enrich with computed confidence.
  // We do NOT ask the synthesis model to regenerate them — it would lose the evidence chain.
  const sva = subVerdicts.stated_vs_actual?.verdict ?? {};
  const loves        = enrichItems(sva.loves ?? []);
  const hates        = enrichItems(sva.hates ?? []);
  const would_change = enrichItems(sva.would_change ?? []);

  // Derive overall confidence from the evidence corpus — not from LLM self-report.
  const confidence_score = deriveOverallConfidence(sva.loves, sva.hates);
  console.log(`[synthesize] Derived confidence_score: ${confidence_score}/10 from ${(sva.loves?.length ?? 0) + (sva.hates?.length ?? 0)} items`);

  // Derive falsifiability accuracy from anchor data — not from LLM self-report.
  const fv = subVerdicts.falsifiability?.verdict ?? {};
  const falsifiability_accuracy = deriveFalsifiabilityAccuracy(fv.anchors, fv.anchors_agree);
  console.log(`[synthesize] Falsifiability accuracy: ${falsifiability_accuracy.estimated_pct ?? 'n/a'}% (${falsifiability_accuracy.based_on_n_anchors} anchors)`);

  // Pull context variance from contextual_variation
  const cv = subVerdicts.contextual_variation?.verdict ?? {};

  const prompt = buildSynthesisPrompt({ person, submissionText, subVerdicts, judgingContext });
  console.log(`[synthesize] Prompt length: ${prompt.length} chars`);

  emit({ type: 'verdict:synthesis_progress', data: { message: `Weighing ${succeeded} dimensions against the submission...` } });

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
- Do NOT produce loves, hates, would_change, confidence_score, or falsifiability_accuracy — those are computed externally and injected.
- Return valid JSON matching the schema exactly.`,
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
    'synthesize'
  );

  try {
    const partial = JSON.parse(response.choices[0].message.content);
    console.log(`[synthesize] Done — score: ${partial.score}/10`);
    emit({ type: 'verdict:synthesis_progress', data: { message: `Score determined: ${partial.score}/10 — assembling final verdict` } });

    // Merge model output (narrative, score) with deterministically computed fields
    return {
      person,
      score: partial.score,
      summary: partial.summary,

      // Structured with evidence + computed confidence — never flat strings
      loves,
      hates,
      would_change,

      contradiction_callout: partial.contradiction_callout ?? null,
      blind_spot_warning: partial.blind_spot_warning ?? null,
      influence_lineage_note: partial.influence_lineage_note,
      context_note: partial.context_note,

      // Computed from evidence corpus, not self-reported
      confidence_score,
      confidence_explanation: partial.confidence_explanation,

      // Context variance with deltas
      context_variance: {
        applied_context: cv.context_applied ?? 'general',
        score_delta: cv.score_delta ?? 0,
        standard_shift: cv.standard_shift ?? 'neutral',
        alternative_contexts: cv.alternative_contexts ?? [],
        note: cv.note ?? null,
      },

      // Falsifiability grounded in anchor evidence, accuracy derived
      falsifiability: {
        anchors: fv.anchors ?? [],
        anchors_agree: fv.anchors_agree ?? null,
        anchored_sentiment: fv.anchored_sentiment ?? 'unknown',
        anchor_note: fv.anchor_note ?? null,
        accuracy: falsifiability_accuracy,
      },

      temporal_weight_note: partial.temporal_weight_note,

      score_breakdown: {
        base_from_stated_vs_actual: partial.score_breakdown?.base_from_stated_vs_actual ?? partial.score,
        drift_adjustment: partial.score_breakdown?.drift_adjustment ?? 0,
        anchor_adjustment: partial.score_breakdown?.anchor_adjustment ?? 0,
        final: partial.score,
      },
    };
  } catch {
    throw new Error('Synthesis returned invalid JSON');
  }
}

// Enrich each item with a computed confidence object derived from its evidence array.
function enrichItems(items) {
  return (items ?? []).map((item) => ({
    ...item,
    confidence: deriveConfidence(item.evidence ?? []),
  }));
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

Produce the following JSON (loves/hates/would_change/confidence_score/falsifiability_accuracy are injected separately — do NOT generate them):

{
  "score": <integer 1-10>,
  "summary": <string — the person's reaction in their own voice, drawn from linguistic_tells.predicted_language and stated_vs_actual.summary>,
  "contradiction_callout": <string or null — from stated_vs_actual.contradiction. Format: "[person] says they value [X] but has publicly [Y]. For this submission, that means [Z].">,
  "blind_spot_warning": <string or null — from blind_spots.warning, only if triggered>,
  "influence_lineage_note": <string — from influence_graph. "[person]'s view here is shaped by [primary_influence], who would [stance] because [reason].">,
  "context_note": <string — from contextual_variation.note>,
  "confidence_explanation": <string — from linguistic_tells. "High confidence: [tells]. They'd probably say: '[predicted_language]'">,
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
