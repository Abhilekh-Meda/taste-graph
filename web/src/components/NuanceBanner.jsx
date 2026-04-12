export function ContradictionBanner({ text }) {
  if (!text) return null;
  return (
    <div className="nuance-banner contradiction">
      <div className="nuance-banner-label">Contradiction</div>
      <div className="nuance-banner-text">{text}</div>
    </div>
  );
}

export function BlindSpotBanner({ text, correction }) {
  if (!text) return null;
  return (
    <div className="nuance-banner blind-spot">
      <div className="nuance-banner-label">Blind spot</div>
      <div className="nuance-banner-text">{text}</div>
      {correction && (
        <div className="nuance-source-pills">
          <span className="source-pill">{correction}</span>
        </div>
      )}
    </div>
  );
}
