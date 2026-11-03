/**
 * Prompt readers. These run locally so the app works out of the box, and are
 * shaped like an AI service call (async, prompt in → structured profile out)
 * so a real model endpoint can be dropped in behind the same functions.
 */
import type { Look } from '../types';

const COLOR_WORDS: Record<string, string> = {
  black: '#1b1b22', white: '#f2f2f2', silver: '#c9ced6', grey: '#8a8f98', gray: '#8a8f98',
  red: '#d6333d', crimson: '#a3162a', scarlet: '#e0352b', pink: '#f07ab8', rose: '#e2638d',
  orange: '#f08a2c', gold: '#e6b93a', golden: '#e6b93a', blonde: '#ecd27a', yellow: '#f2dc4a',
  green: '#3fb36b', lime: '#b6ff3b', emerald: '#1f9e6a', teal: '#1fa5a0', cyan: '#3fd6e8',
  blue: '#3a6fe0', azure: '#3fa0ff', navy: '#1e2a5a', indigo: '#4b3fc7', purple: '#8a4fe0',
  violet: '#9b5cf0', lavender: '#b9a2f0', brown: '#6b4428', chestnut: '#7a3f22', auburn: '#8f3a22',
  copper: '#b8642e', amber: '#e09a2a', hazel: '#8b6a3a', magenta: '#d63fb0', ivory: '#efe7d2',
};

const SKIN_WORDS: Record<string, string> = {
  pale: '#f4dccb', fair: '#f1d1b5', light: '#eecaa8', tan: '#c99468', olive: '#b98d5f',
  brown: '#8d5a3b', dark: '#5e3a26', ebony: '#3f281b', deep: '#4a2d1e',
};

const STOP_NAMES = new Set([
  'She', 'He', 'They', 'Her', 'His', 'Their', 'The', 'A', 'An', 'My', 'This', 'It', 'In', 'On',
  'When', 'After', 'Before', 'Once', 'Born', 'Always', 'Never', 'But', 'And', 'With', 'From', 'I',
]);

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function colorNear(text: string, nouns: string[]): string | null {
  const lower = text.toLowerCase();
  for (const noun of nouns) {
    const re = new RegExp(`([a-z-]+)\\s+(?:[a-z-]+\\s+)?${noun}`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower))) {
      const words = m[0].split(/\s+/);
      for (const w of words) {
        const key = w.replace(/-.*/, '');
        if (COLOR_WORDS[key]) return COLOR_WORDS[key];
      }
    }
    // "hair is silver" / "hair that is silver"
    const re2 = new RegExp(`${noun}\\s+(?:is|are|that is|of)\\s+([a-z]+)`);
    const m2 = lower.match(re2);
    if (m2 && COLOR_WORDS[m2[1]]) return COLOR_WORDS[m2[1]];
  }
  return null;
}

const APPEARANCE = /\b(hair|eyes?|tall|short|wears?|wearing|dressed|outfit|cloak|coat|jacket|armor|armour|skin|scar|tattoo|freckles|build|slender|muscular|face|horns?|wings?|tail|ears?|glasses|hood|dress|boots|uniform|looks?|appearance)\b/i;
const PERSONALITY = /\b(personality|shy|bold|kind|cold|warm|cheerful|grumpy|calm|anxious|brave|reckless|loyal|sarcastic|quiet|loud|gentle|fierce|curious|stubborn|playful|serious|feels?|acts?|hates?|loves?|fears?|smiles?|laughs?|temper|confident|lonely|caring|cocky|mischievous|introvert|extrovert)\b/i;
const POWERS = /\b(power|powers|ability|abilities|can|control|controls|magic|summon|summons|wields?|skill|skilled|master|trait|traits|teleport|fly|flies|strength|speed|heals?|shapeshift)\b/i;
const LORE = /\b(born|grew up|raised|orphan|once|years ago|past|history|backstory|lore|lost|exiled|kingdom|village|city|clan|family|parents|war|destiny|prophecy|secret|lives|lived|from|after|before|seeks?|searching|quest|revenge|sworn)\b/i;

