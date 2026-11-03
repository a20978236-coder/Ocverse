import type { CSSProperties } from 'react';
import type { Character } from '../types';

/**
 * The character's rendered body, drawn from their locked look. The same
 * component draws them on the pedestal, in avatars and in video frames, so
 * the face/hair/outfit/colors/proportions are identical everywhere.
 * Rendering details change with the chosen animation style.
 */
interface Props {
  c: Pick<Character, 'id' | 'look' | 'style' | 'idleEnergy' | 'portrait' | 'name'>;
  bust?: boolean;
  alive?: boolean;
  className?: string;
}

type Kind = 'anime' | 'semi' | 'cartoon' | '3d' | 'real' | 'comic';

function kindOf(c: Props['c']): Kind {
  switch (c.style.preset) {
    case 'semi-realistic anime': return 'semi';
    case 'cartoon': return 'cartoon';
    case '3D animated': return '3d';
    case 'realistic': return 'real';
    case 'comic book': return 'comic';
    default: {
      const t = c.style.custom.toLowerCase();
      if (/comic|ink|manga panel/.test(t)) return 'comic';
      if (/3d|pixar|cgi|clay/.test(t)) return '3d';
      if (/cartoon|chibi|toon/.test(t)) return 'cartoon';
      if (/real|photo|live/.test(t)) return 'real';
      return 'anime';
    }
  }
}

