import { useRef, useEffect } from 'react';
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

export default function ResearchStage({ person, events, dimensions, phase }) {
  const feedRef = useRef(null);

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

  return (
    <div className="research-stage">
      <div className="research-header">
        <h2>{person}</h2>
        <p>Reconstructing taste topology</p>
      </div>

      <div className="research-phase-label">{phaseLabel}</div>

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

      {events.length > 0 && (
        <div className="live-feed" ref={feedRef}>
          {events.map((ev, i) => (
            <div className="feed-item" key={i}>
              {ev.label && <span className="feed-label">{ev.label} </span>}
              {ev.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
