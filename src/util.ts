import type { AnimationStyle } from './types';

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function styleLabel(s: AnimationStyle): string {
  return s.custom.trim() || s.preset || 'anime';
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function timeAgo(t: number): string {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export const fmtLen = (m: number) => `${m}:00`;

let _ctx: CanvasRenderingContext2D | null = null;
/** Normalise any CSS colour (hsl, names…) to #rrggbb for <input type="color">. */
export function toHex(color: string): string {
  _ctx ??= document.createElement('canvas').getContext('2d');
  if (!_ctx) return '#888888';
  _ctx.fillStyle = '#000';
  _ctx.fillStyle = color;
  const v = String(_ctx.fillStyle);
  return /^#[0-9a-f]{6}$/i.test(v) ? v : '#888888';
}
