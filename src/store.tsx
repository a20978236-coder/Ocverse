import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Character, ChatThread, Creator, Series, Video, World } from './types';
import { readLook } from './ai/parse';
import { uid } from './util';

export const ME = 'u_me';

export type MiniTab = 'feed' | 'create' | 'series' | 'discover';

export type Route =
  | { name: 'tab'; tab: MiniTab }
  | { name: 'character-create'; editId?: string; step?: 1 | 2 }
  | { name: 'character'; id: string }
  | { name: 'world'; id: string }
  | { name: 'story'; seriesId?: string; characterIds?: string[]; editVideoId?: string }
  | { name: 'series-new' }
  | { name: 'series'; id: string }
  | { name: 'watch'; videoId: string }
  | { name: 'chat'; characterId?: string }
  | { name: 'profile'; creatorId?: string };

interface DB {
  creators: Creator[];
  characters: Character[];
  worlds: World[];
  videos: Video[];
  series: Series[];
  chats: ChatThread[];
  following: string[];
}

const KEY = 'ocverse.v1';

function seed(): DB {
  const now = Date.now();
  const creators: Creator[] = [
    { id: ME, handle: 'you', displayName: 'You', avatarHue: 84, bio: 'Building my OC universe.' },
    { id: 'u_nyx', handle: 'nyxdraws', displayName: 'Nyx', avatarHue: 280, bio: 'Moody fantasy & neon cities.' },
    { id: 'u_kai', handle: 'kai.verse', displayName: 'Kai', avatarHue: 200, bio: 'Mecha, storms, found family.' },
    { id: 'u_ren', handle: 'renmakes', displayName: 'Ren', avatarHue: 20, bio: 'Cozy chaos. Comic book everything.' },
    { id: 'u_ivy', handle: 'ivy_ocs', displayName: 'Ivy', avatarHue: 140, bio: 'Witches, forests and slow burns.' },
  ];
  const mk = (
    id: string,
    creatorId: string,
    name: string,
    prompt: string,
    appearance: string,
    personality: string,
    lore: string,
    traits: string[],
    preset: Character['style']['preset'],
    worldId: string,
  ): Character => ({
    id, creatorId, name, prompt, appearance, personality, lore, traits,
    look: readLook(prompt, name),
    voice: { kind: 'preset', label: ['Soft alto', 'Gravelly baritone', 'Bright tenor', 'Whispery mezzo'][id.length % 4] },
    style: { preset, custom: '' }, idleEnergy: 40, worldId, remixOf: null, createdAt: now - 86400e3 * 3, updatedAt: now - 86400e3,
  });
  const characters: Character[] = [
    mk('c_vel', 'u_nyx', 'Velka', 'Velka has long silver hair and violet eyes and wears a black coat with lime trim.',
      'Long silver hair, violet eyes, a black high-collared coat with lime trim.', 'Cold on the surface, fiercely loyal underneath. Speaks rarely, notices everything.',
      'Exiled from the Spire after refusing to erase a city from memory.', ['memory weaving', 'shadow step'], 'anime', 'w_spire'),
    mk('c_jax', 'u_kai', 'Jax Orin', 'Jax has spiky red hair, amber eyes, broad muscular build and a navy jacket with orange glow.',
      'Spiky red hair, amber eyes, broad build, navy pilot jacket glowing orange at the seams.', 'Loud, reckless, laughs at danger, secretly terrified of being left behind.',
      'Grew up in the storm docks piloting salvaged mechs.', ['storm calling', 'mech link'], '3D animated', 'w_docks'),
    mk('c_pip', 'u_ren', 'Pip', 'Pip has short blonde hair, green eyes and wears a yellow hoodie.',
      'Short blonde hair, big green eyes, oversized yellow hoodie.', 'Cheerful, curious, says yes to everything.',
      'Runs a sandwich shop that is secretly a portal hub.', ['pocket portals'], 'comic book', 'w_deli'),
    mk('c_moss', 'u_ivy', 'Moss', 'Moss has long green hair tied in a braid, hazel eyes, and a brown robe.',
      'Waist-length green braid, hazel eyes, brown moss-stitched robe.', 'Gentle, patient, dry sense of humor.',
      'Keeper of the Hollow Wood since the last witch vanished.', ['plant speech', 'root walk'], 'semi-realistic anime', 'w_hollow'),
    mk('c_ash', ME, 'Ash', 'Ash has short black hair, cyan eyes and a grey jacket with cyan glow.',
      'Short black hair, cyan eyes, grey techwear jacket with cyan glow lines.', 'Quiet, sarcastic, kind when nobody is looking.',
      'A courier who can see the last thing any object witnessed.', ['object echoes', 'parkour'], 'anime', 'w_neon'),
  ];
  const w = (id: string, creatorId: string, characterId: string, name: string, looks: string, mood: string, rules: string[], palette: [string, string]): World => ({
    id, creatorId, characterId, name, prompt: `${name}. ${looks} ${mood} ${rules.join(' ')}`, looks, mood, rules, palette, remixOf: null, createdAt: now - 86400e3 * 3,
  });
  const worlds: World[] = [
    w('w_spire', 'u_nyx', 'c_vel', 'The Spire', 'A city of black glass towers above a sea of fog.', 'Hushed, watchful, elegant.', ['Memories can be traded like coin.', 'No one may speak the Archivist’s name.'], ['#3b2a5a', '#0b0a14']),
    w('w_docks', 'u_kai', 'c_jax', 'Storm Docks', 'Rusted harbor cranes under permanent lightning.', 'Chaotic, loud, hopeful.', ['Every pilot owes the storm one favor.'], ['#1d3a5a', '#05080f']),
    w('w_deli', 'u_ren', 'c_pip', 'Pip’s Deli', 'A tiny corner shop with too many doors.', 'Cozy chaos.', ['Never open the walk-in fridge on Tuesdays.'], ['#5a4a1d', '#120d05']),
    w('w_hollow', 'u_ivy', 'c_moss', 'Hollow Wood', 'An ancient forest lit by floating spores.', 'Dreamy, quiet, a little haunted.', ['Trees remember every footstep.'], ['#1d5a35', '#04100a']),
    w('w_neon', ME, 'c_ash', 'Lowtown', 'Rain-soaked neon alleys stacked twenty levels deep.', 'Lonely but electric.', ['Deliveries are never late. Ever.'], ['#1d4a5a', '#03090c']),
  ];
  const rep = (ids: string[]) => ({ passes: ids.length * 4, regenerations: 1, perCharacter: ids.map((characterId) => ({ characterId, score: 0.95 + Math.random() * 0.04 })) });
  const v = (id: string, creatorId: string, title: string, story: string, characterIds: string[], worldId: string, lengthMin: number, seriesId: string | null = null, episode: number | null = null, creditIds?: string[]): Video => ({
    id, creatorId, title, story, characterIds, creditIds: creditIds ?? [creatorId], worldId, references: [], audio: null, lengthMin, seriesId, episode,
    likes: Math.floor(200 + Math.random() * 9000), createdAt: now - (id.length + Number(id.slice(1))) * 3600e3 * 7, updatedAt: 0, consistency: rep(characterIds),
  });
  const videos: Video[] = [
    v('v1', 'u_nyx', 'The Archivist’s Debt', 'Velka walks the fog bridge at midnight. A stranger offers her a memory she lost. She refuses — then follows him.', ['c_vel'], 'w_spire', 4),
    v('v2', 'u_kai', 'Storm Season Ep. 1 — Ignition', 'Jax steals a mech during the first storm of the year.', ['c_jax'], 'w_docks', 12, 's_storm', 1),
    v('v3', 'u_kai', 'Storm Season Ep. 2 — Static', 'Jax crashes into Pip’s Deli through a portal. Pip offers him a sandwich.', ['c_jax', 'c_pip'], 'w_docks', 10, 's_storm', 2, ['u_kai', 'u_ren']),
    v('v4', 'u_ren', 'Tuesday Fridge Incident', 'Pip opens the walk-in fridge on a Tuesday. Chaos.', ['c_pip'], 'w_deli', 2),
    v('v5', 'u_ivy', 'Root Walk', 'Moss guides a lost courier through the Hollow Wood.', ['c_moss', 'c_ash'], 'w_hollow', 6, null, null, ['u_ivy', ME]),
    v('v6', 'u_kai', 'Storm Season Ep. 3 — Three Doors', 'Velka, Jax and Pip are trapped between three doors, each leading to a different world.', ['c_jax', 'c_pip', 'c_vel'], 'w_docks', 15, 's_storm', 3, ['u_kai', 'u_ren', 'u_nyx']),
    v('v7', ME, 'Last Delivery', 'Ash touches a broken umbrella and sees who dropped it.', ['c_ash'], 'w_neon', 3),
  ];
  const series: Series[] = [
    { id: 's_storm', creatorId: 'u_kai', title: 'Storm Season', description: 'A reckless pilot, a portal deli, and a city that trades memories. Open collab — every creator credited on every episode.', cover: 'grad:storm', creditIds: ['u_kai', 'u_ren', 'u_nyx'], episodeIds: ['v2', 'v3', 'v6'], createdAt: now - 86400e3 * 3 },
  ];
  const chats: ChatThread[] = [
    { id: 't1', characterId: 'c_vel', messages: [{ from: 'them', text: 'You found the fog bridge. Most people don’t.', at: now - 3600e3 }] },
  ];
  return { creators, characters, worlds, videos, series, chats, following: ['u_kai'] };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* ignore */
  }
  return seed();
}

