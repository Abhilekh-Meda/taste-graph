import { useState, useEffect, useRef } from 'react';
import SpiderChart, { DIMENSIONS } from './components/SpiderChart.jsx';
import VerdictStage from './components/VerdictStage.jsx';

const FEED = [
  ['Profile', 'Starting taste profile for Arlan Rakhmetzhanov'],
  ['Discovery', "Searching for Arlan Rakhmetzhanov's public presence..."],
  ['Discovery', 'web_search: Arlan Rakhmetzhanov founder startup essays interviews'],
  ['Discovery', 'web_search: Arlan Rakhmetzhanov YC Nozomi AI startup'],
  ['Discovery', 'Completed: web_search'],
  ['Discovery', 'read_url: reading arlanrakh.com'],
  ['Discovery', 'Completed: read_url'],
  ['Discovery', 'web_search: Arlan Rakhmetzhanov substack writing philosophy'],
  ['Discovery', 'Completed: web_search'],
  ['Discovery', 'read_url: reading LinkedIn profile and posts'],
  ['Discovery', 'Completed: read_url'],
  ['Discovery', 'Found 12 sources'],
  ['Indexing', 'Indexing 12 sources...'],
  ['Indexing', '[1/12] https://www.arlanrakh.com/'],
  ['Indexed', '[2/12] https://substack.com/@arlanrakhmetzhanov'],
  ['Indexed', '[3/12] https://x.com/arlanr'],
  ['Indexed', '[4/12] https://www.linkedin.com/in/arlan-rakhmetzhanov'],
  ['Indexed', '[5/12] https://github.com/arlanrakh'],
  ['Indexed', '[6/12] https://www.producthunt.com/@arlanrakh'],
  ['Indexed', '[7/12] https://skillful.sh/authors/arlanrakh'],
  ['Indexed', '[8/12] linkedin post — YC S25 acceptance'],
  ['Indexed', '[9/12] linkedin post — high schooler running company'],
  ['Indexed', '[10/12] https://www.youtube.com/watch?v=7hukPKD4Bhs'],
  ['Indexed', '[11/12] https://www.youtube.com/watch?v=KBY0z6jSQsA'],
  ['Indexed', '[12/12] substack essay'],
  ['Indexing', '12 indexed, 0 failed'],
  ['Stated values vs actual reactions', 'Starting...'],
  ['Taste drift over time', 'Starting...'],
  ['Blind spots', 'Starting...'],
  ['Influences', 'Starting...'],
  ['Context', 'Starting...'],
  ['Tells', 'Starting...'],
  ['Falsifiability', 'Starting...'],
  [null, 'Extracting stated principles from essays and posts...'],
  [null, 'web_search: Arlan stated values entrepreneurship first principles'],
  [null, 'Completed: web_search'],
  [null, 'Analyzing early vs recent public statements...'],
  [null, 'Searching for documented misjudgments...'],
  [null, 'read_url: analyzing LinkedIn engagement patterns'],
  [null, 'Completed: read_url'],
  [null, 'Mapping influence topology: PG, Karpathy, YC culture...'],
  [null, 'Indexing excitement and disapproval signals...'],
  [null, 'Cross-referencing against documented reactions...'],
  [null, 'Building ground-truth dataset of known reactions...'],
  [null, 'web_search: Arlan Rakhmetzhanov wrong predictions errors'],
  [null, 'Completed: web_search'],
  [null, 'Comparing hackathon praise patterns vs serious critique...'],
  [null, 'Mapping approval markers: hustle language, agency emphasis...'],
  [null, 'Computing estimated model accuracy...'],
  ['Contextual variation', 'Complete'],
  ['Blind spots', 'Complete'],
  [null, 'Mapping gap between stated meritocracy and prestige signals...'],
  [null, 'Tracing aesthetic lineage from Silicon Valley canon...'],
  [null, 'Mapping disapproval markers: wrapper skepticism, low-agency signals...'],
  ['Linguistic tells', 'Complete'],
  ['Falsifiability', 'Complete'],
  [null, 'Mapping temporal shifts in domain interest...'],
  ['Taste drift over time', 'Complete'],
  ['Stated values vs actual reactions', 'Complete'],
  ['Influences', 'Complete'],
  ['Profile', 'Saving taste profile to memory...'],
  ['Profile', 'Taste profile complete'],
  ['Ingest', 'Processing 1 item(s)...'],
  ['Ingest', 'Reading text (36541 chars)'],
  ['Ingest', '2 content blocks ready'],
  ['Stated values vs actual reactions', 'Analyzing submission...'],
  ['Taste drift over time', 'Analyzing submission...'],
  ['Blind spots', 'Analyzing submission...'],
  ['Influences', 'Analyzing submission...'],
  ['Context', 'Analyzing submission...'],
  ['Tells', 'Analyzing submission...'],
  ['Falsifiability', 'Analyzing submission...'],
  [null, 'We need judge how Arlan Rakhmetzhanov would react as hackathon judge...'],
  [null, 'We need assess whether verdict on this submission would rely on current vs stale taste...'],
  [null, 'We need binary blind-spot check for Arlan Rakhmetzhanov as hackathon judge...'],
  ['Search', 'Arlan Rakhmetzhanov hackathon judge AI tools wrappers research demos transparency'],
  ['Search', 'Retrieved 11936 chars of evidence'],
  [null, 'We have search_profile output with substantial evidence about endorsement patterns...'],
  ['Search', 'Arlan Rakhmetzhanov taste drift autonomous agents visible reasoning streaming UI'],
  ['Search', 'Retrieved 8765 chars of evidence'],
  [null, 'We now have evidence on influences. Primary: YC/startup philosophy, Paul Graham, Karpathy...'],
  ['Search', 'Retrieved 9712 chars of evidence'],
  ['Synthesis', 'Synthesizing final verdict...'],
  ['Synthesis', 'Weighing 7 dimensions against the submission...'],
  ['Synthesis', 'Score determined: 8/10 — assembling final verdict'],
  ['Done', 'Verdict complete'],
];

