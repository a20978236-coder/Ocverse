import { useState } from 'react';
import { useStore } from '../store';
import { Avatar } from './Figure';
import { Icon } from './Icon';

/**
 * Collab picker: tiny circular portraits with the character's name only —
 * no creators shown, no invites. Tap to lock in / tap again to release.
 */
export function CharacterPicker({ selected, onChange, onClose }: { selected: string[]; onChange: (ids: string[]) => void; onClose: () => void }) {
  const { characters } = useStore();
  const [q, setQ] = useState('');
  const list = characters.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Pick characters">
        <div className="sheet-head">
          <h3>Characters</h3>
          <span className="muted">{selected.length} locked in</span>
          <button className="icon-btn" onClick={onClose} aria-label="Done"><Icon name="check" /></button>
        </div>
        <input className="input" placeholder="Search characters" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="picker-grid">
          {list.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button key={c.id} className={`picker-item ${on ? 'on' : ''}`} onClick={() => toggle(c.id)}>
                <span className="picker-avatar">
                  <Avatar c={c} size={56} ring={on} />
                  {on && <span className="lock"><Icon name="check" size={12} /></span>}
                </span>
                <span className="picker-name">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