export function Figure({ c, bust, alive = true, className = '' }: Props) {
  const k = kindOf(c);
  const L = c.look;
  const id = c.id.replace(/[^a-z0-9]/gi, '');
  const shoulder = L.build === 'broad' ? 46 : L.build === 'slim' ? 32 : 38;
  const waist = L.build === 'broad' ? 34 : L.build === 'slim' ? 22 : 27;
  const stroke = k === 'cartoon' || k === 'comic' ? '#0a0a0a' : k === '3d' || k === 'real' ? 'none' : 'rgba(0,0,0,.55)';
  const sw = k === 'comic' ? 3.2 : k === 'cartoon' ? 3.6 : 1.4;
  const eyeR = k === 'cartoon' ? 7 : k === 'anime' ? 6.5 : k === 'semi' ? 5 : k === '3d' ? 6 : 3.6;
  const headR = k === 'cartoon' || k === '3d' ? 38 : 33;
  const fill = (col: string, g: string) => (k === '3d' || k === 'real' || k === 'semi' ? `url(#${g}${id})` : col);
  const e = c.idleEnergy / 100;
  const vars = {
    '--amp': (0.35 + e * 1.5).toFixed(2),
    '--spd': (1.6 - e * 0.95).toFixed(2),
  } as CSSProperties;

  const hairBack =
    L.hairStyle === 'long' ? (
      <path d={`M${100 - headR - 4} 78 Q${100 - headR - 14} 170 ${100 - shoulder + 2} 205 L${100 + shoulder - 2} 205 Q${100 + headR + 14} 170 ${100 + headR + 4} 78 Z`} />
    ) : L.hairStyle === 'tied' ? (
      <path d={`M${100 + headR - 6} 66 q30 10 22 70 q-6 40 -18 64 q-2 -40 -12 -70 Z`} />
    ) : null;

  const hairFront =
    L.hairStyle === 'spiky' ? (
      <path d={`M${100 - headR - 4} 84 L${100 - headR - 16} 52 L${100 - 22} 50 L${100 - 26} 24 L${100 - 4} 40 L${100 + 6} 12 L${100 + 18} 40 L${100 + 38} 26 L${100 + headR} 56 L${100 + headR + 16} 64 L${100 + headR + 4} 86 Q${100 + 10} 54 ${100 - headR - 4} 84 Z`} />
    ) : (
      <path d={`M${100 - headR - 3} 90 Q${100 - headR - 6} ${46 - (k === 'cartoon' ? 6 : 0)} 100 ${80 - headR - 6} Q${100 + headR + 6} 46 ${100 + headR + 3} 90 Q${100 + 20} 58 ${100 - 4} 64 Q${100 - 18} 70 ${100 - headR - 3} 90 Z`} />
    );

  return (
    <svg
      className={['figure', `k-${k}`, alive && 'alive', className].filter(Boolean).join(' ')}
      viewBox={bust ? '46 18 108 108' : '0 0 200 360'}
      style={vars}
      role="img"
      aria-label={c.name}
    >
      <defs>
        <radialGradient id={`skin${id}`} cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor={L.skin} />
          <stop offset="1" stopColor={L.skin} stopOpacity={k === 'real' ? 0.75 : 0.9} />
        </radialGradient>
        <linearGradient id={`out${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={L.outfit} />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`hair${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={L.hair} />
          <stop offset="1" stopColor={L.hair} stopOpacity="0.7" />
        </linearGradient>
        <pattern id={`dots${id}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.1" fill="rgba(0,0,0,.35)" />
        </pattern>
        <clipPath id={`portrait${id}`}>
          <circle cx="100" cy="72" r="54" />
        </clipPath>
      </defs>

      {c.portrait && bust ? (
        <image href={c.portrait} x="46" y="18" width="108" height="108" preserveAspectRatio="xMidYMid slice" />
      ) : (
        <g className="sway" stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
          {/* back hair */}
          <g className="hair-back" fill={fill(L.hair, 'hair')}>{hairBack}</g>

          {!bust && (
            <g className="legs" fill={fill(L.outfit, 'out')}>
              <path d={`M${100 - waist + 2} 252 L${100 - 22} 344 L${100 - 6} 344 L100 262 L${100 + 6} 344 L${100 + 22} 344 L${100 + waist - 2} 252 Z`} />
              <rect x={100 - 26} y="338" width="20" height="10" rx="4" fill="#111" />
              <rect x={100 + 6} y="338" width="20" height="10" rx="4" fill="#111" />
            </g>
          )}

          <g className="breathe">
            {/* arms */}
            <g className="arms" fill={fill(L.outfit, 'out')}>
              <path className="arm-l" d={`M${100 - shoulder} 132 Q${100 - shoulder - 14} 190 ${100 - shoulder - 6} 246 L${100 - shoulder + 6} 246 Q${100 - shoulder + 4} 190 ${100 - shoulder + 12} 150 Z`} />
              <path className="arm-r" d={`M${100 + shoulder} 132 Q${100 + shoulder + 14} 190 ${100 + shoulder + 6} 246 L${100 + shoulder - 6} 246 Q${100 + shoulder - 4} 190 ${100 + shoulder - 12} 150 Z`} />
              <circle cx={100 - shoulder} cy="250" r="6" fill={fill(L.skin, 'skin')} />
              <circle cx={100 + shoulder} cy="250" r="6" fill={fill(L.skin, 'skin')} />
            </g>
            {/* neck */}
            <rect x="92" y="104" width="16" height="24" fill={fill(L.skin, 'skin')} />
            {/* torso + coat hem */}
            <path fill={fill(L.outfit, 'out')} d={`M${100 - shoulder} 128 Q100 118 ${100 + shoulder} 128 L${100 + waist} 210 L${100 - waist} 210 Z`} />
            <path className="cloth" fill={fill(L.outfit, 'out')} d={`M${100 - waist} 206 L${100 + waist} 206 L${100 + waist + 12} 262 Q100 270 ${100 - waist - 12} 262 Z`} />
            {/* accent trim / glow */}
            <path d={`M100 124 L100 262`} stroke={L.accent} strokeWidth="2.4" className="accent" />
            <path d={`M${100 - shoulder + 2} 130 Q100 140 ${100 + shoulder - 2} 130`} stroke={L.accent} strokeWidth="2" fill="none" className="accent" />
            {k === 'comic' && <path fill={`url(#dots${id})`} stroke="none" d={`M${100 - shoulder} 128 Q100 118 ${100 + shoulder} 128 L${100 + waist + 12} 262 Q100 270 ${100 - waist - 12} 262 Z`} />}
          </g>

          {/* head */}
          <g className="head">
            <ellipse cx="100" cy="80" rx={headR - 2} ry={headR} fill={fill(L.skin, 'skin')} />
            {k === 'comic' && <ellipse cx="108" cy="86" rx={headR - 10} ry={headR - 8} fill={`url(#dots${id})`} stroke="none" />}
            <g className="eyes" stroke="none">
              <ellipse cx="87" cy="86" rx={eyeR * 0.8} ry={eyeR} fill="#fff" />
              <ellipse cx="113" cy="86" rx={eyeR * 0.8} ry={eyeR} fill="#fff" />
              <circle cx="88" cy="87" r={eyeR * 0.62} fill={L.eyes} />
              <circle cx="112" cy="87" r={eyeR * 0.62} fill={L.eyes} />
              <circle cx="88" cy="87" r={eyeR * 0.28} fill="#0b0b0b" />
              <circle cx="112" cy="87" r={eyeR * 0.28} fill="#0b0b0b" />
              {(k === 'anime' || k === 'semi' || k === 'cartoon' || k === '3d') && (
                <>
                  <circle cx="90" cy="84" r={eyeR * 0.2} fill="#fff" />
                  <circle cx="114" cy="84" r={eyeR * 0.2} fill="#fff" />
                </>
              )}
            </g>
            <path d="M94 102 Q100 106 106 102" stroke="rgba(0,0,0,.6)" strokeWidth="1.6" fill="none" />
            <g className="hair-front" fill={fill(L.hair, 'hair')}>{hairFront}</g>
          </g>
        </g>
      )}
    </svg>
  );
}

/** Tiny circular character avatar (used in pickers, credits, chat). */
export function Avatar({ c, size = 44, ring = false }: { c: Props['c']; size?: number; ring?: boolean }) {
  return (
    <span className={`avatar ${ring ? 'ring' : ''}`} style={{ width: size, height: size }}>
      <Figure c={c} bust alive={false} />
    </span>
  );
}
