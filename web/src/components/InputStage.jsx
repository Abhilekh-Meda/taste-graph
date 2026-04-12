import { useState, useRef } from 'react';

const CONTEXT_SUGGESTIONS = ['hackathon judge', 'VC partner', 'YC application', 'cold DM', 'design critique'];

function classifyItem(value) {
  if (/^https?:\/\//i.test(value)) {
    if (/github\.com/i.test(value)) return 'github';
    if (/\.(pdf)(\?.*)?$/i.test(value)) return 'pdf';
    if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(value)) return 'image';
    return 'url';
  }
  return 'text';
}

export default function InputStage({ onSubmit }) {
  const [person, setPerson] = useState('');
  const [context, setContext] = useState('');
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState('');
  const inputRef = useRef(null);

  function addItem() {
    const v = currentItem.trim();
    if (!v) return;
    setItems((prev) => [...prev, { value: v, type: classifyItem(v) }]);
    setCurrentItem('');
    inputRef.current?.focus();
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  }

  function handleSubmit() {
    if (!person.trim() || items.length === 0) return;
    onSubmit({
      person: person.trim(),
      judgingContext: context.trim() || 'general',
      items: items.map((i) => i.value),
      label: '',
    });
  }

  const canSubmit = person.trim() && items.length > 0;

  return (
    <div className="input-stage">
      <div className="input-field input-person">
        <label>Whose taste?</label>
        <input
          type="text"
          placeholder="Paul Graham"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          autoFocus
        />
      </div>

      <div className="input-field">
        <label>Judging context</label>
        <input
          type="text"
          placeholder="hackathon judge, VC partner, cold DM..."
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <div className="context-suggestions">
          {CONTEXT_SUGGESTIONS.map((s) => (
            <button key={s} className="context-chip" onClick={() => setContext(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="attachments-section">
        <label>What to judge</label>
        <div className="attachment-input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="Paste a URL, GitHub repo, or type text..."
            value={currentItem}
            onChange={(e) => setCurrentItem(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="attachment-add-btn" onClick={addItem}>
            Add
          </button>
        </div>

        {items.length > 0 && (
          <div className="attachment-list">
            {items.map((item, i) => (
              <div className="attachment-card" key={i}>
                <span className="type-badge">{item.type}</span>
                <span className="value">{item.value}</span>
                <button className="remove-btn" onClick={() => removeItem(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="judge-btn" disabled={!canSubmit} onClick={handleSubmit}>
        Judge
      </button>
    </div>
  );
}
