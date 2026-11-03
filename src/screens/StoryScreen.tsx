import { useMemo, useRef, useState } from 'react';
import { ME, useStore } from '../store';
import type { Attachment, AudioTrack, ConsistencyReport, Video } from '../types';
import { CharacterPicker } from '../components/CharacterPicker';
import { Avatar } from '../components/Figure';
import { Icon } from '../components/Icon';
import { SubHeader } from '../components/Shell';
import { generateVideo } from '../ai/generate';
import { fileToDataUrl, uid } from '../util';

const LIBRARY: string[] = ['Neon Rain (synthwave)', 'Hollow Choir (ambient)', 'Storm Drums (epic)', 'Corner Shop Jazz (lofi)', 'Last Light (piano)'];

export function StoryScreen({ seriesId: initialSeries, characterIds: initialChars, editVideoId }: { seriesId?: string; characterIds?: string[]; editVideoId?: string }) {
  const s = useStore();
  const editing = editVideoId ? s.videos.find((v) => v.id === editVideoId) : undefined;
  const myChars = s.characters.filter((c) => c.creatorId === ME);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [story, setStory] = useState(editing?.story ?? '');
  const [chars, setChars] = useState<string[]>(editing?.characterIds ?? initialChars ?? (myChars[0] ? [myChars[0].id] : []));
  const [refs, setRefs] = useState<Attachment[]>(editing?.references ?? []);
  const [audio, setAudio] = useState<AudioTrack | null>(editing?.audio ?? null);
  const [len, setLen] = useState(editing?.lengthMin ?? 3);
  const [seriesId, setSeriesId] = useState<string>(editing?.seriesId ?? initialSeries ?? '');
  const firstWorld = s.character(chars[0] ?? '')?.worldId ?? '';
  const [worldId, setWorldId] = useState<string>(editing?.worldId ?? '');
  const [picker, setPicker] = useState(false);
  const [audioSheet, setAudioSheet] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const mySeries = s.series.filter((x) => x.creatorId === ME || x.creditIds.includes(ME) || x.id === seriesId);
  const effectiveWorld = worldId || firstWorld;
  const credits = useMemo(() => [...new Set([ME, ...chars.map((id) => s.character(id)?.creatorId).filter(Boolean) as string[]])], [chars, s]);
  const isCollab = credits.length > 1;

  const addRefs = async (files: FileList | null) => {
    if (!files) return;
    const next = await Promise.all([...files].map(async (f) => ({ id: uid('r_'), name: f.name, url: await fileToDataUrl(f), tag: 'scene' as const })));
    setRefs((r) => [...r, ...next]);
  };
  const uploadAudio = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setAudio({ name: f.name, src: URL.createObjectURL(f), library: false });
    setAudioSheet(false);
  };

  const canGo = story.trim().length > 4 && chars.length > 0 && !busy;

  const run = async () => {
    setBusy(true);
    setLog([]);
    setReport(null);
    const characters = chars.map((id) => s.character(id)!).filter(Boolean);
    const rep = await generateVideo(
      { story, characters, world: s.world(effectiveWorld) ?? null, lengthMin: len, referenceCount: refs.length },
      (line, p) => {
        setLog((l) => [...l, line]);
        setPct(p);
      },
    );
    setReport(rep);
    const now = Date.now();
    const series = seriesId ? s.series.find((x) => x.id === seriesId) : undefined;
    const v: Video = {
      id: editing?.id ?? uid('v_'),
      creatorId: editing?.creatorId ?? ME,
      title: title.trim() || (series ? `${series.title} — Episode ${series.episodeIds.length + 1}` : story.split(/[.!?\n]/)[0].slice(0, 48)),
      story,
      characterIds: chars,
      creditIds: [...new Set([...(editing?.creditIds ?? []), ...credits])],
      worldId: effectiveWorld || null,
      references: refs,
      audio,
      lengthMin: len,
      seriesId: seriesId || null,
      episode: editing?.episode ?? (series ? series.episodeIds.length + 1 : null),
      likes: editing?.likes ?? 0,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
      consistency: rep,
    };
    if (editing) s.updateVideo(v);
    else s.addVideo(v);
    setBusy(false);
    setTimeout(() => s.go({ name: 'watch', videoId: v.id }), 900);
  };

  return (
    <div className="page story-page">
      <SubHeader title={editing ? 'Edit video' : seriesId ? 'New episode' : 'Story box'} />

      <label className="field-label">Title</label>
      <input className="input" placeholder="Give it a title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />

      <div className="row gap">
        <div className="grow">
          <label className="field-label">Series</label>
          <select className="input" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} disabled={!!editing}>
            <option value="">Standalone video</option>
            {mySeries.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title} · next is Ep. {x.episodeIds.length + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="grow">
          <label className="field-label">World</label>
          <select className="input" value={effectiveWorld} onChange={(e) => setWorldId(e.target.value)}>
            <option value="">No world</option>
            {s.worlds.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="field-label">What happens</label>
      <div className="storybox">
        <textarea
          placeholder={'Write it beat for beat.\nE.g. "Ash lands on the rooftop in the rain. She picks up a cracked mask and sees a memory flash — someone running. She chases the echo down twenty levels of neon…"'}
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={8}
        />
        {(chars.length > 0 || refs.length > 0 || audio) && (
          <div className="storybox-attached">
            {chars.map((id) => {
              const c = s.character(id);
              return c ? (
                <button key={id} className="chip" onClick={() => setChars(chars.filter((x) => x !== id))} title="Remove">
                  <Avatar c={c} size={20} /> {c.name} <Icon name="close" size={12} />
                </button>
              ) : null;
            })}
            {refs.map((r) => (
              <span key={r.id} className="ref-thumb">
                <img src={r.url} alt={r.name} />
                <select value={r.tag} onChange={(e) => setRefs(refs.map((x) => (x.id === r.id ? { ...x, tag: e.target.value as Attachment['tag'] } : x)))}>
                  <option value="character">look</option>
                  <option value="world">world</option>
                  <option value="scene">scene</option>
                  <option value="mood">mood</option>
                </select>
                <button onClick={() => setRefs(refs.filter((x) => x.id !== r.id))} aria-label="Remove reference"><Icon name="close" size={12} /></button>
              </span>
            ))}
            {audio && (
              <button className="chip" onClick={() => setAudio(null)}>
                <Icon name="audio" size={14} /> {audio.name} <Icon name="close" size={12} />
              </button>
            )}
          </div>
        )}
        <div className="storybox-tools">
          <button className="tool" onClick={() => setPicker(true)} aria-label="Character collab" title="Character collab">
            <Icon name="collab" size={18} />
          </button>
          <button className="tool" onClick={() => fileRef.current?.click()} aria-label="Add reference images" title="Add reference images">
            <Icon name="plus" size={18} />
          </button>
          <button className="tool" onClick={() => setAudioSheet(true)} aria-label="Add music or audio" title="Add music or audio">
            <Icon name="audio" size={18} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addRefs(e.target.files)} />
        </div>
      </div>
      {isCollab && (
        <p className="hint">
          <Icon name="collab" size={14} /> Collab — every creator involved is credited. Each character is locked to their own reference.
        </p>
      )}

      <label className="field-label">
        Length <b className="lime">{len} min</b>
      </label>
      <input className="range" type="range" min={1} max={15} step={1} value={len} onChange={(e) => setLen(+e.target.value)} />
      <div className="range-legend"><span>1 min short</span><span>15 min episode</span></div>

      <button className="btn primary big" disabled={!canGo} onClick={run}>
        <Icon name="sparkle" /> {busy ? 'Generating…' : editing ? 'Regenerate & save' : 'Generate & post'}
      </button>

      {(busy || log.length > 0) && (
        <div className="genlog">
          <div className="genlog-bar"><div style={{ width: `${pct}%` }} /></div>
          <div className="genlog-title"><Icon name="shield" size={14} /> Character consistency check</div>
          {log.map((l, i) => (
            <div key={i} className={`genlog-line ${l.startsWith('↻') ? 'warn' : l.startsWith('✓') ? 'ok' : ''}`}>{l}</div>
          ))}
          {report && (
            <div className="genlog-line ok">
              Delivered — {report.passes} reference checks, {report.regenerations} regeneration{report.regenerations === 1 ? '' : 's'}.
            </div>
          )}
        </div>
      )}

      {picker && <CharacterPicker selected={chars} onChange={setChars} onClose={() => setPicker(false)} />}
      {audioSheet && (
        <div className="sheet-backdrop" onClick={() => setAudioSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><h3>Music & audio</h3><button className="icon-btn" onClick={() => setAudioSheet(false)}><Icon name="close" /></button></div>
            {LIBRARY.map((t) => (
              <button key={t} className={`list-row ${audio?.name === t ? 'on' : ''}`} onClick={() => { setAudio({ name: t, library: true }); setAudioSheet(false); }}>
                <Icon name="audio" size={16} /> {t}
              </button>
            ))}
            <button className="btn ghost" onClick={() => audioRef.current?.click()}><Icon name="plus" size={16} /> Upload your own</button>
            <input ref={audioRef} type="file" accept="audio/*" hidden onChange={(e) => uploadAudio(e.target.files)} />
          </div>
        </div>
      )}
    </div>
  );
}