const SKIP_MILESTONES = [11, 35, 72, 75, 91, FEED.length];

const DIM_KEYS = ['stated_vs_actual','taste_drift','blind_spots','influence_graph','contextual_variation','linguistic_tells','falsifiability'];

function getDimsAtTick(tick, total) {
  const pct = tick / total;
  if (pct < 0.35) return {};
  if (pct < 0.45) {
    const active = {};
    DIM_KEYS.forEach(k => { active[k] = { status: 'active', message: 'Researching...' }; });
    return active;
  }
  if (pct < 0.55) {
    const d = {};
    DIM_KEYS.forEach((k, i) => {
      d[k] = i < 3 ? { status: 'done', value: 0.7 } : { status: 'active', message: 'Researching...' };
    });
    return d;
  }
  if (pct < 0.65) {
    const d = {};
    DIM_KEYS.forEach(k => { d[k] = { status: 'done', value: 0.7 }; });
    return d;
  }
  if (pct < 0.85) {
    const d = {};
    DIM_KEYS.forEach(k => { d[k] = { status: 'active', message: 'Judging submission...' }; });
    return d;
  }
  const d = {};
  DIM_KEYS.forEach(k => { d[k] = { status: 'done', value: 0.85 }; });
  return d;
}

function getPhaseAtTick(tick, total) {
  const pct = tick / total;
  if (pct < 0.65) return 'profile';
  if (pct < 0.9) return 'verdict-agents';
  return 'synthesizing';
}

