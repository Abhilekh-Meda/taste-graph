import { useState, useCallback, useRef } from 'react';
import InputStage from './components/InputStage.jsx';
import ResearchStage from './components/ResearchStage.jsx';
import VerdictStage from './components/VerdictStage.jsx';
import { startJudge } from './api.js';

export default function App() {
  const [stage, setStage] = useState('input');
  const [person, setPerson] = useState('');
  const [events, setEvents] = useState([]);
  const [dimensions, setDimensions] = useState({});
  const [phase, setPhase] = useState('profile');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const connectionRef = useRef(null);

  const addFeedEvent = useCallback((label, message) => {
    setEvents((prev) => {
      const next = [...prev, { label, message, ts: Date.now() }];
      return next.length > 200 ? next.slice(-200) : next;
    });
  }, []);

  const updateDimension = useCallback((key, update) => {
    setDimensions((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), ...update },
    }));
  }, []);

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'profile:start':
        setPhase('profile');
        addFeedEvent('Profile', `Starting taste profile for ${event.data.person}`);
        break;

      case 'profile:cached':
        addFeedEvent('Profile', event.data.message);
        break;

      case 'profile:discovery':
        addFeedEvent('Discovery', event.data.message);
        break;

      case 'profile:discovery_done':
        addFeedEvent('Discovery', `Found ${event.data.sources_found} sources`);
        break;

      case 'profile:indexing':
        addFeedEvent('Indexing', `Indexing ${event.data.count} sources...`);
        break;

      case 'profile:source_indexed':
        addFeedEvent('Indexed', `${event.data.type}: ${event.data.url}`);
        break;

      case 'profile:indexing_done':
        addFeedEvent('Indexing', `${event.data.indexed} indexed, ${event.data.failed} failed`);
        break;

      case 'profile:aspect_start':
        updateDimension(event.data.key, { status: 'active', message: `Starting ${event.data.label}...` });
        addFeedEvent(event.data.label, 'Starting...');
        break;

      case 'profile:aspect_progress':
        updateDimension(event.data.key, { status: 'active', message: event.data.message });
        addFeedEvent(null, event.data.message);
        break;

      case 'profile:aspect_done':
        updateDimension(event.data.key, {
          status: 'done',
          value: event.data.error ? 0.1 : 0.7,
          error: event.data.error,
        });
        addFeedEvent(event.data.label, event.data.error ? `Error: ${event.data.error}` : 'Complete');
        break;

      case 'profile:saving':
        addFeedEvent('Profile', event.data.message);
        break;

      case 'profile:done':
        addFeedEvent('Profile', event.data.cached ? 'Using cached profile' : 'Taste profile complete');
        break;

      case 'verdict:ingesting':
        setPhase('verdict-agents');
        addFeedEvent('Ingest', `Processing ${event.data.item_count} item(s)...`);
        break;

      case 'verdict:ingest_item':
        addFeedEvent('Ingest', `Reading item ${event.data.index + 1}/${event.data.total}: ${event.data.item}`);
        break;

      case 'verdict:ingest_progress':
        addFeedEvent('Ingest', event.data.message);
        break;

      case 'verdict:ingested':
        addFeedEvent('Ingest', `${event.data.blocks} content blocks ready`);
        break;

      case 'verdict:agent_start':
        updateDimension(event.data.key, { status: 'active', message: `Judging: ${event.data.label}` });
        addFeedEvent(event.data.label, 'Analyzing submission...');
        break;

      case 'verdict:agent_think':
        updateDimension(event.data.key, { status: 'active', message: event.data.reasoning_preview });
        addFeedEvent(null, event.data.reasoning_preview);
        break;

      case 'verdict:agent_search':
        addFeedEvent('Search', event.data.queries.join(' | '));
        break;

      case 'verdict:agent_done':
        updateDimension(event.data.key, {
          status: 'done',
          value: event.data.error ? 0.1 : 0.85,
          error: event.data.error,
        });
        break;

      case 'verdict:synthesizing':
        setPhase('synthesizing');
        addFeedEvent('Synthesis', 'Synthesizing final verdict...');
        break;

      case 'verdict:synthesis_progress':
        addFeedEvent('Synthesis', event.data.message);
        break;

      case 'verdict:done':
        addFeedEvent('Done', 'Verdict complete');
        break;

      case 'complete':
        setResult(event.data);
        setStage('verdict');
        break;

      case 'error':
        setError(event.data.message);
        break;

      default:
        if (event.data?.message) {
          addFeedEvent(null, event.data.message);
        }
    }
  }, [addFeedEvent, updateDimension]);

  function handleSubmit(input) {
    setStage('research');
    setPerson(input.person);
    setEvents([]);
    setDimensions({});
    setPhase('profile');
    setResult(null);
    setError(null);

    if (connectionRef.current) connectionRef.current.abort();
    connectionRef.current = startJudge(input, handleEvent);
  }

  function handleReset() {
    if (connectionRef.current) connectionRef.current.abort();
    setStage('input');
    setPerson('');
    setEvents([]);
    setDimensions({});
    setResult(null);
    setError(null);
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">TasteGraph</h1>
        <p className="app-subtitle">
          Index any expert's taste, then judge anything through their eyes
        </p>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <br />
          <button onClick={handleReset}>Start over</button>
        </div>
      )}

      {stage === 'input' && <InputStage onSubmit={handleSubmit} />}

      {stage === 'research' && (
        <ResearchStage
          person={person}
          events={events}
          dimensions={dimensions}
          phase={phase}
        />
      )}

      {stage === 'verdict' && result && (
        <VerdictStage result={result} onReset={handleReset} />
      )}
    </div>
  );
}
