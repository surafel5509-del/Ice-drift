/**
 * ICE DRIFT — headless integration test
 * Loads index.html in jsdom, stubs WebGL2/WebGL1, waits for boot,
 * then drives the game and reports state + errors.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('/tmp/harness/node_modules/jsdom');

const ROOT = process.argv[2] || '/home/user/Ice-drift/ice-drift';
const STEPS = +(process.argv[3] || 400);
const VERBOSE = process.argv.includes('--verbose');

const { makeGL, make2D } = require('./gl-stub.js');

const vc = new VirtualConsole();
const logs = [];
vc.on('jsdomError', (e) => { logs.push(['jsdomError', e.message, e.stack && e.stack.split('\n').slice(0, 6).join('\n')]); });
['error', 'warn', 'log', 'info'].forEach(k => vc.on(k, (...a) => {
  const msg = a.map(x => x && x.stack ? x.stack.split('\n').slice(0, 8).join('\n') : String(x)).join(' ');
  logs.push([k, msg]);
}));

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: 'http://localhost/',
});
const { window } = dom;
const doc = window.document;

/* canvas 2d + webgl */
const origGetContext = window.HTMLCanvasElement.prototype.getContext;
window.HTMLCanvasElement.prototype.getContext = function (type, attrs) {
  if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') {
    if (!this.__gl) this.__gl = makeGL(this);
    return this.__gl;
  }
  if (type === '2d') { if (!this.__2d) this.__2d = make2D(this); return this.__2d; }
  return origGetContext.call(this, type, attrs);
};
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
window.performance.now = () => Date.now() - T0;
let T0 = Date.now();

/* rAF driver: queue callbacks, we control ticking */
let rafQ = [];
window.requestAnimationFrame = (cb) => { rafQ.push(cb); return rafQ.length; };
window.cancelAnimationFrame = () => { };
window.devicePixelRatio = 2;
Object.defineProperty(window, 'innerWidth', { value: 1600, writable: true });
Object.defineProperty(window, 'innerHeight', { value: 900, writable: true });
window.navigator.vibrate = () => true;

/* AudioContext stub (minimal) */
function acStub() {
  const param = () => ({ value: 0, setValueAtTime() { }, linearRampToValueAtTime() { }, exponentialRampToValueAtTime() { }, setTargetAtTime() { }, cancelScheduledValues() { } });
  const node = (extra) => Object.assign({ connect() { }, disconnect() { }, start() { }, stop() { } }, extra);
  const ctx = {
    currentTime: 0, sampleRate: 44100, state: 'running', destination: node({}),
    createGain: () => node({ gain: param() }),
    createOscillator: () => node({ type: 'sine', frequency: param(), detune: param(), start() { }, stop() { } }),
    createBufferSource: () => node({ buffer: null, loop: false }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(), Q: param(), gain: param() }),
    createBuffer: (ch, len, rate) => ({ getChannelData: () => new Float32Array(len), length: len, duration: len / rate }),
    createDelay: () => node({ delayTime: param() }),
    createConvolver: () => node({}),
    createStereoPanner: () => node({ pan: param() }),
    createDynamicsCompressor: () => node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createWaveShaper: () => node({ curve: null }),
    resume: () => Promise.resolve(),
    suspend: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  return ctx;
}
window.AudioContext = function () { return acStub(); };
window.webkitAudioContext = window.AudioContext;

/* load scripts synchronously in order */
const scripts = Array.from(doc.querySelectorAll('script[src]')).map(s => s.getAttribute('src'));
const base = ROOT;
for (const src of scripts) {
  const file = path.join(base, src);
  if (!fs.existsSync(file)) { logs.push(['error', 'MISSING SCRIPT ' + src]); continue; }
  const code = fs.readFileSync(file, 'utf8');
  try {
    window.eval(code);
  } catch (e) {
    logs.push(['error', 'SCRIPT ERROR in ' + src + ': ' + (e && e.stack || e)]);
  }
}

const ID = window.ID;

/* helpers */
function tick(n, dt) {
  for (let i = 0; i < n; i++) {
    const q = rafQ; rafQ = [];
    T0 += (dt || 16.7);
    for (const cb of q) {
      try { cb(T0); } catch (e) { logs.push(['error', 'RAF: ' + (e && e.stack || e)]); }
    }
  }
}

