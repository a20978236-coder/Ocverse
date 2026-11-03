import { useStore } from './store';
import { MiniTabs, TopBar } from './components/Shell';
import { Feed } from './screens/Feed';
import { CreateHub } from './screens/CreateHub';
import { SeriesDetail, SeriesNew, SeriesTab } from './screens/SeriesScreens';
import { Discover } from './screens/Discover';
import { CharacterCreate } from './screens/CharacterCreate';
import { CharacterPage } from './screens/CharacterPage';
import { StoryScreen } from './screens/StoryScreen';
import { Watch } from './screens/Watch';
import { Chat } from './screens/Chat';
import { Profile } from './screens/Profile';

function Screen() {
  const { route: r } = useStore();
  switch (r.name) {
    case 'tab':
      return r.tab === 'feed' ? <Feed /> : r.tab === 'create' ? <CreateHub /> : r.tab === 'series' ? <SeriesTab /> : <Discover />;
    case 'character-create':
      return <CharacterCreate key={`${r.editId ?? 'new'}-${r.step ?? 1}`} editId={r.editId} step={r.step} />;
    case 'character':
      return <CharacterPage key={r.id} id={r.id} />;
    case 'story':
      return <StoryScreen key={r.editVideoId ?? r.seriesId ?? 'new'} {...r} />;
    case 'series-new':
      return <SeriesNew />;
    case 'series':
      return <SeriesDetail id={r.id} />;
    case 'watch':
      return <Watch key={r.videoId} videoId={r.videoId} />;
    case 'chat':
      return <Chat characterId={r.characterId} />;
    case 'profile':
      return <Profile key={r.creatorId} creatorId={r.creatorId} />;
  }
}

export default function App() {
  const { route } = useStore();
  return (
    <div className="app">
      <TopBar />
      {route.name === 'tab' && <MiniTabs />}
      <main className={`main route-${route.name}${route.name === 'tab' ? ` tab-${route.tab}` : ''}`}>
        <Screen />
      </main>
    </div>
  );
}