function guessName(prompt: string): string {
  const explicit = prompt.match(/\b(?:name(?:d)?(?:\s+is)?|called|call (?:her|him|them))\s*[:\-]?\s*([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)/);
  if (explicit) return explicit[1];
  const lead = prompt.match(/^\s*([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\s*(?:is|,|—|-|:|was)\b/);
  if (lead && !STOP_NAMES.has(lead[1].split(' ')[0])) return lead[1];
  const any = prompt.match(/\b([A-Z][a-z'’]{2,})\b/g) || [];
  const counts = new Map<string, number>();
  for (const w of any) if (!STOP_NAMES.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : 'Unnamed';
}

function pickBy(list: string[], re: RegExp, used: Set<string>): string[] {
  const out = list.filter((s) => !used.has(s) && re.test(s));
  out.forEach((s) => used.add(s));
  return out;
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export interface ParsedCharacter {
  name: string;
  appearance: string;
  personality: string;
  lore: string;
  traits: string[];
  look: Look;
}

export function readLook(text: string, seed: string): Look {
  const lower = text.toLowerCase();
  const hue = hashHue(seed);
  const skinKey = Object.keys(SKIN_WORDS).find((k) => new RegExp(`\\b${k}(?:-skinned)?\\s+skin|skin\\s+(?:is\\s+)?${k}|\\b${k}-skinned`).test(lower));
  return {
    hair: colorNear(text, ['hair', 'locks', 'mane', 'braid', 'ponytail']) ?? `hsl(${hue} 55% 40%)`,
    eyes: colorNear(text, ['eyes', 'eye', 'gaze']) ?? `hsl(${(hue + 140) % 360} 70% 55%)`,
    skin: skinKey ? SKIN_WORDS[skinKey] : '#e9c3a0',
    outfit:
      colorNear(text, ['cloak', 'coat', 'jacket', 'hoodie', 'armor', 'armour', 'dress', 'robe', 'uniform', 'outfit', 'suit', 'kimono']) ??
      `hsl(${(hue + 210) % 360} 30% 22%)`,
    accent: colorNear(text, ['glow', 'flames', 'fire', 'aura', 'light', 'lightning', 'energy', 'scarf', 'trim']) ?? '#b6ff3b',
    hairStyle: /spiky|messy|wild/.test(lower)
      ? 'spiky'
      : /ponytail|braid|bun|tied/.test(lower)
        ? 'tied'
        : /long|flowing|waist-length/.test(lower)
          ? 'long'
          : 'short',
    build: /muscular|broad|huge|bulky|strong build/.test(lower) ? 'broad' : /slender|slim|thin|lithe|petite/.test(lower) ? 'slim' : 'average',
  };
}

export async function parseCharacter(prompt: string): Promise<ParsedCharacter> {
  await new Promise((r) => setTimeout(r, 650)); // feels like a model call
  const list = sentences(prompt);
  const used = new Set<string>();
  const name = guessName(prompt);
  const powers = pickBy(list, POWERS, used);
  const appearance = pickBy(list, APPEARANCE, used);
  const personality = pickBy(list, PERSONALITY, used);
  // backstory can share a sentence with powers ("Born in a drowned city, she can control water")
  const isNameOnly = (x: string) => x.length < 40 && x.includes(name) && /\b(name|called|named)\b/i.test(x);
  const lore = list.filter((x) => !appearance.includes(x) && !personality.includes(x) && LORE.test(x) && !isNameOnly(x));
  lore.forEach((x) => used.add(x));
  const leftovers = list.filter((x) => !used.has(x) && !isNameOnly(x));

  const traits = powers
    .flatMap((s) =>
      s
        .replace(/^.*?\b(?:can|powers?(?: are| is)?|abilities(?: are)?|ability to|controls?|wields?)\b[:\s]*/i, '')
        .split(/,|\band\b|;/)
        .map((t) => t.replace(/[.!]$/, '').trim()),
    )
    .filter((t) => t.length > 1 && t.length < 60)
    .slice(0, 8);

  return {
    name,
    appearance: appearance.join(' ') || 'Describe how they look — hair, eyes, outfit, build.',
    personality: personality.join(' ') || 'Describe how they feel and act.',
    lore: [...lore, ...leftovers].join(' ') || 'Their story starts here.',
    traits: traits.length ? traits : [],
    look: readLook(prompt, name),
  };
}

export interface ParsedWorld {
  name: string;
  looks: string;
  mood: string;
  rules: string[];
  palette: [string, string];
}

const MOOD = /\b(mood|feels?|feeling|atmosphere|eerie|calm|peaceful|tense|gloomy|dreamy|melanchol\w*|hopeful|chaotic|serene|haunted|vibrant|cozy|ominous|lonely|joyful|dark|bright|quiet)\b/i;
const RULES = /\b(rule|rules|law|laws|must|cannot|can't|never|always|forbidden|only|no one|nobody|every|if you|whoever|magic is|costs?)\b/i;

export async function parseWorld(prompt: string): Promise<ParsedWorld> {
  await new Promise((r) => setTimeout(r, 650));
  const list = sentences(prompt);
  const used = new Set<string>();
  const explicit = prompt.match(/\b(?:called|named|name(?:\s+is)?|world of|realm of|city of|land of)\s*[:\-]?\s*([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)*)/);
  const lead = prompt.match(/^\s*([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)*)\s*(?:is|,|—|-|:)/);
  // a short title-case opening line is the name: "The Drowned City of Maren."
  const first = list[0]?.replace(/[.!:]$/, '') ?? '';
  const words = first.split(/\s+/);
  const titled = words.length <= 7 && words.filter((x) => /^[A-Z]/.test(x)).length >= Math.ceil(words.length * 0.6) ? first : null;
  const name = titled ?? explicit?.[1] ?? (lead && !STOP_NAMES.has(lead[1].split(' ')[0]) ? lead[1] : guessName(prompt));
  const rules = pickBy(list, RULES, used).map((s) => s.replace(/^rules?:\s*/i, ''));
  const mood = pickBy(list, MOOD, used);
  const looks = list.filter((s) => !used.has(s) && !(titled && s.replace(/[.!:]$/, '') === titled));
  const c1 = colorNear(prompt, ['sky', 'skies', 'light', 'lights', 'sea', 'forest', 'neon', 'glow', 'fog', 'mist']);
  const hue = hashHue(name);
  return {
    name,
    looks: looks.join(' ') || 'Describe what it looks like.',
    mood: mood.join(' ') || 'Describe the mood.',
    rules: rules.length ? rules : [],
    palette: [c1 ?? `hsl(${hue} 50% 30%)`, `hsl(${(hue + 60) % 360} 60% 12%)`],
  };
}