interface Store extends DB {
  route: Route;
  go: (r: Route) => void;
  back: () => void;
  creator: (id: string) => Creator | undefined;
  character: (id: string) => Character | undefined;
  world: (id: string | null | undefined) => World | undefined;
  /** Everyone credited on a video; series episodes credit every creator in the series. */
  videoCredits: (v: Video) => string[];
  upsertCharacter: (c: Character) => void;
  upsertWorld: (w: World) => void;
  deleteCharacter: (id: string) => void;
  remixCharacter: (id: string) => Character;
  remixWorld: (id: string) => World;
  addVideo: (v: Video) => void;
  updateVideo: (v: Video) => void;
  upsertSeries: (s: Series) => void;
  like: (videoId: string) => void;
  toggleFollow: (creatorId: string) => void;
  sendChat: (characterId: string, text: string) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const [stack, setStack] = useState<Route[]>([{ name: 'tab', tab: 'feed' }]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* storage full / blocked — app keeps working in memory */
    }
  }, [db]);

  const go = useCallback((r: Route) => {
    setStack((s) => (r.name === 'tab' ? [r] : [...s, r]));
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  const store = useMemo<Store>(() => {
    const patch = (fn: (d: DB) => DB) => setDb((d) => fn(d));
    return {
      ...db,
      route: stack[stack.length - 1],
      go,
      back,
      creator: (id) => db.creators.find((c) => c.id === id),
      character: (id) => db.characters.find((c) => c.id === id),
      world: (id) => (id ? db.worlds.find((w) => w.id === id) : undefined),
      videoCredits: (v) => {
        const ser = v.seriesId ? db.series.find((x) => x.id === v.seriesId) : undefined;
        return [...new Set([v.creatorId, ...v.creditIds, ...(ser?.creditIds ?? [])])];
      },
      upsertCharacter: (c) =>
        patch((d) => ({
          ...d,
          characters: d.characters.some((x) => x.id === c.id) ? d.characters.map((x) => (x.id === c.id ? c : x)) : [c, ...d.characters],
        })),
      upsertWorld: (w) =>
        patch((d) => ({ ...d, worlds: d.worlds.some((x) => x.id === w.id) ? d.worlds.map((x) => (x.id === w.id ? w : x)) : [w, ...d.worlds] })),
      deleteCharacter: (id) => patch((d) => ({ ...d, characters: d.characters.filter((c) => c.id !== id) })),
      remixCharacter: (id) => {
        const src = db.characters.find((c) => c.id === id)!;
        const srcWorld = db.worlds.find((w) => w.id === src.worldId);
        const now = Date.now();
        const nc: Character = {
          ...src, id: uid('c_'), creatorId: ME, name: `${src.name} (remix)`, remixOf: { characterId: src.id, creatorId: src.creatorId },
          createdAt: now, updatedAt: now, worldId: null,
        };
        let nw: World | null = null;
        if (srcWorld) {
          nw = { ...srcWorld, id: uid('w_'), creatorId: ME, characterId: nc.id, remixOf: { worldId: srcWorld.id, creatorId: srcWorld.creatorId }, createdAt: now };
          nc.worldId = nw.id;
        }
        patch((d) => ({ ...d, characters: [nc, ...d.characters], worlds: nw ? [nw, ...d.worlds] : d.worlds }));
        return nc;
      },
      remixWorld: (id) => {
        const src = db.worlds.find((w) => w.id === id)!;
        const nw: World = { ...src, id: uid('w_'), creatorId: ME, characterId: null, name: `${src.name} (remix)`, remixOf: { worldId: src.id, creatorId: src.creatorId }, createdAt: Date.now() };
        patch((d) => ({ ...d, worlds: [nw, ...d.worlds] }));
        return nw;
      },
      addVideo: (v) =>
        patch((d) => ({
          ...d,
          videos: [v, ...d.videos],
          series: v.seriesId
            ? d.series.map((s) =>
                s.id === v.seriesId ? { ...s, episodeIds: [...s.episodeIds, v.id], creditIds: [...new Set([...s.creditIds, ...v.creditIds])] } : s,
              )
            : d.series,
        })),
      updateVideo: (v) =>
        patch((d) => ({
          ...d,
          videos: d.videos.map((x) => (x.id === v.id ? v : x)),
          series: v.seriesId ? d.series.map((s) => (s.id === v.seriesId ? { ...s, creditIds: [...new Set([...s.creditIds, ...v.creditIds])] } : s)) : d.series,
        })),
      upsertSeries: (s) =>
        patch((d) => ({ ...d, series: d.series.some((x) => x.id === s.id) ? d.series.map((x) => (x.id === s.id ? s : x)) : [s, ...d.series] })),
      like: (videoId) => patch((d) => ({ ...d, videos: d.videos.map((v) => (v.id === videoId ? { ...v, likes: v.likes + 1 } : v)) })),
      toggleFollow: (cid) =>
        patch((d) => ({ ...d, following: d.following.includes(cid) ? d.following.filter((x) => x !== cid) : [...d.following, cid] })),
      sendChat: (characterId, text) =>
        patch((d) => {
          const c = d.characters.find((x) => x.id === characterId);
          const reply = c ? characterReply(c, text) : '…';
          const now = Date.now();
          const existing = d.chats.find((t) => t.characterId === characterId);
          const msgs = [{ from: 'me' as const, text, at: now }, { from: 'them' as const, text: reply, at: now + 1 }];
          return {
            ...d,
            chats: existing
              ? d.chats.map((t) => (t.characterId === characterId ? { ...t, messages: [...t.messages, ...msgs] } : t))
              : [{ id: uid('t_'), characterId, messages: msgs }, ...d.chats],
          };
        }),
      reset: () => setDb(seed()),
    };
  }, [db, stack, go, back]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

function characterReply(c: Character, text: string): string {
  const p = c.personality.toLowerCase();
  const tone = /cold|quiet|serious/.test(p) ? 'quiet' : /loud|reckless|cheerful|playful/.test(p) ? 'loud' : 'warm';
  const q = text.trim().endsWith('?');
  const trait = c.traits[0];
  if (tone === 'quiet') return q ? 'Maybe. Ask me again when it matters.' : trait ? `…Noted. Don’t make me use ${trait}.` : '…Noted.';
  if (tone === 'loud') return q ? `HA — obviously yes! Wanna see${trait ? ` some ${trait}` : ''}?` : 'Okay okay okay, I’m in. Let’s go!';
  return q ? 'Good question. Sit with me a while and I’ll tell you.' : 'I hear you. Stay a bit?';
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
