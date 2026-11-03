import { useState } from 'react';
import { ME, useStore } from '../store';
import { Avatar } from '../components/Figure';
import { Backdrop, BACKGROUNDS, CreatorDot, SubHeader } from '../components/Shell';
import { Icon } from '../components/Icon';
import { VideoCard } from './Feed';
import { coverStyle } from './SeriesScreens';

export function Profile({ creatorId = ME }: { creatorId?: string }) {
  const s = useStore();
  const u = s.creator(creatorId);
  const [tab, setTab] = useState<'characters' | 'videos' | 'series' | 'collabs'>('characters');
  if (!u) return <div className="page"><SubHeader title="Not found" /></div>;
  const me = creatorId === ME;
  const chars = s.characters.filter((c) => c.creatorId === creatorId);
  const vids = s.videos.filter((v) => v.creatorId === creatorId);
  const collabs = s.videos.filter((v) => v.creditIds.includes(creatorId) && v.creatorId !== creatorId);
  const series = s.series.filter((x) => x.creditIds.includes(creatorId));
  const following = s.following.includes(creatorId);
  return (
    <Backdrop src={BACKGROUNDS.profile} className="profile-backdrop">
      <div className="page">
        <SubHeader title={me ? 'Profile' : `@${u.handle}`} />
        <div className="profile-head">
          <CreatorDot id={u.id} size={92} />
          <h2>{u.displayName}</h2>
          <div className="muted">@{u.handle}</div>
          <p>{u.bio}</p>
          <div className="stats">
            <span><b>{chars.length}</b> character{chars.length === 1 ? '' : 's'}</span>
            <span><b>{vids.length}</b> video{vids.length === 1 ? '' : 's'}</span>
            <span><b>{series.length}</b> series</span>
            <span><b>{collabs.length}</b> collab{collabs.length === 1 ? '' : 's'}</span>
          </div>
          {!me && <button className={`btn ${following ? 'ghost' : 'primary'}`} onClick={() => s.toggleFollow(u.id)}>{following ? 'Following' : 'Follow'}</button>}
          {me && (
            <div className="row gap">
              <button className="btn primary" onClick={() => s.go({ name: 'character-create' })}><Icon name="sparkle" size={16} /> New character</button>
              <button className="btn ghost sm" onClick={() => { if (confirm('Reset all local OCVerse data to the demo?')) s.reset(); }}>Reset demo data</button>
            </div>
          )}
        </div>
        <div className="steps">
          {(['characters', 'videos', 'series', 'collabs'] as const).map((t) => (
            <button key={t} className={`step ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        {tab === 'characters' && (
          <div className="char-row wrap">
            {chars.map((c) => (
              <button key={c.id} className="char-tile" onClick={() => s.go({ name: 'character', id: c.id })}>
                <Avatar c={c} size={72} ring />
                <b>{c.name}</b>
                {c.remixOf && <span className="sm muted"><Icon name="remix" size={12} /> remix</span>}
              </button>
            ))}
            {chars.length === 0 && <p className="muted">No characters yet.</p>}
          </div>
        )}
        {tab === 'videos' && <div className="grid">{vids.map((v) => <VideoCard key={v.id} v={v} />)}</div>}
        {tab === 'collabs' && <div className="grid">{collabs.map((v) => <VideoCard key={v.id} v={v} />)}</div>}
        {tab === 'series' && (
          <div className="series-grid">
            {series.map((x) => (
              <button key={x.id} className="series-card" onClick={() => s.go({ name: 'series', id: x.id })}>
                <div className="series-cover" style={coverStyle(x.cover)}><span className="series-count">{x.episodeIds.length} eps</span></div>
                <b>{x.title}</b>
              </button>
            ))}
          </div>
        )}
      </div>
    </Backdrop>
  );
}
