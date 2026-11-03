# OCVerse

Original-character animation app: dark theme, lime accents, cinematic feel.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Structure

- **Top bar**: OCVerse brand · **ANIMATIONS** · chat icon · profile pic
- **Animations mini tabs**: Feed · Create · Series · Discover
- **Create**: character creation (2 steps: one prompt for the character, one for the world) · Story box · New series
- **Character arrival**: a lime beam drops, the character assembles out of particles with a glitch shimmer, then lands with a flash. After that they idle on the pedestal (breathing, blinking, swaying, hair and clothes drifting). An idle slider runs from calm to energetic.
- **Consistency**: every character has a locked reference (face, hair, outfit, colors, proportions, voice, style). Generation checks each beat against it and regenerates when a character drifts (`src/ai/generate.ts`).
- **Remixes and collabs**: remixes link back to the original creator. In collabs you pick characters (only their names and portraits are shown), with no invites, and every creator is credited.
- **Series**: ordered episodes with a next-episode autoplay. Episodes can be edited and reordered. Collab series credit every creator on every episode.
- **Videos**: 1–15 minutes, with optional reference images and audio.

## Backgrounds

See `public/backgrounds/README.md`.

## AI integration points

The app runs fully in the browser with local stand-ins:

- `src/ai/parse.ts`: `parseCharacter` / `parseWorld` turn the prompt boxes into structured profiles.
- `src/ai/generate.ts`: `generateVideo` runs the pipeline with the consistency gate (swap the simulated beat render and `scoreAgainstReference` for real model calls).

To use real models, replace the bodies of these functions; the UI does not need to change. Data is saved in `localStorage`.
