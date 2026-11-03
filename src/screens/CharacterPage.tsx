import { ME, useStore } from '../store';
import { Pedestal } from '../components/Pedestal';
import { Avatar } from '../components/Figure';
import { Backdrop, BACKGROUNDS, Credits, SubHeader } from '../components/Shell';
import { Icon } from '../components/Icon';
import { VideoCard } from './Feed';
import { styleLabel } from '../util';
import { lockReference } from '../ai/generate';

export function CharacterPage({ id }: { id: string }) {
  const s = useStore();
  const c = s.character(id);
  if (!c) return <div className="page"><SubHeader title="Not found" /></div>;
  const w = s.world(c.worldId);
  const mine = c.creatorId === ME;
  const appears = s.videos.filter((v) => v.characterIds.includes(c.id));
  const ref = lockReference(c);

  const remix = () => {
    const nc = s.remixCharacter(c.id);
    s.go({ name: 'character-create', editId: nc.id });
  };

  return (
    <div className="page char-page">
      <Backdrop src={BACKGROUNDS.characterCreation} className="char-hero">
        <SubHeader title={c.name} right={mine ? <button className="btn ghost sm" onClick={() => s.go({ name: 'character-create', editId: c.id })}><Icon name="edit" size={14} /> Edit</button> : null} />
        <Pedestal c={c} arrivalKey={c.id} />
      </Backdrop>

      <div className="char-body">
        <div className="char-title">
          <Avatar c={c} size={56} ring />
          <div>
            <h2>{c.name}</h2>
            <Credits ids={[c.creatorId]} label="created by" />
            {c.remixOf && (
              <div className="remix-credit">
                <Icon name="remix" size={14} /> Remix of{' '}
                <button className="link" onClick={() => s.go({ name: 'character', id: c.remixOf!.characterId })}>
                  {s.character(c.remixOf.characterId)?.name ?? 'original'}
                </button>{' '}
                <Credits ids={[c.remixOf.creatorId]} />
              </div>
            )}
          </div>
        </div>

        <div className="actions">
          <button className="btn primary" onClick={() => s.go({ name: 'story', characterIds: [c.id] })}><Icon name="film" size={16} /> Make a video</button>
          <button className="btn ghost" onClick={() => s.go({ name: 'chat', characterId: c.id })}><Icon name="chat" size={16} /> Chat</button>
          {!mine && <button className="btn ghost" onClick={remix}><Icon name="remix" size={16} /> Remix</button>}
        </div>

        <section className="card">
          <h3>Appearance</h3>
          <p>{c.appearance}</p>
          <div className="palette">
            {ref.colors.map((col, i) => <span key={i} style={{ background: col }} />)}
          </div>
        </section>
        <section className="card"><h3>Personality</h3><p>{c.personality}</p></section>
        <section className="card"><h3>Lore</h3><p>{c.lore}</p></section>
        {c.traits.length > 0 && (
          <section className="card">
            <h3>Traits & powers</h3>
            <div className="chips">{c.traits.map((t) => <span key={t} className="chip on">{t}</span>)}</div>
          </section>
        )}
        <div className="two">
          <section className="card">
            <h3>Voice</h3>
            {c.voice ? <p><Icon name="mic" size={14} /> {c.voice.label}</p> : <p className="muted">No voice yet {mine && <button className="link" onClick={() => s.go({ name: 'character-create', editId: c.id })}>add one</button>}</p>}
            {c.voice?.src && <audio controls src={c.voice.src} className="audio" />}
          </section>
          <section className="card">
            <h3>Animation style</h3>
            <p className="lime">{styleLabel(c.style)}</p>
          </section>
        </div>

        <section className="card world-card">
          <h3>World</h3>
          {w ? (
            <>
              <div className="world-swatch" style={{ background: `radial-gradient(120% 90% at 50% 10%, ${w.palette[0]}, ${w.palette[1]})` }}><span>{w.name}</span></div>
              <p>{w.looks}</p>
              <p><b>Mood:</b> {w.mood}</p>
              {w.rules.filter(Boolean).length > 0 && <ul className="rules">{w.rules.filter(Boolean).map((r, i) => <li key={i}>{r}</li>)}</ul>}
              {w.remixOf && <div className="remix-credit"><Icon name="remix" size={14} /> World remixed from <Credits ids={[w.remixOf.creatorId]} label="" /></div>}
              <div className="row gap">
                {mine && <button className="btn ghost sm" onClick={() => s.go({ name: 'character-create', editId: c.id, step: 2 })}><Icon name="edit" size={14} /> Edit world</button>}
                {!mine && <button className="btn ghost sm" onClick={() => { const nw = s.remixWorld(w.id); s.go({ name: 'world', id: nw.id }); }}><Icon name="remix" size={14} /> Remix world</button>}
              </div>
            </>
          ) : (
            <p className="muted">No world yet. {mine && <button className="link" onClick={() => s.go({ name: 'character-create', editId: c.id, step: 2 })}>Create one</button>}</p>
          )}
        </section>

        <section className="card ref-card">
          <h3><Icon name="shield" size={16} /> Locked reference</h3>
          <p className="muted">Used for every video, episode, remix and collab. Each new video is checked against this and regenerated if {c.name} drifts.</p>
          <dl>
            <dt>Face</dt><dd>{ref.face}</dd>
            <dt>Hair</dt><dd>{ref.hair}</dd>
            <dt>Outfit</dt><dd>{ref.outfit}</dd>
            <dt>Proportions</dt><dd>{ref.proportions}</dd>
            <dt>Voice</dt><dd>{ref.voice}</dd>
            <dt>Style</dt><dd>{ref.style}</dd>
          </dl>
        </section>

        {appears.length > 0 && (
          <section>
            <h3 className="section-title">Appears in</h3>
            <div className="grid">{appears.map((v) => <VideoCard key={v.id} v={v} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
