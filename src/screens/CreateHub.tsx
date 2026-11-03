import { ME, useStore } from '../store';
import { Avatar } from '../components/Figure';
import { Icon } from '../components/Icon';

export function CreateHub() {
  const s = useStore();
  const mine = s.characters.filter((c) => c.creatorId === ME);
  const myWorlds = s.worlds.filter((w) => w.creatorId === ME);
  return (
    <div className="page hub">
      <div className="hub-grid">
        <button className="hub-tile big" onClick={() => s.go({ name: 'character-create' })}>
          <Icon name="sparkle" size={28} />
          <b>Character creation</b>
          <span>One prompt box. Type anything — we fill in the rest, then transport them onto the pedestal.</span>
        </button>
        <button className="hub-tile" onClick={() => (mine[0] ? s.go({ name: 'character-create', editId: mine[0].id, step: 2 }) : s.go({ name: 'character-create' }))}>
          <Icon name="globe" size={24} />
          <b>World creation</b>
          <span>Name, look, mood and rules — linked to your character.</span>
        </button>
        <button className="hub-tile" onClick={() => s.go({ name: 'story' })}>
          <Icon name="film" size={24} />
          <b>Story box</b>
          <span>Write it beat for beat. 1–15 minutes. Collab, references, audio.</span>
        </button>
        <button className="hub-tile" onClick={() => s.go({ name: 'series-new' })}>
          <Icon name="series" size={24} />
          <b>New series</b>
          <span>Group episodes into a show.</span>
        </button>
      </div>

      <h3 className="section-title">Your characters</h3>
      {mine.length === 0 ? (
        <p className="muted">No characters yet.</p>
      ) : (
        <div className="char-row">
          {mine.map((c) => (
            <button key={c.id} className="char-tile" onClick={() => s.go({ name: 'character', id: c.id })}>
              <Avatar c={c} size={72} ring />
              <b>{c.name}</b>
              <span className="muted sm">{s.world(c.worldId)?.name ?? 'no world'}</span>
            </button>
          ))}
        </div>
      )}

      {myWorlds.length > 0 && (
        <>
          <h3 className="section-title">Your worlds</h3>
          <div className="char-row">
            {myWorlds.map((w) => (
              <button
                key={w.id}
                className="world-tile"
                style={{ background: `radial-gradient(120% 90% at 50% 10%, ${w.palette[0]}, ${w.palette[1]})` }}
                onClick={() => (w.characterId ? s.go({ name: 'character-create', editId: w.characterId, step: 2 }) : undefined)}
              >
                <b>{w.name}</b>
                {w.remixOf && <span className="sm"><Icon name="remix" size={12} /> remix</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
