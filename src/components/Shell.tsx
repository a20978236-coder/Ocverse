import type { ReactNode } from 'react';
import { ME, useStore, type MiniTab } from '../store';
import { Icon } from './Icon';

/** Background images supplied by the creator. Drop files into public/backgrounds/. */
export const BACKGROUNDS = {
  feed: '/backgrounds/feed.jpg',
  discover: '/backgrounds/discover.jpg',
  characterCreation: '/backgrounds/character-creation.jpg',
  profile: '/backgrounds/profile.jpg',
} as const;

export function Backdrop({ src, children, className = '' }: { src?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`backdrop ${className}`}>
      {src && <div className="backdrop-img" style={{ backgroundImage: `url(${src})` }} />}
      <div className="backdrop-shade" />
      <div className="backdrop-content">{children}</div>
    </div>
  );
}

export function CreatorDot({ id, size = 34 }: { id: string; size?: number }) {
  const { creator } = useStore();
  const c = creator(id);
  const hue = c?.avatarHue ?? 84;
  return (
    <span className="creator-dot" style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${(hue + 60) % 360} 70% 25%))` }}>
      {(c?.displayName ?? '?').slice(0, 1)}
    </span>
  );
}

export function TopBar() {
  const { go, route, chats } = useStore();
  const unread = chats.length;
  return (
    <header className="topbar">
      <button className="brand" onClick={() => go({ name: 'tab', tab: 'feed' })}>
        <span className="brand-mark">OC</span>VERSE
      </button>
      <div className="topbar-main">ANIMATIONS</div>
      <div className="topbar-actions">
        <button className={`icon-btn ${route.name === 'chat' ? 'on' : ''}`} onClick={() => go({ name: 'chat' })} aria-label="Chat">
          <Icon name="chat" />
          {unread > 0 && <span className="badge" />}
        </button>
        <button className="pfp-btn" onClick={() => go({ name: 'profile', creatorId: ME })} aria-label="Profile">
          <CreatorDot id={ME} size={32} />
        </button>
      </div>
    </header>
  );
}

const TABS: { id: MiniTab; label: string; icon: string }[] = [
  { id: 'feed', label: 'Feed', icon: 'play' },
  { id: 'create', label: 'Create', icon: 'sparkle' },
  { id: 'series', label: 'Series', icon: 'series' },
  { id: 'discover', label: 'Discover', icon: 'search' },
];

export function MiniTabs() {
  const { route, go } = useStore();
  const active = route.name === 'tab' ? route.tab : null;
  return (
    <nav className="minitabs" aria-label="Animations">
      {TABS.map((t) => (
        <button key={t.id} className={`minitab ${active === t.id ? 'on' : ''}`} onClick={() => go({ name: 'tab', tab: t.id })}>
          <Icon name={t.icon} size={16} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export function SubHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { back } = useStore();
  return (
    <div className="subheader">
      <button className="icon-btn" onClick={back} aria-label="Back">
        <Icon name="back" />
      </button>
      <h1>{title}</h1>
      <div className="subheader-right">{right}</div>
    </div>
  );
}

/** "Created by / Remix of / Collab with" line — every creator is credited and linked. */
export function Credits({ ids, label = 'by' }: { ids: string[]; label?: string }) {
  const { creator, go } = useStore();
  return (
    <span className="credits">
      {label}{' '}
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && (i === ids.length - 1 ? ' & ' : ', ')}
          <button className="link" onClick={(e) => { e.stopPropagation(); go({ name: 'profile', creatorId: id }); }}>
            @{creator(id)?.handle ?? 'unknown'}
          </button>
        </span>
      ))}
    </span>
  );
}
