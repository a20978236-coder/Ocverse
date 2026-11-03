# Backgrounds

Drop your four background images here with these exact names:

| File                     | Used on                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `feed.jpg`               | Animations → Feed                                             |
| `discover.jpg`           | Animations → Discover                                         |
| `character-creation.jpg` | Animations → Create → character creation (and the pedestal on character pages) |
| `profile.jpg`            | Profile (top-bar profile pic)                                  |

Using `.png` or `.webp` instead? Update the paths in `src/components/Shell.tsx` (`BACKGROUNDS`).

If your character-creation image has its own pedestal, line the glowing pad up with it by
changing `--pedestal-y` in `src/styles.css` (distance from the bottom of the stage).
