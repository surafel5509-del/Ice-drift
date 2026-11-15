/* =====================================================================
   ICE DRIFT  ·  world.js
   Endless procedural mountains · 7 themed resorts · GLB landmarks ·
   instanced props · floating sky islands
   ===================================================================== */
'use strict';
(function (ID) {
  const U = ID.U, FX = ID.FX;
  const W = ID.World = {
    scene: null, loc: null, chunks: new Map(), chunkLen: 60,
    props: [], batches: {}, landmarks: [], hubs: [], skyIslands: [],
    seed: 1, sMin: 0, sMax: 0, iceGlow: [], fires: [], lastCamS: 0,
    peaks: [],
  };

  /* ==================================================================
     LOCATIONS
     ================================================================== */
  const LOCS = W.LOCS = [
    {
      id: 'valley', name: 'Summit Valley', tag: 'Sunlit pistes, timber lodges and wide open cruisers',
      theme: 'day', diff: 1, lvl: 1, cost: 0, seed: 11, bg: 'valley',
      width: 30, slope: .235, curve: 1.0, rough: .7, tree: .75, rock: .3, ice: .06,
      wind: [.1, 0], snow: 1, pal: { snow: 0xf5f9ff, rock: 0x6e6a66, pine: 0x1e4a33, ice: 0xbfe9ff },
      hub: 'village', features: ['lodge', 'chairlift', 'cocoa', 'bench', 'snowman', 'crystal'],
      music: 'bright',
    },
    {
      id: 'frostwood', name: 'Frostwood Forest', tag: 'Dense frosted pines, log cabins and tight tree lines',
      theme: 'dawn', diff: 2, lvl: 3, cost: 1200, seed: 23, bg: 'valley',
      width: 20, slope: .255, curve: 1.35, rough: .8, tree: 2.1, rock: .35, ice: .1,
      wind: [.15, 0], snow: 1.15, pal: { snow: 0xe9f2ff, rock: 0x53585c, pine: 0x14352a, ice: 0xa9dcff },
      hub: 'cabin', features: ['chalet', 'firepit', 'cocoa', 'rack', 'sled'],
      music: 'calm',
    },
    {
      id: 'glacier', name: 'Glacier Point', tag: 'Blue ice shelves, snowpark features and huge airs',
      theme: 'day', diff: 3, lvl: 5, cost: 2500, seed: 37, bg: 'peaks',
      width: 34, slope: .28, curve: 1.05, rough: 1.05, tree: .08, rock: .5, ice: .34,
      wind: [-.2, .1], snow: .95, pal: { snow: 0xe4f6ff, rock: 0x7fb8d6, pine: 0x1e4a33, ice: 0x9fe8ff },
      hub: 'park', features: ['park', 'gondola', 'crystal', 'boulder'],
      music: 'bright',
    },
    {
      id: 'serac', name: 'Serac Falls', tag: 'Crystal seracs, frozen falls and knife-edge ridges',
      theme: 'dusk', diff: 4, lvl: 7, cost: 4000, seed: 41, bg: 'peaks',
      width: 24, slope: .3, curve: 1.3, rough: 1.25, tree: .3, rock: .9, ice: .28,
      wind: [.4, .2], snow: 1, pal: { snow: 0xeef4ff, rock: 0x5c5560, pine: 0x1f3a2e, ice: 0xb8ecff },
      hub: 'crystal', features: ['crystal', 'icicle', 'gondola', 'boulder'],
      music: 'mystic',
    },
    {
      id: 'aurora', name: 'Aurora Ridge', tag: 'Night skiing beneath shimmering northern lights',
      theme: 'aurora', diff: 5, lvl: 9, cost: 6000, seed: 53, bg: 'aurora',
      width: 28, slope: .27, curve: 1.15, rough: .9, tree: 1.0, rock: .45, ice: .14,
      wind: [.2, -.1], snow: 1, pal: { snow: 0xdce8ff, rock: 0x3c4250, pine: 0x123029, ice: 0xa8dcff },
      hub: 'cabin', features: ['chalet', 'firepit', 'chairlift', 'lantern'],
      music: 'aurora',
    },
    {
      id: 'tempest', name: 'Tempest Peak', tag: 'Whiteout winds and the most savage ridgeline',
      theme: 'storm', diff: 6, lvl: 12, cost: 8000, seed: 67, bg: 'storm',
      width: 26, slope: .33, curve: 1.5, rough: 1.2, tree: .55, rock: .8, ice: .22,
      wind: [1.2, .3], snow: 2.6, pal: { snow: 0xeff4fa, rock: 0x464e58, pine: 0x1a352a, ice: 0xc8e8ff },
      hub: 'rescue', features: ['rescue', 'sign', 'fence', 'boulder'],
      music: 'storm',
    },
    {
      id: 'midnight', name: 'Midnight Pass', tag: 'Moonlit extreme lines for the fearless',
      theme: 'midnight', diff: 7, lvl: 15, cost: 11000, seed: 79, bg: 'aurora',
      width: 22, slope: .36, curve: 1.6, rough: 1.45, tree: .8, rock: 1.1, ice: .3,
      wind: [.3, .2], snow: 1, pal: { snow: 0xd8e2f8, rock: 0x2e3440, pine: 0x0f2620, ice: 0x9ad8ff },
      hub: 'crystal', features: ['crystal', 'rescue', 'sign', 'boulder'],
      music: 'mystic',
    },
  ];
  W.LOCBY = {}; LOCS.forEach(l => W.LOCBY[l.id] = l);

  /* ==================================================================
     TERRAIN — analytic height field
     ================================================================== */
  let cfg = null;          // active location runtime config
  const S = { W: 30, slope: .24, c1: 24, f1: .0042, p1: 0, c2: 9, f2: .0125, p2: 0, b1: 12, bf: .0095, b2: 4, b2f: .028, rough: .8, seed: 1, ice: .1, tree: 1, hub: 'village' };

  function rnd1(i, k) { return U.noise2(i * .37 + S.seed * 3.1, k * .91 + S.seed); }
  W.reset = function (locId, runCfg) {
    const L = W.LOCBY[locId] || LOCS[0];
    W.loc = L;
    const r = U.rng(L.seed * 7919 + (runCfg && runCfg.seed || 0));
    S.W = L.width; S.slope = L.slope * (runCfg && runCfg.slopeMul || 1);
    S.c1 = L.width * (.7 + r() * .5); S.f1 = .003 + r() * .0016; S.p1 = r() * 6.283;
    S.c2 = L.width * (.22 + r() * .2); S.f2 = .010 + r() * .008; S.p2 = r() * 6.283;
    S.b1 = 9 + r() * 7; S.bf = .008 + r() * .004; S.b2 = 2.5 + r() * 2.5; S.b2f = .022 + r() * .012;
    S.rough = L.rough; S.seed = L.seed + (runCfg && runCfg.seed || 0); S.ice = L.ice; S.tree = L.tree;
    S.hub = L.hub;
    S.featureMul = runCfg && runCfg.featureMul || 1;
    S.gateSpacing = runCfg && runCfg.gateSpacing || 46;
    S.rampSpacing = runCfg && runCfg.rampSpacing || 150;
  };
  W.cfg = () => S;

  /* course centre line (lateral offset as function of downhill distance) */
  W.cx = function (s) {
    if (s < 60) return 0;
    return (S.c1 * Math.sin(s * S.f1 + S.p1) + S.c2 * Math.sin(s * S.f2 + S.p2)) * U.sstep(0, 160, s);
  };
  W.cxd = function (s) { return W.cx(s + .6) - W.cx(s - .6); };
  W.halfWidth = function (s) {
    const w = S.W * (1 + .16 * Math.sin(s * .006 + S.p1) + .1 * Math.sin(s * .017 + S.p2));
    const narrow = 1 - .22 * U.sstep(1200, 3000, s);
    return Math.max(12, w * narrow);
  };

  /* hub terraces: periodic landmarks flattened into the slope side */
  W.hubSpacing = W.chunkLen * 4;
  /* hub index -> deterministic hub record (no proximity test) */
  W.hubAtK = function (k) {
    if (k < 1) return null;
    const spacing = W.hubSpacing;
    const hs = k * spacing + (rnd1(k, 3) - .5) * 80 + 60;
    const side = rnd1(k, 7) > 0 ? 1 : -1;
    return { s: hs, side, k, hx: W.cx(hs) + side * (W.halfWidth(hs) + 26), level: W.baseHeight(hs) };
  };
  W.hubAt = function (s) {
    if (s < 0) return null;
    const spacing = W.hubSpacing;
    const k = Math.round((s - 60) / spacing);
    for (const kk of [k, k - 1, k + 1]) {
      const h = W.hubAtK(kk);
      if (h && Math.abs(s - h.s) < spacing * .5) return h;
    }
    return null;
  };
  W.hubList = function (s0, s1) {
    const out = [], spacing = W.hubSpacing;
    const k0 = Math.floor((s0 - 60) / spacing) - 1, k1 = Math.ceil((s1 - 60) / spacing) + 1;
    for (let k = Math.max(1, k0); k <= k1; k++) {
      const h = W.hubAtK(k);
      if (h && h.s > s0 - 70 && h.s < s1 + 70) out.push(h);
    }
    return out;
  };
  W.baseHeight = function (s) {
    return -S.slope * s + S.b1 * Math.sin(s * S.bf) + S.b2 * Math.sin(s * S.b2f);
  };
  /* ramp / kicker shape at s */
  W.rampAt = function (s) {
    const sp = S.rampSpacing;
    if (sp < 40) return 0;
    const k = Math.floor(s / sp);
    const c = (k + .5) * sp;
    const d = s - c;
    if (Math.abs(d) > 13) return 0;
    const lip = U.sstep(-13, 9, d) * (1 - U.sstep(9, 13, d));
    return lip * (4.6 + rnd1(k, 1) * 4.2) * S.featureMul;
  };
  W.rampInfo = function (s) {
    const sp = S.rampSpacing; const k = Math.floor(s / sp);
    const c = (k + .5) * sp;
    return { k, center: c, u: (rnd1(k, 2) - .5) * W.halfWidth(c) * .8 };
  };

  /* main height field */
  const VILLAGE_R = 90;
  W.heightAt = function (x, z) {
    let s = -z;
    const u = x - W.cx(Math.max(0, s));
    let y = W.baseHeight(s);
    const hw = W.halfWidth(s);
    /* piste surface: bedded cross-slope + gentle side banks */
    const au = Math.abs(u);
    y += U.sstep(hw * .55, hw, au) * (au - hw * .55) * .07;
    /* soft rollers & drift noise */
    y += U.noise2(u * .045, s * .028) * 1.15 * S.rough;
    y += U.noise2(u * .16 + 40, s * .11) * .32 * S.rough;
    /* kicker ramps on the piste */
    const ramp = W.rampAt(s);
    if (ramp > 0) {
      const ri = W.rampInfo(s);
      const w = hw * .55;
      const taper = 1 - U.sstep(w * .55, w * 1.05, Math.abs(u - ri.u));
      y += ramp * taper;
    }
    /* valley walls -> mountains */
    if (au > hw) {
      const d = au - hw;
      const wall = Math.pow(d, 1.28) * .78;
      const n = U.fbm2(u * .012 + S.seed, s * .01, 4);
      const cliff = U.sstep(0, 26, d) * (18 + n * 34);
      y += wall * .32 + cliff * .55;
      y += U.noise2(u * .06, s * .05) * 6 * U.sstep(hw, hw + 40, au);
    }
    /* hub terraces (flat pads for buildings) */
    const hub = W.hubAt(s);
    if (hub) {
      const dx = x - hub.hx, dz = z + hub.s;
      const dist = Math.hypot(dx, dz);
      const k = 1 - U.sstep(20, 40, dist);
      if (k > 0) y = U.lerp(y, hub.level - .4, Math.min(1, k * 1.25));
    }
    /* start plateau */
    if (s < VILLAGE_R) {
      const k = 1 - U.sstep(VILLAGE_R * .55, VILLAGE_R * 1.05, s);
      y = U.lerp(y, W.baseHeight(0) + 1.2 - Math.abs(u) * .012, k);
    }
    return y;
  };
  /* normal from finite differences */
  const nrm = new THREE.Vector3();
  W.normalAt = function (x, z) {
    const e = 1.1;
    const hL = W.heightAt(x - e, z), hR = W.heightAt(x + e, z);
    const hD = W.heightAt(x, z - e), hU = W.heightAt(x, z + e);
    nrm.set(hL - hR, 2 * e, hD - hU).normalize();
    return nrm;
  };
  W.iceAt = function (x, z) {
    if (S.ice <= 0.02) return 0;
    const s = -z, u = x - W.cx(Math.max(0, s));
    if (Math.abs(u) > W.halfWidth(s)) return 0;
    const n = U.noise2(u * .05 + 11, s * .032 + 5) * .5 + .5;
    const th = 1 - S.ice * 1.6;
    return U.sstep(th, th + .1, n);
  };

  /* ==================================================================
     SCENE BUILD
     ================================================================== */
  W.init = function (scene) {
    W.scene = scene;
    W.root = new THREE.Group(); W.root.name = 'world';
    scene.add(W.root);
    W.terrainGroup = new THREE.Group(); W.terrainGroup.name = 'terrain';
    W.root.add(W.terrainGroup);
    W.propGroup = new THREE.Group(); W.propGroup.name = 'props';
    W.root.add(W.propGroup);
    W.landmarkGroup = new THREE.Group(); W.landmarkGroup.name = 'landmarks';
    W.root.add(W.landmarkGroup);
    W.skyGroup = new THREE.Group(); W.skyGroup.name = 'skyislands';
    W.root.add(W.skyGroup);
    FX.fires = W.fires;
    W.terrainMat = null; W.snowMat = null;
  };

  W.clear = function () {
    /* every terrain mesh under the group, including ones whose chunk record
       was already evicted (previously leaked on rebuild) */
    W.terrainGroup.traverse(o => { if (o.isMesh) o.geometry && o.geometry.dispose(); });
    for (const ch of W.chunks.values()) {
      for (const m of ch.meshes) { W.terrainGroup.remove(m); }
    }
    W.chunks.clear();
    /* dispose only objects we own (hub pads, lights, sprites) — model geometry is shared */
    const kill = (o) => {
      o.traverse(c => {
        if (c.isSprite) { if (c.material.map && c.material.map.isCanvasTexture) { } c.material.dispose(); }
        else if (c.isMesh && c.userData.__own) { if (!c.userData.__sharedMat) c.geometry.dispose(); if (!c.userData.__sharedMat) c.material.dispose(); }
        else if (c.isLight) { c.dispose && c.dispose(); }
      });
      o.parent && o.parent.remove(o);
    };
    while (W.landmarkGroup.children.length) kill(W.landmarkGroup.children[0]);
    while (W.root.children.length) {
      const c = W.root.children[0];
      if (c === W.terrainGroup || c === W.propGroup || c === W.landmarkGroup || c === W.skyGroup) {
        W.root.remove(c); continue;
      }
      W.root.remove(c);   // peaks, start area, and anything else rebuilt per run
    }
    W.root.add(W.terrainGroup); W.root.add(W.propGroup); W.root.add(W.landmarkGroup); W.root.add(W.skyGroup);
    for (const k in W.batches) {
      const b = W.batches[k];
      W.propGroup.remove(b.group);
      if (b.ims) for (const im of b.ims) { im.dispose && im.dispose(); }
    }
    W.batches = {};
    W.props.length = 0;
    W.landmarks.length = 0;
    W.fires.length = 0;
    while (W.skyGroup.children.length) {
      const o = W.skyGroup.children[0];
      if (o.userData.__own) { o.geometry && o.geometry.dispose(); }
      W.skyGroup.remove(o);
    }
    if (W.peakRoot) {
      W.peakRoot.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
      W.propGroup.remove(W.peakRoot);
      W.peakRoot = null;
    }
    if (W.skyIslandMat) { W.skyIslandMat.dispose(); W.skyIslandMat = null; }
    if (W.peakMat) { W.peakMat.dispose(); W.peakMat = null; }
    if (W.snowPeakMat) { W.snowPeakMat.dispose(); W.snowPeakMat = null; }
    if (W.peakGeo) { W.peakGeo.dispose(); W.peakGeo = null; }
    W.peaks = [];
    W.bridges = [];
    W.iceGlow = [];
    if (W.peakGeo) { W.peakGeo.dispose(); W.peakGeo = null; }
    if (W.peakMat) { W.peakMat.dispose(); W.peakMat = null; W.snowPeakMat && W.snowPeakMat.dispose(); }
  };

  /* ------------------------------------------------------------------
     TERRAIN MESH BUILDER
     ------------------------------------------------------------------ */
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1);
  function buildTerrainChunk(c) {
    const len = W.chunkLen;
    const s0 = c * len, s1 = s0 + len;
    const hw = Math.max(W.halfWidth(s0), W.halfWidth(s1));
    const span = hw + 170;                        // include valley walls
    const NX = 34, NZ = 20;
    const verts = [], colors = [], idx = [];
    const snowC = new THREE.Color(W.loc.pal.snow), rockC = new THREE.Color(W.loc.pal.rock), iceC = new THREE.Color(W.loc.pal.ice);
    const col = new THREE.Color();
    for (let j = 0; j <= NZ; j++) {
      const s = s0 + (j / NZ) * len;
      for (let i = 0; i <= NX; i++) {
        const t = i / NX * 2 - 1;
        const x = W.cx(Math.max(0, s)) + t * span;
        const z = -s;
        const y = W.heightAt(x, z);
        verts.push(x, y, z);
        /* colour: snow, ice patches, exposed rock on steep faces */
        const n = W.normalAt(x, z);
        const steep = 1 - n.y;
        const ice = W.iceAt(x, z);
        col.copy(snowC);
        col.lerp(iceC, ice * .75);
        const au = Math.abs(x - W.cx(Math.max(0, s)));
        const wallK = U.sstep(hw * 1.02, hw * 1.35, au);
        col.lerp(rockC, Math.min(1, steep * 2.1 + wallK * .55));
        const v = .94 + U.noise2(x * .09, z * .08) * .09;
        col.multiplyScalar(v);
        colors.push(col.r, col.g, col.b);
      }
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, cc = a + NX + 1, d = cc + 1;
      idx.push(a, cc, b, b, cc, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, W.terrainMat);
    m.receiveShadow = true; m.castShadow = false;
    m.matrixAutoUpdate = false;
    m.name = 'terrain_' + c;
    W.terrainGroup.add(m);
    return { meshes: [m] };
  }

  /* ------------------------------------------------------------------
     MATERIALS
     ------------------------------------------------------------------ */
  W.buildMaterials = function () {
    const L = W.loc;
    if (W.terrainMat) W.terrainMat.dispose();
    W.terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: .82, metalness: .02, flatShading: true,
      envMapIntensity: .45,
    });
    ID.Models.mats.snowTerrain = W.terrainMat;
    W.iceMat = new THREE.MeshStandardMaterial({ color: L.pal.ice, roughness: .1, metalness: .1, transparent: true, opacity: .82, envMapIntensity: 1.4, flatShading: true });
    W.glowMat = new THREE.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
  };

  /* ------------------------------------------------------------------
     PROPS AROUND THE COURSE
     ------------------------------------------------------------------ */
  const PROP_SETS = {
    valley: [['snowy_pine', 1], ['snowy_pine_small', 1.6], ['snow_boulder', .5], ['icicle_rock', .4], ['snow_mound', .8], ['snowman', .06], ['bench', .05], ['trail_sign', .12], ['ski_rack', .04]],
    frostwood: [['snowy_pine', 3.2], ['snowy_pine_small', 2.4], ['snow_boulder', .7], ['snow_mound', .9], ['snow_fence', .2], ['trail_sign', .14], ['sled', .06], ['snowman', .08]],
    glacier: [['icicle_rock', 1.4], ['snow_boulder', .9], ['snowy_pine_small', .18], ['snow_mound', .5], ['snow_fence', .25], ['trail_sign', .1], ['ski_rack', .05], ['snowmobile', .03]],
    serac: [['icicle_rock', 1.9], ['snow_boulder', 1.1], ['snowy_pine_small', .3], ['snow_mound', .4], ['trail_sign', .12], ['snow_fence', .3]],
    aurora: [['snowy_pine', 1.5], ['snowy_pine_small', 1.2], ['snow_boulder', .6], ['snow_mound', .7], ['bench', .1], ['trail_sign', .14], ['icicle_rock', .5], ['snowman', .05]],
    tempest: [['snow_boulder', 1.2], ['icicle_rock', .9], ['snowy_pine_small', .7], ['snow_mound', .9], ['snow_fence', .4], ['trail_sign', .18]],
    midnight: [['icicle_rock', 1.5], ['snow_boulder', 1.3], ['snowy_pine_small', .9], ['snow_mound', .6], ['snow_fence', .3], ['trail_sign', .16]],
  };

  function addPropInstance(batchKey, x, y, z, ry, sc) {
    if (!W.batches[batchKey]) {
      const cap = { 'snowy_pine': 900, 'snowy_pine_small': 1400, 'snow_boulder': 700, 'icicle_rock': 800, 'snow_mound': 900, 'snow_fence': 500, 'trail_sign': 260, 'snowman': 80, 'bench': 120, 'ski_rack': 80, 'sled': 60, 'snowmobile': 40 }[batchKey] || 300;
      const ins = ID.instancer(batchKey, cap);
      ins.group.name = 'batch_' + batchKey;
      W.propGroup.add(ins.group);
      W.batches[batchKey] = ins;
    }
    const b = W.batches[batchKey];
    if (b.count >= 900) return;
    tmpQ.setFromEuler(new THREE.Euler(0, ry, 0));
    tmpV.set(x, y, z);
    tmpM.compose(tmpV, tmpQ, tmpS.set(sc, sc, sc));
    b.push(tmpM.clone());
  }
  W.refreshProps = function () {
    for (const k in W.batches) W.batches[k].clear();
    for (const p of W.props) addPropInstance(p.t, p.x, p.y, p.z, p.ry, p.sc);
    for (const k in W.batches) W.batches[k].commit();
  };

  function decorateChunk(c) {
    const r = U.rng(S.seed * 131 + c * 977);
    const s0 = c * W.chunkLen, s1 = s0 + W.chunkLen;
    const set = PROP_SETS[W.loc.id] || PROP_SETS.valley;
    const totalW = set.reduce((a, b) => a + b[1], 0);
    const count = Math.round(S.tree * 30);
    for (let i = 0; i < count; i++) {
      const s = s0 + r() * (s1 - s0);
      if (s < 46) continue;
      const hw = W.halfWidth(s);
      const side = r() > .5 ? 1 : -1;
      const dist = hw * (1.06 + Math.pow(r(), 1.6) * 2.4);
      const x = W.cx(s) + side * dist + (r() - .5) * 6;
      const z = -s;
      /* keep hub pads clear */
      const hub = W.hubAt(s);
      if (hub && Math.hypot(x - hub.hx, z + hub.s) < 42) continue;
      const y = W.heightAt(x, z);
      /* pick prop by weight */
      let pick = r() * totalW, name = set[0][0];
      for (const st of set) { pick -= st[1]; if (pick <= 0) { name = st[0]; break; } }
      const sc = name.indexOf('pine') >= 0 ? (.75 + r() * .8) : (.7 + r() * .7);
      W.props.push({ t: name, x, y: y - .1, z, ry: r() * 6.283, sc, chunk: c });
    }
    /* snow fences lining the piste on tight sections */
    if (r() > .45) {
      const s = s0 + r() * (s1 - s0);
      const hw = W.halfWidth(s);
      const side = r() > .5 ? 1 : -1;
      for (let i = 0; i < 5; i++) {
        const ss = s + i * 3.2;
        const x = W.cx(ss) + side * (hw + 1.5);
        W.props.push({ t: 'snow_fence', x, y: W.heightAt(x, -ss) - .1, z: -ss, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, sc: 1, chunk: c });
      }
    }
  }

  /* ------------------------------------------------------------------
     LANDMARK HUBS
     ------------------------------------------------------------------ */
  const MODELS_NEEDED = ['timber-ski-lodge', 'alpine-ski-chalet', 'ski-rental-shop', 'ski-resort-terrace', 'lift-ticket-booth', 'ski-gondola-station', 'ski-resort-chairlift', 'mountain-rescue-hut', 'snowboard-park-set', 'wooden-ski-jump', 'ski-lodge-lounge', 'snow-cannon-set', 'piste-marker-set', 'snow-tubing-lane', 'banked-bobsled-run', 'curling-rink-set', 'ice-hockey-set', 'ski-resort-hot-tub-deck', 'ski-race-start-gate', 'slalom-gates-set', 'sporty-snowmobile', 'ski-resort-snow-groomer', 'snowy_pine', 'snowy_pine_small', 'fire_pit', 'bench', 'chalet', 'lodge', 'rental_hut', 'hot_cocoa_stand', 'ski_rack', 'ski_poles', 'snowman', 'sled', 'snowmobile', 'ski_jump_ramp', 'slalom_gate', 'lift_pylon', 'lift_station', 'gondola_cabin', 'chairlift_chair', 'tow_rope_handle', 'icicle_rock', 'snow_boulder', 'snow_mound', 'snow_fence', 'trail_sign', 'ticket_booth', 'skier_figure', 'ski_helmet', 'ski_pair', 'ski_boots'];

  function buildHub(hub, c) {
    const L = W.loc;
    const k = hub.k;
    const side = hub.side;
    const base = W.heightAt(hub.hx, -hub.s);
    const root = new THREE.Group();
    root.position.set(hub.hx, base, -hub.s);
    root.rotation.y = side > 0 ? -Math.PI / 2.2 : Math.PI / 2.2;
    W.landmarkGroup.add(root);
    const add = (model, x, y, z, ry, sc, shadow) => {
      const o = ID.make(model, { scale: sc || 1 });
      o.position.set(x, y || 0, z);
      o.rotation.y = ry || 0;
      o.updateMatrix();
      /* fold each landmark building into a single baked mesh -> one draw call */
      const bg = ID.bakeObject(o);
      if (bg) {
        const bm = new THREE.Mesh(bg, ID.BAKED_MAT());
        bm.castShadow = shadow !== false; bm.receiveShadow = true; bm.userData.__own = true;
        bm.position.set(0, 0, 0);
        root.add(bm);
        return bm;
      }
      o.traverse(q => { if (q.isMesh) { q.castShadow = shadow !== false; q.receiveShadow = true; } });
      root.add(o);
      return o;
    };
    const r = U.rng(S.seed * 31 + k * 17);
    const feat = L.features;
    const layout = L.hub;
    /* terrace pad */
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(20, 22, 1.4, 12), W.terrainMat);
    pad.position.set(0, .1, 0); pad.receiveShadow = true; pad.userData.__own = false;
    root.add(pad);
    let lanterns = [];

    if (layout === 'village' || layout === 'cabin' || layout === 'rescue') {
      const main = L.hub === 'rescue' ? 'mountain-rescue-hut' : (r() > .5 ? 'timber-ski-lodge' : 'alpine-ski-chalet');
      const lodge = add(main, -2 - r() * 3, 0, -8 - r() * 4, Math.PI + (r() - .5) * .4, 1.05);
      add('alpine-ski-chalet', 12 + r() * 3, 0, -12 + r() * 4, Math.PI - .5, .85);
      add('ski-rental-shop', -14, 0, -2 + r() * 3, Math.PI / 2, .8);
      add('ski-race-start-gate', 0, 0, 14, 0, .9);
      add('lift-ticket-booth', 9, 0, 5, -Math.PI / 2, .7);
      add('bench', -6, 0, 6, Math.PI, 1);
      add('bench', 4, 0, 7, Math.PI, 1);
      add('hot_cocoa_stand', 14, 0, 2, -Math.PI / 2, 1);
      add('ski_rack', -11, 0, 7, Math.PI, 1);
      add('snowman', 17, 0, 12, r() * 6, 1);
      /* fire pit + light */
      const fp = add('fire_pit', 6, 0, 10, 0, 1);
      const firePos = new THREE.Vector3(hub.hx + 6 * Math.cos(root.rotation.y), base + .9, -hub.s + 10);
      W.fires.push({ pos: new THREE.Vector3(0, 1.0, 10).applyMatrix4(new THREE.Matrix4().makeRotationY(root.rotation.y)).add(root.position), scale: 1, intensity: 1.2, color: new THREE.Color(0xff9a3c) });
      const lant = new THREE.PointLight(0xffb066, 12, 26, 2);
      lant.position.set(0, 2.4, 10); root.add(lant);
      /* poles for chairlift */
      if (feat.indexOf('chairlift') >= 0) {
        add('lift_pylon', 22, 0, -22, .4, 1);
        add('lift_station', 26, 0, -30, -.2, 1);
        add('gondola_cabin', 18, 0, -18, .2, 1);
      }
    } else if (layout === 'park') {
      add('snowboard-park-set', 0, 0, -6, Math.PI, 1.15);
      add('wooden-ski-jump', -8, 0, -26, .2, .55);
      add('ski-rental-shop', 20, 0, 2, -Math.PI / 2.4, .8);
      add('ski-resort-terrace', 8, 0, 12, Math.PI, .7);
      add('snow-cannon-set', -18, 0, 8, Math.PI / 2, .9);
      add('snow-cannon-set', 18, 0, 16, -Math.PI / 2, .9);
      add('ski_rack', -13, 0, 6, Math.PI, 1);
      add('sled', 13, 0, 9, .4, 1);
    } else if (layout === 'crystal') {
      add('snowboard-park-set', -4, 0, -18, Math.PI, .85);
      add('mountain-rescue-hut', 14, 0, -10, Math.PI - .3, .75);
      add('ski-race-start-gate', 0, 0, 12, 0, .85);
      add('snow-cannon-set', -16, 0, 4, Math.PI / 2, .95);
      add('trail_sign', 8, 0, 6, 0, 1);
      add('icicle_rock', -9, 0, 9, .4, 1.4);
      add('icicle_rock', 11, 0, -2, 1.1, 1.1);
    }
    /* gondola station for big resorts */
    if (k % 3 === 1) {
      add('ski-gondola-station', -22, 0, -20, Math.PI / 2, 1);
      add('chairlift_chair', -14, 0, -14, 0, 1);
    }
    /* torches at night */
    if (W.loc.theme === 'aurora' || W.loc.theme === 'midnight' || W.loc.theme === 'dusk' || W.loc.theme === 'night') {
      for (const lx of [-16, 16]) {
        const post = add('tow_rope_handle', lx, 0, 16, 0, .8);
        const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.tex.glow, color: 0xffc880, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .85 }));
        lampGlow.scale.setScalar(5); lampGlow.position.set(lx, 2.1, 16); root.add(lampGlow);
        W.fires.push({ pos: new THREE.Vector3(lx, 2.0, 16).applyMatrix4(new THREE.Matrix4().makeRotationY(root.rotation.y)).add(root.position), scale: .35, intensity: .6, color: new THREE.Color(0xffc070) });
      }
    }
    /* waypoint glow so hubs read from a distance */
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.2, 28), new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: .45, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 1.4, 14); root.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.4, 1.6, 26, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(0, 14, 14); root.add(beam);
    W.landmarks.push({ s: hub.s, k, root, hub, ring });
  }

  /* sky islands floating in the distance (from Frost Sky Islands kit) */
  /* Floating islands are static set-dressing: bake them into ONE mesh each
     (vertex colours) so a whole fortress island costs a single draw call. */
  function buildSkyIslands() {
    W.skyIslands.length = 0;
    const r = U.rng(W.loc.seed * 13 + 4);
    const islands = ['frost-sky-island', 'frost-cabin-island', 'frozen-lake-sky-island', 'frost-crystal-island', 'frost-islet-set'];
    const n = W.loc.bg === 'peaks' ? 4 : 3;
    const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .84, metalness: .05, flatShading: true, envMapIntensity: .5 });
    W.skyIslandMat = vcMat;
    for (let i = 0; i < n; i++) {
      const name = islands[(i + (W.loc.seed % 5)) % islands.length];
      const scale = (name === 'frost-islet-set' ? .8 : .55) + r() * .45;
      const b = new ID.Baker();
      const m4 = new THREE.Matrix4().makeScale(scale, scale, scale);
      b.add(name, m4, null, 1);
      const geo = b.geometry();
      if (!geo) continue;
      const o = new THREE.Mesh(geo, vcMat);
      const ang = (i / n) * 6.283 + r();
      const dist = 900 + r() * 1500;
      o.position.set(Math.cos(ang) * dist, 260 + r() * 420, Math.sin(ang) * dist - 600);
      o.rotation.y = r() * 6.283;
      o.userData.bob = r() * 6.283;
      o.userData.baseY = o.position.y;
      o.userData.__own = true;
      W.skyIslands.push(o);
      W.skyGroup.add(o);
    }
  }

  /* distant mountain ring */
  function buildPeaks() {
    const L = W.loc;
    if (W.peakRoot) { W.propGroup.remove(W.peakRoot); W.peakRoot = null; }
    const r = U.rng(L.seed * 71);
    const g = W.peakGeo = new THREE.ConeGeometry(1, 1, 5, 3, true);
    const col = new THREE.Color(L.pal.rock).lerp(new THREE.Color(FX.theme ? FX.theme.fog : 0xbfd4e8), .45);
    const mmat = W.peakMat = new THREE.MeshStandardMaterial({ color: col, roughness: 1, metalness: 0, flatShading: true, fog: true });
    const snowM = W.snowPeakMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(L.pal.snow).lerp(new THREE.Color(0xffffff), .5), roughness: .9, flatShading: true });
    const baker = new ID.Baker();
    const coneGeo = new THREE.ConeGeometry(1, 1, 6, 1, false);
    const rockMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(L.pal.rock).lerp(new THREE.Color(FX.theme ? FX.theme.fog : 0xbfd4e8), .4), roughness: 1, metalness: 0, flatShading: true });
    const snowMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(L.pal.snow).lerp(new THREE.Color(0xffffff), .45), roughness: .92, flatShading: true });
    W.peakGeo = coneGeo;
    W.peakMat = rockMat; W.snowPeakMat = snowMat;
    const inst = new THREE.InstancedMesh(coneGeo, rockMat, 34);
    const inst2 = new THREE.InstancedMesh(coneGeo, snowMat, 34);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    for (let i = 0; i < 34; i++) {
      const ang = r() * 6.283;
      const dist = 1100 + r() * 2600;
      const h = 420 + r() * 900, rad = 300 + r() * 420;
      const y = -60 + r() * 120;
      pos.set(Math.cos(ang) * dist, y, Math.sin(ang) * dist - 900);
      q.setFromEuler(new THREE.Euler(0, r() * 6.283, 0));
      scl.set(rad, h, rad);
      m4.compose(pos, q, scl);
      inst.setMatrixAt(i, m4);
      pos.y += h * .2; scl.set(rad * .64, h * .56, rad * .64);
      m4.compose(pos, q, scl);
      inst2.setMatrixAt(i, m4);
      W.peaks.push({ x: pos.x, z: pos.z });
    }
    inst.instanceMatrix.needsUpdate = true; inst2.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false; inst2.frustumCulled = false;
    W.peakRoot = new THREE.Group();
    W.peakRoot.add(inst); W.peakRoot.add(inst2);
    W.propGroup.add(W.peakRoot);
  }

  /* ==================================================================
     START AREA — village, start gate, lift station
     ================================================================== */
  function buildStartArea() {
    const root = new THREE.Group();
    root.position.set(0, W.heightAt(0, -2), -2);
    W.landmarkGroup.add(root);
    W.startRoot = root;
    const add = (m, x, y, z, ry, sc) => { const o = ID.make(m, { scale: sc || 1 }); o.position.set(x, y, z); o.rotation.y = ry || 0; root.add(o); return o; };
    add('timber-ski-lodge', -34, -2, -6, Math.PI * .5, 1.1);
    add('lift-ticket-booth', 26, -1, -4, -Math.PI / 2, .9);
    add('ski-rental-shop', 40, -1, 6, -Math.PI / 2.2, .85);
    add('ski-resort-terrace', -18, -1, 12, Math.PI, .85);
    add('ski-race-start-gate', 0, 0, 6, 0, 1.15);
    add('ski_resort_chairlift', 30, -2, -26, Math.PI * .3, .9);
    add('lift_station', 34, -1, -24, Math.PI * .3, 1);
    add('gondola_cabin', 22, -1, -18, .4, 1);
    add('snowman', -12, 0, 10, .4, 1.2);
    add('snowman', 12, 0, 13, 1.9, .9);
    add('bench', -6, 0, 12, Math.PI, 1);
    add('bench', 6, 0, 12, Math.PI, 1);
    add('hot_cocoa_stand', 18, 0, 12, -Math.PI / 2, 1);
    add('ski_rack', -22, 0, 8, Math.PI, 1);
    /* floodlight glow for night start */
    if (W.loc.theme !== 'day') {
      const l = new THREE.PointLight(0xa8d8ff, 30, 60, 2); l.position.set(0, 14, 8); root.add(l);
      for (const lx of [-10, 10]) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.tex.glow, color: 0xbcdcff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 }));
        s.scale.setScalar(12); s.position.set(lx, 13, 8); root.add(s);
      }
    }
    W.startArea = root;
  }

  /* ==================================================================
     SKY BRIDGES — floating checkpoint islands spanning the piste
     ================================================================== */
  W.bridges = [];
  function buildBridges() {
    W.bridges.length = 0;
    const r = U.rng(S.seed * 53 + 11);
    const isl = ['frost-islet-set', 'frost-crystal-island'];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const s = 380 + i * 420 + r() * 120;
      if (s > 2800) break;
      const side = i % 2 === 0 ? 1 : -1;
      const hw = W.halfWidth(s);
      const u = side * hw * .55;
      const x = W.cx(s) + u;
      const z = -s;
      const gy = W.heightAt(x, z);
      const grp = new THREE.Group();
      grp.position.set(x, gy + 7.2, z);
      grp.rotation.y = r() * 6.283;
      const model = ID.make(isl[i % 2], { scale: .62 + r() * .25 });
      /* strip the rock underside so it reads as a floating gate arch */
      grp.add(model);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(9, .35, 6, 28), new THREE.MeshStandardMaterial({ color: 0x66e0ff, emissive: 0x66e0ff, emissiveIntensity: 1.6, roughness: .4, metalness: .2 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = -4.6; grp.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.4, 7, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 5; grp.add(beam);
      W.landmarkGroup.add(grp);
      W.bridges.push({ s, x, z, y: gy + 2.6, root: grp, taken: false, ring, u });
    }
  }
  W.buildBridges = buildBridges;
  W.bridgeNear = function (s) {
    for (const b of W.bridges) if (!b.taken && s > b.s - 3 && s < b.s + 3) return b;
    return null;
  };

  /* ==================================================================
     CHUNK STREAMING
     ================================================================== */
  const active = W.active = { s: -1e9 };
  W.ensure = function (sTarget) {
    const len = W.chunkLen;
    const near = Math.floor((sTarget - 80) / len);
    const far = Math.floor((sTarget + len * (ID.Q.chunks)) / len);
    let changed = false;
    for (let c = near; c <= far; c++) {
      if (c < -2) continue;
      if (!W.chunks.has(c)) {
        const ch = buildTerrainChunk(c);
        decorateChunk(c);
        ch.c = c;
        ch.landmarks = [];
        /* hub terraces whose centre falls inside this terrain chunk */
        for (const hub of W.hubList(c * len, (c + 1) * len)) {
          const owner = Math.floor(hub.s / len);
          if (owner === c) buildHub(hub, c);
        }
        W.chunks.set(c, ch);
        changed = true;
      }
    }
    /* evict far chunks */
    for (const [c, ch] of W.chunks) {
      if (c < near - 2 || c > far + 3) {
        for (const m of ch.meshes) { W.terrainGroup.remove(m); m.geometry.dispose(); }
        W.chunks.delete(c);
        changed = true;
      }
    }
    if (changed) {
      /* prune props/landmarks belonging to evicted chunks */
      W.props = W.props.filter(p => p.chunk === undefined || W.chunks.has(p.chunk));
      W.refreshProps();
      W.landmarks = W.landmarks.filter(l => {
        const c = Math.floor(l.s / len);
        if (!W.chunks.has(c) && l.s < sTarget - 380) {
          const kill = (o) => o.traverse(c2 => {
            if (c2.isSprite) c2.material.dispose();
            else if (c2.isLight) c2.dispose && c2.dispose();
            else if (c2.isMesh && c2.userData.__own) { c2.geometry.dispose(); c2.material.dispose(); }
          });
          kill(l.root); W.landmarkGroup.remove(l.root);
          return false;
        }
        return true;
      });
    }
  };

  W.buildFinish = function (s, length) {
    if (!isFinite(s) || s > 1e8) return;
    const root = new THREE.Group();
    const y = W.heightAt(W.cx(s), -s);
    root.position.set(W.cx(s), y, -s);
    W.root.add(root);
    const hw = Math.min(W.halfWidth(s) * .9, 16);
    const gate = ID.make('ski-race-start-gate', { scale: 1.4 });
    gate.position.y = -.4;
    root.add(gate);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xff8a1f, emissiveIntensity: .8, roughness: .5, metalness: .3 });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 1.1, .3), mat);
    banner.position.y = 6.2; root.add(banner);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2.2, 2.6), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(0, 3.2, -0.2); glow.rotation.x = -.1; root.add(glow);
    for (const sx of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, 6.5, 8), mat);
      pole.position.set(sx * hw, 3.2, 0); root.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshStandardMaterial({ color: 0xff3b30, side: THREE.DoubleSide, emissive: 0xff3b30, emissiveIntensity: .3 }));
      flag.position.set(sx * (hw - 1.2), 5.4, 0); root.add(flag);
    }
    W.finishRoot = root;
    return root;
  };

  W.start = function (locId, runCfg) {
    W.clear();
    W.reset(locId, runCfg);
    W.buildMaterials();
    W.ensure(0);
    buildStartArea();
    buildSkyIslands();
    buildPeaks();
    W.finishRoot = null;
    buildBridges();
  };

  /* ==================================================================
     FRAME UPDATE
     ================================================================== */
  const skyM = new THREE.Matrix4();
  /* cheap distance culling: props/landmarks beyond a radius are hidden */
  let cullT = 0;
  function distanceCull(playerS, cam) {
    const far = ID.Q.chunks * W.chunkLen + 340;
    for (const l of W.landmarks) {
      l.root.visible = Math.abs(l.s - playerS) < far;
    }
    if (W.startArea) W.startArea.visible = playerS < 420;
    if (W.finishRoot) W.finishRoot.visible = true;
    for (const b of W.bridges) if (b.root) b.root.visible = Math.abs(b.s - playerS) < far;
    /* skydome props are far but always interesting: fade with distance instead */
    for (const o of W.skyIslands) {
      const d = o.position.distanceTo(cam || o.position);
      o.visible = d < 3600;
    }
    if (W.peaks.length) {
      const vis = ID.Q.chunks >= 6;
      for (const pk of W.peaks) pk.visible = vis;
    }
  }
  W.update = function (dt, t, playerS, camera) {
    W.ensure(playerS);
    cullT += dt;
    if (cullT > .12) { cullT = 0; distanceCull(playerS, camera); }
    /* gentle bob + rotation for sky islands */
    for (let i = 0; i < W.skyIslands.length; i++) {
      const o = W.skyIslands[i];
      o.position.y = o.userData.baseY + Math.sin(t * .12 + o.userData.bob) * 8;
      o.rotation.y += dt * .006;
    }
    /* floating checkpoint rings */
    for (const b of W.bridges) {
      if (!b.root) continue;
      b.root.position.y = b.y + Math.sin(t * .9 + b.s) * .5;
      b.root.rotation.y += dt * .12;
      b.ring.rotation.z += dt * .6;
    }
    /* glow flicker on crystals / fires */
    if (W.fires.length) {
      for (const f of W.fires) {
        if (!f.light) continue;
        f.light.intensity = f.baseIntensity * (.82 + Math.sin(t * 7 + f.pos.x) * .12 + Math.random() * .1);
      }
    }
  };

  /* query helpers for gameplay */
  W.isOffPiste = function (x, z) {
    const s = -z;
    return Math.abs(x - W.cx(Math.max(0, s))) > W.halfWidth(s) + 2;
  };
  W.hubNear = function (s) { return W.hubAt(s); };
})(window.ID);
