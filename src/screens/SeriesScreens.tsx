import { useRef, useState } from 'react';
import { ME, useStore } from '../store';
import type { Series } from '../types';
import { Credits, SubHeader } from '../components/Shell';
import { Icon } from '../components/Icon';
import { VideoFrame } from '../components/VideoFrame';
import { fileToDataUrl, fmtLen, uid } from '../util';

const GRADS: Record<string, string> = {
  storm: 'linear-gradient(135deg,#1d3a5a,#05080f 60%,#b6ff3b33)',
  lime: 'linear-gradient(135deg,#2a3a0a,#070a03 60%,#b6ff3b55)',
  dusk: 'linear-gradient(135deg,#3b2a5a,#0b0a14 60%,#f07ab833)',
  ember: 'linear-gradient(135deg,#5a2a1d,#120805 60%,#f08a2c44)',
};

export function coverStyle(cover: string) {
  if (cover.startsWith('grad:')) return { background: GRADS[cover.slice(5)] ?? GRADS.lime };
  return { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' };
}

export function SeriesTab() {
  const s = useStore();
  return (
    <div className="page">
      <div className="row between">
        <h2 className="section-title">Shows</h2>
        <button className="btn primary sm" onClick={() => s.go({ name: 'series-new' })}><Icon name="plus" size={14} /> New series</button>
      </div>
      <div className="series-grid">
        {s.series.map((x) => (
          <button key={x.id} className="series-card" onClick={() => s.go({ name: 'series', id: x.id })}>
            <div className="series-cover" style={coverStyle(x.cover)}>
              <span className="series-count">{x.episodeIds.length} episode{x.episodeIds.length === 1 ? '' : 's'}</span>
            </div>
            <b>{x.title}</b>
            <Credits ids={x.creditIds} label={x.creditIds.length > 1 ? 'collab by' : 'by'} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function SeriesNew() {
  const s = useStore();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cover, setCover] = useState('grad:lime');
  const fileRef = useRef<HTMLInputElement>(null);
  const create = () => {
    const x: Series = { id: uid('s_'), creatorId: ME, title: title.trim() || 'Untitled series', description: desc, cover, creditIds: [ME], episodeIds: [], createdAt: Date.now() };
    s.upsertSeries(x);
    s.back();
    s.go({ name: 'series', id: x.id });
  };
  return (
    <div className="page">
      <SubHeader title="New series" />
      <div className="series-cover big" style={coverStyle(cover)}><span>{title || 'Your show'}</span></div>
      <div className="chips">
        {Object.keys(GRADS).map((g) => (
          <button key={g} className={`chip ${cover === `grad:${g}` ? 'on' : ''}`} onClick={() => setCover(`grad:${g}`)}>{g}</button>
        ))}
        <button className="chip" onClick={() => fileRef.current?.click()}><Icon name="plus" size={14} /> Upload cover</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && setCover(await fileToDataUrl(e.target.files[0]))} />
      </div>
      <label className="field-label">Title</label>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Storm Season" />
      <label className="field-label">Description</label>
      <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What’s the show about?" />
      <p className="hint"><Icon name="collab" size={14} /> Collab series are open-ended: add any creator’s characters to an episode and every creator gets credit on every episode.</p>
      <button className="btn primary big" onClick={create}>Create series</button>
    </div>
  );
}

export function SeriesDetail({ id }: { id: string }) {
  const s = useStore();
  const x = s.series.find((y) => y.id === id);
  const [editing, setEditing] = useState(false);
  if (!x) return <div className="page"><SubHeader title="Not found" /></div>;
  const eps = x.episodeIds.map((e) => s.videos.find((v) => v.id === e)).filter(Boolean) as NonNullable<ReturnType<typeof s.videos.find>>[];
  const canEdit = x.creatorId === ME || x.creditIds.includes(ME);
  const move = (i: number, d: -1 | 1) => {
    const ids = [...x.episodeIds];
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    s.upsertSeries({ ...x, episodeIds: ids });
    ids.forEach((eid, k) => {
      const v = s.videos.find((vv) => vv.id === eid);
      if (v && v.episode !== k + 1) s.updateVideo({ ...v, episode: k + 1 });
    });
  };
  return (
    <div className="page">
      <SubHeader title={x.title} right={x.creatorId === ME ? <button className="btn ghost sm" onClick={() => setEditing((e) => !e)}><Icon name="edit" size={14} /> {editing ? 'Done' : 'Edit'}</button> : null} />
      <div className="series-cover big" style={coverStyle(x.cover)}>
        {editing ? (
          <input className="input" value={x.title} onChange={(e) => s.upsertSeries({ ...x, title: e.target.value })} />
        ) : (
          <span>{x.title}</span>
        )}
      </div>
      {editing ? (
        <textarea className="input" rows={3} value={x.description} onChange={(e) => s.upsertSeries({ ...x, description: e.target.value })} />
      ) : (
        <p>{x.description}</p>
      )}
      <Credits ids={x.creditIds} label={x.creditIds.length > 1 ? 'Collab series by' : 'By'} />
      <div className="actions">
        {eps[0] && <button className="btn primary" onClick={() => s.go({ name: 'watch', videoId: eps[0].id })}><Icon name="play" size={16} /> Watch from Episode 1</button>}
        {canEdit && <button className="btn ghost" onClick={() => s.go({ name: 'story', seriesId: x.id })}><Icon name="plus" size={16} /> Episode {eps.length + 1}</button>}
        {!canEdit && <button className="btn ghost" onClick={() => s.go({ name: 'story', seriesId: x.id, characterIds: eps.at(-1)?.characterIds })}><Icon name="collab" size={16} /> Join with an episode</button>}
      </div>
      <div className="ep-list">
        {eps.map((v, i) => (
          <div key={v.id} className="ep-card">
            <button className="ep-thumb" onClick={() => s.go({ name: 'watch', videoId: v.id })}>
              <VideoFrame v={v} playing={false} compact />
            </button>
            <div className="grow">
              <div className="muted sm">Episode {i + 1} · {fmtLen(v.lengthMin)}</div>
              <b>{v.title}</b>
              <div><Credits ids={s.videoCredits(v)} /></div>
            </div>
            {editing && (
              <div className="col">
                <button className="icon-btn" onClick={() => move(i, -1)} aria-label="Move up">▲</button>
                <button className="icon-btn" onClick={() => move(i, 1)} aria-label="Move down">▼</button>
              </div>
            )}
            {v.creatorId === ME && <button className="icon-btn" onClick={() => s.go({ name: 'story', editVideoId: v.id })} aria-label="Edit episode"><Icon name="edit" size={16} /></button>}
          </div>
        ))}
        {eps.length === 0 && <p className="muted">No episodes yet.</p>}
      </div>
    </div>
  );
}
