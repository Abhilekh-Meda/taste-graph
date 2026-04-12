import { useState } from 'react';
import SpiderChart from './SpiderChart.jsx';
import ConfidenceBar from './ConfidenceBar.jsx';
import EvidencePill from './EvidencePill.jsx';
import { ContradictionBanner, BlindSpotBanner } from './NuanceBanner.jsx';

export default function VerdictStage({ result, onReset }) {
  const { verdict, person } = result;
  const [methodOpen, setMethodOpen] = useState(false);

  const confidencePct = ((verdict.confidence_score ?? 5) / 10) * 100;

  const spiderDims = {};
  if (result.sub_verdicts) {
    for (const [key, sv] of Object.entries(result.sub_verdicts)) {
      spiderDims[key] = { status: 'done', value: sv.error ? 0.1 : 0.7 };
    }
  }

  return (
    <div className="verdict-stage">
      <button className="back-link" onClick={onReset}>
        ← New judgment
      </button>

      <SpiderChart dimensions={spiderDims} />

      <div className="verdict-header">
        <div className="verdict-score-row">
          <div>
            <div className="verdict-score">{verdict.score}</div>
            <div className="verdict-score-label">out of 10</div>
          </div>
          <div className="verdict-score-meta">
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{person}</div>
            <div className="verdict-confidence">
              Confidence
              <div className="confidence-bar-inline">
                <div className="confidence-bar-fill" style={{ width: `${confidencePct}%` }} />
              </div>
              {verdict.confidence_score}/10
            </div>
          </div>
        </div>
        <div className="verdict-summary">{verdict.summary}</div>
      </div>

      <ContradictionBanner text={verdict.contradiction_callout} />
      <BlindSpotBanner
        text={verdict.blind_spot_warning}
        correction={result.sub_verdicts?.blind_spots?.verdict?.correction_suggested}
      />

      <VerdictItemSection
        title="Would love"
        items={verdict.loves}
        sentiment="positive"
      />

      <VerdictItemSection
        title="Would criticize"
        items={verdict.hates}
        sentiment="negative"
      />

      <VerdictItemSection
        title="Would change"
        items={verdict.would_change}
        sentiment="neutral"
        isSuggestion
      />

      {verdict.context_variance && (
        <ContextVariance cv={verdict.context_variance} />
      )}

      <div className="methodology-section">
        <button
          className="methodology-toggle"
          onClick={() => setMethodOpen((p) => !p)}
        >
          <span className={`arrow ${methodOpen ? 'open' : ''}`}>▶</span>
          Methodology &amp; breakdown
        </button>
        {methodOpen && (
          <div className="methodology-content">
            <dl>
              <dt>Score breakdown</dt>
              <dd>
                <div className="score-breakdown">
                  <span className="score-step">
                    Base: {verdict.score_breakdown?.base_from_stated_vs_actual ?? '–'}
                  </span>
                  <span className="score-arrow">→</span>
                  <span className="score-step">
                    Drift: {formatDelta(verdict.score_breakdown?.drift_adjustment)}
                  </span>
                  <span className="score-arrow">→</span>
                  <span className="score-step">
                    Anchor: {formatDelta(verdict.score_breakdown?.anchor_adjustment)}
                  </span>
                  <span className="score-arrow">→</span>
                  <span className="score-step" style={{ fontWeight: 500 }}>
                    Final: {verdict.score_breakdown?.final ?? verdict.score}
                  </span>
                </div>
              </dd>

              {verdict.falsifiability && (
                <>
                  <dt>Falsifiability</dt>
                  <dd>
                    {verdict.falsifiability.accuracy?.estimated_pct != null
                      ? `${verdict.falsifiability.accuracy.estimated_pct}% estimated accuracy`
                      : 'No anchors found'}
                    {verdict.falsifiability.accuracy?.methodology &&
                      ` — ${verdict.falsifiability.accuracy.methodology}`}
                  </dd>
                </>
              )}

              {verdict.influence_lineage_note && (
                <>
                  <dt>Influence lineage</dt>
                  <dd>{verdict.influence_lineage_note}</dd>
                </>
              )}

              {verdict.temporal_weight_note && (
                <>
                  <dt>Temporal weight</dt>
                  <dd>{verdict.temporal_weight_note}</dd>
                </>
              )}

              {verdict.confidence_explanation && (
                <>
                  <dt>Confidence reasoning</dt>
                  <dd>{verdict.confidence_explanation}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function VerdictItemSection({ title, items, sentiment, isSuggestion }) {
  if (!items?.length) return null;

  return (
    <div className="verdict-section">
      <h3 className="verdict-section-title">
        {title}
        <span className="section-count">{items.length}</span>
      </h3>
      {items.map((item, i) => (
        <div className="verdict-item" key={i}>
          <ConfidenceBar confidence={item.confidence} />
          <div className="verdict-item-content">
            <div className="verdict-item-aspect">
              {isSuggestion ? item.suggestion : item.aspect}
            </div>
            {!isSuggestion && item.because && (
              <div className="verdict-item-because">
                {item.because}
                {item.evidence?.length > 0 && (
                  <span className="evidence-refs">
                    {item.evidence.map((ev, j) => (
                      <EvidencePill key={j} evidence={ev} index={j + 1} />
                    ))}
                  </span>
                )}
              </div>
            )}
            {isSuggestion && item.evidence?.length > 0 && (
              <div className="verdict-item-because">
                <span className="evidence-refs">
                  {item.evidence.map((ev, j) => (
                    <EvidencePill key={j} evidence={ev} index={j + 1} />
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContextVariance({ cv }) {
  if (!cv) return null;

  const allContexts = [
    { name: cv.applied_context, delta: cv.score_delta, current: true },
    ...(cv.alternative_contexts ?? []).map((ac) => ({
      name: ac.context_name,
      delta: ac.score_delta,
      current: false,
      difference: ac.key_difference,
    })),
  ];

  return (
    <div className="context-variance">
      <div className="context-variance-title">Context variance</div>
      <div className="context-chips">
        {allContexts.map((ctx, i) => (
          <div
            className={`context-chip-variant ${ctx.current ? 'current' : ''}`}
            key={i}
            title={ctx.difference || ''}
          >
            {ctx.name}
            <span
              className={`context-delta ${ctx.delta > 0 ? 'positive' : ctx.delta < 0 ? 'negative' : 'neutral'}`}
            >
              {formatDelta(ctx.delta)}
            </span>
          </div>
        ))}
      </div>
      {cv.note && <div className="context-variance-note">{cv.note}</div>}
    </div>
  );
}

function formatDelta(n) {
  if (n == null || n === 0) return '±0';
  return n > 0 ? `+${n}` : `${n}`;
}