(async () => {
  if (!ID) { console.log('NO ID GLOBAL'); dump(); return; }
  console.log('scripts loaded. ID present');
  /* wait for async model parse chain (setTimeout used inside loader) */
  for (let i = 0; i < 400; i++) {
    await new Promise(r => setTimeout(r, 10));
    tick(1, 16.7);
    if (ID.E && ID.E.ready) break;
  }
  await new Promise(r => setTimeout(r, 400));
  tick(20, 16.7);
  report();
  report();
  if (process.env.SHOT) { require('./shots.js'); return; }
  /* start a race */
  console.log('\n--- starting race ---');
  try { ID.Game.start({ mode: 'race', loc: 'valley', diff: 1 }); } catch (e) { logs.push(['error', 'START: ' + e.stack]); }
  ID.IN.touch.acc = 1;
  /* countdown 3.2s -> ~200 frames */
  tick(210, 16.7);
  for (let i = 0; i < STEPS; i++) {
    ID.IN.touch.acc = 1;
    ID.IN.touch.steer = Math.sin(i * .03) * .6;
    tick(1, 16.7);
    if (i % 60 === 0) {
      const p = ID.Game.player;
      if (p) console.log('  t=' + (i / 60).toFixed(1) + 's state=' + ID.G.state + ' s=' + p.s.toFixed(1) + ' speed=' + (p.speed * 3.6).toFixed(0) + 'km/h y=' + p.pos.y.toFixed(2) + ' air=' + p.air + ' gates=' + p.gates + ' score=' + Math.round(p.score) + ' chunks=' + ID.World.chunks.size);
    }
  }
  const st = ID.G.state;
  if (st === 'race' || st === 'countdown') { console.log('  forcing finish'); try { ID.Game.finish('test'); tick(10, 16.7); } catch (e) { logs.push(['error', 'FINISH: ' + e.stack]); } }
  report();
  /* other screens */
  console.log('\n--- screens ---');
  for (const s of ['renderModes', 'renderMountains', 'renderGarage', 'renderCareer', 'renderSettings', 'renderHelp']) {
    try { ID.UI[s](); tick(3, 16.7); console.log('  ' + s + ' ok, screen=' + ID.UI.screen); } catch (e) { logs.push(['error', s + ': ' + e.stack]); }
  }
  console.log('\n--- modes ---');
  for (const m of ['slalom', 'time', 'freestyle', 'endless', 'survival']) {
    try {
      ID.Game.start({ mode: m, loc: 'frostwood', diff: 2 });
      ID.IN.touch.acc = 1;
      tick(50, 16.7);
      console.log('  ' + m + ' ok s=' + (ID.Game.player ? ID.Game.player.s.toFixed(0) : '?') + ' state=' + ID.G.state);
    } catch (e) { logs.push(['error', 'MODE ' + m + ': ' + e.stack]); }
  }
  console.log('\n--- all mountains ---');
  for (const l of ID.World.LOCS) {
    try {
      ID.Game.start({ mode: 'race', loc: l.id, diff: l.diff });
      ID.IN.touch.acc = 1;
      tick(40, 16.7);
      console.log('  ' + l.id.padEnd(10) + ' chunks=' + ID.World.chunks.size + ' props=' + ID.World.props.length + ' landmarks=' + ID.World.landmarks.length + ' tris=' + ID.E.renderer.info.render.triangles);
    } catch (e) { logs.push(['error', 'LOC ' + l.id + ': ' + e.stack]); }
  }
  report();
  console.log('\n=== LOG SUMMARY ===');
  const seen = new Set();
  for (const [k, m] of logs) {
    if (k === 'log' || k === 'info') continue;
    const key = m.slice(0, 160);
    if (seen.has(key)) continue; seen.add(key);
    console.log('[' + k + '] ' + m.slice(0, 900));
  }
  console.log('log entries:', logs.length);
  process.exit(0);
})();

function report() {
  if (!ID) return;
  console.log('\n=== STATE ===');
  console.log('models loaded:', ID.Models ? Object.keys(ID.Models.proto).length : 0, 'errors:', ID.Models ? ID.Models.errors.length : '?', ID.Models && ID.Models.errors.slice(0, 5));
  console.log('models ms:', ID.Models && ID.Models.ms, 'bytes:', ID.Models && ID.Models.bytes);
  console.log('world chunks:', ID.World.chunks.size, 'props:', ID.World.props.length, 'landmarks:', ID.World.landmarks.length, 'skyIslands:', ID.World.skyIslands.length, 'peaks:', ID.World.peaks.length);
  if (ID.E && ID.E.renderer) console.log('render info:', JSON.stringify(ID.E.renderer.info.render), 'memory:', JSON.stringify(ID.E.renderer.info.memory), 'programs:', ID.E.renderer.info.programs ? ID.E.renderer.info.programs.length : '?');
  console.log('state:', ID.G.state, 'quality:', ID.G.quality, 'composer:', !!(ID.FX && ID.FX.composer));
  if (ID.FX) {
    const ps = ID.FX.particles || {};
    console.log('particles:', Object.keys(ps).map(k=>k+':'+ps[k].cap).join(' '), 'snowLayers:', (ID.FX.snowLayers||[]).length);
    console.log('dirty/attrs:', ps.spray ? Object.keys(ps.spray.geo.attributes).join(',') : '-');
    console.log('tweenCount:', ID.FX.tweens.length, 'trails:', ID.FX.trailGroup && ID.FX.trailGroup.visible);
  }
  console.log('gates:', ID.Game.course ? ID.Game.course.gates.length : 0, 'live gate meshes:', ID.Game.course ? ID.Game.course.gates.filter(g=>g.mesh).length : 0, 'coins:', ID.Game.course ? ID.Game.course.coins.length : 0);
  console.log('player:', ID.Game.player ? JSON.stringify({s:+ID.Game.player.s.toFixed(1), u:+ID.Game.player.u.toFixed(1), spd:+(ID.Game.player.speed*3.6).toFixed(0), gates:ID.Game.player.gates, score:Math.round(ID.Game.player.score), rank:ID.Game.player.rank, air:ID.Game.player.air}) : 'none');
  console.log('ai:', ID.Game.ai.map(a=>a.name.split(' ')[0]+':'+Math.round(a.s)).join(' '));
}
