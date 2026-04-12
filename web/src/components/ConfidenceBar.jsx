export default function ConfidenceBar({ confidence }) {
  const level = confidence?.level ?? 'low';
  return <div className={`confidence-bar ${level}`} />;
}
