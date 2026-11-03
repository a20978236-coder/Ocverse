import { useEffect, useRef, useState } from 'react';
import type { Character } from '../types';
import { Figure } from './Figure';

type Phase = 'empty' | 'beam' | 'assemble' | 'flash' | 'idle';

/**
 * Transport sequence: lime beam drops → character assembles from swirling
 * particles with a glitch shimmer → soft flash on landing → alive idle loop.
 * Re-runs whenever `arrivalKey` changes (created or opened).
 */
export function Pedestal({ c, arrivalKey }: { c: Character | null; arrivalKey: string | number }) {
  const [phase, setPhase] = useState<Phase>(c ? 'beam' : 'empty');
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!c) {
      setPhase('empty');
      return;
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPhase('idle');
      return;
    }
    setPhase('beam');
    const t1 = setTimeout(() => setPhase('assemble'), 650);
    const t2 = setTimeout(() => setPhase('flash'), 2300);
    const t3 = setTimeout(() => setPhase('idle'), 2900);
    return () => [t1, t2, t3].forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivalKey, c?.id]);

  // particle swirl
  useEffect(() => {
    if (phase !== 'assemble' && phase !== 'beam') return;
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.scale(dpr, dpr);
    const cx = W / 2;
    const accent = c?.look.accent ?? '#b6ff3b';
    const N = 220;
    const ps = Array.from({ length: N }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = 80 + Math.random() * Math.max(W, H) * 0.5;
      return {
        a,
        r,
        tx: cx + (Math.random() - 0.5) * W * 0.32,
        ty: H * 0.12 + Math.random() * H * 0.72,
        spin: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3),
        size: 0.8 + Math.random() * 2.4,
        col: Math.random() < 0.7 ? '#c8ff5a' : accent,
        delay: Math.random() * 0.35,
      };
    });
    const start = performance.now();
    const dur = phase === 'beam' ? 650 : 1650;
    let raf = 0;
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        const lt = Math.max(0, Math.min(1, (t - p.delay) / (1 - p.delay)));
        const ease = phase === 'beam' ? lt * 0.25 : 0.25 + 0.75 * (1 - Math.pow(1 - lt, 3));
        const ang = p.a + p.spin * (1 - ease);
        const rr = p.r * (1 - ease);
        const x = p.tx + Math.cos(ang) * rr;
        const y = p.ty + Math.sin(ang) * rr * 0.55;
        const alpha = phase === 'beam' ? lt * 0.6 : 1 - Math.pow(lt, 6) * 0.9;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.col;
        ctx.shadowColor = p.col;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t < 1) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
    };
  }, [phase, c]);

  return (
    <div className={`pedestal-stage phase-${phase}`}>
      <div className="beam" />
      <canvas ref={canvas} className="particles" />
      <div className="figure-wrap">
        {c && (
          <div className="figure-glitch" key={String(arrivalKey)}>
            <Figure c={c} alive={phase === 'idle' || phase === 'flash'} />
          </div>
        )}
      </div>
      <div className="flash" />
      <div className="pedestal">
        <div className="pedestal-top" />
        <div className="pedestal-ring r1" />
        <div className="pedestal-ring r2" />
      </div>
      {!c && <div className="pedestal-hint">Your character will be transported here</div>}
    </div>
  );
}
