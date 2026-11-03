import { useEffect, useRef, useState } from 'react';
import { ME, useStore } from '../store';
import { PRESET_STYLES, type Character, type Look, type World } from '../types';
import { parseCharacter, parseWorld } from '../ai/parse';
import { Pedestal } from '../components/Pedestal';
import { Backdrop, BACKGROUNDS, SubHeader } from '../components/Shell';
import { Icon } from '../components/Icon';
import { fileToDataUrl, styleLabel, uid } from '../util';

const PRESET_VOICES = ['Soft alto', 'Bright tenor', 'Gravelly baritone', 'Whispery mezzo', 'Robotic', 'Childlike', 'Regal'];

let _ctx: CanvasRenderingContext2D | null = null;
export function toHex(color: string): string {
  _ctx ??= document.createElement('canvas').getContext('2d');
  if (!_ctx) return '#888888';
  _ctx.fillStyle = '#000';
  _ctx.fillStyle = color;
  return String(_ctx.fillStyle);
}

export function CharacterCreate({ editId, step: initialStep }: { editId?: string; step?: 1 | 2 }) {
  const s = useStore();
  const existing = editId ? s.character(editId) : undefined;
  const [step, setStep] = useState<1 | 2>(initialStep ?? 1);
  const [prompt, setPrompt] = useState(existing?.prompt ?? '');
  const [draft, setDraft] = useState<Character | null>(existing ?? null);
  const [arrival, setArrival] = useState(0);
  const [reading, setReading] = useState(false);
  const existingWorld = s.world(existing?.worldId);
  const [worldPrompt, setWorldPrompt] = useState(existingWorld?.prompt ?? '');
  const [world, setWorld] = useState<World | null>(existingWorld ?? null);
  const voiceRef = useRef<HTMLInputElement>(null);
  const portraitRef = useRef<HTMLInputElement>(null);

  // live-save: everything stays editable, nothing locked
  useEffect(() => {
    if (draft) s.upsertCharacter(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  useEffect(() => {
    if (world) s.upsertWorld(world);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const set = <K extends keyof Character>(k: K, v: Character[K]) => setDraft((d) => (d ? { ...d, [k]: v, updatedAt: Date.now() } : d));
  const setLook = <K extends keyof Look>(k: K, v: Look[K]) => setDraft((d) => (d ? { ...d, look: { ...d.look, [k]: v }, updatedAt: Date.now() } : d));

  const readCharacter = async () => {
    if (!prompt.trim()) return;
    setReading(true);
    const p = await parseCharacter(prompt);
    const now = Date.now();
    setDraft((d) => ({
      id: d?.id ?? uid('c_'),
      creatorId: d?.creatorId ?? ME,
      prompt,
      ...p,
      voice: d?.voice ?? null,
      style: d?.style ?? { preset: 'anime', custom: '' },
      idleEnergy: d?.idleEnergy ?? 40,
      worldId: d?.worldId ?? null,
      portrait: d?.portrait,
      remixOf: d?.remixOf ?? null,
      createdAt: d?.createdAt ?? now,
      updatedAt: now,
    }));
    setArrival((a) => a + 1);
    setReading(false);
  };

  const readWorld = async () => {
    if (!worldPrompt.trim() || !draft) return;
    setReading(true);
    const p = await parseWorld(worldPrompt);
    const w: World = {
      id: world?.id ?? uid('w_'),
      creatorId: world?.creatorId ?? ME,
      characterId: draft.id,
      prompt: worldPrompt,
      ...p,
      remixOf: world?.remixOf ?? null,
      createdAt: world?.createdAt ?? Date.now(),
    };
    setWorld(w);
    set('worldId', w.id);
    setReading(false);
  };

  const finish = () => {
    if (draft) s.go({ name: 'character', id: draft.id });
  };

  return (
    <Backdrop src={BACKGROUNDS.characterCreation} className="create-backdrop">
      <div className="page create-page">
        <SubHeader title={existing ? `Edit ${existing.name}` : 'Create a character'} right={<span className="stepper">Step {step} / 2</span>} />
        <div className="create-layout">
          <div className="stage-col">
            <Pedestal c={draft} arrivalKey={`${draft?.id ?? 'none'}-${arrival}`} />
            {draft && (
              <div className="stage-controls glass">
                <div className="row between">
                  <b>{draft.name}</b>
                  <button className="btn ghost sm" onClick={() => setArrival((a) => a + 1)}>
                    <Icon name="sparkle" size={14} /> Re-transport
                  </button>
                </div>
                <label className="field-label">
                  Idle motion <span className="muted">{draft.idleEnergy < 34 ? 'calm' : draft.idleEnergy > 66 ? 'energetic' : 'easy'}</span>
                </label>
                <div className="row gap center">
                  <span className="muted sm">calm</span>
                  <input className="range grow" type="range" min={0} max={100} value={draft.idleEnergy} onChange={(e) => set('idleEnergy', +e.target.value)} />
                  <span className="muted sm">energetic</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-col">
            <div className="steps">
              <button className={`step ${step === 1 ? 'on' : ''}`} onClick={() => setStep(1)}>1 · Character</button>
              <button className={`step ${step === 2 ? 'on' : ''}`} disabled={!draft} onClick={() => setStep(2)}>2 · World</button>
            </div>

            {step === 1 && (
              <>
                <div className="glass prompt-card">
                  <label className="field-label">Tell us about your character — anything, in your own words</label>
                  <textarea
                    className="bigprompt"
                    rows={7}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={'Paste or type anything.\n\nE.g. "Her name is Rue. She has long white hair and red eyes and wears a black cloak with gold trim. She’s shy but fierce when protecting friends. Born in a drowned city, she can control water and talk to ghosts."'}
                  />
                  <button className="btn primary" disabled={!prompt.trim() || reading} onClick={readCharacter}>
                    <Icon name="sparkle" /> {reading ? 'Reading…' : draft ? 'Re-read prompt' : 'Bring to life'}
                  </button>
                </div>

                {draft && (
                  <>
                    <div className="glass">
                      <label className="field-label">Name</label>
                      <input className="input" value={draft.name} onChange={(e) => set('name', e.target.value)} />
                      <label className="field-label">Appearance</label>
                      <textarea className="input" rows={3} value={draft.appearance} onChange={(e) => set('appearance', e.target.value)} />
                      <div className="look-grid">
                        {(['hair', 'eyes', 'skin', 'outfit', 'accent'] as const).map((k) => (
                          <label key={k} className="swatch">
                            <input type="color" value={toHex(draft.look[k])} onChange={(e) => setLook(k, e.target.value)} />
                            <span>{k}</span>
                          </label>
                        ))}
                        <label className="swatch">
                          <select value={draft.look.hairStyle} onChange={(e) => setLook('hairStyle', e.target.value as Look['hairStyle'])}>
                            <option value="short">short</option><option value="long">long</option><option value="spiky">spiky</option><option value="tied">tied</option>
                          </select>
                          <span>hair style</span>
                        </label>
                        <label className="swatch">
                          <select value={draft.look.build} onChange={(e) => setLook('build', e.target.value as Look['build'])}>
                            <option value="slim">slim</option><option value="average">average</option><option value="broad">broad</option>
                          </select>
                          <span>build</span>
                        </label>
                      </div>
                      <button className="btn ghost sm" onClick={() => portraitRef.current?.click()}>
                        <Icon name="plus" size={14} /> {draft.portrait ? 'Replace portrait image' : 'Upload a portrait image (optional)'}
                      </button>
                      {draft.portrait && <button className="btn ghost sm" onClick={() => set('portrait', undefined)}>Remove portrait</button>}
                      <input ref={portraitRef} type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && set('portrait', await fileToDataUrl(e.target.files[0]))} />
                      <label className="field-label">Personality — how they feel and act</label>
                      <textarea className="input" rows={3} value={draft.personality} onChange={(e) => set('personality', e.target.value)} />
                      <label className="field-label">Lore / backstory</label>
                      <textarea className="input" rows={4} value={draft.lore} onChange={(e) => set('lore', e.target.value)} />
                      <label className="field-label">Traits & powers <span className="muted">(comma separated)</span></label>
                      <input className="input" value={draft.traits.join(', ')} onChange={(e) => set('traits', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} />
                    </div>

                    <div className="glass">
                      <label className="field-label">Voice <span className="muted">(optional — skip and add later)</span></label>
                      <div className="chips">
                        <button className={`chip ${!draft.voice ? 'on' : ''}`} onClick={() => set('voice', null)}>No voice yet</button>
                        {PRESET_VOICES.map((v) => (
                          <button key={v} className={`chip ${draft.voice?.label === v ? 'on' : ''}`} onClick={() => set('voice', { kind: 'preset', label: v })}>{v}</button>
                        ))}
                        <button className={`chip ${draft.voice?.kind === 'uploaded' ? 'on' : ''}`} onClick={() => voiceRef.current?.click()}>
                          <Icon name="mic" size={14} /> {draft.voice?.kind === 'uploaded' ? draft.voice.label : 'Upload my voice'}
                        </button>
                      </div>
                      {draft.voice?.src && <audio controls src={draft.voice.src} className="audio" />}
                      <input
                        ref={voiceRef}
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) set('voice', { kind: 'uploaded', label: f.name, src: f.size < 2_000_000 ? await fileToDataUrl(f) : URL.createObjectURL(f) });
                        }}
                      />
                    </div>

                    <div className="glass">
                      <label className="field-label">Animation style <span className="muted">— applies to this character everywhere</span></label>
                      <div className="chips">
                        {PRESET_STYLES.map((p) => (
                          <button key={p} className={`chip ${draft.style.preset === p && !draft.style.custom ? 'on' : ''}`} onClick={() => set('style', { preset: p, custom: '' })}>{p}</button>
                        ))}
                      </div>
                      <input
                        className="input"
                        placeholder="…or describe your own style (e.g. “90s cel anime with watercolor backgrounds”)"
                        value={draft.style.custom}
                        onChange={(e) => set('style', { preset: e.target.value ? null : draft.style.preset ?? 'anime', custom: e.target.value })}
                      />
                      <p className="hint">Current: <b className="lime">{styleLabel(draft.style)}</b></p>
                    </div>

                    <button className="btn primary big" onClick={() => setStep(2)}>Next: create their world →</button>
                  </>
                )}
              </>
            )}

            {step === 2 && draft && (
              <>
                <div className="glass prompt-card">
                  <label className="field-label">{draft.name}’s world — its name, what it looks like, its mood, its rules</label>
                  <textarea
                    className="bigprompt"
                    rows={7}
                    value={worldPrompt}
                    onChange={(e) => setWorldPrompt(e.target.value)}
                    placeholder={'E.g. "The Drowned City of Maren. Half-sunken marble towers, lanterns floating on black water, endless rain. It feels melancholy and quiet. Rule: the dead can speak only when it rains. No one may sail after midnight."'}
                  />
                  <button className="btn primary" disabled={!worldPrompt.trim() || reading} onClick={readWorld}>
                    <Icon name="globe" /> {reading ? 'Building…' : world ? 'Re-read world' : 'Build world'}
                  </button>
                </div>
                {world && (
                  <div className="glass">
                    <div className="world-swatch" style={{ background: `radial-gradient(120% 90% at 50% 10%, ${world.palette[0]}, ${world.palette[1]})` }}>
                      <span>{world.name}</span>
                    </div>
                    <div className="row gap">
                      <label className="swatch"><input type="color" value={toHex(world.palette[0])} onChange={(e) => setWorld({ ...world, palette: [e.target.value, world.palette[1]] })} /><span>sky</span></label>
                      <label className="swatch"><input type="color" value={toHex(world.palette[1])} onChange={(e) => setWorld({ ...world, palette: [world.palette[0], e.target.value] })} /><span>ground</span></label>
                    </div>
                    <label className="field-label">Name</label>
                    <input className="input" value={world.name} onChange={(e) => setWorld({ ...world, name: e.target.value })} />
                    <label className="field-label">What it looks like</label>
                    <textarea className="input" rows={3} value={world.looks} onChange={(e) => setWorld({ ...world, looks: e.target.value })} />
                    <label className="field-label">Mood</label>
                    <textarea className="input" rows={2} value={world.mood} onChange={(e) => setWorld({ ...world, mood: e.target.value })} />
                    <label className="field-label">Rules <span className="muted">(one per line)</span></label>
                    <textarea className="input" rows={3} value={world.rules.join('\n')} onChange={(e) => setWorld({ ...world, rules: e.target.value.split('\n') })} />
                  </div>
                )}
                <button className="btn primary big" onClick={finish}>{world ? 'Finish — open character page' : 'Skip world for now'}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
