import { useState } from 'react';

const TYPE_LABELS = {
  direct_quote: 'Direct quote',
  documented_reaction: 'Documented reaction',
  consistent_pattern: 'Consistent pattern',
  single_source: 'Single source',
  inferred: 'Inferred',
  extrapolated: 'Extrapolated',
};

export default function EvidencePill({ evidence, index }) {
  const [show, setShow] = useState(false);

  if (!evidence) return null;

  return (
    <span
      className="evidence-ref"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {index}
      {show && (
        <div className="evidence-tooltip">
          <span className={`ev-type ${evidence.type}`}>
            {TYPE_LABELS[evidence.type] ?? evidence.type}
          </span>
          {evidence.source && (
            <div className="ev-source">{evidence.source}</div>
          )}
          {evidence.quote && (
            <div className="ev-quote">{evidence.quote}</div>
          )}
        </div>
      )}
    </span>
  );
}
