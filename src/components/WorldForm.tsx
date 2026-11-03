import type { World } from '../types';
import { toHex } from '../util';

/** Editable world fields — shared by character creation (step 2) and the standalone world editor. */
export function WorldForm({ world, onChange }: { world: World; onChange: (w: World) => void }) {
  const set = (patch: Partial<World>) => onChange({ ...world, ...patch });
  return (
    <div className="glass world-form">
      <div className="world-swatch" style={{ background: `radial-gradient(120% 90% at 50% 10%, ${world.palette[0]}, ${world.palette[1]})` }}>
        <span>{world.name}</span>
      </div>
      <div className="row gap">
        <label className="swatch"><input type="color" value={toHex(world.palette[0])} onChange={(e) => set({ palette: [e.target.value, world.palette[1]] })} /><span>sky</span></label>
        <label className="swatch"><input type="color" value={toHex(world.palette[1])} onChange={(e) => set({ palette: [world.palette[0], e.target.value] })} /><span>ground</span></label>
      </div>
      <label className="field-label">Name</label>
      <input className="input" aria-label="World name" value={world.name} onChange={(e) => set({ name: e.target.value })} />
      <label className="field-label">What it looks like</label>
      <textarea className="input" rows={3} value={world.looks} onChange={(e) => set({ looks: e.target.value })} />
      <label className="field-label">Mood</label>
      <textarea className="input" rows={2} value={world.mood} onChange={(e) => set({ mood: e.target.value })} />
      <label className="field-label">Rules <span className="muted">(one per line)</span></label>
      <textarea className="input" rows={3} value={world.rules.join('\n')} onChange={(e) => set({ rules: e.target.value.split('\n') })} />
    </div>
  );
}
