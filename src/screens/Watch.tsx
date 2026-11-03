import { useEffect, useState } from 'react';
import { ME, useStore } from '../store';
import { VideoFrame } from '../components/VideoFrame';
import { Avatar } from '../components/Figure';
import { Credits, SubHeader } from '../components/Shell';
import { Icon } from '../components/Icon';
import { fmtLen, styleLabel, timeAgo } from '../util';

export function Watch({ videoId }: { videoId: string }) {
  const s = useStore();
  const v = s.videos.find((x) => x.id === videoId);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const series = v?.seriesId ? s.series.find((x) => x.id === v.seriesId) : undefined;
  const idx = series && v ? series.episodeIds.indexOf(v.id) : -1;
  const nextId = series && idx >= 0 ? series.episodeIds[idx + 1] : undefined;

  useEffect(() => {
    setPlaying(true);
    setEnded(false);
    setCountdown(5);
  }, [videoId]);

  useEffect(() => {
    if (!ended || !nextId) return;
    if (countdown <= 0) {
      s.back();
      s.go({ name: 'watch', videoId: nextId });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [ended, countdown, nextId, s]);

  if (!v) return <div className="page"><SubHeader title="Not found" /></div>;
  const chars = v.characterIds.map(s.character).filter(Boolean) as NonNullable<ReturnType<typeof s.character>>[];
  const w = s.world(v.worldId);
  const canEdit = v.creatorId === ME;
  const minScore = Math.min(...v.consistency.perCharacter.map((p) => p.score), 1);

  return (
    <div className="page watch-page">
      <SubHeader
        title={series ? `${series.title} · Ep. ${v.episode}` : 'Watch'}
        right={canEdit ? <button className="btn ghost sm" onClick={() => s.go({ name: 'story', editVideoId: v.id })}><Icon name="edit" size={14} /> Edit</button> : null}
      />
      <div className="watch-player" onClick={() => !ended && setPlaying((p) => !p)}>
        <VideoFrame v={v} playing={playing && !ended} onEnded={() => setEnded(true)} />
        {!playing && !ended && <div className="play-overlay"><Icon name="play" size={48} /></div>}
        {ended && (
          <div className="end-overlay" onClick={(e) => e.stopPropagation()}>
            {nextId ? (
              <>
                <p className="muted">Next episode in {countdown}…</p>
                <h3>{s.videos.find((x) => x.id === nextId)?.title}</h3>
                <div className="row gap">
                  <button className="btn primary" onClick={() => { s.back(); s.go({ name: 'watch', videoId: nextId }); }}><Icon name="next" size={16} /> Play next episode</button>
                  <button className="btn ghost" onClick={() => setCountdown(999)}>Stay</button>
                </div>
              </>
            ) : (
              <>
                <h3>{series ? 'You’re all caught up' : 'The end'}</h3>
                <button className="btn ghost" onClick={() => { setEnded(false); setPlaying(true); }}>Replay</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="watch-body">
        <h2>{v.title}</h2>
        <div className="muted sm">{fmtLen(v.lengthMin)} · {timeAgo(v.createdAt)} ago{v.updatedAt - v.createdAt > 60e3 && v.updatedAt > 0 ? ' · edited' : ''}</div>
        <Credits ids={s.videoCredits(v)} label={s.videoCredits(v).length > 1 ? 'Collab by' : 'By'} />

        <div className="consistency-badge">
          <Icon name="shield" size={16} /> Characters match their references · lowest match {Math.round(minScore * 100)}% · {v.consistency.regenerations} auto-regeneration{v.consistency.regenerations === 1 ? '' : 's'}
        </div>

        <div className="actions">
          <button className="btn ghost" onClick={() => s.like(v.id)}><Icon name="heart" size={16} /> {v.likes.toLocaleString()}</button>
          <button className="btn ghost" onClick={() => s.go({ name: 'story', characterIds: v.characterIds })}><Icon name="collab" size={16} /> Collab with this cast</button>
        </div>

        <h3 className="section-title">Cast</h3>
        <div className="cast-row">
          {chars.map((c) => (
            <button key={c.id} className="cast-big" onClick={() => s.go({ name: 'character', id: c.id })}>
              <Avatar c={c} size={52} />
              <b>{c.name}</b>
              <span className="muted sm">{styleLabel(c.style)}</span>
            </button>
          ))}
        </div>
        {w && <p className="muted"><Icon name="globe" size={14} /> {w.name}</p>}
        <h3 className="section-title">Story</h3>
        <p className="story-text">{v.story}</p>
        {v.audio && <p className="muted"><Icon name="audio" size={14} /> {v.audio.name}</p>}
        {v.audio?.src && <audio controls src={v.audio.src} className="audio" />}
        {v.references.length > 0 && (
          <div className="refs">{v.references.map((r) => <img key={r.id} src={r.url} alt={r.name} title={r.tag} />)}</div>
        )}

        {series && (
          <>
            <h3 className="section-title">Episodes</h3>
            <div className="ep-list">
              {series.episodeIds.map((eid, i) => {
                const e = s.videos.find((x) => x.id === eid);
                if (!e) return null;
                return (
                  <button key={eid} className={`ep-row ${eid === v.id ? 'on' : ''}`} onClick={() => { s.back(); s.go({ name: 'watch', videoId: eid }); }}>
                    <span className="ep-num">{i + 1}</span>
                    <span className="grow">{e.title}</span>
                    <span className="muted sm">{fmtLen(e.lengthMin)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
