import { ME, useStore } from '../store';
import { Backdrop, BACKGROUNDS, Credits, SubHeader } from '../components/Shell';
import { WorldForm } from '../components/WorldForm';
import { Icon } from '../components/Icon';

/** Standalone world page — used for remixed worlds and any world not tied to a character. */
export function WorldEdit({ id }: { id: string }) {
  const s = useStore();
  const w = s.world(id);
  if (!w) return <div className="page"><SubHeader title="Not found" /></div>;
  const mine = w.creatorId === ME;
  const linked = s.character(w.characterId ?? '');
  const myChars = s.characters.filter((c) => c.creatorId === ME);
  return (
    <Backdrop src={BACKGROUNDS.characterCreation}>
      <div className="page">
        <SubHeader title={mine ? `Edit ${w.name}` : w.name} />
        {w.remixOf && (
          <p className="remix-credit"><Icon name="remix" size={14} /> Remix of {s.world(w.remixOf.worldId)?.name ?? 'a world'} <Credits ids={[w.remixOf.creatorId]} /></p>
        )}
        {mine ? (
          <>
            <WorldForm world={w} onChange={s.upsertWorld} />
            <label className="field-label">Home of</label>
            <select
              className="input"
              value={w.characterId ?? ''}
              onChange={(e) => {
                const cid = e.target.value || null;
                s.upsertWorld({ ...w, characterId: cid });
                const c = cid ? s.character(cid) : undefined;
                if (c) s.upsertCharacter({ ...c, worldId: w.id, updatedAt: Date.now() });
              }}
            >
              <option value="">No character linked</option>
              {myChars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        ) : (
          <div className="glass">
            <p>{w.looks}</p>
            <p><b>Mood:</b> {w.mood}</p>
            <button className="btn ghost sm" onClick={() => { const nw = s.remixWorld(w.id); s.back(); s.go({ name: 'world', id: nw.id }); }}><Icon name="remix" size={14} /> Remix world</button>
          </div>
        )}
        {linked && <button className="btn ghost" onClick={() => s.go({ name: 'character', id: linked.id })}>Open {linked.name}</button>}
      </div>
    </Backdrop>
  );
}
