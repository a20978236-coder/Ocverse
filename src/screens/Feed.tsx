import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { Video } from '../types';
import { VideoFrame } from '../components/VideoFrame';
import { Avatar } from '../components/Figure';
import { Backdrop, BACKGROUNDS, Credits } from '../components/Shell';
import { Icon } from '../components/Icon';
import { fmtLen } from '../util';

export function VideoCard({ v }: { v: Video }) {
  const s = useStore();
  const series = v.seriesId ? s.series.find((x) => x.id === v.seriesId) : undefined;
  return (
    <button className="vcard" onClick={() => s.go({ name: 'watch', videoId: v.id })}>
      <div className="vcard-thumb">
        <VideoFrame v={v} playing={false} compact />
        <span className="len">{fmtLen(v.lengthMin)}</span>
        {series && <span className="ep">Ep. {v.episode}</span>}
      </div>
      <div className="vcard-meta">
        <b>{v.title}</b>
        <Credits ids={s.videoCredits(v)} />
      </div>
    </button>
  );
}

function FeedItem({ v }: { v: Video }) {
  const s = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && e.intersectionRatio > 0.6), { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const chars = v.characterIds.map(s.character).filter(Boolean) as NonNullable<ReturnType<typeof s.character>>[];
  const series = v.seriesId ? s.series.find((x) => x.id === v.seriesId) : undefined;
  return (
    <div className="feed-item" ref={ref}>
      <div className="feed-player" onClick={() => s.go({ name: 'watch', videoId: v.id })}>
        <VideoFrame v={v} playing={visible} />
      </div>
      <div className="feed-info">
        {series && <div className="feed-series"><Icon name="series" size={14} /> {series.title} · Episode {v.episode}</div>}
        <h3>{v.title}</h3>
        <Credits ids={s.videoCredits(v)} label={s.videoCredits(v).length > 1 ? 'collab by' : 'by'} />
        <div className="feed-cast">
          {chars.map((c) => (
            <button key={c.id} className="cast-chip" onClick={() => s.go({ name: 'character', id: c.id })}>
              <Avatar c={c} size={22} /> {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="feed-rail">
        <button onClick={() => s.like(v.id)}><Icon name="heart" size={24} /><span>{v.likes.toLocaleString()}</span></button>
        <button onClick={() => s.go({ name: 'story', characterIds: v.characterIds })}><Icon name="collab" size={24} /><span>Collab</span></button>
        {chars[0] && <button onClick={() => s.go({ name: 'character', id: chars[0].id })}><Icon name="remix" size={24} /><span>Remix</span></button>}
        <span className="rail-len">{fmtLen(v.lengthMin)}</span>
      </div>
    </div>
  );
}

export function Feed() {
  const { videos } = useStore();
  const sorted = [...videos].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <Backdrop src={BACKGROUNDS.feed} className="feed-backdrop">
      <div className="feed">
        {sorted.map((v) => <FeedItem key={v.id} v={v} />)}
      </div>
    </Backdrop>
  );
}
