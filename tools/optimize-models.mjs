/**
 * Ice Drift — GLB optimizer / bundler
 * --------------------------------------------------------------
 * Reads every .glb model used by the game, then:
 *   1. drops unused vertex attributes (TEXCOORD_n, TANGENT, ...)
 *   2. welds duplicated vertices (Blender exports non-indexed meshes)
 *   3. builds compact index buffers (uint16 when possible)
 *   4. rebuilds a minimal glTF 2.0 JSON + binary chunk per model
 *   5. packs all models into a single deflate-compressed ZIP
 *
 * Output: ice-drift/assets/models.zip   (plus report on stdout)
 * The runtime (js/models.js) unpacks this archive with fflate and
 * feeds each GLB to THREE.GLTFLoader.parse() — no network needed.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'ice-drift', 'assets', 'models.zip');
const KIT = fs.existsSync('/tmp/kit/ski-resort') ? '/tmp/kit/ski-resort' : null;

/* ------------------------------------------------------------------ */
/* which models ship with the game                                     */
/* ------------------------------------------------------------------ */
const CORE = [
  'bench', 'chairlift_chair', 'chalet', 'fire_pit', 'gondola_cabin', 'hot_cocoa_stand',
  'icicle_rock', 'lift_pylon', 'lift_station', 'lodge', 'rental_hut', 'ski_boots',
  'ski_helmet', 'ski_jump_ramp', 'ski_pair', 'ski_poles', 'ski_rack', 'skier_figure',
  'slalom_gate', 'sled', 'snow_boulder', 'snow_fence', 'snow_mound', 'snowboard',
  'snowman', 'snowmobile', 'snowy_pine', 'snowy_pine_small', 'ticket_booth',
  'tow_rope_handle', 'trail_sign',
];
const ISLANDS = [
  'frost-sky-island', 'frost-cabin-island', 'frozen-lake-sky-island',
  'frost-crystal-island', 'frost-islet-set',
];
const KITFILES = [
  'timber-ski-lodge', 'alpine-ski-chalet', 'wooden-ski-jump', 'ski-resort-snow-groomer',
  'sporty-snowmobile', 'low-poly-skier', 'ski-rental-shop', 'ice-hockey-set',
  'lift-ticket-booth', 'ski-resort-terrace', 'ski-gondola-station', 'banked-bobsled-run',
  'ski-resort-chairlift', 'mountain-rescue-hut', 'snow-tubing-lane', 'piste-marker-set',
  'ski-lodge-lounge', 'curling-rink-set', 'ski-race-start-gate', 'ski-resort-hot-tub-deck',
  'snow-cannon-set', 'snowboard-park-set', 'ski-resort-snow-fences', 'low-poly-snowboarder',
  'slalom-gates-set',
];

/* ------------------------------------------------------------------ */
/* glb io                                                              */
/* ------------------------------------------------------------------ */
function readGLB(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546C67) throw new Error('not glb: ' + file);
  const len = b.readUInt32LE(8);
  let off = 12, json = null, bin = null;
  while (off < len) {
    const cl = b.readUInt32LE(off), ct = b.readUInt32LE(off + 4);
    const data = b.subarray(off + 8, off + 8 + cl);
    if (ct === 0x4E4F534A) json = JSON.parse(data.toString('utf8'));
    else if (ct === 0x004E4942) bin = data;
    off += 8 + cl + ((4 - (cl % 4)) % 4);
  }
  return { json, bin };
}

function writeGLB(json, bin) {
  const js = Buffer.from(JSON.stringify(json), 'utf8');
  const jsPad = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const binPad = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4, 0)]);
  const total = 12 + 8 + jsPad.length + (binPad.length ? 8 + binPad.length : 0);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsPad.length, 12); out.writeUInt32LE(0x4E4F534A, 16);
  jsPad.copy(out, 20);
  if (binPad.length) {
    const o = 20 + jsPad.length;
    out.writeUInt32LE(binPad.length, o); out.writeUInt32LE(0x004E4942, o + 4);
    binPad.copy(out, o + 8);
  }
  return out;
}

