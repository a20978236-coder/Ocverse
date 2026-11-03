/**
 * End-to-end check of every OCVerse feature against a running app.
 *   npm run build && npx vite preview --port 4173 &
 *   node e2e/smoke.cjs http://localhost:4173 [screenshotDir]
 * Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:4173';
const SHOTS = process.argv[3];
const results = [];
let page;

async function check(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name, String(e.message || e).split('\n')[0]]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/fail-${results.length}.png` }).catch(() => {});
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const shot = (n, full) => SHOTS && page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: !!full });

/** Body figure markup with per-instance ids / animation state removed → identical iff the character looks identical. */
async function signature(locator) {
  const html = await locator.evaluate((el) => el.outerHTML);
  return html
    .replace(/(skin|out|hair|dots|portrait)[a-z0-9_]+/gi, '$1')
    .replace(/class="([^"]*)"/, (_, c) => `class="${c.split(/\s+/).filter((x) => x && x !== 'alive').sort().join(' ')}"`)
    .replace(/style="[^"]*"/, '')
    .replace(/aria-label="[^"]*"/, '');
}
const fig = (scope, name) => page.locator(`${scope} svg.figure[aria-label="${name}"]`).first();

const WAV = (() => {
  const n = 800, b = Buffer.alloc(44 + n);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  for (let i = 0; i < n; i++) b[44 + i] = 128 + Math.round(60 * Math.sin(i / 4));
  return b;
})();
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => { if (!r.url().includes('fonts.g')) errors.push('requestfailed: ' + r.url()); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/backgrounds/')) errors.push(`http ${r.status()}: ${r.url()}`); });

  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.feed-item');

  // ---------- navigation ----------
  await check('Top bar shows OCVERSE, ANIMATIONS, chat icon and profile pic', async () => {
    assert(await page.locator('.brand').isVisible(), 'brand');
    assert((await page.locator('.topbar-main').textContent()) === 'ANIMATIONS', 'main tab');
    assert(await page.getByLabel('Chat', { exact: true }).isVisible(), 'chat');
    assert(await page.getByLabel('Profile', { exact: true }).isVisible(), 'profile');
  });
  for (const [tab, sel] of [['Create', '.hub-grid'], ['Series', '.series-grid'], ['Discover', '.discover-grid'], ['Feed', '.feed-item']]) {
    await check(`Mini tab "${tab}" opens`, async () => {
      await page.click(`.minitab:has-text("${tab}")`);
      await page.waitForSelector(sel, { timeout: 3000 });
      assert(await page.locator(`.minitab.on:has-text("${tab}")`).count() === 1, 'active state');
    });
  }
  await check('Chat icon opens chat; back returns', async () => {
    await page.getByLabel('Chat', { exact: true }).click();
    await page.waitForSelector('h1:has-text("Chat")');
    await page.getByLabel('Back').click();
    await page.waitForSelector('.feed-item');
  });
  await check('Profile pic opens profile; brand returns to feed', async () => {
    await page.getByLabel('Profile', { exact: true }).click();
    await page.waitForSelector('.profile-head');
    await page.click('.brand');
    await page.waitForSelector('.feed-item');
  });
  await check('Background slots point at the 4 image files', async () => {
    const want = { feed: 'feed.jpg' };
    const bg = await page.locator('.backdrop-img').first().evaluate((e) => e.style.backgroundImage);
    assert(bg.includes(want.feed), bg);
    await page.click('.minitab:has-text("Discover")');
    assert((await page.locator('.backdrop-img').first().evaluate((e) => e.style.backgroundImage)).includes('discover.jpg'), 'discover');
    await page.getByLabel('Profile', { exact: true }).click();
    assert((await page.locator('.backdrop-img').first().evaluate((e) => e.style.backgroundImage)).includes('profile.jpg'), 'profile');
    await page.click('.minitab, .brand');
  });

  // ---------- feed ----------
  await page.click('.brand');
  await check('Feed: video plays, like increments', async () => {
    const item = page.locator('.feed-item').first();
    const before = await item.locator('.feed-rail button').first().textContent();
    await page.waitForTimeout(800);
    const w = await item.locator('.vframe-progress div').evaluate((e) => parseFloat(e.style.width));
    assert(w > 0, 'progress not moving');
    await item.locator('.feed-rail button').first().click();
    const after = await item.locator('.feed-rail button').first().textContent();
    assert(before !== after, `like ${before} -> ${after}`);
  });
  await check('Feed: credit link opens creator profile', async () => {
    await page.locator('.feed-item').first().locator('.credits .link').first().click();
    await page.waitForSelector('.profile-head');
    await page.getByLabel('Back').click();
    await page.waitForSelector('.feed-item');
  });
  await check('Feed: cast chip opens character page', async () => {
    await page.locator('.feed-item').first().locator('.cast-chip').first().click();
    await page.waitForSelector('.char-body');
    await page.getByLabel('Back').first().click();
    await page.waitForSelector('.feed-item');
  });
  await check('Feed: Collab button opens story box with that cast locked in', async () => {
    const n = await page.locator('.feed-item').first().locator('.cast-chip').count();
    await page.locator('.feed-item').first().locator('.feed-rail button:has-text("Collab")').click();
    await page.waitForSelector('.storybox');
    assert(await page.locator('.storybox-attached .chip').count() === n, 'cast not locked in');
    await page.getByLabel('Back').click();
  });
  await check('Feed: tapping a video opens the player', async () => {
    await page.locator('.feed-item').first().locator('.feed-player').click();
    await page.waitForSelector('.watch-player');
    await page.getByLabel('Back').click();
    await page.waitForSelector('.feed-item');
  });

  // ---------- create hub ----------
  await page.click('.minitab:has-text("Create")');
  for (const [tile, sel] of [['Character creation', 'textarea.bigprompt'], ['World creation', 'textarea.bigprompt'], ['Story box', '.storybox'], ['New series', 'h1:has-text("New series")']]) {
    await check(`Create hub: "${tile}" opens`, async () => {
      await page.click(`.hub-tile:has-text("${tile}")`);
      await page.waitForSelector(sel, { timeout: 3000 });
      await page.getByLabel('Back').click();
      await page.waitForSelector('.hub-grid');
    });
  }

  // ---------- character creation ----------
  await page.click('.hub-tile:has-text("Character creation")');
  await check('Character creation uses the character-creation background', async () => {
    assert((await page.locator('.backdrop-img').first().evaluate((e) => e.style.backgroundImage)).includes('character-creation.jpg'), 'bg');
  });
  await check('Empty pedestal waits for a character', async () => {
    assert(await page.locator('.pedestal-stage.phase-empty').count() === 1, 'not empty');
  });
  const PROMPT = "Her name is Rue. She has long white hair and red eyes and wears a black cloak with gold trim. She's shy but fierce when protecting friends. Born in a drowned city, she can control water and talk to ghosts.";
  await page.fill('textarea.bigprompt', PROMPT);
  await page.evaluate(() => {
    window.__phases = [];
    const el = document.querySelector('.pedestal-stage');
    const rec = () => { const ph = [...el.classList].find((c) => c.startsWith('phase-')); if (window.__phases.at(-1) !== ph) window.__phases.push(ph); };
    new MutationObserver(rec).observe(el, { attributes: true, attributeFilter: ['class'] });
    rec();
    // sample the particle canvas in-page so slow test steps can't miss the swirl
    window.__maxParticles = 0;
    const sample = () => {
      const c = el.querySelector('canvas.particles');
      const d = c.getContext('2d').getImageData(0, 0, c.width || 1, c.height || 1).data;
      let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++;
      window.__maxParticles = Math.max(window.__maxParticles, n);
      if (!el.classList.contains('phase-idle')) setTimeout(sample, 80);
    };
    sample();
  });
  await page.click('button:has-text("Bring to life")');
  await check('Transport: beam → particle assembly with glitch → flash → idle', async () => {
    await page.waitForSelector('.pedestal-stage.phase-beam', { timeout: 3000 });
    await page.waitForSelector('.pedestal-stage.phase-assemble', { timeout: 5000 });
    assert(await page.locator('.phase-assemble .figure-glitch').count() === 1, 'glitch layer');
    const glitch = await page.locator('.phase-assemble .figure-glitch').evaluate((e) => getComputedStyle(e).animationName);
    assert(glitch === 'glitch', 'glitch anim=' + glitch);
    await page.waitForSelector('.pedestal-stage.phase-flash, .pedestal-stage.phase-idle', { timeout: 5000 });
    const lit = await page.evaluate(() => window.__maxParticles);
    assert(lit > 50, 'no particles drawn (' + lit + ')');
    await shot('01-transport');
    await page.waitForSelector('.pedestal-stage.phase-idle', { timeout: 5000 });
    const seq = await page.evaluate(() => window.__phases.join('>'));
    assert(seq === 'phase-empty>phase-beam>phase-assemble>phase-flash>phase-idle', 'sequence ' + seq);
  });
  await check('Prompt box fills name, appearance, personality, lore, traits', async () => {
    const v = async (label) => page.locator(`.field-label:has-text("${label}") + *`).first().inputValue();
    assert((await v('Name')) === 'Rue', 'name=' + (await v('Name')));
    assert((await v('Appearance')).includes('white hair'), 'appearance');
    assert((await v('Personality')).includes('shy'), 'personality');
    assert((await v('Lore')).includes('drowned city'), 'lore=' + (await v('Lore')));
    assert((await v('Traits')).includes('control water'), 'traits');
  });
  await check('Prompt colours drive the look (white hair, red eyes)', async () => {
    const hair = await page.locator('.swatch:has-text("hair") input[type=color]').first().inputValue();
    const eyes = await page.locator('.swatch:has-text("eyes") input[type=color]').inputValue();
    assert(hair === '#f2f2f2' && eyes === '#d6333d', `${hair} ${eyes}`);
  });
  await check('Idle animation is alive and stays on the pedestal', async () => {
    const svg = page.locator('.pedestal-stage svg.figure');
    assert(await svg.evaluate((e) => e.classList.contains('alive')), 'not alive');
    const anims = await page.locator('.pedestal-stage .figure .eyes').evaluate((e) => getComputedStyle(e).animationName);
    assert(anims === 'blink', 'blink=' + anims);
    const sway = await page.locator('.pedestal-stage .figure .sway').evaluate((e) => getComputedStyle(e).animationName);
    assert(sway === 'sway', 'sway=' + sway);
    const b1 = await page.locator('.figure-wrap').boundingBox();
    await page.waitForTimeout(1500);
    const b2 = await page.locator('.figure-wrap').boundingBox();
    assert(Math.abs(b1.x - b2.x) < 1 && Math.abs(b1.y - b2.y) < 1, 'figure moved off pedestal');
  });
  await check('Idle motion slider: calm ↔ energetic', async () => {
    const r = page.locator('.stage-controls input[type=range]');
    await r.fill('0');
    const calm = await page.locator('.pedestal-stage svg.figure').evaluate((e) => e.style.getPropertyValue('--amp'));
    await r.fill('100');
    const hype = await page.locator('.pedestal-stage svg.figure').evaluate((e) => e.style.getPropertyValue('--amp'));
    assert(parseFloat(hype) > parseFloat(calm), `${calm} -> ${hype}`);
    assert((await page.locator('.stage-controls .field-label').textContent()).includes('energetic'), 'label');
    await r.fill('40');
  });
  await check('Appearance edits update the character live', async () => {
    await page.locator('.swatch:has-text("outfit") input[type=color]').fill('#3366ff');
    const fill = await page.locator('.pedestal-stage .figure .cloth').getAttribute('fill');
    assert(fill === '#3366ff', 'cloth fill=' + fill);
    await page.locator('.swatch:has-text("hair style") select').selectOption('tied');
    await page.locator('.swatch:has-text("hair style") select').selectOption('long');
  });
  await check('Animation style presets + custom style apply to the character', async () => {
    await page.click('.chip:has-text("comic book")');
    assert(await page.locator('.pedestal-stage svg.figure.k-comic').count() === 1, 'comic');
    await page.click('.chip:has-text("cartoon")');
    assert(await page.locator('.pedestal-stage svg.figure.k-cartoon').count() === 1, 'cartoon');
    await page.fill('input[placeholder^="…or describe your own style"]', '90s cel anime with watercolor backgrounds');
    assert((await page.locator('.hint b.lime').textContent()).includes('90s cel anime'), 'custom label');
    await page.fill('input[placeholder^="…or describe your own style"]', '');
    await page.click('.chip:has-text("anime") >> nth=0');
    assert(await page.locator('.pedestal-stage svg.figure.k-anime').count() === 1, 'anime');
  });
  await check('Voice: preset, upload, and skip all work', async () => {
    await page.click('.chip:has-text("Soft alto")');
    assert(await page.locator('.chip.on:has-text("Soft alto")').count() === 1, 'preset');
    await page.locator('input[type=file][accept="audio/*"]').first().setInputFiles({ name: 'my-voice.wav', mimeType: 'audio/wav', buffer: WAV });
    await page.waitForSelector('.chip.on:has-text("my-voice.wav")');
    assert(await page.locator('audio.audio').count() === 1, 'player');
    await page.click('.chip:has-text("No voice yet")');
    assert(await page.locator('.chip.on:has-text("No voice yet")').count() === 1, 'skip');
    await page.click('.chip:has-text("Soft alto")');
  });
  await check('Re-transport replays the arrival', async () => {
    await page.click('button:has-text("Re-transport")');
    await page.waitForSelector('.pedestal-stage.phase-beam, .pedestal-stage.phase-assemble', { timeout: 2000 });
    await page.waitForSelector('.pedestal-stage.phase-idle', { timeout: 4000 });
  });
  const rueSig = await signature(page.locator('.pedestal-stage svg.figure'));
  await shot('02-character-step1', true);

  // ---------- world creation ----------
  await page.click('button:has-text("Next: create their world")');
  await check('Step 2 asks for the character\'s world', async () => {
    await page.waitForSelector('.field-label:has-text("Rue’s world")');
    assert(await page.locator('.stepper:has-text("Step 2")').count() === 1, 'stepper');
  });
  await page.fill('textarea.bigprompt', 'The Drowned City of Maren. Half-sunken marble towers under a violet sky. It feels melancholy and quiet. The dead can speak only when it rains. No one may sail after midnight.');
  await page.click('button:has-text("Build world")');
  await check('World prompt fills name, look, mood, rules', async () => {
    await page.waitForSelector('.world-form');
    assert((await page.getByLabel('World name').inputValue()) === 'The Drowned City of Maren', 'name');
    const ta = page.locator('.world-form textarea');
    assert((await ta.nth(0).inputValue()).includes('marble towers'), 'looks');
    assert((await ta.nth(1).inputValue()).includes('melancholy'), 'mood');
    assert((await ta.nth(2).inputValue()).split('\n').length === 2, 'rules');
  });
  await check('World is editable', async () => {
    await page.getByLabel('World name').fill('Maren');
    assert((await page.locator('.world-swatch span').textContent()) === 'Maren', 'swatch');
  });
  await shot('03-world', true);
  await page.click('button:has-text("Finish")');

  // ---------- character page ----------
  await check('Character page shows portrait, appearance, personality, lore, voice, style, world', async () => {
    await page.waitForSelector('.char-body');
    const text = await page.locator('.char-body').textContent();
    for (const s of ['Appearance', 'white hair', 'Personality', 'shy', 'Lore', 'drowned city', 'Voice', 'Soft alto', 'Animation style', 'anime', 'World', 'Maren', 'Locked reference']) assert(text.includes(s), 'missing ' + s);
    assert(await page.locator('.char-title .avatar').count() === 1, 'portrait');
  });
  await check('Opening a character transports them onto the pedestal', async () => {
    await page.waitForSelector('.char-hero .pedestal-stage.phase-idle', { timeout: 4000 });
  });
  await check('Character page figure is identical to the one created', async () => {
    assert((await signature(page.locator('.char-hero svg.figure'))) === rueSig, 'drift between create and character page');
  });
  await check('Edit → change personality later → saved', async () => {
    await page.click('.subheader button:has-text("Edit")');
    await page.waitForSelector('.pedestal-stage.phase-idle', { timeout: 4000 });
    await page.locator('.field-label:has-text("Personality") + textarea').fill('Shy, stubborn, secretly funny.');
    await page.getByLabel('Back').click();
    await page.waitForSelector('.char-body');
    assert((await page.locator('.char-body').textContent()).includes('secretly funny'), 'not saved');
  });
  await check('Edit world from character page', async () => {
    await page.click('button:has-text("Edit world")');
    await page.waitForSelector('.world-form');
    await page.locator('.world-form textarea').nth(1).fill('Melancholy, quiet, lantern-lit.');
    await page.getByLabel('Back').click();
    assert((await page.locator('.world-card').textContent()).includes('lantern-lit'), 'world edit not saved');
  });
  await check('Chat with character from their page', async () => {
    await page.click('.actions button:has-text("Chat")');
    await page.fill('.composer input', 'Hi Rue?');
    await page.click('[aria-label="Send"]');
    assert(await page.locator('.msg.me').count() === 1 && await page.locator('.msg.them').count() === 1, 'no reply');
    await page.getByLabel('Back').click();
    await page.waitForSelector('.char-body');
  });

  // ---------- story box + collab ----------
  await page.click('button:has-text("Make a video")');
  await check('Story box: three icons in their own row under the description', async () => {
    const tools = page.locator('.storybox > .storybox-tools .tool');
    assert(await tools.count() === 3, 'tools');
    for (const l of ['Character collab', 'Add reference images', 'Add music or audio']) assert(await page.getByLabel(l).isVisible(), l);
  });
  await check('Collab picker: circular portraits + names only, tap to lock in', async () => {
    await page.getByLabel('Character collab').click();
    await page.waitForSelector('.picker-grid');
    const txt = await page.locator('.sheet').textContent();
    assert(!txt.includes('@'), 'creator handle shown in picker');
    assert(await page.locator('.picker-item .avatar').count() >= 6, 'avatars');
    await page.click('.picker-item:has-text("Velka")');
    await page.click('.picker-item:has-text("Jax Orin")');
    assert((await page.locator('.sheet-head .muted').textContent()).includes('3 locked in'), 'count');
    await page.click('.picker-item:has-text("Jax Orin")');
    await shot('04-picker');
    await page.getByLabel('Done').click();
    assert(await page.locator('.storybox-attached .chip').count() === 2, 'chips');
  });
  await check('Reference images upload (+ icon)', async () => {
    await page.locator('.storybox-tools input[type=file]').setInputFiles([{ name: 'mood.png', mimeType: 'image/png', buffer: PNG }]);
    await page.waitForSelector('.ref-thumb img');
    await page.locator('.ref-thumb select').selectOption('mood');
  });
  await check('Audio: pick a track', async () => {
    await page.getByLabel('Add music or audio').click();
    await page.click('.list-row:has-text("Hollow Choir")');
    assert(await page.locator('.storybox-attached .chip:has-text("Hollow Choir")').count() === 1, 'track');
  });
  await check('Audio: upload your own', async () => {
    await page.getByLabel('Add music or audio').click();
    await page.locator('.sheet input[type=file]').setInputFiles({ name: 'theme.wav', mimeType: 'audio/wav', buffer: WAV });
    assert(await page.locator('.storybox-attached .chip:has-text("theme.wav")').count() === 1, 'upload');
  });
  await check('Length range is 1–15 minutes', async () => {
    const r = page.locator('input.range[min="1"][max="15"]');
    assert(await r.count() === 1, 'range');
    await r.fill('15');
    assert((await page.locator('.field-label:has-text("Length")').textContent()).includes('15 min'), '15');
    await r.fill('1');
    assert((await page.locator('.field-label:has-text("Length")').textContent()).includes('1 min'), '1');
    await r.fill('4');
  });
  await check('World selector: "No world" can be chosen and sticks', async () => {
    const sel = page.locator('.field-label:has-text("World") + select');
    await sel.selectOption('');
    assert((await sel.inputValue()) === '', 'no world reverted');
    await sel.selectOption({ label: 'Maren' });
  });
  await check('Collab credit notice shown', async () => {
    assert(await page.locator('.hint:has-text("Collab")').count() === 1, 'hint');
  });
  await page.fill('.storybox textarea', 'Rue walks the flooded stairs at dusk. Velka appears out of the fog. They argue, then team up against the drowned bell.');
  await page.click('button:has-text("Generate & post")');
  await check('Generation locks every character reference and runs the consistency check', async () => {
    await page.waitForSelector('.genlog-line:has-text("Locked 2 character references")');
    await page.waitForSelector('.genlog-line:has-text("Delivered")', { timeout: 20000 });
    await shot('05-generate', true);
    await page.waitForSelector('.watch-player', { timeout: 5000 });
  });

  // ---------- watch + consistency ----------
  await check('Collab video credits every creator', async () => {
    const c = await page.locator('.watch-body > .credits').textContent();
    assert(c.includes('@you') && c.includes('@nyxdraws'), c);
  });
  await check('CONSISTENCY: Rue in the video is identical to her reference', async () => {
    assert((await signature(fig('.watch-player', 'Rue'))) === rueSig, 'Rue drifted in video');
  });
  let velkaVideoSig;
  await check('CONSISTENCY: collab partner Velka looks like herself', async () => {
    velkaVideoSig = await signature(fig('.watch-player', 'Velka'));
    await page.click('.cast-big:has-text("Velka")');
    await page.waitForSelector('.char-hero .pedestal-stage.phase-idle', { timeout: 4000 });
    assert((await signature(page.locator('.char-hero svg.figure'))) === velkaVideoSig, 'Velka drifted');
    await page.getByLabel('Back').first().click();
  });
  await check('Watch: tap pauses and resumes', async () => {
    await page.waitForSelector('.watch-player');
    await page.locator('.watch-player').click();
    await page.waitForSelector('.play-overlay');
    await page.locator('.watch-player').click();
    assert(await page.locator('.play-overlay').count() === 0, 'still paused');
  });
  await check('Watch: replay restarts after the end', async () => {
    await page.waitForSelector('.end-overlay', { timeout: 15000 });
    await page.click('.end-overlay button:has-text("Replay")');
    await page.waitForTimeout(600);
    assert(await page.locator('.end-overlay').count() === 0, 'replay ended immediately');
  });
  await check('Posted videos stay editable', async () => {
    await page.click('.subheader button:has-text("Edit")');
    await page.waitForSelector('.storybox');
    assert((await page.locator('.storybox textarea').inputValue()).includes('drowned bell'), 'not prefilled');
    await page.fill('input[placeholder^="Give it a title"]', 'The Drowned Bell');
    await page.click('button:has-text("Regenerate & save")');
    await page.waitForSelector('.watch-body h2:has-text("The Drowned Bell")', { timeout: 20000 });
  });
  await check('CONSISTENCY: same character in another creator\'s video thumbnails/frames matches', async () => {
    await page.click('.brand');
    await page.click('.minitab:has-text("Discover")');
    await page.click('.discover-card:has-text("Velka") .discover-main');
    await page.waitForSelector('.vcard');
    const s1 = await signature(page.locator('.vcard svg.figure[aria-label="Velka"]').first());
    assert(s1 === velkaVideoSig, 'Velka differs across videos');
  });

  // ---------- remix ----------
  await check('Remix a character: credits + links back to original creator', async () => {
    await page.click('.actions button:has-text("Remix")');
    await page.waitForSelector('textarea.bigprompt');
    assert((await page.locator('.field-label:has-text("Name") + input').inputValue()) === 'Velka (remix)', 'name');
    await page.getByLabel('Back').click();
    await page.getByLabel('Profile', { exact: true }).click();
    await page.click('.char-tile:has-text("Velka (remix)")');
    await page.waitForSelector('.remix-credit');
    const t = await page.locator('.char-title .remix-credit').textContent();
    assert(t.includes('Remix of') && t.includes('Velka') && t.includes('@nyxdraws'), t);
  });
  await check('CONSISTENCY: remix keeps the original look', async () => {
    await page.waitForSelector('.char-hero .pedestal-stage.phase-idle', { timeout: 4000 });
    assert((await signature(page.locator('.char-hero svg.figure'))) === velkaVideoSig, 'remix drifted');
  });
  await check('Remix link opens the original character', async () => {
    await page.click('.char-title .remix-credit button:has-text("Velka")');
    await page.waitForSelector('.char-title h2:has-text("Velka")');
    await page.getByLabel('Back').first().click();
  });
  await check('Remix a world → opens editable world with credit', async () => {
    await page.click('.minitab, .brand');
    await page.click('.minitab:has-text("Discover")');
    await page.click('.discover-card:has-text("Moss") .discover-main');
    await page.click('button:has-text("Remix world")');
    await page.waitForSelector('.world-form');
    assert((await page.locator('.remix-credit').textContent()).includes('@ivy_ocs'), 'credit');
    await page.getByLabel('World name').fill('My Hollow');
    await page.getByLabel('Back').click();
    await page.click('.brand'); await page.click('.minitab:has-text("Create")');
    await page.click('.world-tile:has-text("My Hollow")');
    await page.waitForSelector('.world-form');
    await page.getByLabel('Back').click();
  });

  // ---------- series ----------
  await page.click('.minitab:has-text("Series")');
  await check('Create a series with title + cover', async () => {
    await page.click('button:has-text("New series")');
    await page.fill('input[placeholder="e.g. Storm Season"]', 'Rue: Low Tide');
    await page.click('.chip:has-text("dusk")');
    await page.locator('input[type=file]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForTimeout(200);
    await page.click('button:has-text("Create series")');
    await page.waitForSelector('.subheader h1:has-text("Rue: Low Tide")');
  });
  for (const [i, story, title] of [[1, 'Rue wakes on the tide stairs.', ''], [2, 'Rue finds the bell.', 'The Bell']]) {
    await check(`Add Episode ${i}`, async () => {
      await page.click(`button:has-text("Episode ${i}")`);
      await page.waitForSelector('.storybox');
      assert((await page.locator('.field-label:has-text("Series") + select').inputValue()) !== '', 'series not preselected');
      await page.getByLabel('Character collab').click();
      if (!(await page.locator('.picker-item.on:has-text("Rue")').count())) await page.click('.picker-item:has-text("Rue")');
      await page.getByLabel('Done').click();
      await page.fill('.storybox textarea', story);
      if (title) await page.fill('input[placeholder^="Give it a title"]', title);
      await page.click('button:has-text("Generate & post")');
      await page.waitForSelector('.watch-player', { timeout: 20000 });
      assert((await page.locator('.subheader h1').textContent()).includes(`Ep. ${i}`), 'episode number');
      await page.getByLabel('Back').click();
      await page.getByLabel('Back').click();
      await page.waitForSelector('.ep-card');
    });
  }
  await check('Next-episode flow plays straight through', async () => {
    await page.click('button:has-text("Watch from Episode 1")');
    await page.waitForSelector('.end-overlay:has-text("Next episode")', { timeout: 10000 });
    await shot('06-next-episode');
    await page.waitForSelector('.subheader h1:has-text("Ep. 2")', { timeout: 8000 });
    await page.getByLabel('Back').click();
  });
  await check('Episodes are reorderable and editable after posting', async () => {
    await page.click('.subheader button:has-text("Edit")');
    await page.getByLabel('Move down').first().click();
    const titles = await page.locator('.ep-card b').allTextContents();
    assert(titles[0] === 'The Bell' && titles[1] === 'Rue: Low Tide — Episode 2', 'order/renumber: ' + titles.join(' | '));
    await page.click('.subheader button:has-text("Done")');
    await page.getByLabel('Edit episode').first().click();
    await page.waitForSelector('button:has-text("Regenerate & save")');
    await page.getByLabel('Back').click();
  });
  await check('Collab series: joining another creator\'s series credits you on every episode', async () => {
    await page.getByLabel('Back').click();
    await page.click('.series-card:has-text("Storm Season")');
    await page.click('button:has-text("Join with an episode")');
    await page.getByLabel('Character collab').click();
    await page.click('.picker-item:has-text("Rue")');
    await page.getByLabel('Done').click();
    await page.fill('.storybox textarea', 'Rue surfaces in the Storm Docks.');
    await page.click('button:has-text("Generate & post")');
    await page.waitForSelector('.watch-player', { timeout: 20000 });
    await page.getByLabel('Back').click(); await page.getByLabel('Back').click();
    await page.waitForSelector('.ep-card');
    const credits = await page.locator('.ep-card').first().locator('.credits').textContent();
    assert(credits.includes('@you') && credits.includes('@kai.verse'), 'episode 1 credits: ' + credits);
  });

  // ---------- discover + profile ----------
  await page.click('.brand');
  await page.click('.minitab:has-text("Discover")');
  await check('Discover: search characters', async () => {
    await page.fill('.search input', 'moss');
    assert(await page.locator('.discover-card').count() === 1, 'search');
    await page.fill('.search input', '');
  });
  await check('Discover: creators, follow toggle, open profile', async () => {
    await page.click('.step:has-text("Creators")');
    const btn = page.locator('.creator-row:has-text("Ivy") button.btn');
    const a = await btn.textContent();
    await btn.click();
    assert((await btn.textContent()) !== a, 'follow toggle');
    await page.click('.creator-row:has-text("Ivy") .grow');
    await page.waitForSelector('.profile-head:has-text("Ivy")');
    await page.getByLabel('Back').click();
  });
  await check('Discover: Collab button opens story box with that character', async () => {
    await page.click('.step:has-text("Characters")');
    await page.click('.discover-card:has-text("Pip") button:has-text("Collab")');
    assert(await page.locator('.storybox-attached .chip:has-text("Pip")').count() === 1, 'pip');
    await page.getByLabel('Back').click();
  });
  await check('Profile tabs: characters, videos, series, collabs', async () => {
    await page.getByLabel('Profile', { exact: true }).click();
    for (const t of ['videos', 'series', 'collabs', 'characters']) await page.click(`.step:has-text("${t}")`);
    await page.click('.step:has-text("videos")');
    assert(await page.locator('.vcard').count() >= 3, 'videos');
    await page.click('.vcard >> nth=0');
    await page.waitForSelector('.watch-player');
    await page.getByLabel('Back').click();
    await page.click('.profile-head button:has-text("New character")');
    await page.waitForSelector('textarea.bigprompt');
    await page.getByLabel('Back').click();
  });
  await check('Chat list from top bar opens a thread', async () => {
    await page.getByLabel('Chat', { exact: true }).click();
    await page.click('.list-row:has-text("Rue")');
    assert(await page.locator('.msg').count() >= 2, 'thread');
    await page.getByLabel('Back').click();
    await page.click('.char-tile >> nth=0');
    await page.fill('.composer input', 'hello');
    await page.keyboard.press('Enter');
    assert(await page.locator('.msg.them').count() >= 1, 'reply');
  });
  await check('Data persists across reload', async () => {
    await page.reload();
    await page.getByLabel('Profile', { exact: true }).click();
    assert(await page.locator('.char-tile:has-text("Rue")').count() === 1, 'Rue lost');
  });

  // ---------- phone ----------
  const m = await browser.newContext({ ...devices['iPhone 13'] });
  page = await m.newPage();
  page.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
  await page.goto(BASE);
  await page.waitForSelector('.feed-item');
  for (const tab of ['Feed', 'Create', 'Series', 'Discover']) {
    await check(`Phone: ${tab} fits without sideways scroll`, async () => {
      await page.click(`.minitab:has-text("${tab}")`);
      await page.waitForTimeout(300);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 1, `overflow ${over}px`);
    });
  }
  await check('Phone: character creation + transport', async () => {
    await page.click('.minitab:has-text("Create")');
    await page.click('.hub-tile:has-text("Character creation")');
    await page.fill('textarea.bigprompt', 'Zed is a cocky racer with spiky blue hair and amber eyes. He can bend lightning.');
    await page.click('button:has-text("Bring to life")');
    await page.waitForSelector('.pedestal-stage.phase-idle', { timeout: 6000 });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(over <= 1, `overflow ${over}px`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('07-phone-create');
  });

  await check('No runtime errors in the console', async () => { assert(errors.length === 0, errors.slice(0, 5).join(' | ')); });

  await browser.close();
  const fails = results.filter((r) => r[0] === 'FAIL');
  for (const r of results) console.log(r.join('  '));
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(async (e) => {
  for (const r of results) console.log(r.join('  '));
  console.error('\nCRASHED:', String(e.message).split('\n')[0]);
  if (SHOTS && page) await page.screenshot({ path: `${SHOTS}/crash.png` }).catch(() => {});
  process.exit(2);
});
