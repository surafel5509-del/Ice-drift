/* =====================================================================
   ICE DRIFT  ·  core.js
   Utilities · deterministic noise · persistence · input · audio
   ===================================================================== */
'use strict';
window.ID = window.ID || {};
(function (ID) {
  /* ------------------------------------------------------------------
     MATH / UTILITIES
     ------------------------------------------------------------------ */
  const U = ID.U = {
    TAU: Math.PI * 2,
    DEG: Math.PI / 180,
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    damp(a, b, k, dt) { return a + (b - a) * (1 - Math.exp(-k * dt)); },
    sstep(a, b, x) { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); },
    wrapPi(a) { a %= U.TAU; if (a > Math.PI) a -= U.TAU; else if (a < -Math.PI) a += U.TAU; return a; },
    sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; },
    mix(a, b, t) { return a + (b - a) * t; },
    rng(seed) {
      let a = (seed | 0) || 1;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    pick(arr, rnd) { return arr[Math.floor((rnd ? rnd() : Math.random()) * arr.length) % arr.length]; },
    /* value noise (tileable 256 table) */
    noise2: null,
    fbm2: null,
    hex(h) { return [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255]; },
    col(h) { return new THREE.Color(h); },
    fmtTime(t, short) {
      if (!isFinite(t) || t < 0) t = 0;
      const m = Math.floor(t / 60), s = t - m * 60;
      if (short) return s.toFixed(1);
      return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
    },
    fmtNum(n) { n = Math.round(n); if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k'; return String(n); },
    ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); },
    now() { return performance.now(); },
    isTouch: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
    deviceMem: navigator.deviceMemory || 4,
    hard: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
    raf: (fn) => requestAnimationFrame(fn),
    $: (s, r) => (r || document).querySelector(s),
    $$: (s, r) => Array.from((r || document).querySelectorAll(s)),
    ease: { outCubic: t => 1 - Math.pow(1 - t, 3), outQuint: t => 1 - Math.pow(1 - t, 5), inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 },
    /* rotate a vec3 about an arbitrary axis */
    rotAxis(v, axis, ang) { return v.applyAxisAngle(axis, ang); },
    bytes(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; },
    debounce(fn, ms) { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), ms); }; },
  };

  /* deterministic permutation-based value noise */
  const PERM = new Uint8Array(512), GRAD = new Float32Array(256);
  { const r = U.rng(1337); for (let i = 0; i < 256; i++) { PERM[i] = PERM[i + 256] = i; GRAD[i] = r(); } 
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = PERM[i]; PERM[i] = PERM[j]; PERM[j] = t; } }
  const h2 = (x, y) => GRAD[PERM[(PERM[x & 255] + (y & 255)) & 255]];
  U.noise2 = function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return (a + (b - a) * fx + (c - a + (a - b - c + d) * fx) * fy) * 2 - 1;
  };
  U.fbm2 = function (x, y, oct) {
    let v = 0, amp = 0.5, f = 1;
    oct = oct || 4;
    for (let i = 0; i < oct; i++) { v += amp * U.noise2(x * f, y * f); f *= 2.03; amp *= 0.5; }
    return v;
  };
  U.noise3 = function (x, y, z) {
    return (U.noise2(x + z * 0.71, y - z * 0.37) + U.noise2(x * 1.7 - z * 0.23, y * 1.3 + z * 0.91)) * 0.5;
  };

  /* ------------------------------------------------------------------
     GLOBAL GAME OBJECT
     ------------------------------------------------------------------ */
  const G = ID.G = {
    state: 'boot',       // boot|loading|menu|garage|countdown|race|air|finish|paused|results
    prev: '',
    t: 0,                // wall time
    dt: 0,
    run: null,           // active run descriptor
    cfg: null,           // course config
    mode: 'race',
    paused: false,
    demo: true,
    locale: 'en',
    season: 1,
    build: '2.0.0',
    debug: false,
    quality: 'high',
    frame: 0,
    fps: 60,
    drops: 0,
  };

  /* ------------------------------------------------------------------
     PERSISTENCE
     ------------------------------------------------------------------ */
  const KEY = 'icedrift.save.v2';
  let LS = true;
  try { localStorage.setItem('__id', '1'); localStorage.removeItem('__id'); } catch (e) { LS = false; }
  const mem = {};

  const defaults = () => ({
    v: 2,
    coins: 300,
    xp: 0,
    level: 1,
    gems: 3,
    rider: 'skier',                   // skier | snowboarder
    paint: 0,                          // jacket colour index
    unlocked: { valley: true },
    owned: { suit0: 1, board0: 1, trail0: 1 },
    equip: { suit: 0, board: 0, trail: 0 },
    up: { speed: 0, carve: 0, air: 0, boost: 0 },
    best: {},                          // best runs per mode/loc
    ghosts: {},                        // best ghost per loc/mode
    career: {},                        // event id -> medal(1..3)
    cup: {},
    ach: {},
    stats: { runs: 0, wins: 0, golds: 0, crashes: 0, gates: 0, tricks: 0, air: 0, dist: 0, coins: 0, sessions: 0, bestCombo: 0, topspeed: 0, perfect: 0 },
    daily: { last: '', streak: 0, done: false },
    set: { quality: 'auto', res: 1, vol: .8, sfx: .9, music: .55, mute: false, shake: 1, ghost: true, fps: false, cam: 0, ctrl: 'auto', invertY: false, skidmarks: true, motionblur: true, hint: true },
    tut: false,
  });

  function merge(t, s) {
    for (const k in s) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object') merge(t[k], s[k]);
      else if (t[k] === undefined) t[k] = s[k];
    }
  }
  const SV = ID.SV = defaults();
  ID.load = function () {
    try {
      const raw = LS ? localStorage.getItem(KEY) : mem[KEY];
      if (raw) { const j = JSON.parse(raw); if (j && typeof j === 'object') merge(JSON.parse(JSON.stringify(defaults())), j), Object.assign(SV, j); }
    } catch (e) { /* corrupted save -> defaults */ }
    /* restore any keys missing after older versions */
    const d = defaults();
    (function fill(a, b) { for (const k in b) { if (a[k] === undefined) a[k] = b[k]; else if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) fill(a[k], b[k]); } })(SV, d);
    return SV;
  };
  let saveTimer = 0;
  ID.save = function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { const s = JSON.stringify(SV); LS ? localStorage.setItem(KEY, s) : (mem[KEY] = s); } catch (e) { }
    }, 350);
  };
  ID.saveNow = function () { try { const s = JSON.stringify(SV); LS ? localStorage.setItem(KEY, s) : (mem[KEY] = s); } catch (e) { } };
  ID.resetSave = function () { Object.assign(SV, defaults()); ID.saveNow(); location.reload(); };
  ID.xpFor = (lvl) => Math.round(120 * Math.pow(lvl, 1.32));
  ID.addXP = function (n) {
    SV.xp += n; let ups = 0;
    while (SV.xp >= ID.xpFor(SV.level) && SV.level < 60) { SV.xp -= ID.xpFor(SV.level); SV.level++; ups++; SV.coins += 150; SV.gems += (SV.level % 5 === 0) ? 1 : 0; }
    return ups;
  };

  /* ------------------------------------------------------------------
     SETTINGS -> QUALITY PROFILE
     ------------------------------------------------------------------ */
  const QP = ID.QP = {
    low: { name: 'Low', dpr: 1, shadow: 0, shadowSize: 512, bloom: false, snowfall: 700, particles: 900, chunks: 5, chunkLen: 80, pines: .45, aa: false, envMap: false, aniso: 1, fog: 210, trails: false, refl: false, post: false, mat: 'lambert' },
    med: { name: 'Medium', dpr: 1.35, shadow: 1, shadowSize: 1024, bloom: true, snowfall: 1500, particles: 1800, chunks: 6, chunkLen: 70, pines: .7, aa: true, envMap: true, aniso: 2, fog: 300, trails: true, refl: false, post: true, mat: 'standard' },
    high: { name: 'High', dpr: 1.75, shadow: 2, shadowSize: 2048, bloom: true, snowfall: 2600, particles: 3000, chunks: 8, chunkLen: 60, pines: 1, aa: true, envMap: true, aniso: 4, fog: 420, trails: true, refl: true, post: true, mat: 'standard' },
    ultra: { name: 'Ultra', dpr: 2.2, shadow: 2, shadowSize: 4096, bloom: true, snowfall: 4200, particles: 5200, chunks: 10, chunkLen: 55, pines: 1.25, aa: true, envMap: true, aniso: 8, fog: 520, trails: true, refl: true, post: true, mat: 'standard' },
  };
  ID.Q = QP.high;
  ID.applyQuality = function (force) {
    let q = SV.set.quality;
    if (q === 'auto' || !q) {
      const weak = U.hard || U.deviceMem <= 3 || Math.min(screen.width, screen.height) < 720;
      q = weak ? 'med' : 'high';
      if (ID.benchSlow) q = 'low';
    }
    G.quality = q; ID.Q = QP[q] || QP.high;
    if (force && ID.E && ID.E.applyQuality) ID.E.applyQuality();
    return q;
  };

  /* ------------------------------------------------------------------
     INPUT — keyboard, gamepad, touch
     ------------------------------------------------------------------ */
  const IN = ID.IN = {
    steer: 0, steerRaw: 0, acc: 0, brake: 0, edge: 0, jump: false, jumpBuf: 0,
    boost: false, trickA: false, trickB: false, trickBuf: 0, grab: false,
    keys: {}, touch: { steer: 0, acc: 0, brake: 0, jump: 0, boost: 0, trick: 0 },
    pad: { on: false, steer: 0, acc: 0, brake: 0, jump: 0, boost: 0, trick: 0 },
    lastInput: 'kb', any: false,
  };
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', ShiftLeft: 'edge', ShiftRight: 'edge', KeyJ: 'trickA', KeyK: 'trickB',
    KeyL: 'grab', KeyQ: 'trickA', KeyE: 'trickB', ControlLeft: 'boost', KeyC: 'cam',
    KeyP: 'pause', Escape: 'pause', KeyR: 'restart', KeyM: 'mute', KeyH: 'help',
    Tab: 'swap', KeyB: 'boost',
  };
  IN.keyDown = {};
  IN.bindKeyboard = function () {
    addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (['jump', 'trickA', 'trickB', 'grab', 'cam', 'pause', 'restart', 'mute', 'help', 'swap'].includes(a) && !e.repeat) {
        if (a === 'cam' && ID.camCycle) ID.camCycle();
        else if (a === 'pause' && ID.togglePause) ID.togglePause();
        else if (a === 'restart' && ID.restartRun) ID.restartRun();
        else if (a === 'mute' && ID.toggleMute) ID.toggleMute();
        else if (a === 'help' && ID.showHelp) ID.showHelp();
        else if (a === 'swap') { e.preventDefault(); if (ID.swapCamera) ID.swapCamera(); }
        else if (a === 'jump') IN.jumpBuf = .18;
        else if (a === 'trickA') IN.trickBuf = .3, ID.A && ID.A.sfx('uiClick');
        else if (a === 'trickB') IN.trickBuf2 = .3, ID.A && ID.A.sfx('uiClick');
      }
      IN.keyDown[a] = true; IN.keys[a] = true; IN.lastInput = 'kb'; IN.any = true;
      if (['up', 'down', 'left', 'right', 'jump'].includes(a)) e.preventDefault();
    }, { passive: false });
    addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code]; if (!a) return;
      IN.keyDown[a] = false; IN.keys[a] = false;
    });
    addEventListener('blur', () => { IN.keyDown = {}; IN.keys = {}; });
  };
  IN.poll = function (dt) {
    const k = IN.keyDown;
    let steer = 0, acc = 0, brake = 0;
    if (k.left) steer -= 1; if (k.right) steer += 1;
    if (k.up) acc = 1; if (k.down) brake = 1;
    /* gamepad */
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let padOn = false;
    for (const p of pads) {
      if (!p || !p.connected) continue;
      padOn = true;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > .18) steer += ax;
      if (ay < -.2) acc = Math.max(acc, -ay);
      if (ay > .2) brake = Math.max(brake, ay);
      const b = p.buttons;
      if (b[0] && b[0].pressed) IN.jumpBuf = Math.max(IN.jumpBuf, .05);
      if (b[1] && b[1].pressed) IN.trickBuf = .2;
      if (b[2] && b[2].pressed) IN.trickBuf2 = .2;
      if (b[7] && b[7].pressed) brake = Math.max(brake, .7);
      if (b[6] && b[6].pressed) acc = 1;
      if (b[5] && b[5].pressed) { if (!IN.padBoostPrev) ID.camCycle && ID.camCycle(); IN.padBoostPrev = true; } else IN.padBoostPrev = false;
      if (b[4] && b[4].pressed) IN.trickBuf2 = .2;
      break;
    }
    IN.pad.on = padOn;
    /* touch override */
    if (Math.abs(IN.touch.steer) > .05) steer = IN.touch.steer, IN.lastInput = 'touch';
    if (IN.touch.acc) acc = Math.max(acc, 1);
    if (IN.touch.brake) brake = Math.max(brake, .6);
    if (IN.touch.jump) IN.jumpBuf = Math.max(IN.jumpBuf, .05);
    const clamp1 = v => v < -1 ? -1 : v > 1 ? 1 : v;
    IN.steerRaw = clamp1(steer);
    IN.steer = U.damp(IN.steer, IN.steerRaw, 22, dt);
    IN.acc = acc; IN.brake = brake;
    IN.edge = (k.edge ? 1 : 0) || (IN.touch.edge ? 1 : 0) || (IN.pad.edge ? 1 : 0);
    IN.boost = (k.boost ? 1 : 0) || IN.touch.boost || 0;
    IN.grab = (k.grab ? 1 : 0) || IN.touch.grab || 0;
    IN.jumpBuf = Math.max(0, IN.jumpBuf - dt);
    IN.trickBuf = Math.max(0, IN.trickBuf - dt);
    IN.trickBuf2 = Math.max(0, IN.trickBuf2 - dt);
    if (Math.abs(steer) > .05 || acc || brake) IN.any = true;
  };
  ID.haptics = function (ms, str) {
    if (SV.set.mute) return;
    try { navigator.vibrate && navigator.vibrate(Math.round((str || 1) * ms)); } catch (e) { }
  };

  /* ------------------------------------------------------------------
     AUDIO — fully procedural (Web Audio)
     ------------------------------------------------------------------ */
  const AU = ID.A = {
    ctx: null, master: null, gsfx: null, gmus: null, gwind: null, noise: null,
    ready: false, on: false, last: {}, musicMode: 'menu', musicT: 0, step: 0,
    envNodes: {}, gainEnv: 0,
  };
  function makeNoise(ctx, sec, type) {
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (type === 'pink') { let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .997 * b0 + w * .029; b1 = .985 * b1 + w * .055; b2 = .95 * b2 + w * .11; d[i] = (b0 + b1 + b2) * 1.2; } }
    else if (type === 'brown') { let l = 0; for (let i = 0; i < len; i++) { l = (l + (Math.random() * 2 - 1) * .08) * .995; d[i] = l * 3; } }
    else for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  AU.init = function () {
    if (AU.ctx) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      const c = AU.ctx = new C();
      AU.master = c.createGain(); AU.master.connect(c.destination);
      AU.gsfx = c.createGain(); AU.gsfx.connect(AU.master);
      AU.gmus = c.createGain(); AU.gmus.connect(AU.master);
      AU.gwind = c.createGain(); AU.gwind.gain.value = 0; AU.gwind.connect(AU.master);
      /* world wind bed */
      AU.noise = makeNoise(c, 2, 'pink');
      const wind = c.createBufferSource(); wind.buffer = AU.noise; wind.loop = true;
      const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 520; wf.Q.value = .6;
      const wg = c.createGain(); wg.gain.value = .5;
      wind.connect(wf); wf.connect(wg); wg.connect(AU.gwind); wind.start();
      AU.envNodes.windFilter = wf;
      /* music bus reverb-ish delay */
      AU.ready = true;
      AU.setVolumes();
      AU.startMusic('menu');
    } catch (e) { AU.ready = false; }
  };
  AU.resume = function () { if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => { }); AU.on = true; };
  AU.setVolumes = function () {
    if (!AU.ctx) return;
    const s = SV.set, t = AU.ctx.currentTime;
    AU.master.gain.setTargetAtTime(s.mute ? 0 : s.vol, t, .05);
    AU.gsfx.gain.setTargetAtTime(s.sfx, t, .05);
    AU.gmus.gain.setTargetAtTime(s.music, t, .05);
  };
  function seq(notes, t0, dur, type, vol, bus, detune) {
    const c = AU.ctx;
    notes.forEach((f, i) => {
      if (!f) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = f; if (detune) o.detune.value = detune * (i % 2 ? 1 : -1);
      const st = t0 + i * dur;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(vol, st + .01);
      g.gain.exponentialRampToValueAtTime(.0001, st + dur * 1.8);
      o.connect(g); g.connect(bus || AU.gsfx); o.start(st); o.stop(st + dur * 2 + .05);
    });
  }
  function noiseBurst(dur, f0, f1, vol, type, bus, Q) {
    if (!AU.ctx) return;
    const c = AU.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = AU.noise;
    if (!s.buffer) return;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = Q || .8;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || AU.gsfx);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
  }
  const SOUNDS = {
    ui() { seq([880, 1320], AU.ctx.currentTime, .05, 'triangle', .1); },
    uiBack() { seq([700, 500], AU.ctx.currentTime, .05, 'triangle', .09); },
    hover() { seq([1500], AU.ctx.currentTime, .03, 'sine', .025); },
    buy() { const t = AU.ctx.currentTime; seq([784, 988, 1319], t, .06, 'triangle', .1); },
    coin() { const t = AU.ctx.currentTime; seq([1568, 2093], t, .045, 'sine', .1); },
    gem() { const t = AU.ctx.currentTime; seq([1046, 1318, 1568, 2093], t, .055, 'triangle', .09); },
    trick() { const t = AU.ctx.currentTime; seq([523, 659, 784, 1046], t, .055, 'square', .045); },
    land() { noiseBurst(.16, 900, 180, .22, 'lowpass', AU.gsfx, .7); seq([110, 80], AU.ctx.currentTime, .04, 'sine', .18); },
    jump() { noiseBurst(.14, 1400, 500, .12, 'bandpass', AU.gsfx, 1.2); },
    crash() { noiseBurst(.4, 800, 80, .4, 'lowpass', AU.gsfx, .5); seq([70, 55], AU.ctx.currentTime, .09, 'sine', .3); },
    gate() { const t = AU.ctx.currentTime; seq([1320, 1760], t, .04, 'sine', .07); },
    perfect() { const t = AU.ctx.currentTime; seq([1568, 1976, 2637], t, .05, 'triangle', .08); },
    count() { seq([523], AU.ctx.currentTime, .08, 'triangle', .14); },
    go() { const t = AU.ctx.currentTime; seq([523, 784, 1046], t, .07, 'triangle', .16); noiseBurst(.3, 1200, 400, .08, 'bandpass', AU.gsfx, .6); },
    boost() { noiseBurst(.5, 400, 2200, .13, 'bandpass', AU.gsfx, 1.4); seq([220, 330, 440], AU.ctx.currentTime, .06, 'sawtooth', .05); },
    win() { const t = AU.ctx.currentTime; seq([523, 659, 784, 1046, 1318, 1046, 1318, 1568], t, .13, 'triangle', .12); },
    lose() { const t = AU.ctx.currentTime; seq([440, 392, 330, 262], t, .16, 'triangle', .1); },
    medal() { const t = AU.ctx.currentTime; [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => seq([f], t + i * .06, .1, 'sine', .1)); },
    warn() { const t = AU.ctx.currentTime; seq([330, 330], t, .08, 'square', .06); },
    error() { seq([180, 140], AU.ctx.currentTime, .09, 'sawtooth', .06); },
    splash() { noiseBurst(.25, 1600, 300, .15, 'bandpass', AU.gsfx, .5); },
    speed() { noiseBurst(.35, 300, 1800, .1, 'bandpass', AU.gsfx, .9); },
  };
  AU.sfx = function (name, vel) {
    if (!AU.ready || !AU.on || SV.set.mute) return;
    if (AU.ctx.state !== 'running') return;
    const now = AU.ctx.currentTime;
    if (AU.last[name] && now - AU.last[name] < .035) return;
    AU.last[name] = now;
    const fn = SOUNDS[name]; if (fn) { try { fn(); } catch (e) { } }
  };

  /* --- adaptive music: winter pads + arpeggio, tempo follows intensity --- */
  const SCALE = [0, 2, 3, 5, 7, 9, 10];           // natural minor
  const ROOT = 174.61;                            // F3
  const CHORDS = [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]]; // Fm, C#… moody
  AU.mus = { next: 0, step: 0, bpm: 84, intensity: 0, mode: 'menu' };
  AU.startMusic = function (mode) {
    if (AU.mus.mode === mode && AU.ctx) return;
    AU.mus.mode = mode; AU.mus.bpm = mode === 'race' ? 112 : 78; AU.mus.step = 0; AU.mus.next = 0;
  };
  AU.setIntensity = function (v) { AU.mus.intensity = U.clamp(v, 0, 1); AU.mus.bpm = (AU.mus.mode === 'race' ? 104 : 74) + AU.mus.intensity * 22; };
  function midi(n) { return ROOT * Math.pow(2, n / 12); }
  AU.musTick = function () {
    if (!AU.ready || !AU.on || !AU.ctx || AU.ctx.state !== 'running' || SV.set.mute) return;
    const c = AU.ctx, m = AU.mus;
    if (m.next < c.currentTime) m.next = c.currentTime + .06;
    const spb = 60 / m.bpm;
    while (m.next < c.currentTime + .35) {
      const s = m.step, bar = Math.floor(s / 8) % 4, k = s % 8;
      const ch = CHORDS[bar];
      const race = m.mode === 'race';
      /* pad chord every bar */
      if (k === 0) {
        ch.forEach((n, i) => {
          const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
          o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = midi(n - 12);
          f.type = 'lowpass'; f.frequency.value = 900;
          g.gain.setValueAtTime(0, m.next);
          g.gain.linearRampToValueAtTime(.055, m.next + spb * .8);
          g.gain.exponentialRampToValueAtTime(.0001, m.next + spb * 7.4);
          o.connect(f); f.connect(g); g.connect(AU.gmus); o.start(m.next); o.stop(m.next + spb * 8);
        });
      }
      /* arpeggio */
      if (race || k % 2 === 0) {
        const pat = [0, 2, 1, 3, 2, 1, 0, 2];
        const n = ch[pat[k] % ch.length] + (k > 3 ? 12 : 0);
        const o = c.createOscillator(), g = c.createGain();
        o.type = race ? 'square' : 'sine'; o.frequency.value = midi(n + 12);
        g.gain.setValueAtTime(0, m.next);
        g.gain.linearRampToValueAtTime(race ? .022 + m.intensity * .02 : .03, m.next + .01);
        g.gain.exponentialRampToValueAtTime(.0001, m.next + spb * 1.4);
        o.connect(g); g.connect(AU.gmus); o.start(m.next); o.stop(m.next + spb * 1.6);
      }
      /* percussion in race */
      if (race && (k === 0 || k === 3 || (k === 6 && bar % 2))) {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(120, m.next); o.frequency.exponentialRampToValueAtTime(45, m.next + .12);
        g.gain.setValueAtTime(.16 + m.intensity * .08, m.next);
        g.gain.exponentialRampToValueAtTime(.0001, m.next + .16);
        o.connect(g); g.connect(AU.gmus); o.start(m.next); o.stop(m.next + .2);
      }
      if (race && k % 2 === 1) {
        const s2 = c.createBufferSource(); s2.buffer = AU.noise;
        if (s2.buffer) {
          const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
          const g = c.createGain(); g.gain.setValueAtTime(.035, m.next);
          g.gain.exponentialRampToValueAtTime(.0001, m.next + .05);
          s2.connect(f); f.connect(g); g.connect(AU.gmus); s2.start(m.next, Math.random()); s2.stop(m.next + .06);
        }
      }
      m.step++; m.next += spb / 2;
    }
  };
  /* continuous ski/wind sound driven by physics */
  AU.env = function (speed, carve, air, snowContact) {
    if (!AU.ready || !AU.ctx) return;
    const t = AU.ctx.currentTime, e = AU.envNodes;
    const sp = U.clamp(speed / 34, 0, 1.4);
    const wind = U.clamp(.04 + sp * .5 + (air ? .25 : 0), 0, 1);
    AU.gwind.gain.setTargetAtTime(wind * .5, t, .08);
    if (e.windFilter) e.windFilter.frequency.setTargetAtTime(380 + sp * 1500, t, .1);
    if (!e.carve) {
      const c = AU.ctx;
      const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .9; f.frequency.value = 1800;
      const g = c.createGain(); g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(AU.gsfx); s.start();
      e.carve = { src: s, filt: f, gain: g };
    }
    const cg = snowContact ? U.clamp(Math.abs(carve) * .16 + sp * .06, 0, .3) : 0;
    e.carve.gain.gain.setTargetAtTime(cg, t, .05);
    e.carve.filt.frequency.setTargetAtTime(1200 + Math.abs(carve) * 2600 + sp * 700, t, .06);
  };
  AU.toggleMute = function () { SV.set.mute = !SV.set.mute; AU.setVolumes(); ID.save(); return SV.set.mute; };

  /* ------------------------------------------------------------------
     SMALL HELPERS FOR UI
     ------------------------------------------------------------------ */
  ID.toast = function (msg, cls, icon) {
    const host = document.getElementById('toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.innerHTML = (icon ? '<span class="ti">' + icon + '</span>' : '') + '<span>' + msg + '</span>';
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2600);
  };
  ID.flyCoins = function (n, fromEl) {
    const host = document.getElementById('flyers'); if (!host) return;
    const r = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    for (let i = 0; i < Math.min(n, 12); i++) {
      const el = document.createElement('div'); el.className = 'flyer';
      el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.top + r.height / 2) + 'px';
      el.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
      el.style.setProperty('--dy', (-40 - Math.random() * 80) + 'px');
      el.style.animationDelay = (i * 35) + 'ms';
      host.appendChild(el); setTimeout(() => el.remove(), 1400 + i * 35);
    }
  };
})(window.ID);
