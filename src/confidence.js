// Evidence taxonomy weights. These are the inputs to confidence — the model never self-reports confidence.
export const EVIDENCE_WEIGHTS = {
  direct_quote:         1.0,  // he literally said this
  documented_reaction:  0.8,  // he reacted to something with the same structural properties
  consistent_pattern:   0.7,  // same signal across 3+ documented cases, no single smoking gun
  single_source:        0.4,  // one interview/essay, no corroboration
  inferred:             0.25, // consistent with philosophy but never stated directly
  extrapolated:         0.1,  // derived from adjacent behavior in a different domain
};

// Confidence is derived from evidence items, not self-reported.
// Multiple weak items add up: 3 × inferred (0.25 each) = 0.75 → high.
// Total is capped at 1.0.
export function deriveConfidence(evidenceItems) {
  if (!evidenceItems?.length) {
    return { level: 'low', score: 0, reasoning: 'No evidence found' };
  }

  const total = Math.min(
    evidenceItems.reduce((sum, e) => sum + (EVIDENCE_WEIGHTS[e.type] ?? 0.1), 0),
    1.0
  );

  const level = total >= 0.75 ? 'high' : total >= 0.45 ? 'medium' : 'low';

  const strongest = evidenceItems.reduce((best, e) =>
    (EVIDENCE_WEIGHTS[e.type] ?? 0) > (EVIDENCE_WEIGHTS[best?.type] ?? 0) ? e : best
  , evidenceItems[0]);

  return { level, score: Math.round(total * 100), strongest_evidence: strongest };
}

// Derives an overall verdict confidence (1-10) from all evidence across loves + hates.
export function deriveOverallConfidence(loves, hates) {
  const all = [...(loves ?? []), ...(hates ?? [])].flatMap((item) => item.evidence ?? []);
  if (!all.length) return 5;
  const { score } = deriveConfidence(all);
  return Math.max(1, Math.min(10, Math.round((score / 100) * 10)));
}

// Derives a falsifiability accuracy estimate from anchor quality.
// The model finds anchors; we compute accuracy from what it found.
export function deriveFalsifiabilityAccuracy(anchors, anchors_agree) {
  if (!anchors?.length) {
    return { estimated_pct: null, based_on_n_anchors: 0, methodology: 'No analogous public reactions found' };
  }

  const highCount = anchors.filter((a) => a.similarity_to_submission === 'high').length;
  const medCount  = anchors.filter((a) => a.similarity_to_submission === 'medium').length;
  const lowCount  = anchors.filter((a) => a.similarity_to_submission === 'low').length;

  const weightedScore = (highCount * 1.0 + medCount * 0.6 + lowCount * 0.2) / anchors.length;
  const agreementMultiplier = anchors_agree ? 1.0 : 0.7;
  const pct = Math.round(weightedScore * agreementMultiplier * 100);

  const parts = [];
  if (highCount) parts.push(`${highCount} high-similarity`);
  if (medCount)  parts.push(`${medCount} medium-similarity`);
  if (lowCount)  parts.push(`${lowCount} low-similarity`);

  return {
    estimated_pct: pct,
    based_on_n_anchors: anchors.length,
    methodology: `${parts.join(', ')} anchor(s), ${anchors_agree ? 'all pointing same direction' : 'conflicting — near a taste boundary'} → ${pct}% estimated accuracy`,
  };
}
