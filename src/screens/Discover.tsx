import { useState } from 'react';
import { ME, useStore } from '../store';
import { Avatar } from '../components/Figure';
import { Backdrop, BACKGROUNDS, CreatorDot } from '../components/Shell';
import { Icon } from '../components/Icon';
import { styleLabel } from '../util';

export function Discover() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'characters' | 'creators'>('characters');
  const ql = q.toLowerCase();
  const chars = s.characters.filter((c) => c.creatorId !== ME && (c.name + c.personality + c.traits.join(' ') + styleLabel(c.style)).toLowerCase().includes(ql));
  const creators = s.creators.filter((c) => c.id !== ME && (c.handle + c.displayName + c.bio).toLowerCase().includes(ql));
  return (
    <Backdrop src={BACKGROUNDS.discover} className="discover-backdrop">
      <div className="page">
        <div className="search">
          <Icon name="search" size={18} />
          <input placeholder="Find creators and characters" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="steps">
          <button className={`step ${mode === 'characters' ? 'on' : ''}`} onClick={() => setMode('characters')}>Characters</button>
          <button className={`step ${mode === 'creators' ? 'on' : ''}`} onClick={() => setMode('creators')}>Creators</button>
        </div>
        {mode === 'characters' ? (
          <div className="discover-grid">
            {chars.map((c) => (
              <div key={c.id} className="discover-card glass">
                <button className="discover-main" onClick={() => s.go({ name: 'character', id: c.id })}>
                  <Avatar c={c} size={84} ring />
                  <b>{c.name}</b>
                  <span className="muted sm">{styleLabel(c.style)}</span>
                  <span className="sm clamp">{c.personality}</span>
                </button>
                <div className="row gap">
                  <button className="btn ghost sm" onClick={() => s.go({ name: 'story', characterIds: [c.id] })}><Icon name="collab" size={14} /> Collab</button>
                  <button className="btn ghost sm" onClick={() => { const nc = s.remixCharacter(c.id); s.go({ name: 'character-create', editId: nc.id }); }}><Icon name="remix" size={14} /> Remix</button>
                </div>
              </div>
            ))}
            {chars.length === 0 && <p className="muted">No characters match.</p>}
          </div>
        ) : (
          <div className="creator-list">
            {creators.map((c) => {
              const following = s.following.includes(c.id);
              const count = s.characters.filter((x) => x.creatorId === c.id).length;
              return (
                <div key={c.id} className="creator-row glass">
                  <button className="row gap center grow left" onClick={() => s.go({ name: 'profile', creatorId: c.id })}>
                    <CreatorDot id={c.id} size={48} />
                    <div>
                      <b>{c.displayName}</b> <span className="muted">@{c.handle}</span>
                      <div className="sm muted">{c.bio} · {count} character{count === 1 ? '' : 's'}</div>
                    </div>
                  </button>
                  <button className={`btn sm ${following ? 'ghost' : 'primary'}`} onClick={() => s.toggleFollow(c.id)}>{following ? 'Following' : 'Follow'}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Backdrop>
  );
}
