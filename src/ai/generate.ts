/**
 * Video generation pipeline with the character-consistency gate.
 *
 * Every character in a video (yours, a collab partner's, or a remix) is sent
 * with its locked reference: portrait + face/hair/outfit/colors/proportions +
 * voice + animation style. Each rendered clip is scored against that
 * reference; any character below the threshold is regenerated against the
 * reference before the video is delivered.
 *
 * The renderer here is simulated so the app runs without a backend — swap
 * the simulated beat render + `scoreAgainstReference` for real model calls.
 */
import type { Character, ConsistencyReport, World } from '../types';
import { styleLabel } from '../util';

export const CONSISTENCY_THRESHOLD = 0.92;

export interface LockedReference {
  characterId: string;
  name: string;
  face: string;
  hair: string;
  outfit: string;
  colors: string[];
  proportions: string;
  voice: string;
  style: string;
}

export function lockReference(c: Character): LockedReference {
  return {
    characterId: c.id,
    name: c.name,
    face: `${c.look.eyes} eyes, ${c.look.skin} skin`,
    hair: `${c.look.hairStyle} ${c.look.hair}`,
    outfit: c.look.outfit,
    colors: [c.look.hair, c.look.eyes, c.look.skin, c.look.outfit, c.look.accent],
    proportions: c.look.build,
    voice: c.voice?.label ?? 'none',
    style: styleLabel(c.style),
  };
}

export interface GenerateRequest {
  story: string;
  characters: Character[];
  world: World | null;
  lengthMin: number;
  referenceCount: number;
}

export type ProgressFn = (line: string, pct: number) => void;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function beats(story: string): string[] {
  const b = story
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return b.length ? b.slice(0, 6) : ['Opening shot'];
}

/** Simulated drift score: most passes are clean, some drift and need a redo. */
function scoreAgainstReference(attempt: number): number {
  const base = 0.86 + Math.random() * 0.13;
  return Math.min(0.995, base + attempt * 0.05);
}

export async function generateVideo(req: GenerateRequest, onProgress: ProgressFn): Promise<ConsistencyReport> {
  const refs = req.characters.map(lockReference);
  const steps = beats(req.story);
  const total = steps.length + 2;
  let done = 0;
  const tick = (line: string) => onProgress(line, Math.round((++done / total) * 100));

  tick(
    `Locked ${refs.length} character reference${refs.length === 1 ? '' : 's'}` +
      (req.world ? ` + world “${req.world.name}”` : '') +
      (req.referenceCount ? ` + ${req.referenceCount} reference image${req.referenceCount === 1 ? '' : 's'}` : ''),
  );
  await wait(400);

  let regenerations = 0;
  let passes = 0;
  const best = new Map<string, number>();

  for (const [i, beat] of steps.entries()) {
    onProgress(`Beat ${i + 1}: ${beat.slice(0, 70)}${beat.length > 70 ? '…' : ''}`, Math.round((done / total) * 100));
    await wait(350);
    for (const ref of refs) {
      let attempt = 0;
      let score = scoreAgainstReference(attempt);
      passes++;
      while (score < CONSISTENCY_THRESHOLD && attempt < 3) {
        regenerations++;
        attempt++;
        onProgress(
          `↻ ${ref.name} drifted (${Math.round(score * 100)}% match) — regenerating against reference`,
          Math.round((done / total) * 100),
        );
        await wait(300);
        score = scoreAgainstReference(attempt);
        passes++;
      }
      best.set(ref.characterId, Math.min(best.get(ref.characterId) ?? 1, score));
    }
    tick(`✓ Beat ${i + 1} matches every character reference`);
  }

  tick(`Final check passed · ${req.lengthMin} min · ready to post`);
  return {
    passes,
    regenerations,
    perCharacter: [...best.entries()].map(([characterId, score]) => ({ characterId, score })),
  };
}
