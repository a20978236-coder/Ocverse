const P: Record<string, string> = {
  chat: 'M4 5h16v11H8l-4 4z',
  collab: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 2-5 4-5 3 0 6 2 6 5',
  plus: 'M12 5v14M5 12h14',
  audio: 'M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  back: 'M15 5l-7 7 7 7',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  play: 'M8 5l11 7-11 7z',
  remix: 'M4 7h11l-3-3M20 17H9l3 3M17 4l3 3-3 3M7 14l-3 3 3 3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  next: 'M6 5l9 7-9 7zM18 5v14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  series: 'M4 6h16M4 12h16M4 18h10',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M16 9h4M4 15h4M16 15h4',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
  send: 'M4 12l16-8-6 16-3-7z',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
};

export function Icon({ name, size = 20, className = '' }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.sparkle} />
    </svg>
  );
}
