/* =====================================================================
   ICE DRIFT  ·  models.js
   Offline model archive (models.zip / models.data.js) -> THREE objects
   Includes: material styling, geometry baking, instancing, skier rig
   ===================================================================== */
'use strict';
(function (ID) {
  const U = ID.U;
  const M = ID.Models = {
    proto: {},        // name -> { parts:[{geom,mat}], merged:Object3D, bbox }
    loaded: false,
    errors: [],
    tris: 0,
    bytes: 0,
    mats: {},
    order: [],
  };
  const BASE = 'assets';

  /* ------------------------------------------------------------------
     ARCHIVE SOURCE: prefer embedded base64 (works from file://)
     ------------------------------------------------------------------ */
  function loadArchive() {
    if (window.ID_MODELS_B64 && window.ID_MODELS_B64.length > 1000) {
      const b = window.ID_MODELS_B64;
      const bin = atob(b);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return Promise.resolve(u8);
    }
    return fetch(BASE + '/models.zip').then(r => {
      if (!r.ok) throw new Error('models.zip ' + r.status);
      return r.arrayBuffer();
    }).then(ab => new Uint8Array(ab));
  }

  /* ------------------------------------------------------------------
     MATERIAL STYLING
     ------------------------------------------------------------------ */
  const SPECIAL = {
    glass: { transparent: true, opacity: .32, roughness: .08, metalness: .1, envMapIntensity: 1.6, depthWrite: false },
    ice: { transparent: true, opacity: .78, roughness: .12, metalness: .05, envMapIntensity: 1.5 },
    icicle: { transparent: true, opacity: .72, roughness: .1, metalness: .0, envMapIntensity: 1.6 },
    crystal: { transparent: true, opacity: .82, roughness: .06, metalness: .15, envMapIntensity: 2.0, emissiveIntensity: .55 },
    fire: { emissiveIntensity: 2.2, roughness: .6 },
    lantern: { emissiveIntensity: 2.0 },
    headlight: { emissiveIntensity: 2.4 },
    beacon: { emissiveIntensity: 2.6 },
    snow: { roughness: .82, metalness: 0, envMapIntensity: .55 },
    snowpacked: { roughness: .74, metalness: 0, envMapIntensity: .6 },
    metal: { roughness: .38, metalness: .82, envMapIntensity: 1.1 },
    iron: { roughness: .5, metalness: .7, envMapIntensity: 1.0 },
    gold: { roughness: .32, metalness: .95, envMapIntensity: 1.4 },
    water_tub: { transparent: true, opacity: .8, roughness: .06, metalness: .1, envMapIntensity: 1.4, color: 0x2a7fa8 },
    water: { transparent: true, opacity: .82, roughness: .05, metalness: .1 },
    crystal_emissive: {},
  };
  function styleMaterial(src, key) {
    if (M.mats[key]) return M.mats[key];
    let m = src.clone();
    if (!m.isMeshStandardMaterial) {
      const n = new THREE.MeshStandardMaterial({ color: m.color ? m.color.clone() : 0xffffff });
      m = n;
    }
    m.flatShading = true;
    m.vertexColors = false;
    const lname = (m.name || '').toLowerCase();
    m.roughness = .86; m.metalness = .02; m.envMapIntensity = .5;
    if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > .01) m.emissiveIntensity = Math.max(m.emissiveIntensity || 1, 1.2);
    for (const k in SPECIAL) if (lname.indexOf(k) >= 0) Object.assign(m, SPECIAL[k]);
    if (lname.indexOf('glass') === 0) m.side = THREE.DoubleSide;
    if (lname.indexOf('foliage') >= 0 || lname.indexOf('pine') >= 0 || lname.indexOf('banner') >= 0 || lname.indexOf('cloth') >= 0) { m.side = THREE.DoubleSide; m.roughness = .92; }
    if (lname.indexOf('crystal') >= 0 && !m.emissive) { m.emissive = new THREE.Color(0x7fe8ff); m.emissiveIntensity = .8; }
    if (lname === 'crystal' || lname === 'shrinecrystal') { m.emissive = new THREE.Color(0x6fe0ff); m.emissiveIntensity = 1.15; }
    if (lname === 'fire' || lname === 'flame') { m.emissive = new THREE.Color(0xff7a1a); m.emissiveIntensity = 2.4; }
    m.name = key;
    M.mats[key] = m;
    return m;
  }

  /* ------------------------------------------------------------------
     GEOMETRY HELPERS
     ------------------------------------------------------------------ */
  function geomFrom(name, mesh, matWorld) {
    let g = mesh.geometry;
    if (g.index) g = g.toNonIndexed();
    else g = g.clone();
    if (matWorld) g.applyMatrix4(matWorld);
    /* strip everything but position (uvs/tangents unused: untextured kit) */
    for (const k in g.attributes) if (k !== 'position' && k !== 'color') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    return g;
  }

  /* merge list of geometries into one (positions only) */
  function mergeGeoms(list) {
    let total = 0, hasColor = false;
    for (const it of list) { total += it.geom.attributes.position.count; if (it.geom.attributes.color) hasColor = true; }
    const pos = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    let o = 0;
    for (const it of list) {
      const p = it.geom.attributes.position.array;
      pos.set(p, o * 3);
      const c = it.color;
      const n = it.geom.attributes.position.count;
      if (Array.isArray(c)) { for (let i = 0; i < n; i++) { col[(o + i) * 3] = c[0]; col[(o + i) * 3 + 1] = c[1]; col[(o + i) * 3 + 2] = c[2]; } }
      o += n;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }

  /* ------------------------------------------------------------------
     PREPARE A MODEL
     ------------------------------------------------------------------ */
  function prepare(name, gltf) {
    const scene = gltf.scene || gltf.scenes[0];
    scene.updateMatrixWorld(true);
    const parts = [];
    let meshes = 0;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      const g = geomFrom(name, o, null);
      const mkey = name + ':' + ((o.material && o.material.name) || 'mat');
      const mat = styleMaterial(o.material || new THREE.MeshStandardMaterial({ color: 0xcccccc }), mkey);
      parts.push({ geom: g, mat, mesh: o, node: o.name });
    });
    M.tris += Math.round(scene.children.length + meshes);
    const box = new THREE.Box3();
    parts.forEach(p => { p.geom.computeBoundingBox(); box.union(p.geom.boundingBox); });
    const size = new THREE.Vector3(), center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);
    /* merged single object (all materials grouped) */
    const merged = new THREE.Group();
    merged.name = name;
    M.proto[name] = { name, parts, box, size, center, scene, merged: null };
    return M.proto[name];
  }

  /* Build a merged Object3D: one mesh per material */
  function buildMerged(name) {
    const P = M.proto[name];
    if (!P) return null;
    if (P.merged) return P.merged;
    const by = new Map();
    for (const p of P.parts) {
      const key = p.mat.name;
      if (!by.has(key)) by.set(key, []);
      by.get(key).push({ geom: p.geom, color: null });
    }
    const grp = new THREE.Group(); grp.name = name;
    /* Large kits (lodges, gondola stations) get spatial sub-groups so the
       renderer can frustum-cull their far side. Each part keeps its own
       bounding box; small props merge per material to save draw calls.   */
    const SPATIAL = false;
    if (SPATIAL) {
      for (let i = 0; i < P.parts.length; i += 8) {
        const chunk = P.parts.slice(i, i + 8);
        const sub = new THREE.Group();
        for (const p of chunk) {
          const mat = p.mat;
          const mesh = new THREE.Mesh(p.geom, mat);
          mesh.castShadow = !(mat.transparent && mat.opacity < .5);
          mesh.receiveShadow = true;
          mesh.matrixAutoUpdate = false;
          mesh.updateMatrix();
          sub.add(mesh);
        }
        grp.add(sub);
      }
    } else {
      for (const [key, list] of by) {
        const g = list.length === 1 ? list[0].geom : mergeGeoms(list);
        const mat = M.mats[key];
        const mesh = new THREE.Mesh(g, mat);
        mesh.castShadow = !(mat.transparent && mat.opacity < .5);
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        grp.add(mesh);
      }
    }
    /* pre-compute bounds so culling is cheap */
    const box = new THREE.Box3().setFromObject(grp);
    grp.userData.box = box;
    grp.userData.center = box.getCenter(new THREE.Vector3());
    grp.userData.radius = box.getSize(new THREE.Vector3()).length() * .5;
    P.merged = grp;
    return grp;
  }

  /* create a unique instance of a prop (shared geometry / materials) */
  ID.make = function (name, opts) {
    opts = opts || {};
    if (opts.bake) {
      const inner = ID.make(name, Object.assign({}, opts, { bake: false }));
      const g = ID.bakeObject(inner);
      if (!g) return inner;
      const m = new THREE.Mesh(g, ID.BAKED_MAT());
      m.castShadow = true; m.receiveShadow = true; m.userData.__baked = true;
      return m;
    }
    const P = M.proto[name];
    if (!P) { return fallbackMesh(name); }
    const o = buildMerged(name).clone(true);
    o.traverse(c => { if (c.isMesh) { c.castShadow = opts.shadow !== false; c.receiveShadow = true; } });
    if (opts.scale) { const s = opts.scale; o.scale.setScalar ? o.scale.multiplyScalar(s) : (o.scale.x = o.scale.y = o.scale.z = s); }
    if (opts.pos) o.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
    if (opts.rotY !== undefined) o.rotation.y = opts.rotY;
    return o;
  };
  let _bakedMat = null;
  ID.BAKED_MAT = function () {
    if (!_bakedMat) _bakedMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: .03, flatShading: true, envMapIntensity: .55 });
    return _bakedMat;
  };
  function fallbackMesh(name) {
    const g = new THREE.ConeGeometry(.6, 1.6, 6);
    const m = new THREE.MeshStandardMaterial({ color: 0x9fb6cc, flatShading: true });
    const o = new THREE.Mesh(g, m); o.name = 'fallback:' + name; return o;
  }

  /* Collapse an already-built object tree (ID.make clones, primitives, groups)
     into one vertex-coloured BufferGeometry. Material colour x object colour
     is baked per vertex; translucent parts are skipped. */
  ID.bakeObject = function (root) {
    root.updateMatrixWorld(true);
    const pos = [], col = [], inv = new THREE.Matrix4();
    const v = new THREE.Vector3(), n3 = new THREE.Matrix3(), nm = new THREE.Matrix3();
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh) return;
      const g = o.geometry;
      if (!g || !g.attributes.position) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const m0 = mats[0];
      if (!m0 || (m0.transparent && m0.opacity < .85) || m0.opacity === 0) return;
      const pa = g.attributes.position.array;
      const ca = g.attributes.color ? g.attributes.color.array : null;
      const cnt = pa.length / 3;
      const c = m0.color || new THREE.Color(0xffffff);
      const oc = o.color || new THREE.Color(0xffffff);
      n3.getNormalMatrix(o.matrixWorld);
      for (let i = 0; i < cnt; i++) {
        v.set(pa[i * 3], pa[i * 3 + 1], pa[i * 3 + 2]).applyMatrix4(o.matrixWorld);
        pos.push(v.x, v.y, v.z);
        if (ca) col.push(ca[i * 3] * c.r * oc.r, ca[i * 3 + 1] * c.g * oc.g, ca[i * 3 + 2] * c.b * oc.b);
        else col.push(c.r * oc.r, c.g * oc.g, c.b * oc.b);
      }
    });
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  };

  /* instance helper: N copies of a prop in as few draw calls as possible */
  ID.instancer = function (name, count) {
    const P = M.proto[name];
    const grp = new THREE.Group();
    const ims = [];
    if (!P) return { group: grp, set() { }, count: 0 };
    const by = new Map();
    for (const p of P.parts) {
      const key = p.mat.name;
      if (!by.has(key)) by.set(key, []);
      by.get(key).push({ geom: p.geom, color: null });
    }
    for (const [key, list] of by) {
      const g = list.length === 1 ? list[0].geom : mergeGeoms(list);
      const mat = M.mats[key];
      const im = new THREE.InstancedMesh(g, mat, count);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      im.count = 0;
      grp.add(im); ims.push(im);
    }
    let n = 0;
    const tmp = new THREE.Matrix4();
    return {
      group: grp, ims, get count() { return n; },
      set(i, m4) { for (const im of ims) im.setMatrixAt(i, m4); if (i >= n) n = i + 1; },
      push(m4) { const i = n; this.set(i, m4); return i; },
      commit(visible) { for (const im of ims) { im.count = visible === undefined ? n : Math.min(visible, n); im.instanceMatrix.needsUpdate = true; } },
      clear() { n = 0; for (const im of ims) im.count = 0; },
    };
  };

  /* ------------------------------------------------------------------
     BAKING: transform model geometry into a vertex-colour buffer
     used by the endless world to keep thousands of props cheap.
     ------------------------------------------------------------------ */
  ID.Baker = function () {
    this.pos = []; this.col = []; this.n = 0;
  };
  ID.Baker.prototype.add = function (name, matrix, tint, colorMul) {
    const P = M.proto[name];
    if (!P) return;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    for (const p of P.parts) {
      const mat = M.mats[p.mat.name];
      if (mat.transparent && mat.opacity < .85) continue;  // skip translucent details when baking
      const pos = p.geom.attributes.position.array;
      const cnt = pos.length / 3;
      const c = mat.color;
      const cr = c.r * (tint ? tint.r : 1) * (colorMul || 1);
      const cg = c.g * (tint ? tint.g : 1) * (colorMul || 1);
      const cb = c.b * (tint ? tint.b : 1) * (colorMul || 1);
      const v = new THREE.Vector3();
      for (let i = 0; i < cnt; i++) {
        v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(matrix);
        this.pos.push(v.x, v.y, v.z);
        this.col.push(cr, cg, cb);
      }
      this.n += cnt;
    }
  };
  ID.Baker.prototype.isEmpty = function () { return this.n === 0; };
  ID.Baker.prototype.geometry = function () {
    if (this.n === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    g.setDrawRange(0, this.n);
    return g;
  };

  /* ------------------------------------------------------------------
     SKIER RIG — pivots derived from the authored model
     ------------------------------------------------------------------ */
  const J = {                                         // joint positions (model units)
    waist: [0, 2.46, -0.06],
    hipL: [-0.38, 2.4, 0.02], hipR: [0.38, 2.4, 0.02],
    kneeL: [-0.42, 1.92, 0.34], kneeR: [0.42, 1.92, 0.34],
    ankleL: [-0.45, 0.62, 0.24], ankleR: [0.45, 0.62, 0.24],
    neck: [0, 3.6, 0.16],
    shL: [-0.72, 3.42, 0.38], shR: [0.72, 3.42, 0.38],
    elL: [-0.8, 3.02, 0.3], elR: [0.8, 3.02, 0.3],
    wrL: [-0.72, 2.6, 0.94], wrR: [0.72, 2.6, 0.94],
  };
  const PART_MAP = {
    torso: ['Pelvis', 'Jacket', 'JacketStripe', 'Collar', 'Helmet', 'HelmetStripe', 'Head', 'GoggleFrame', 'GoggleLens', 'GoggleStrap'],
    shL: ['Shoulder_L'], shR: ['Shoulder_R'],
    armL: ['UpperArm_L'], armR: ['UpperArm_R'],
    foreL: ['Elbow_L', 'Forearm_L'], foreR: ['Elbow_R', 'Forearm_R'],
    handL: ['Glove_L', 'Pole_L'], handR: ['Glove_R', 'Pole_R'],
    thighL: ['Thigh_L'], thighR: ['Thigh_R'],
    shinL: ['Knee_L', 'Shin_L'], shinR: ['Knee_R', 'Shin_R'],
    footL: ['Boot_L', 'Binding_L', 'Ski_L'], footR: ['Boot_R', 'Binding_R', 'Ski_R'],
  };

  const RIDER_COLORS = [
    { jacket: 0x1b64e0, pants: 0x23252e, helmet: 0xf2f6ff, ski: 0xff3b30, accent: 0xffb703 },
    { jacket: 0xd62828, pants: 0x181c24, helmet: 0xd62828, ski: 0x1a1a24, accent: 0xffffff },
    { jacket: 0x2ec27e, pants: 0x1a1a2e, helmet: 0xffffff, ski: 0x2ec27e, accent: 0x111111 },
    { jacket: 0x111318, pants: 0x3a3a44, helmet: 0xffb703, ski: 0xffb703, accent: 0xffb703 },
    { jacket: 0xff4fa3, pants: 0x2a2a5a, helmet: 0xff4fa3, ski: 0xff4fa3, accent: 0xffffff },
    { jacket: 0x7b2cff, pants: 0x1a1030, helmet: 0x2affc4, ski: 0x2affc4, accent: 0x7b2cff },
    { jacket: 0xff7a00, pants: 0x14161c, helmet: 0x14161c, ski: 0xffffff, accent: 0x22d3ff },
    { jacket: 0xf0f6ff, pants: 0x1b64e0, helmet: 0x1b64e0, ski: 0xd62828, accent: 0x1b64e0 },
  ];
  ID.RIDER_COLORS = RIDER_COLORS;

  /* Build a rigged rider. kind: 'skier' | 'snowboarder' */
  ID.buildRider = function (kind, colorIdx, opts) {
    opts = opts || {};
    const col = RIDER_COLORS[(colorIdx || 0) % RIDER_COLORS.length];
    const S = opts.scale || 0.405;                  // 4.74 units -> 1.92 m
    const root = new THREE.Group();
    root.name = 'rider';
    const body = new THREE.Group();
    body.name = 'body';
    body.scale.setScalar(S);
    root.add(body);
    const P = M.proto[kind === 'snowboarder' ? 'low-poly-snowboarder' : 'low-poly-skier'];
    const rig = { root, body, kind, parts: {}, mats: [], S, colors: col };

    const matOf = (base) => {
      const m = base.clone();
      m.flatShading = true; m.roughness = .78; m.metalness = .04; m.envMapIntensity = .4;
      m.name = base.name + ':rider';
      rig.mats.push(m);
      return m;
    };
    function applyColors(node) {
      /* recolour by authored material name */
      node.traverse(o => {
        if (!o.isMesh) return;
        const base = o.material;
        const nm = (base.name || '').toLowerCase();
        let c = null;
        if (nm.indexOf('paintblue') >= 0) c = col.jacket;
        else if (nm.indexOf('paintred') >= 0) c = col.ski;
        else if (nm.indexOf('paintorange') >= 0) c = col.accent;
        else if (nm.indexOf('cream') >= 0) c = col.helmet;
        else if (nm.indexOf('rubber') >= 0) c = col.pants;
        if (c !== null) {
          const m = matOf(base); m.color.setHex(c); m.name = base.name + ':rider';
          o.material = m;
        } else if (!o.material.userData.ridermat) {
          const m = matOf(base); o.material = m;
        }
        o.material.userData.ridermat = true;
        o.castShadow = true; o.receiveShadow = false;
      });
    }

    if (!P) { return rig; }
    if (kind === 'snowboarder') {
      /* single mesh rider: whole body lean animation only */
      const inst = P.merged ? P.merged.clone(true) : buildMerged('low-poly-snowboarder').clone(true);
      applyColors(inst);
      body.add(inst);
      rig.simple = true;
      return rig;
    }

    /* -- full skier rig ------------------------------------------------ */
    const source = P.scene;
    const nodeByName = {};
    source.traverse(o => { if (o.isMesh) nodeByName[o.name] = o; });
    const pivot = (name, joint) => { const g = new THREE.Group(); g.name = name; g.position.set(joint[0], joint[1], joint[2]); return g; };
    const attach = (pivotGroup, partNames) => {
      for (const pn of partNames) {
        const src = nodeByName[pn];
        if (!src) continue;
        const g = geomFrom(pn, src, null);
        const m = applyPartMat(src);
        const mesh = new THREE.Mesh(g, m);
        mesh.name = pn;
        mesh.position.set(-pivotGroup.position.x, -pivotGroup.position.y, -pivotGroup.position.z);
        mesh.castShadow = true;
        pivotGroup.add(mesh);
        rig.parts[pn] = mesh;
      }
    };
    function applyPartMat(src) {
      const base = src.material;
      const nm = (base.name || '').toLowerCase();
      const m = base.clone(); m.flatShading = true; m.roughness = .8; m.metalness = .03; m.envMapIntensity = .35;
      if (nm.indexOf('paintblue') >= 0) m.color.setHex(col.jacket);
      else if (nm.indexOf('paintred') >= 0) m.color.setHex(col.ski);
      else if (nm.indexOf('paintorange') >= 0) m.color.setHex(col.accent);
      else if (nm.indexOf('cream') >= 0) m.color.setHex(col.helmet);
      else if (nm.indexOf('rubber') >= 0) m.color.setHex(col.pants);
      rig.mats.push(m);
      return m;
    }
    const waist = pivot('waist', J.waist);
    body.add(waist);
    attach(waist, PART_MAP.torso);
    /* head sub-pivot for helmet cam + look */
    rig.head = waist;
    /* arms */
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? -1 : 1;
      const sh = pivot('sh' + side, side === 'L' ? J.shL : J.shR);
      waist.add(sh);
      attach(sh, PART_MAP['sh' + side]);
      const arm = pivot('arm' + side, side === 'L' ? J.shL : J.shR);
      sh.add(arm); arm.position.set(0, 0, 0);
      attach(arm, PART_MAP['arm' + side]);
      const el = pivot('el' + side, side === 'L' ? J.elL : J.elR);
      el.position.set((side === 'L' ? J.elL[0] : J.elR[0]) - (side === 'L' ? J.shL[0] : J.shR[0]), (side === 'L' ? J.elL[1] : J.elR[1]) - (side === 'L' ? J.shL[1] : J.shR[1]), (side === 'L' ? J.elL[2] : J.elR[2]) - (side === 'L' ? J.shL[2] : J.shR[2]));
      arm.add(el);
      attach(el, PART_MAP['fore' + side]);
      const wr = pivot('wr' + side, side === 'L' ? J.wrL : J.wrR);
      wr.position.set((side === 'L' ? J.wrL[0] : J.wrR[0]) - (side === 'L' ? J.elL[0] : J.elR[0]), (side === 'L' ? J.wrL[1] : J.wrR[1]) - (side === 'L' ? J.elL[1] : J.elR[1]), (side === 'L' ? J.wrL[2] : J.wrR[2]) - (side === 'L' ? J.elL[2] : J.elR[2]));
      el.add(wr);
      attach(wr, PART_MAP['hand' + side]);
      rig['sh' + side] = sh; rig['arm' + side] = arm; rig['el' + side] = el; rig['wr' + side] = wr;
    }
    /* legs */
    for (const side of ['L', 'R']) {
      const hipJ = side === 'L' ? J.hipL : J.hipR, kneeJ = side === 'L' ? J.kneeL : J.kneeR, ankJ = side === 'L' ? J.ankleL : J.ankleR;
      const hip = pivot('hip' + side, hipJ); waist.add(hip);
      hip.position.set(hipJ[0], hipJ[1] - J.waist[1], hipJ[2] - J.waist[2]);
      attach(hip, PART_MAP['thigh' + side]);
      const kn = pivot('knee' + side, [0, 0, 0]);
      kn.position.set(kneeJ[0] - hipJ[0], kneeJ[1] - hipJ[1], kneeJ[2] - hipJ[2]);
      hip.add(kn);
      attach(kn, PART_MAP['shin' + side]);
      const an = pivot('ankle' + side, [0, 0, 0]);
      an.position.set(ankJ[0] - kneeJ[0], ankJ[1] - kneeJ[1], ankJ[2] - kneeJ[2]);
      kn.add(an);
      attach(an, PART_MAP['foot' + side]);
      rig['hip' + side] = hip; rig['knee' + side] = kn; rig['ankle' + side] = an;
    }
    /* base pose: authored crouch */
    rig.base = { waist: 0, hips: 0, knees: 0 };
    return rig;
  };

  /* animate a rigged rider
     p: { tuck 0..1, carve -1..1, lean, air, push, crash, grab, lookY, edge } */
  ID.poseRider = function (rig, p, dt) {
    if (!rig || !rig.body) return;
    const d = dt || .016, k = 14;
    const tuck = p.tuck || 0, carve = p.carve || 0, air = p.air ? 1 : 0;
    if (rig.simple) {
      rig.body.rotation.z = U.damp(rig.body.rotation.z, -carve * .28, 9, d);
      rig.body.rotation.x = U.damp(rig.body.rotation.x, -tuck * .18 + (p.crash ? .6 : 0), 8, d);
      rig.body.position.y = U.damp(rig.body.position.y, tuck * .08 + (air ? .05 : 0), 8, d);
      return;
    }
    const waist = rig.parts.Pelvis ? rig.parts.Pelvis.parent.parent : null;
    const K = 12;
    const t = p.t || 0;
    const push = p.push || 0;
    /* body pitch/crouch */
    rig.body.rotation.x = U.damp(rig.body.rotation.x, -0.06 + tuck * 0.16 + (air ? -0.1 : 0) + (p.crash ? .75 : 0), 8, d);
    rig.body.rotation.z = U.damp(rig.body.rotation.z, -carve * .2, 10, d);
    /* torso lean into turn */
    const torso = rig.waist;
    if (torso) {
      torso.rotation.y = U.damp(torso.rotation.y, carve * .22, 9, d);
      torso.rotation.z = U.damp(torso.rotation.z, carve * .1, 9, d);
      torso.position.y = U.damp(torso.position.y, 2.46 - tuck * .16, 10, d);
    }
    /* legs: tuck raises knees */
    for (const side of ['L', 'R']) {
      const hip = rig['hip' + side], kn = rig['knee' + side], an = rig['ankle' + side];
      if (!hip) continue;
      hip.rotation.x = U.damp(hip.rotation.x, -tuck * .55 - air * .2 + carve * (side === 'L' ? .1 : -.1), K, d);
      kn.rotation.x = U.damp(kn.rotation.x, tuck * .9 + air * .35, K, d);
      an.rotation.x = U.damp(an.rotation.x, -tuck * .35 - air * .15, K, d);
    }
    /* arms + poles: absorb, push, balance */
    const swing = Math.sin(t * 9) * push;
    for (const side of ['L', 'R']) {
      const sh = rig['sh' + side], arm = rig['arm' + side], el = rig['el' + side], wr = rig['wr' + side];
      if (!arm) continue;
      const sd = side === 'L' ? -1 : 1;
      const targetArmX = -0.15 - tuck * .2 - air * .5 + swing * 1.2;
      const targetArmZ = -sd * (0.12 + carve * .18 * -sd);
      arm.rotation.x = U.damp(arm.rotation.x, targetArmX, K, d);
      arm.rotation.z = U.damp(arm.rotation.z, targetArmZ, K, d);
      if (el) el.rotation.x = U.damp(el.rotation.x, -0.15 - tuck * .3 + air * .3 - swing * .9, K, d);
      if (wr) wr.rotation.x = U.damp(wr.rotation.x, 0.1 + tuck * .1, K, d);
      if (sh) sh.rotation.z = U.damp(sh.rotation.z, sd * .05, K, d);
    }
    /* crash tumble */
    if (p.crash) {
      rig.body.rotation.z += Math.sin(t * 12) * .08;
    }
  };

  /* ------------------------------------------------------------------
     LOAD ALL
     ------------------------------------------------------------------ */
  ID.Models.load = function (progress) {
    const t0 = performance.now();
    progress && progress(0.02, 'Reading asset pack…');
    return loadArchive().then(bytes => {
      M.bytes = bytes.length;
      progress && progress(0.08, 'Unpacking models…');
      let files;
      try {
        files = fflate.unzipSync(bytes, {});
      } catch (e) {
        throw new Error('model archive corrupted: ' + e.message);
      }
      const names = Object.keys(files).filter(n => /\.glb$/i.test(n));
      const loader = new THREE.GLTFLoader();
      let done = 0;
      return new Promise((resolve, reject) => {
        const next = () => {
          if (done >= names.length) {
            M.loaded = true;
            progress && progress(.97, 'Warming shaders…');
            resolve(M);
            return;
          }
          const file = names[done];
          const nm = file.replace(/\.glb$/i, '');
          const buf = files[file];
          const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
          loader.parse(ab, '', (gltf) => {
            try { prepare(nm, gltf); } catch (e) { M.errors.push(nm + ': ' + e.message); }
            done++;
            progress && progress(.08 + .88 * done / names.length, 'Loading ' + nm.replace(/-/g, ' '));
            /* yield every few models so the loading ring animates */
            if (done % 3 === 0) setTimeout(next, 0); else next();
          }, (err) => {
            M.errors.push(nm + ': parse failed');
            done++;
            setTimeout(next, 0);
          });
        };
        next();
      });
    }).then(() => {
      M.ms = Math.round(performance.now() - t0);
      return M;
    });
  };
})(window.ID);