const CT = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readAccessor(j, bin, idx) {
  const a = j.accessors[idx];
  const [Arr, sz] = CT[a.componentType];
  const nc = NC[a.type];
  const bv = j.bufferViews[a.bufferView];
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const stride = bv.byteStride || sz * nc;
  const out = new Arr(a.count * nc);
  if (stride === sz * nc) {
    const src = new Arr(bin.buffer, bin.byteOffset + base, a.count * nc);
    out.set(src);
  } else {
    for (let i = 0; i < a.count; i++) {
      const view = new Arr(bin.buffer, bin.byteOffset + base + i * stride, nc);
      out.set(view, i * nc);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* optimize one model                                                  */
/* ------------------------------------------------------------------ */
function optimize(name, srcFile) {
  const { json: J, bin } = readGLB(srcFile);
  const KEEP = ['POSITION', 'COLOR_0'];
  const newAccessors = [];
  const newViews = [];
  const chunks = [];
  let cursor = 0;

  function pushBytes(bytes) {
    const pad = (4 - (cursor % 4)) % 4;
    if (pad) { chunks.push(Buffer.alloc(pad)); cursor += pad; }
    const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const byteOffset = cursor;
    chunks.push(buf); cursor += buf.length;
    return { byteOffset, byteLength: buf.length };
  }
  function addView(buf) {
    const v = pushBytes(buf);
    newViews.push({ buffer: 0, byteOffset: v.byteOffset, byteLength: v.byteLength });
    return newViews.length - 1;
  }
  function addAccessor(arr, type, componentType, target, minmax) {
    const view = addView(arr);
    const acc = { bufferView: view, componentType, count: arr.length / NC[type], type };
    if (minmax) { acc.min = minmax.min; acc.max = minmax.max; }
    if (target) newViews[view].target = target;
    newAccessors.push(acc);
    return newAccessors.length - 1;
  }

  /* ---- dedupe identical primitives across the file (snow caps etc.) ---- */
  const primCache = new Map();
  const meshes = J.meshes.map((m) => {
    const prims = [];
    for (const p of m.primitives) {
      const attrs = {};
      const keep = Object.keys(p.attributes).filter((k) => KEEP.includes(k));
      // read source data
      const raw = {};
      for (const k of keep) raw[k] = readAccessor(J, bin, p.attributes[k]);
      const idx = p.indices !== undefined ? readAccessor(J, bin, p.indices) : null;
      const vCount = raw.POSITION.length / 3;
      const order = idx ? Array.from(idx) : Array.from({ length: vCount }, (_, i) => i);

      // weld: key = pos + normal + color
      const keyOf = (i) => {
        const k3 = i * 3;
        let s = '';
        for (let c = 0; c < 3; c++) s += Math.round(raw.POSITION[k3 + c] * 2048) + ',';
        if (raw.NORMAL) for (let c = 0; c < 3; c++) s += Math.round(raw.NORMAL[k3 + c] * 512) + ',';
        if (raw.COLOR_0) { const n = raw.COLOR_0.length / vCount; for (let c = 0; c < n; c++) s += Math.round(raw.COLOR_0[i * n + c] * 255) + ','; }
        return s;
      };
      const map = new Map(); // key -> newIndex
      const remap = new Int32Array(vCount).fill(-1);
      const outIdx = [];
      for (const i of order) {
        let k = remap[i];
        if (k < 0) {
          const key = keyOf(i);
          k = map.get(key);
          if (k === undefined) { k = map.size; map.set(key, k); }
          remap[i] = k;
        }
        outIdx.push(k);
      }
      const nv = map.size;
      const P = new Float32Array(nv * 3);
      const N = raw.NORMAL ? new Float32Array(nv * 3) : null;
      const C = raw.COLOR_0 ? new Float32Array(nv * (raw.COLOR_0.length / vCount)) : null;
      const MIN = [1e9, 1e9, 1e9], MAX = [-1e9, -1e9, -1e9];
      let w = 0;
      for (const i of order) {
        const k = remap[i];
        if (k >= w) { /* first time this slot is reached */ }
      }
      // second pass: write unique vertices in slot order
      const firstOf = new Int32Array(nv).fill(-1);
      for (const i of order) { const k = remap[i]; if (firstOf[k] < 0) firstOf[k] = i; }
      for (let k = 0; k < nv; k++) {
        const i = firstOf[k];
        for (let c = 0; c < 3; c++) P[k * 3 + c] = raw.POSITION[i * 3 + c];
        if (N) for (let c = 0; c < 3; c++) N[k * 3 + c] = raw.NORMAL[i * 3 + c];
        if (C) { const n = C.length / nv; for (let c = 0; c < n; c++) C[k * n + c] = raw.COLOR_0[i * n + c]; }
      }
      for (let k = 0; k < nv; k++) for (let c = 0; c < 3; c++) { MIN[c] = Math.min(MIN[c], P[k * 3 + c]); MAX[c] = Math.max(MAX[c], P[k * 3 + c]); }
      attrs.POSITION = addAccessor(P, 'VEC3', 5126, 34962, { min: MIN, max: MAX });
      
      if (C) attrs.COLOR_0 = addAccessor(C, C.length / nv === 4 ? 'VEC4' : 'VEC3', 5126, 34962);

      const useShort = nv <= 65535;
      const I = useShort ? new Uint16Array(outIdx) : new Uint32Array(outIdx);
      const indexAcc = addAccessor(I, 'SCALAR', useShort ? 5123 : 5125, 34963);

      const prim = { attributes: attrs, indices: indexAcc };
      // material (strip texture refs — the kit is untextured flat colour)
      if (p.material !== undefined) {
        const m = J.materials[p.material];
        const key = JSON.stringify(m);
        let mi = primCache.get(key);
        if (mi === undefined) { mi = primCache.size; primCache.set(key, mi); }
        prim.material = mi;
      }
      if (p.mode !== undefined) prim.mode = p.mode;
      prims.push(prim);
    }
    return { name: m.name, primitives: prims };
  });

  // rebuild material list in first-seen order
  const matList = [];
  for (const [key] of primCache) matList.push(JSON.parse(key));

  const out = {
    asset: { version: '2.0', generator: 'Ice Drift model packer' },
    scene: 0,
    scenes: [{ nodes: J.scenes?.[0]?.nodes ?? J.nodes.map((_, i) => i) }],
    nodes: J.nodes.map((n) => {
      const o = {};
      for (const k of ['name', 'translation', 'rotation', 'scale', 'mesh', 'children']) {
        if (n[k] !== undefined) o[k] = n[k];
      }
      if (n.matrix) o.matrix = n.matrix;
      return o;
    }),
    meshes,
    materials: matList,
    accessors: newAccessors,
    bufferViews: newViews,
    buffers: [{ byteLength: cursor }],
  };
  const packed = Buffer.concat(chunks);
  out.buffers[0].byteLength = packed.length;
  const glb = writeGLB(out, packed);
  return glb;
}

/* ------------------------------------------------------------------ */
/* zip writer (deflate)                                                */
/* ------------------------------------------------------------------ */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(entries) {
  const local = [], central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    local.push(lh, nameBuf, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, nameBuf);
    offset += lh.length + nameBuf.length + comp.length;
  }
  const cdStart = offset;
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(cdStart, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...local, cd, end]);
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */
const entries = [];
const report = [];
let rawBytes = 0, optBytes = 0;

function add(name, file) {
  if (!fs.existsSync(file)) { report.push('  MISSING ' + name); return; }
  const before = fs.statSync(file).size;
  rawBytes += before;
  const glb = optimize(name, file);
  optBytes += glb.length;
  entries.push({ name: name + '.glb', data: glb });
  report.push(`  ${name.padEnd(26)} ${(before / 1024).toFixed(0).padStart(6)} KB -> ${(glb.length / 1024).toFixed(0).padStart(6)} KB   (${(glb.length / before * 100).toFixed(0)}%)`);
}

for (const n of CORE) add(n, path.join(ROOT, n + '.glb'));
for (const n of ISLANDS) add(n, path.join(ROOT, n + '.glb'));
for (const n of KITFILES) add(n, KIT ? path.join(KIT, n + '.glb') : '');
// license / readme inside the archive
entries.push({ name: 'LICENSE.txt', data: fs.readFileSync(path.join(ROOT, 'LICENSE.txt')) });
entries.push({ name: 'README.txt', data: fs.readFileSync(path.join(ROOT, 'README.txt')) });

const zip = makeZip(entries);
fs.writeFileSync(OUT, zip);

console.log(report.join('\n'));
console.log(`\n  ${entries.length - 2} models`);
console.log(`  source ${(rawBytes / 1048576).toFixed(2)} MB -> optimized ${(optBytes / 1048576).toFixed(2)} MB (${(optBytes / rawBytes * 100).toFixed(0)}%)`);
console.log(`  packed archive: ${(zip.length / 1048576).toFixed(2)} MB -> ${path.relative(ROOT, OUT)}`);