export default function DemoApp() {
  const [stage, setStage] = useState('input');
  const [tick, setTick] = useState(0);
  const [verdict, setVerdict] = useState(null);
  const feedRef = useRef(null);
  const intervalRef = useRef(null);

  function startDemo() {
    setStage('research');
    setTick(0);
    setVerdict(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
  }

  function skipToNext() {
    const next = SKIP_MILESTONES.find((m) => m > tick) ?? FEED.length;
    setTick(next);
  }

  useEffect(() => {
    if (tick >= FEED.length && stage === 'research') {
      clearInterval(intervalRef.current);
      fetch('/demo-data/result.json')
        .then(r => r.json())
        .then(data => {
          setVerdict(data);
          setStage('verdict');
        })
        .catch(() => {
          import('../../demo-data/result.json').then(m => {
            setVerdict(m.default);
            setStage('verdict');
          });
        });
    }
  }, [tick, stage]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [tick]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const visibleFeed = FEED.slice(0, tick);
  const dims = getDimsAtTick(tick, FEED.length);
  const phase = getPhaseAtTick(tick, FEED.length);
  const activeDims = Object.values(dims).filter(d => d.status === 'active').length;
  const doneDims = Object.values(dims).filter(d => d.status === 'done').length;

  const elapsed = tick;
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const elapsedStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

  const phaseLabel = phase === 'profile' ? 'Building taste profile'
    : phase === 'verdict-agents' ? 'Judging submission'
    : 'Synthesizing verdict';

  const DIMENSION_LABELS = {
    stated_vs_actual: 'Values vs Reality',
    taste_drift: 'Taste Drift',
    blind_spots: 'Blind Spots',
    influence_graph: 'Influences',
    contextual_variation: 'Context',
    linguistic_tells: 'Tells',
    falsifiability: 'Falsifiability',
  };

  const DIMENSION_DESCS = {
    stated_vs_actual: 'Stated values vs actual reactions',
    taste_drift: 'How taste has shifted over time',
    blind_spots: 'Systematic misjudgments',
    influence_graph: 'Intellectual lineage',
    contextual_variation: 'Judgment shifts by context',
    linguistic_tells: 'Signals of approval & disapproval',
    falsifiability: 'Anchoring against known reactions',
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">TasteGraph</h1>
        <p className="app-subtitle">Index any expert's taste, then judge anything through their eyes</p>
      </div>

      {stage === 'input' && (
        <div className="input-stage">
          <div className="input-field input-person">
            <label>Whose taste?</label>
            <input type="text" defaultValue="Arlan Rakhmetzhanov" readOnly />
          </div>
          <div className="input-field">
            <label>Judging context</label>
            <input type="text" defaultValue="hackathon judge" readOnly />
          </div>
          <div className="attachments-section">
            <label>What to judge</label>
            <div className="attachment-list">
              <div className="attachment-card">
                <span className="type-badge">text</span>
                <span className="value">TasteGraph hackathon submission (36,541 chars)</span>
              </div>
            </div>
          </div>
          <button className="judge-btn" onClick={startDemo}>Judge</button>
        </div>
      )}

      {stage === 'research' && (
        <div className="research-stage" style={{ animation: 'fadeIn 400ms ease' }}>
          <div className="research-header">
            <h2>Arlan Rakhmetzhanov</h2>
            <p>Reconstructing taste topology</p>
          </div>
          <div className="research-phase-label">
            {phaseLabel}
            <span className="elapsed-time">{elapsedStr}</span>
          </div>
          {(activeDims > 0 || doneDims > 0) && (
            <div className="dimension-progress-summary">
              {doneDims}/{DIMENSIONS.length} dimensions complete
              {activeDims > 0 && ` · ${activeDims} active`}
            </div>
          )}
          <SpiderChart dimensions={dims} />
          <div className="dimension-grid">
            {DIM_KEYS.map(key => {
              const state = dims[key] ?? { status: 'waiting' };
              return (
                <div className={`dimension-card ${state.status}`} key={key}>
                  <div className="dimension-card-header">
                    <div className={`dimension-status ${state.status}`} />
                    <span>{DIMENSION_LABELS[key]}</span>
                  </div>
                  <p>
                    {state.status === 'active' ? (state.message || 'Working...')
                      : state.status === 'done' ? 'Complete'
                      : DIMENSION_DESCS[key]}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="live-feed" ref={feedRef}>
            {visibleFeed.map(([label, message], i) => (
              <div className="feed-item" key={i}>
                {label && <span className="feed-label">{label} </span>}
                {message}
              </div>
            ))}
          </div>
          {tick < FEED.length && (
            <button
              type="button"
              onClick={skipToNext}
              style={{
                display: 'block',
                margin: '16px auto 0',
                fontSize: '0.72rem',
                color: 'var(--text-tertiary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              skip to next →
            </button>
          )}
        </div>
      )}

      {stage === 'verdict' && verdict && (
        <VerdictStage result={verdict} onReset={() => { setStage('input'); setTick(0); setVerdict(null); }} />
      )}
    </div>
  );
}
