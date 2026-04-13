import { useRef, useEffect, useState } from 'react';
import SpiderChart, { DIMENSIONS } from './SpiderChart.jsx';

const DIMENSION_DESCRIPTIONS = {
  stated_vs_actual: 'Stated values vs actual reactions',
  taste_drift: 'How taste has shifted over time',
  blind_spots: 'Systematic misjudgments',
  influence_graph: 'Intellectual lineage',
  contextual_variation: 'Judgment shifts by context',
  linguistic_tells: 'Signals of approval & disapproval',
  falsifiability: 'Anchoring against known reactions',
};

function useElapsed() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ResearchStage({ person, events, dimensions, phase }) {
  const feedRef = useRef(null);
  const elapsed = useElapsed();

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const phaseLabel =
    phase === 'profile'
      ? 'Building taste profile'
      : phase === 'verdict-agents'
        ? 'Judging submission'
        : phase === 'synthesizing'
          ? 'Synthesizing verdict'
          : 'Working...';

  const activeDims = Object.values(dimensions).filter((d) => d.status === 'active').length;
  const doneDims = Object.values(dimensions).filter((d) => d.status === 'done').length;

  return (
    <div className="research-stage">
      <div className="research-header">
        <h2>{person}</h2>
        <p>Reconstructing taste topology</p>
      </div>

      <div className="research-phase-label">
        {phaseLabel}
        <span className="elapsed-time">{elapsed}</span>
      </div>

      {(activeDims > 0 || doneDims > 0) && (
        <div className="dimension-progress-summary">
          {doneDims}/{DIMENSIONS.length} dimensions complete
          {activeDims > 0 && ` · ${activeDims} active`}
        </div>
      )}

      <SpiderChart dimensions={dimensions} />

      <div className="dimension-grid">
        {DIMENSIONS.map((dim) => {
          const state = dimensions[dim.key] ?? { status: 'waiting' };
          return (
            <div
              className={`dimension-card ${state.status}`}
              key={dim.key}
            >
              <div className="dimension-card-header">
                <div className={`dimension-status ${state.status}`} />
                <span>{dim.short}</span>
              </div>
              <p>
                {state.status === 'active' && state.message
                  ? state.message
                  : state.status === 'done'
                    ? state.error
                      ? `Error: ${state.error}`
                      : 'Complete'
                    : DIMENSION_DESCRIPTIONS[dim.key]}
              </p>
            </div>
          );
        })}
      </div>

      <div className="live-feed" ref={feedRef}>
        {events.length === 0 ? (
          <div className="feed-item">
            <span className="feed-label">Starting </span>
            Connecting to server...
          </div>
        ) : (
          events.map((ev, i) => (
            <div className="feed-item" key={i}>
              {ev.label && <span className="feed-label">{ev.label} </span>}
              {ev.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
