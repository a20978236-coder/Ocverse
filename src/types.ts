export type PresetStyle =
  | 'anime'
  | 'semi-realistic anime'
  | 'cartoon'
  | '3D animated'
  | 'realistic'
  | 'comic book';

export const PRESET_STYLES: PresetStyle[] = [
  'anime',
  'semi-realistic anime',
  'cartoon',
  '3D animated',
  'realistic',
  'comic book',
];

/** Either a preset, or the creator's own words. */
export interface AnimationStyle {
  preset: PresetStyle | null;
  custom: string;
}

export interface Voice {
  kind: 'uploaded' | 'preset';
  label: string;
  /** Object URL / data URL for an uploaded sample. */
  src?: string;
}

/** Visual palette pulled from the prompt; drives the portrait + the locked reference. */
export interface Look {
  hair: string;
  eyes: string;
  skin: string;
  outfit: string;
  accent: string;
  hairStyle: 'short' | 'long' | 'spiky' | 'tied';
  build: 'slim' | 'average' | 'broad';
}

export interface Character {
  id: string;
  creatorId: string;
  name: string;
  prompt: string;
  appearance: string;
  personality: string;
  lore: string;
  traits: string[];
  look: Look;
  voice: Voice | null;
  style: AnimationStyle;
  /** 0 calm … 100 energetic */
  idleEnergy: number;
  worldId: string | null;
  portrait?: string; // optional uploaded portrait override (data URL)
  remixOf?: { characterId: string; creatorId: string } | null;
  createdAt: number;
  updatedAt: number;
}

export interface World {
  id: string;
  creatorId: string;
  characterId: string | null;
  name: string;
  prompt: string;
  looks: string;
  mood: string;
  rules: string[];
  palette: [string, string];
  remixOf?: { worldId: string; creatorId: string } | null;
  createdAt: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  tag?: 'character' | 'world' | 'scene' | 'mood';
}

export interface AudioTrack {
  name: string;
  src?: string;
  library: boolean;
}

export interface ConsistencyReport {
  passes: number;
  regenerations: number;
  perCharacter: { characterId: string; score: number }[];
}

export interface Video {
  id: string;
  creatorId: string;
  title: string;
  story: string;
  characterIds: string[];
  /** All creators credited (owner + every collab character's creator). */
  creditIds: string[];
  worldId: string | null;
  references: Attachment[];
  audio: AudioTrack | null;
  lengthMin: number;
  seriesId: string | null;
  episode: number | null;
  likes: number;
  createdAt: number;
  updatedAt: number;
  consistency: ConsistencyReport;
}

export interface Series {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  cover: string; // data URL or gradient key
  /** Creators credited on every episode. */
  creditIds: string[];
  episodeIds: string[]; // ordered
  createdAt: number;
}

export interface Creator {
  id: string;
  handle: string;
  displayName: string;
  avatarHue: number;
  bio: string;
}

export interface ChatThread {
  id: string;
  characterId: string;
  messages: { from: 'me' | 'them'; text: string; at: number }[];
}
