import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Video } from '../types';
import { Figure } from './Figure';

/**
 * Stand-in "player": renders the video's world + locked characters and steps
 * through the story beats as captions. Real generated video would replace
 * the stage, keeping the same chrome.
 */
export function VideoFrame({ v, playing, onEnded, compact }: { v: Video; playing: boolean; onEnded?: () => void; compact?: boolean }) {
  const { character, world } = useStore();
  const w = world(v.worldId);
  const chars = v.characterIds.map((id) => character(id)).filter(Boolean) as NonNullable<ReturnType<typeof character>>[];
  const beats = useMemo(() => v.story.split(/\n+|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean), [v.story]);
  const [t, setT] = useState(0);
  // compressed preview timeline: ~3s per beat
  const total = Math.max(1, beats.length) * 3000;

  useEffect(() => setT(0), [v.id]);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - t;
    let raf = 0;
    const loop = (now: number) => {
      const nt = now - start;
      if (nt >= total) {
        setT(total);
        onEnded?.();
        return;
      }
      setT(nt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, v.id, total]);

  const beat = beats[Math.min(beats.length - 1, Math.floor((t / total) * beats.length))] ?? '';
  const [a, b] = w?.palette ?? ['#1a2a10', '#05070a'];

  return (
    <div className={`vframe ${compact ? 'compact' : ''}`} style={{ background: `radial-gradient(120% 80% at 50% 20%, ${a}, ${b})` }}>
      <div className="vframe-grain" />
      <div className="vframe-floor" />
      <div className="vframe-cast" style={{ ['--n' as string]: chars.length }}>
        {chars.map((c, i) => (
          <div key={c.id} className="vframe-actor" style={{ animationDelay: `${i * 0.4}s` }}>
            <Figure c={c} alive={playing} />
          </div>
        ))}
      </div>
      {!compact && beat && <div className="vframe-caption">{beat}</div>}
      <div className="vframe-progress">
        <div style={{ width: `${(t / total) * 100}%` }} />
      </div>
    </div>
  );
}
