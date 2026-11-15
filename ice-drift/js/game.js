/* =====================================================================
   ICE DRIFT  ·  game.js
   Player physics · tricks · camera · AI rivals · gates · coins · modes
   ===================================================================== */
'use strict';
(function (ID) {
  const U = ID.U, FX = ID.FX, W = ID.World, G = ID.G;
  const V3 = THREE.Vector3, TAU = Math.PI * 2;

  const Game = ID.Game = {
    player: null, rig: null, ghost: null,
    ai: [], coins: [], gates: [], obstacles: [], pickups: [],
    cam: { mode: 0, pos: new V3(), target: new V3(), shake: 0, fov: 68, look: new V3() },
    course: null, run: null, score: 0, combo: 1, comboT: 0, bestCombo: 1,
    countdown: 0, finishT: 0, finished: false, results: null,
    tricks: [], trickPopupT: 0, avaGap: 999, avaS: 0,
    particlesAcc: 0, trailAcc: 0, hint: '', danger: 0,
    firstUpdate: true, clock: 0, splits: [], ghostRec: [],
  };

  /* ==================================================================
     PLAYER STATE
     ================================================================== */
  function makePlayer(cfg) {
    const p = {
      pos: new V3(0, 0, 0), yaw: 0, speed: 0, latV: 0, vy: 0,
      onGround: true, air: false, airT: 0, airPeak: 0,
      s: 0, u: 0, steer: 0, lean: 0, edge: 0,
      tuck: 0, push: 0, crouch: 0, crashT: 0, crashSpin: 0, invuln: 0,
      spin: 0, spinV: 0, flip: 0, flipV: 0, grab: 0,
      trickActive: false, trickName: '', trickChain: 0, trickT: 0,
      boost: .35, boosting: false, boostCool: 0,
      coins: 0, gates: 0, gatesTotal: 0, perfect: 0, missed: 0,
      score: 0, maxAir: 0, topSpeed: 0, dist: 0, time: 0, crashes: 0,
      landing: 0, splashT: 0, trailOn: false, ghostT: 0,
      charge: 0, lastGroundY: 0, groundY: 0, grade: 0, trailOn: false, stuckT: 0, gatesAhead: 0,
      trickScore: 0, combo: 1, comboT: 0, bestCombo: 1,
      stumbles: 0, checkpoint: 0, rank: 1,
    };
    const st = ID.statsOf();
    p.stats = st;
    p.maxSpeed = 33 + st.speed * 1.35;
    p.accel = 7.2 + st.accel * .55;
    p.grip = 5.2 + st.control * .5;
    p.airGrip = 1.2;
    p.pos.set(0, 0, 0);
    p.pos.y = W.heightAt(0, 0);
    /* rider visual */
    let rig = null;
    try { rig = ID.buildRider(ID.SV.rider, ID.SV.paint); } catch (e) { rig = null; }
    p.rig = rig;
    if (rig) { W.root.add(rig.root); rig.root.position.copy(p.pos); }
    return p;
  }
  ID.statsOf = function () {
    const s = { speed: ID.SV.up.speed, accel: ID.SV.up.carve, control: ID.SV.up.carve, balance: ID.SV.up.air };
    const suits = ID.ITEMS.suit; const it = suits[ID.SV.equip.suit]; if (it) for (const k in it.b) s[k] = (s[k] || 0) + it.b[k];
    const boards = ID.ITEMS.board; const bd = boards[ID.SV.equip.board]; if (bd) for (const k in bd.b) s[k] = (s[k] || 0) + bd.b[k];
    s.speed += ID.SV.up.speed;
    return s;
  };

  /* ==================================================================
     COURSE BUILD — streamed so infinite modes stay cheap
     ================================================================== */
  const CC = {
    gateGeo: null, flagGeo: null, poleMatCache: {}, gateMatCache: {},
    coinGeo: null, coinMat: null, gatePool: [], obPool: [],
    gateGroup: new THREE.Group(), coinGroup: new THREE.Group(), obGroup: new THREE.Group(),
  };
  CC.gateGroup.name = 'gates'; CC.coinGroup.name = 'coins'; CC.obGroup.name = 'obstacles';
  let coinMesh = null;
  const COIN_CAP = 420;
  const GATE_CAP = 90;

  function courseInitVisuals() {
    /* shared geometry, built once */
    if (!CC.gateGeo) {
      CC.gateGeo = new THREE.CylinderGeometry(.085, .085, 2.1, 6);
      CC.flagGeo = new THREE.PlaneGeometry(1.05, .78);
      CC.bandGeo = new THREE.TorusGeometry(1, .045, 4, 22);
      CC.archGeo = new THREE.TorusGeometry(1, .055, 5, 24, Math.PI);
      const cg = new THREE.CylinderGeometry(.4, .4, .09, 14);
      cg.rotateX(Math.PI / 2);
      CC.coinGeo = cg;
      CC.coinMat = new THREE.MeshStandardMaterial({ color: 0xffd24a, metalness: .95, roughness: .26, emissive: 0x6b4a00, emissiveIntensity: .7, envMapIntensity: 1.5 });
    }
    if (!coinMesh || coinMesh.parent !== CC.coinGroup) {
      if (coinMesh) { CC.coinGroup.remove(coinMesh); }
      coinMesh = new THREE.InstancedMesh(CC.coinGeo, CC.coinMat, COIN_CAP);
      coinMesh.frustumCulled = false; coinMesh.castShadow = false;
      coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      CC.coinGroup.add(coinMesh);
    }
    while (CC.gateGroup.children.length) CC.gateGroup.remove(CC.gateGroup.children[0]);
    while (CC.obGroup.children.length) CC.obGroup.remove(CC.obGroup.children[0]);
    CC.gatePool.length = 0; CC.obPool.length = 0;
    if (!CC.gateGroup.parent) W.root.add(CC.gateGroup);
    if (!CC.coinGroup.parent) W.root.add(CC.coinGroup);
    if (!CC.obGroup.parent) W.root.add(CC.obGroup);
  }
  function gateVisual(g) {
    const mat = new THREE.MeshStandardMaterial({ color: g.color, roughness: .55, metalness: .1, emissive: g.color, emissiveIntensity: .32 });
    const fmat = new THREE.MeshStandardMaterial({ color: g.color, roughness: .8, side: THREE.DoubleSide, emissive: g.color, emissiveIntensity: .38 });
    const grp = new THREE.Group();
    const y = W.heightAt(g.c, -g.s);
    grp.position.set(g.c, y, -g.s);
    for (const sgn of [-1, 1]) {
      const pole = new THREE.Mesh(CC.gateGeo, mat); pole.position.set(sgn * g.hw, 1.05, 0); pole.castShadow = true; grp.add(pole);
      const flag = new THREE.Mesh(CC.flagGeo, fmat); flag.position.set(sgn * (g.hw - .5), 1.62, 0); flag.rotation.y = .35; flag.castShadow = true; grp.add(flag);
    }
    const band = new THREE.Mesh(CC.bandGeo, new THREE.MeshBasicMaterial({ color: g.color, transparent: true, opacity: .55 }));
    band.scale.setScalar(g.hw); band.rotation.x = Math.PI / 2; band.position.y = .06; grp.add(band);
    const arch = new THREE.Mesh(CC.archGeo, new THREE.MeshBasicMaterial({ color: g.color, transparent: true, opacity: .5 }));
    arch.scale.setScalar(g.hw); arch.position.y = .05; grp.add(arch);
    g.mat = mat; g.fmat = fmat;
    g.mesh = grp;
    CC.gateGroup.add(grp);
    return grp;
  }
  function disposeGate(g) {
    if (!g || !g.mesh) return;
    CC.gateGroup.remove(g.mesh);
    g.mesh.traverse(o => { if (o.isMesh) { if (o.material !== g.mat && o.material !== g.fmat) o.material.dispose(); } });
    if (g.mat) g.mat.dispose();
    if (g.fmat) g.fmat.dispose();
    g.mesh = null;
  }

  function buildCourse(cfg) {
    const course = {
      L: cfg.length, cfg, gates: [], coins: [], obstacles: [], ramps: [],
      genS: 40, coinIdx: 0, gateIdx: 0, closeGates: [], closeObs: [],
      rnd: U.rng((W.loc.seed * 131 + (cfg.seed || 0) * 17) | 0),
      uOff: 0, gateSpacing: cfg.gateSpacing || 46,
    };
    Game.course = course;
    courseInitVisuals();
    extendCourse(course, 900);
    return course;
  }

  /* generate gates / coins / obstacles up to s = upto */
  function extendCourse(course, upto) {
    const cfg = course.cfg, r = course.rnd;
    const hardStop = Math.min(course.L - 40, upto);
    const spacing = course.gateSpacing;
    /* gates */
    while (course.genS < hardStop) {
      const s = course.genS;
      const hwLoc = W.halfWidth(s);
      course.uOff = U.clamp(course.uOff + (r() - .5) * (cfg.mode === 'slalom' ? 15 : 13), -hwLoc * .6, hwLoc * .6);
      const hw = cfg.mode === 'slalom' ? 6.2 : 7.6;
      const g = { s, c: W.cx(s) + course.uOff, hw, i: course.gateIdx++, passed: false, missed: false, color: course.gateIdx % 2 ? 0xff3b30 : 0x2a8bff, alive: true };
      /* pop-in visual only near the player */
      course.gates.push(g);
      /* coins */
      if (r() > .2) {
        const arc = r() > .55;
        const n = arc ? 5 : 1;
        const baseU = (r() - .5) * W.halfWidth(s) * .85;
        for (let i = 0; i < n; i++) {
          course.coins.push({ s: s + 3 + i * 3.2, u: arc ? baseU + Math.sin(i / Math.max(1, n - 1) * Math.PI) * 3.2 : baseU, taken: false, spin: r() * TAU });
        }
      }
      /* obstacle roughly every other gate */
      if (r() < .32 * (cfg.danger || 1)) {
        const kind = r() < .5 ? 'rock' : (r() < .8 ? 'tree' : 'rolling');
        course.obstacles.push({ s: s + spacing * .5, u: (r() - .5) * W.halfWidth(s) * 1.4, kind, r: kind === 'tree' ? 1.15 : (kind === 'rock' ? 1.4 : 1.0), hit: false, roll: r() * TAU, mesh: null });
      }
      course.genS += spacing;
    }
    /* ramps markers */
    const rsp = W.cfg().rampSpacing;
    while (course.ramps.length * rsp < hardStop + rsp) {
      const k = course.ramps.length + 1;
      const s = (k + .5) * rsp;
      if (s > course.L - 30 || s > hardStop + rsp) break;
      const ri = W.rampInfo(s);
      course.ramps.push({ s, u: ri.u, w: W.halfWidth(s) * .55 });
    }
    /* prune old data far behind the player */
    const p = Game.player;
    const cutoff = (p ? p.s : 0) - 260;
    if (course.gates.length > 120) course.gates = course.gates.filter(g => { if (g.s < cutoff) { disposeGate(g); return false; } return true; });
    if (course.coins.length > 1200) course.coins = course.coins.filter(c => c.s > cutoff - 100);
    if (course.obstacles.length > 160) course.obstacles = course.obstacles.filter(o => { if (o.s < cutoff) { if (o.mesh) o.mesh.visible = false; return false; } return true; });
  }

  /* create / hide gate + obstacle visuals around the player */
  function updateCourseVisuals(dt) {
    const course = Game.course, p = Game.player; if (!course || !p) return;
    const near = p.s - 90, far = p.s + 520;
    let liveGates = 0;
    for (let i = 0; i < course.gates.length; i++) {
      const g = course.gates[i];
      const vis = g.s > near && g.s < far;
      if (vis && !g.mesh) gateVisual(g);
      if (!vis && g.mesh) disposeGate(g);
      if (vis) {
        liveGates++;
        /* pulse when passed */
        if (g.passed && g.mesh && !g.pulsed) {
          g.pulsed = true;
          const m = g.mesh;
          FX.tweens.push({ t0: FX.time, dur: .55, fn: (k) => { m.scale.setScalar(1 + Math.sin(k * Math.PI) * .14); if (g.mat) g.mat.emissiveIntensity = .32 + (1 - k) * 1.4; } });
        }
      }
      if (liveGates > GATE_CAP) break;
    }
    /* obstacle visuals from pool */
    let liveObs = 0;
    for (let i = 0; i < course.obstacles.length; i++) {
      const o = course.obstacles[i];
      const vis = o.s > near && o.s < far + 60;
      if (vis && !o.mesh) {
        const m = ID.make(o.kind === 'tree' ? 'snowy_pine_small' : 'snow_boulder');
        o.mesh = m; CC.obGroup.add(m);
      }
      if (o.mesh) {
        o.mesh.visible = vis;
        if (vis) {
          const x = W.cx(o.s) + o.u, z = -o.s;
          o.mesh.position.set(x, W.heightAt(x, z) - .12, z);
          if (o.kind === 'rolling') { o.roll += dt * 1.4; o.mesh.rotation.x = o.roll; o.mesh.rotation.y = 0; }
          liveObs++;
        }
      }
      if (liveObs > 60) break;
    }
    /* coins: instance near coins */
    if (coinMesh) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
      const AXIS = new THREE.Vector3(0, 1, 0);
      let n = 0;
      for (let i = 0; i < course.coins.length && n < COIN_CAP; i++) {
        const c = course.coins[i];
        if (c.taken) continue;
        if (c.s < near || c.s > far) continue;
        c.spin += dt * 3.4;
        const x = W.cx(c.s) + c.u, z = -c.s, y = W.heightAt(x, z) + .85 + Math.sin(c.spin * .8) * .07;
        q.setFromAxisAngle(AXIS, c.spin);
        v.set(x, y, z);
        m.compose(v, q, sc.set(1, 1, 1));
        coinMesh.setMatrixAt(n++, m);
      }
      coinMesh.count = n;
      coinMesh.instanceMatrix.needsUpdate = true;
    }
    /* emit snow kick from coin sparkle for nearby pickups */
  }

  /* ==================================================================
     AVALANCHE WALL (survival mode)
     ================================================================== */
  const Ava = Game.ava = { root: null, chunks: [], puff: 0 };
  function buildAvalanche() {
    if (Ava.root && Ava.root.parent) Ava.root.parent.remove(Ava.root);
    Ava.chunks.length = 0;
    Ava.root = new THREE.Group(); Ava.root.name = 'avalanche';
    const mat = new THREE.MeshStandardMaterial({ color: 0xf2f8ff, roughness: .95, metalness: 0, flatShading: true, emissive: 0x334455, emissiveIntensity: .12 });
    for (let i = 0; i < 26; i++) {
      const g = new THREE.IcosahedronGeometry(1, 0);
      const m = new THREE.Mesh(g, mat);
      m.scale.set(6 + Math.random() * 9, 4 + Math.random() * 7, 6 + Math.random() * 9);
      m.userData.off = (i % 13 - 6) * 7.5;
      m.userData.h = Math.random() * 8;
      m.userData.sp = .5 + Math.random();
      Ava.root.add(m);
      Ava.chunks.push(m);
    }
    W.root.add(Ava.root);
  }
  function updateAvalanche(dt) {
    if (!Ava.root) return;
    const p = Game.player; if (!p) return;
    const active = Game.cfg && Game.cfg.ava;
    Ava.root.visible = !!active;
    if (!active) return;
    const s0 = Game.avaS;
    for (const m of Ava.chunks) {
      const s = s0 + m.userData.h;
      const x = W.cx(Math.max(0, s)) + m.userData.off * 1.6;
      const y = W.heightAt(x, -s);
      m.position.set(x, y + m.scale.y * .55 + Math.sin(G.t * 2 * m.userData.sp + m.userData.off) * .7, -s);
      m.rotation.y += dt * .3 * m.userData.sp;
      m.rotation.x += dt * .12;
    }
    /* snow dust kicked up in front of the wall */
    Ava.puff += dt;
    if (Ava.puff > .05) {
      Ava.puff = 0;
      const x = W.cx(Math.max(0, s0)) + (Math.random() - .5) * 40;
      FX.powder(x, W.heightAt(x, -s0), -s0 + (Math.random() - .5) * 8, 2);
    }
  }
  Game.buildAvalanche = buildAvalanche;

  /* ==================================================================
     AI RIVALS
     ================================================================== */
  const AI_NAMES = ['Lena Frost', 'Marco Alpino', 'Yuki Tanaka', 'Viktor Storm', 'Sofia Rossi', 'Kai Nordmann', 'Elise Blanc', 'Rook Malone'];
  const AI_COLORS = [1, 2, 3, 6, 4, 5, 7, 0];
  function buildAI(n, base, skill) {
    Game.ai.length = 0;
    const grp = new THREE.Group(); grp.name = 'airs';
    W.root.add(grp);
    for (let i = 0; i < n; i++) {
      let mesh = null;
      try { mesh = ID.buildRiderSimple(i % 2 === 1 ? 'snowboarder' : 'skier', AI_COLORS[i % AI_COLORS.length]); } catch (e) { mesh = null; }
      if (mesh) grp.add(mesh);
      Game.ai.push({
        name: AI_NAMES[i % AI_NAMES.length],
        s: 8 + i * 4, u: (i - (n - 1) / 2) * 5, yaw: 0, spd: base * (.9 + i * .02),
        base, skill: skill * (1 - i * .035), mesh, group: grp,
        finished: false, t: 0, lane: (i - (n - 1) / 2) / Math.max(1, n - 1),
        wobble: Math.random() * 6.283, crashed: 0, tilt: 0,
      });
    }
    Game.aiGroup = grp;
  }

  function updateAI(dt) {
    const t = G.t;
    for (const a of Game.ai) {
      if (a.finished) continue;
      /* speed driven by slope + skill, with occasional slip */
      const grade = W.cfg().slope;
      const curve = Math.abs(W.cxd(a.s));
      const target = a.base * a.skill * (1 + Math.sin(t * .8 + a.wobble) * .05) * (1 - Math.min(.22, curve * .4));
      a.spd = U.damp(a.spd, target, 1.2, dt);
      a.s += a.spd * dt;
      /* weave around gates loosely */
      const cx = W.cx(a.s);
      const wander = Math.sin(a.s * .011 + a.wobble) * W.halfWidth(a.s) * .4;
      const uTarget = cx + wander + a.lane * 6;
      const u = a.u + cx * 0;
      a.u = U.damp(a.u, uTarget, .8, dt);
      /* own lateral position */
      const x = a.u, z = -a.s;
      const y = W.heightAt(x, z);
      const prevY = a.y === undefined ? y : a.y;
      a.y = U.damp(prevY, y, 22, dt);
      const dx = (W.cx(a.s + 1) - W.cx(a.s - 1)) * .5;
      a.yaw = U.damp(a.yaw, Math.atan2(dx * 2 + (uTarget - a.u) * .2, 2), 2, dt);
      if (a.mesh) {
        a.mesh.position.set(x, a.y, z);
        a.mesh.rotation.y = a.yaw;
        const slopeTilt = Math.atan2(a.y - prevY + .0001, Math.max(.001, a.spd * dt)) * .4;
        a.tilt = U.damp(a.tilt, U.clamp(-(uTarget - a.u) * .06, -.4, .4), 4, dt);
        a.mesh.rotation.z = a.tilt;
        a.mesh.rotation.x = U.clamp(slopeTilt, -.3, .3);
      }
      if (a.s >= Game.course.L || a.s >= Game.cfg.length) { a.finished = true; if (!a.t) a.t = t - Game.run.startT; }
    }
  }

  /* ==================================================================
     RUN FLOW
     ================================================================== */
  const MODES = ID.MODES = {
    race: { name: 'Downhill Race', desc: 'Beat 5 rivals to the finish line', icon: 'flag', L: 1500, gateSpacing: 52, rivals: 5, danger: 1 },
    slalom: { name: 'Slalom', desc: 'Carve through every gate. Missed gates cost 2s', icon: 'gate', L: 1000, gateSpacing: 30, rivals: 0, danger: .7 },
    time: { name: 'Time Attack', desc: 'Race the clock and your own ghost', icon: 'clock', L: 1600, gateSpacing: 46, rivals: 0, danger: .8, ghost: true },
    freestyle: { name: 'Freestyle', desc: 'Land tricks off the kickers for maximum score', icon: 'star', L: 2400, gateSpacing: 90, rivals: 0, danger: .3, time: 120 },
    endless: { name: 'Endless Descent', desc: 'How far can you ride before three crashes?', icon: 'inf', L: Infinity, gateSpacing: 60, rivals: 0, danger: 1.2, lives: 3 },
    survival: { name: 'Avalanche!', desc: 'Outrun the wall of snow. Never slow down', icon: 'warn', L: Infinity, gateSpacing: 70, rivals: 0, danger: 1.5, ava: true, lives: 2 },
  };

  Game.start = function (opts) {
    const mode = opts.mode || 'race';
    const spec = MODES[mode] || MODES.race;
    const loc = W.LOCBY[opts.loc] || W.LOCS[0];
    const diff = opts.diff || 1;
    const cfg = {
      mode, loc: loc.id, seed: opts.seed !== undefined ? opts.seed : (Date.now() % 99991),
      length: opts.length || (spec.L === Infinity ? 1e9 : Math.round(spec.L * (opts.lengthMul || 1))),
      gateSpacing: opts.gateSpacing || spec.gateSpacing,
      rivals: opts.rivals !== undefined ? opts.rivals : spec.rivals,
      danger: (spec.danger || 1) * (1 + (diff - 1) * .12),
      time: opts.time || spec.time || 0,
      lives: opts.lives !== undefined ? opts.lives : spec.lives || 0,
      maxLives: opts.lives !== undefined ? opts.lives : spec.lives || 0,
      ava: !!spec.ava, target: opts.target || 0, ghost: !!spec.ghost && ID.SV.set.ghost && !!ID.SV.ghosts[loc.id + '_' + mode],
      dm: opts.dm || 1, career: opts.career, cup: opts.cup, event: opts.event, daily: opts.daily,
      theme: opts.theme || loc.theme,
    };
    Game.cfg = cfg;
    G.cfg = cfg; G.state = 'countdown'; G.mode = mode;
    /* tear the previous run down FIRST so nothing it owns survives into the rebuild */
    teardownRun();
    if (Ava.root) { Ava.root.visible = false; }
    /* world */
    W.start(loc.id, { seed: cfg.seed % 97, gateSpacing: cfg.gateSpacing, featureMul: 1 });
    if (cfg.length < 1e8) W.buildFinish(cfg.length, cfg.length);
    FX.setTheme(cfg.theme, {});
    buildCourse(cfg);
    /* player */
    Game.player = makePlayer(cfg);
    Game.rig = Game.player.rig;
    Game.player.pos.set(W.cx(0), W.heightAt(0, 0) + .1, 0);
    Game.player.s = 0;
    Game.player.speed = 5.5;
    Game.ghostRec = [];
    Game.splits = [];
    Game.score = 0; Game.combo = 1; Game.bestCombo = 1; Game.finished = false; Game.results = null;
    Game.tricks = []; Game.countdown = 3.2; Game.finishT = 0; Game._resShown = false; Game.resultsDelay = 1.9;
    Game.run = { startT: G.t, mode, loc, cfg, time: 0, splits: [] };
    Game.avaGap = 22; Game.avaS = -8;
    Game.danger = 0;
    Game.clock = 0;
    /* avalanche */
    if (cfg.ava) buildAvalanche();
    else if (Ava.root) Ava.root.visible = false;
    /* AI */
    if (cfg.rivals > 0) {
      const base = 18.6 + diff * 1.15;
      buildAI(cfg.rivals, base, .86 + .05 * diff);
    } else { Game.ai.length = 0; Game.aiGroup = null; }
    /* ghost */
    if (cfg.ghost) {
      const g = ID.SV.ghosts[loc.id + '_' + mode];
      if (g && g.samples && g.samples.length) {
        Game.ghost = { data: g, t: 0, i: 0 };
        try { Game.ghostMesh = ID.buildRiderSimple('skier', 5); Game.ghostMesh.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .42; o.material.depthWrite = false; } }); W.root.add(Game.ghostMesh); } catch (e) { Game.ghostMesh = null; }
      }
    } else { Game.ghost = null; Game.ghostMesh = null; }
    /* fx reset */
    FX.trailBegin();
    FX.setFade(0); FX.setFade(0, true);
    FX.tweens.length = 0;
    Game.cam.mode = ID.SV.set.cam | 0;
    Game.cam.pos.set(0, Game.player.pos.y + 5, 8);
    Game.firstUpdate = true;
    ID.A.startMusic('race');
    ID.A.setIntensity(.4);
    if (ID.UI) ID.UI.enterRace();
  };

  Game.restart = function () {
    if (!Game.cfg) return;
    const c = Game.cfg;
    /* keep the player's chosen length/mode but roll a fresh course */
    const nextSeed = (c.seed * 7 + 13) % 99991;
    Game.start({
      mode: c.mode, loc: c.loc, diff: c.dm, lengthMul: 1, gateSpacing: c.gateSpacing,
      rivals: c.rivals, lives: c.maxLives || undefined, target: c.target,
      career: c.career, cup: c.cup, event: c.event, daily: c.daily, seed: nextSeed,
    });
  };
  ID.restartRun = function () { if (G.state === 'race' || G.state === 'countdown' || G.state === 'finish') Game.restart(); };

  /* ==================================================================
     PHYSICS UPDATE
     ================================================================== */
  const fwd = new V3(), right = new V3(), tmpV = new V3();
  const trailL = new V3(), trailR = new V3();
  const SNOWC = new THREE.Color();

  function crash(p, reason) {
    if (p.crashT > 0 || p.invuln > 0) return;
    p.crashT = 1.5; p.crashSpin = Math.random() * TAU;
    p.crashes++;
    p.combo = 1; p.comboT = 0; p.trickActive = false; p.spin = 0; p.flip = 0;
    p.speed *= .25; p.latV = 0;
    Game.cam.shake = 1;
    ID.A.sfx('crash'); ID.haptics(90, 1);
    FX.spray(p.pos.x, p.pos.y + .3, p.pos.z, 0, 0, 24, 3.6);
    FX.powder(p.pos.x, p.pos.y, p.pos.z, 26);
    FX.sparks(p.pos.x, p.pos.y + .6, p.pos.z, 12, 0xffffff, 4);
    if (ID.UI) ID.UI.message(reason || 'WIPEOUT!', 'bad', .9);
    ID.SV.stats.crashes++;
    /* endless lives */
    if (Game.cfg && Game.cfg.lives) {
      Game.cfg.lives--;
      if (Game.cfg.lives <= 0) setTimeout(() => Game.end('crash'), 900);
    }
  }

  function updatePlayer(dt) {
    const p = Game.player; if (!p) return;
    const IN = ID.IN;
    const cfg = Game.cfg;
    const speedMul = p.boost ? 1.25 : 1;
    const yaw0 = p.yaw;
    fwd.set(Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    right.set(Math.cos(p.yaw), 0, Math.sin(p.yaw));

    /* ---------- crash state ---------- */
    if (p.crashT > 0) {
      p.crashT -= dt;
      p.speed *= Math.max(0, 1 - dt * 2.6);
      p.pos.addScaledVector(fwd, p.speed * dt);
      p.pos.y = W.heightAt(p.pos.x, p.pos.z);
      if (p.crashT <= 0) {
        /* recover: face downhill at nearest centre */
        const s = -p.pos.z;
        p.pos.x = U.damp(p.pos.x, W.cx(s), .55, 1);
        p.yaw = Math.atan2(W.cxd(s) || 0, 1) * .5;
        p.speed = 9; p.latV = 0; p.spin = 0; p.flip = 0; p.vy = 0; p.airT = 0; p.onGround = true; p.air = false;
        p.invuln = .8;
      }
      updateRiderVisual(p, dt);
      return;
    }
    p.invuln = Math.max(0, p.invuln - dt);

    /* ---------- steering & grip ---------- */
    const grounded = p.onGround;
    p.steer = U.damp(p.steer, IN.steer, grounded ? 13 : 4, dt);
    p.edge = U.damp(p.edge, IN.edge, 8, dt);
    const steer = p.steer;
    const hw = W.halfWidth(-p.pos.z);
    const offPiste = Math.abs(p.pos.x - W.cx(-p.pos.z)) > hw;
    const ice = W.iceAt(p.pos.x, p.pos.z);
    const spd = p.speed;

    if (grounded) {
      /* turn rate drops with speed */
      const turnRate = (1.28 + p.stats.control * .035) / (1 + spd * .030) * (p.edge ? 1.35 : 1);
      p.yaw += steer * turnRate * dt * (spd > 1 ? 1 : .6);
      /* carving assist: with no input the skis naturally follow the fall line */
      if (Math.abs(steer) < .08) {
        const fall = Math.atan2(W.cxd(p.s), 1) * .55;
        const dYaw = U.wrapPi(fall - p.yaw);
        p.yaw += dYaw * Math.min(1, dt * 2.1 * (1 + spd * .03));
      }
      /* snow contact spray + sound */
      const carveAmt = Math.abs(steer) * U.clamp(spd / 18, 0, 1.4);
      if (carveAmt > .12) {
        p.trailOn = true;
        Game.particlesAcc += carveAmt * dt * (offPiste ? 130 : 85);
        if (Game.particlesAcc > 1) {
          const n = Math.min(6, Math.floor(Game.particlesAcc));
          Game.particlesAcc -= n;
          const cx = W.heightAt(p.pos.x, p.pos.z);
          FX.spray(p.pos.x + right.x * (steer > 0 ? -.5 : .5), cx + .05, p.pos.z + right.z * (steer > 0 ? -.5 : .5),
            -fwd.x * spd * .2 - right.x * steer * 4, p.pos.z, n, 1.6 + carveAmt);
        }
      }
    } else {
      /* air control */
      p.yaw += steer * 1.5 * dt;
    }

    /* ---------- forward dynamics ---------- */
    const grade = deriveGrade(p, fwd);
    p.grade = grade;
    const drag = offPiste ? .0034 : .0021;
    let accel = 0;
    if (grounded) {
      accel += grade * 13.4;                       // gravity down the slope
      if (IN.acc) { accel += p.accel * .55; p.push = U.damp(p.push, 1, 6, dt); } else p.push = U.damp(p.push, 0, 5, dt);
      if (IN.brake) accel -= 9;
      accel -= drag * spd * spd;
      if (offPiste) accel -= 1.6;
      if (ice > .5) accel += grade * 2;
    } else {
      accel -= drag * spd * spd * .4;
    }
    /* boost */
    p.boosting = false;
    if ((IN.boost || IN.boost === 1) && p.boost > .02 && grounded) {
      p.boosting = true;
      accel += 16;
      p.boost = Math.max(0, p.boost - dt * .42);
      if (Math.random() < dt * 40) FX.sparks(p.pos.x, p.pos.y + .4, p.pos.z, 1, 0x9fe8ff, 2.5);
    } else if (grounded) {
      p.boost = Math.min(1, p.boost + dt * .035);
    }
    /* deep powder walls keep the rider on the mountain */
    if (offPiste) {
      const cx = W.cx(p.s);
      const over = Math.abs(p.pos.x - cx) - hw;
      if (over > 4) {
        const push = Math.min(22, over * .75) * dt;
        p.pos.x += U.sign(cx - p.pos.x) * push;
        p.speed *= Math.max(0, 1 - dt * .55);
      }
    }
    const maxSpd = p.maxSpeed * speedMul * (offPiste ? .66 : 1) * (cfg.mode === 'survival' ? 1.12 : 1);
    p.speed = U.clamp(p.speed + accel * dt, 0, maxSpd);
    if (p.speed > p.topSpeed) p.topSpeed = p.speed;

    /* ---------- grip: velocity direction converges to heading ---------- */
    const gripK = grounded ? (p.grip * .92 * (1 - ice * .7) * (p.edge ? 1.35 : 1) / (1 + spd * .014)) : .35;
    p.latV += -steer * spd * dt * (grounded ? 2.6 : .2) * (1 - ice * .5);
    p.latV *= Math.exp(-gripK * dt);
    p.latV = U.clamp(p.latV, -14, 14);

    /* ---------- integrate position ---------- */
    fwd.set(Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    right.set(Math.cos(p.yaw), 0, Math.sin(p.yaw));
    p.pos.x += (fwd.x * p.speed + right.x * p.latV) * dt;
    p.pos.z += (fwd.z * p.speed + right.z * p.latV) * dt;

    /* ---------- vertical: free-fall + slope contact ----------
       The rider always carries horizontal momentum. Vertically we apply
       gravity every frame and only "stick" to the snow while the surface
       is close enough. When a crest or ramp lip drops away, the rider
       becomes airborne naturally with no artificial impulse.               */
    const prevY = p.pos.y;
    const gy = W.heightAt(p.pos.x, p.pos.z);
    p.groundY = gy;
    const wasGround = p.onGround;
    p.vy = Math.max(-26, p.vy - 19.5 * dt);
    p.pos.y += p.vy * dt;
    const gap = p.pos.y - gy;
    if (gap <= 0) {
      /* touching the snow */
      if (!wasGround) { land(p, gy); if (p.crashT > 0) { updateRiderVisual(p, dt); return; } }
      p.pos.y = gy; p.vy = 0;
      p.onGround = true; p.air = false; p.airT = 0;
    } else if (wasGround && gap < .3 && p.vy < .4) {
      /* glued to the slope while carving */
      p.pos.y = gy; p.vy = 0;
      p.onGround = true; p.air = false;
    } else {
      p.onGround = false; p.air = true;
      p.airT += dt;
      if (p.airT > 4.2) p.airT = 4.2;
    }
    /* explicit ollie */
    if (wasGround && IN.jumpBuf > 0 && p.speed > 1.5) {
      p.vy = 6.4 + Math.min(3.6, p.speed * .11);
      p.pos.y = gy + .02;
      p.onGround = false; p.air = true; p.airT = .0001;
      IN.jumpBuf = 0;
      ID.A.sfx('jump');
      FX.spray(p.pos.x, p.pos.y + .08, p.pos.z, 0, 0, 8, 2);
      ID.haptics(18, .4);
    }

    /* ---------- tricks ---------- */
    if (p.air) {
      if (IN.trickBuf > 0 && p.spinV === 0) { p.spinV = 7.4; IN.trickBuf = 0; p.trickActive = true; }
      if (IN.trickBuf2 > 0 && p.flipV === 0) { p.flipV = 6.9; IN.trickBuf2 = 0; p.trickActive = true; }
      if (p.spinV) p.spin += p.spinV * dt;
      if (p.flipV) p.flip += p.flipV * dt;
      if (IN.grab) p.grab = U.clamp(p.grab + dt * 3, 0, 1); else p.grab = U.damp(p.grab, 0, 6, dt);
      p.maxAir = Math.max(p.maxAir, p.airT);
    } else {
      p.spin = U.damp(p.spin, Math.round(p.spin / TAU) * TAU, 12, dt);
      p.flip = U.damp(p.flip, 0, 12, dt);
      p.spinV = 0; p.flipV = 0; p.grab = U.damp(p.grab, 0, 8, dt);
    }

    /* ---------- spin yaw from tricks ---------- */
    if (p.air && p.spin) {
      /* visual spin applied to rig, not heading */
    }
    p.s = -p.pos.z;
    p.u = p.pos.x - W.cx(p.s);
    p.dist = p.s;

    /* ---------- gates ---------- */
    checkGates(p);
    checkCoins(p, dt);
    checkObstacles(p);
    /* ---------- score / combo ---------- */
    p.comboT = Math.max(0, p.comboT - dt);
    if (p.comboT <= 0 && p.combo > 1) { p.combo = 1; }
    p.score += p.speed * dt * .55 * p.combo;

    /* ---------- sky bridge checkpoints ---------- */
    const br = W.bridgeNear(p.s);
    /* horizontal gate: ride within 11 m of the island's x/u line */
    if (br && Math.abs(p.pos.x - br.x) < 13 && Math.abs(p.pos.y - br.y) < 30) {
      br.taken = true;
      p.boost = 1; p.score += 500 * p.combo; p.combo = Math.min(9, p.combo + .5); p.comboT = 5;
      p.bestCombo = Math.max(p.bestCombo, p.combo);
      ID.SV.stats.perfect = (ID.SV.stats.perfect || 0) + 1;
      FX.ring(br.x, p.pos.y + .5, -br.s, 0x9fe8ff, 9);
      FX.sparks(br.x, p.pos.y + 1, -br.s, 26, 0x9fe8ff, 8);
      ID.A.sfx('perfect');
      if (ID.UI) ID.UI.message('SKY GATE · BOOST REFILL', 'good', 1.2);
      if (br.ring) br.ring.material.color.setHex(0x3ddc84);
    }
    /* ---------- streamed course visuals ---------- */
    updateCourseVisuals(dt);
    /* ---------- trails ---------- */
    updateTrails(p, dt);
    updateRiderVisual(p, dt);

    /* ---------- out of bounds / stuck ---------- */
    if (p.speed < .4 && p.onGround && !Game.finished && Game.clock > 2) p.stuckT = (p.stuckT || 0) + dt; else p.stuckT = 0;
    if (p.u !== undefined && Math.abs(p.u) > W.halfWidth(p.s) + 70) {
      /* far into the mountains: teleport back to piste */
      p.pos.x = W.cx(p.s); p.latV = 0;
      if (ID.UI) ID.UI.message('BACK ON PISTE', 'warn');
    }
    /* ---------- speed fx ---------- */
    if (p.speed > p.maxSpeed * .82 && p.onGround) {
      if (!p.speedFxT || G.t - p.speedFxT > 3) { p.speedFxT = G.t; ID.A.sfx('speed'); }
    }
    /* ---------- avalanche ---------- */
    if (cfg.ava) {
      const target = p.s - Game.avaGap;
      Game.avaS = U.damp(Game.avaS, target, 1.1, dt);
      const gap = p.s - Game.avaS;
      Game.danger = U.clamp(1 - gap / 40, 0, 1);
      if (gap < 3.5) {
        /* buried: lose a life and claw back in front of the wall */
        if (Game.cfg.lives > 0) {
          Game.cfg.lives--;
          Game.avaS = p.s - 30;
          crash(p, 'BURIED! ' + (Game.cfg.lives > 0 ? (Game.cfg.lives + ' LEFT') : 'LAST ONE'));
          if (Game.cfg.lives <= 0) setTimeout(() => Game.end('crash'), 700);
        } else crash(p, 'BURIED!');
      }
      if (gap < 12 && Math.random() < dt * 14) {
        FX.powder(p.pos.x + (Math.random() - .5) * 24, W.heightAt(W.cx(p.s), -p.s), p.pos.z + 6 + Math.random() * 6, 3);
      }
    } else Game.danger = 0;

    /* ---------- finish ---------- */
    if (!Game.finished && cfg.length < 1e8 && p.s >= cfg.length) {
      Game.finish('finish');
    }
    /* ---------- freestyle timer ---------- */
    if (cfg.mode === 'freestyle') {
      Game.clock += dt;
      if (Game.clock > cfg.time) Game.finish('time');
    }
  }

  function deriveGrade(p, fwd) {
    const a = 2.6;
    const y0 = W.heightAt(p.pos.x, p.pos.z);
    const y1 = W.heightAt(p.pos.x + fwd.x * a, p.pos.z + fwd.z * a);
    return U.clamp((y0 - y1) / a, -.14, 1.1);
  }

  function land(p, gy) {
    const wasAir = p.air;
    const airT = p.airT;
    if (!wasAir || airT < .12) {
      p.onGround = true; p.air = false; p.vy = 0; p.airT = 0; p.lastGroundY = gy;
      p.spin = 0; p.flip = 0; p.spinV = 0; p.flipV = 0;
      return;
    }
    p.pos.y = gy;
    /* evaluate trick landing */
    const spinN = p.spin / TAU, flipN = p.flip / TAU;
    const spinErr = Math.abs(spinN - Math.round(spinN)) * TAU;
    const flipErr = Math.abs(flipN - Math.round(flipN)) * TAU;
    const clean = spinErr < .95 && flipErr < 1.15;
    const bigAir = airT > .55;
    p.onGround = true; p.air = false;
    p.vy = 0; p.lastGroundY = gy;
    const impact = U.clamp(airT * .9 + Math.abs(p.vy) * .12 + .2, .3, 2.6);
    Game.cam.shake = Math.min(1, impact * .5);
    ID.haptics(30 + impact * 30, .6);
    if (wasAir && (p.vy < -21 || airT > 3.2)) {
      if (Math.random() < .55) { crash(p, 'HARD LANDING'); return; }
    }
    if (wasAir) {
      FX.spray(p.pos.x, p.pos.y + .1, p.pos.z, 0, 0, Math.round(10 + impact * 12), 2.6);
      FX.powder(p.pos.x, p.pos.y, p.pos.z, Math.round(4 + impact * 8));
      FX.ring(p.pos.x, p.pos.y + .1, p.pos.z, 0xbfe8ff, 5 + impact * 2);
      ID.A.sfx('land');
    }
    if (!clean && airT > .45) {
      /* sketchy landing: lose most speed, keep the line */
      p.speed *= .62;
      p.combo = Math.max(1, p.combo - .6);
      Game.cam.shake = .75;
      FX.spray(p.pos.x, p.pos.y + .2, p.pos.z, 0, 0, 22, 3.4);
      ID.A.sfx('land');
      if (ID.UI) ID.UI.message('SKETCHY LANDING', 'warn', .9);
      if (airT > 1.6 && Math.random() < .5) { crash(p, 'BAD LANDING'); return; }
      p.spin = 0; p.flip = 0; p.spinV = 0; p.flipV = 0; p.airT = 0;
      return;
    }
    if (airT > .45) {
      /* score the trick */
      const rotations = Math.round(spinN);
      const flips = Math.round(flipN);
      let score = 0, names = [];
      if (Math.abs(rotations) > 0) { const r = Math.abs(rotations); const dir = rotations > 0 ? '' : 'Switch '; score += r * 260; names.push(dir + (r * 180) + ''); }
      if (Math.abs(flips) > 0) { const f = Math.abs(flips); score += f * 360; names.push(f === 1 ? 'Frontflip' : (f + 'x Flip')); }
      if (p.grab > .25) { score += 220; names.push('Indy Grab'); }
      if (airT > 1.1) { score += 180; names.push('Huge Air'); }
      if (score > 0) {
        const label = names.length ? names.join(' + ') : 'Air';
        p.trickScore += score;
        p.score += score * p.combo;
        p.combo = Math.min(9, p.combo + (clean ? .35 : 0));
        p.bestCombo = Math.max(p.bestCombo, p.combo);
        p.airCleared = (p.airCleared || 0) + 1;
        ID.SV.stats.tricks++;
        ID.SV.stats.air = Math.max(ID.SV.stats.air || 0, airT);
        if (ID.UI) ID.UI.trick(label, rotations, flips, score);
        ID.A.sfx('trick');
        FX.confetti(p.pos.x, p.pos.y + 2, p.pos.z, 18);
        FX.sparks(p.pos.x, p.pos.y + .5, p.pos.z, 14, 0xffe08a, 5);
      } else if (airT > .5) {
        p.combo = Math.min(9, p.combo + .12);
      }
      p.boost = Math.min(1, p.boost + Math.min(.4, airT * .18));
    }
    p.spin = 0; p.flip = 0; p.spinV = 0; p.flipV = 0; p.airT = 0;
  }

  function checkGates(p) {
    const course = Game.course, gates = course.gates;
    /* keep the course generated well ahead of the player */
    if (course.genS < p.s + 700) extendCourse(course, p.s + 1500);
    let minAhead = Infinity;
    for (let i = 0; i < gates.length; i++) {
      const g = gates[i];
      if (g.passed || g.missed) continue;
      if (g.s > p.s + 2 && g.s < minAhead) minAhead = g.s;
      if (p.s >= g.s && p.s < g.s + 30) {
        const d = Math.abs(p.pos.x - g.c);
        if (d <= g.hw) {
          g.passed = true; p.gates++;
          const perfect = d < g.hw * .3;
          if (perfect) p.perfect++;
          p.score += (perfect ? 160 : 90) * p.combo;
          p.combo = Math.min(9, p.combo + (perfect ? .3 : .18));
          p.bestCombo = Math.max(p.bestCombo, p.combo);
          p.comboT = 4.5;
          p.boost = Math.min(1, p.boost + (perfect ? .07 : .04));
          ID.A.sfx(perfect ? 'perfect' : 'gate');
          FX.sparks(g.c, W.heightAt(g.c, -g.s) + 1.6, -g.s, perfect ? 16 : 8, perfect ? 0xffe08a : 0x9fe8ff, 4);
          if (ID.UI) ID.UI.gatePassed(perfect, p.gates, p.gatesTotal);
        } else if (p.s > g.s + 15) {
          g.missed = true; p.missed++;
          p.combo = 1; p.comboT = 0;
          if (Game.cfg.mode === 'slalom') { p.time += 2; Game.run.time += 2; }
          if (ID.UI) ID.UI.message('GATE MISSED +2s', 'warn', .8);
        }
      }
    }
    /* how many gates remain (for HUD) */
    p.gatesTotal = Game.cfg.length < 1e8
      ? Math.round(Math.max(1, (Game.cfg.length - 90) / course.gateSpacing))
      : p.gates + 12;
  }

  function checkCoins(p, dt) {
    const coins = Game.course.coins;
    const cx = p.pos.x, cy = p.pos.y + .8, cz = p.pos.z;
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      if (c.taken) continue;
      const ds = c.s - p.s;
      if (ds < -3 || ds > 5) continue;
      const x = W.cx(c.s) + c.u, z = -c.s;
      const y = W.heightAt(x, z) + .85;
      const dx = x - cx, dy = y - cy, dz = z - cz;
      if (dx * dx + dy * dy + dz * dz < 3.1) {
        c.taken = true; p.coins++; p.score += 30 * p.combo;
        p.boost = Math.min(1, p.boost + .03);
        ID.A.sfx('coin');
        FX.sparks(x, y, z, 6, 0xffd24a, 3);
        if (ID.UI) ID.UI.coin();
      }
    }
  }

  function checkObstacles(p) {
    const obs = Game.course.obstacles;
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (o.hit) continue;
      const ds = o.s - p.s;
      if (ds < -7 || ds > 7) continue;
      const x = W.cx(o.s) + o.u, z = -o.s;
      const dx = x - p.pos.x, dz = z - p.pos.z, dy = p.pos.y - W.heightAt(x, z);
      if (dx * dx + dz * dz < (o.r + .72) * (o.r + .72) && dy < 2.4) {
        o.hit = true;
        if (p.invuln <= 0 && p.crashT <= 0) {
          if (o.kind === 'rock' || o.kind === 'tree') crash(p, 'OBSTACLE!');
          else { p.speed *= .45; p.latV += (p.pos.x - x) * 6; ID.A.sfx('land'); Game.cam.shake = .6; }
        }
      }
    }
  }

  function updateTrails(p, dt) {
    if (!p.onGround || p.speed < 4) { if (FX.trailGroup) FX.trailGroup.visible = false; return; }
    const ice = W.iceAt(p.pos.x, p.pos.z);
    if (ice > .6 && ID.Q.trails) { /* ice: faint marks only */ }
    FX.trailGroup.visible = ID.Q.trails !== false;
    const y = p.pos.y + .05;
    fwd.set(Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    right.set(Math.cos(p.yaw), 0, Math.sin(p.yaw));
    const w = .36;
    trailL.set(p.pos.x - right.x * w, y, p.pos.z - right.z * w);
    trailR.set(p.pos.x + right.x * w, y, p.pos.z + right.z * w);
    FX.trailPoint(trailL, trailR);
  }

  function updateRiderVisual(p, dt) {
    const rig = p.rig; if (!rig) return;
    const b = rig.root;
    b.position.set(p.pos.x, p.pos.y, p.pos.z);
    /* yaw + spin trick */
    b.rotation.set(0, 0, 0);
    b.rotation.y = p.yaw + p.spin;
    if (p.crashT > 0) {
      b.rotation.z = p.crashSpin + (1.5 - p.crashT) * 9;
      b.rotation.x = (1.5 - p.crashT) * 3;
      b.position.y += Math.abs(Math.sin((1.5 - p.crashT) * 5)) * .4;
    } else {
      /* align to slope */
      const n = W.normalAt(p.pos.x, p.pos.z);
      const tiltF = p.onGround ? U.clamp(n.z * 1.4 - n.y * 0, -.25, .25) : U.clamp(p.vy * -.03, -.35, .35);
      b.rotation.x = U.damp(b.rotation.x, tiltF - (p.air ? p.vy * .02 : 0), 8, dt);
      b.rotation.z = U.damp(b.rotation.z, -p.lean * .35, 6, dt);
      if (p.air) {
        b.rotation.x += p.flip;
        b.rotation.z += p.grab * .35;
      }
    }
    p.lean = U.damp(p.lean, p.steer * U.clamp(p.speed / 20, 0, 1.2), 5, dt);
    /* pose */
    const pose = {
      tuck: U.clamp(p.speed / 32, 0, 1) * .5 + (p.edge ? .2 : 0) + (p.air ? .25 : 0) + p.grab * .3,
      carve: p.steer, air: p.air, crash: p.crashT > 0, push: p.push * (ID.IN.acc ? 1 : 0),
      t: G.t, grab: p.grab,
    };
    ID.poseRider(rig, pose, dt);
  }

  /* ==================================================================
     CAMERA
     ================================================================== */
  const camTmp = new V3(), camLook = new V3();
  const CAM_MODES = [
    { name: 'Chase', dist: 8.2, height: 3.4, look: 6.5, lookUp: 1.2, fov: 70 },
    { name: 'Cinematic', dist: 13.5, height: 6.2, look: 12, lookUp: 1.4, fov: 62 },
    { name: 'First Person', dist: -.4, height: 1.7, look: 10, lookUp: .2, fov: 78 },
  ];
  Game.camCycle = function () {
    Game.cam.mode = (Game.cam.mode + 1) % CAM_MODES.length;
    ID.SV.set.cam = Game.cam.mode; ID.save();
    if (ID.UI) ID.UI.message(CAM_MODES[Game.cam.mode].name.toUpperCase() + ' CAM', 'info', .8);
  };
  ID.camCycle = Game.camCycle;

  function updateCamera(dt) {
    const p = Game.player;
    const cam = Game.cam;
    const cm = CAM_MODES[cam.mode] || CAM_MODES[0];
    if (G.state === 'menu' || G.state === 'garage') { updateMenuCamera(dt); return; }
    if (G.state === 'finish' || G.state === 'results') {
      /* hero orbit around the finisher */
      const camera = ID.renderer3d.camera;
      const t = Game.finishT;
      const ang = p.yaw + 2.4 + t * .55;
      const rad = 9 - Math.min(2.4, t * 1.2);
      const tx = p.pos.x + Math.sin(ang) * rad, tz = p.pos.z + Math.cos(ang) * rad;
      const ty = Math.max(p.pos.y + 2.1 + t * .35, W.heightAt(tx, tz) + 1.5);
      cam.pos.x = U.damp(cam.pos.x, tx, 2.6, dt); cam.pos.y = U.damp(cam.pos.y, ty, 2.6, dt); cam.pos.z = U.damp(cam.pos.z, tz, 2.6, dt);
      cam.look.x = U.damp(cam.look.x, p.pos.x, 4, dt);
      cam.look.y = U.damp(cam.look.y, p.pos.y + 1.25, 4, dt);
      cam.look.z = U.damp(cam.look.z, p.pos.z, 4, dt);
      camera.position.copy(cam.pos); camera.lookAt(cam.look);
      camera.fov = U.damp(camera.fov, 52, 1.6, dt); camera.updateProjectionMatrix();
      cam.shake = Math.max(0, cam.shake - dt * 2.4);
      return;
    }
    fwd.set(Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const spdN = U.clamp(p.speed / 30, 0, 1.4);
    const dist = cm.dist + spdN * 2.2;
    const height = cm.height + spdN * .5;
    const target = camTmp.copy(p.pos).addScaledVector(fwd, -dist).add(new V3(0, height, 0));
    /* terrain clearance */
    const gy = W.heightAt(target.x, target.z) + 1.5;
    if (target.y < gy) target.y = gy;
    if (cam.mode === 2) {
      /* first person: head position */
      target.copy(p.pos).add(new V3(0, 1.42 - (p.tuck || 0) * .3, 0)).addScaledVector(fwd, .15);
    }
    const k = cam.mode === 2 ? 22 : 6.5;
    cam.pos.x = U.damp(cam.pos.x, target.x, k, dt);
    cam.pos.y = U.damp(cam.pos.y, target.y, cam.mode === 2 ? 26 : 9, dt);
    cam.pos.z = U.damp(cam.pos.z, target.z, k, dt);
    camLook.copy(p.pos).addScaledVector(fwd, cm.look).add(new V3(0, cm.lookUp, 0));
    if (p.crashT > 0) camLook.y += .6;
    cam.look.x = U.damp(cam.look.x, camLook.x, 9, dt);
    cam.look.y = U.damp(cam.look.y, camLook.y, 9, dt);
    cam.look.z = U.damp(cam.look.z, camLook.z, 9, dt);
    /* shake */
    cam.shake = Math.max(0, cam.shake - dt * 2.4);
    const sh = cam.shake * (ID.SV.set.shake ? 1 : 0) * .5;
    if (sh > .001) {
      cam.pos.x += (Math.random() - .5) * sh;
      cam.pos.y += (Math.random() - .5) * sh;
      cam.pos.z += (Math.random() - .5) * sh;
      ID.SV.set.shake && (cam.look.x += (Math.random() - .5) * sh * .3);
    }
    /* apply */
    const camera = ID.renderer3d.camera;
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);
    /* bank with turn */
    if (cam.mode !== 2) camera.rotation.z = U.damp(camera.rotation.z, -p.steer * .06 * U.clamp(p.speed / 25, 0, 1), 4, dt);
    else camera.rotation.z = U.damp(camera.rotation.z, -p.steer * .1, 5, dt);
    /* fov */
    const targetFov = cm.fov + spdN * 12 + (p.boosting ? 6 : 0) + (p.air ? 2 : 0);
    camera.fov = U.damp(camera.fov, targetFov, 3, dt);
    camera.updateProjectionMatrix();
    cam.fov = camera.fov;
    cam.speedN = spdN;
  }

  /* ==================================================================
     MENU DEMO — a rider carving the mountain behind the title screen
     ================================================================== */
  const Demo = Game.demo = { rig: null, s: 30, u: 0, yaw: 0, spd: 12, t: 0, sprayT: 0 };
  Game.startDemo = function () {
    Game.demoStop();
    try { Demo.rig = ID.buildRider('skier', (ID.SV.paint + 3) % ID.RIDER_COLORS.length); } catch (e) { Demo.rig = null; }
    if (!Demo.rig) return;
    W.root.add(Demo.rig.root);
    Demo.s = 26; Demo.u = 0; Demo.spd = 13; Demo.t = 0;
    Demo.yaw = 0;
  };
  Game.demoStop = function () {
    if (Demo.rig) {
      Demo.rig.root.traverse(o => { if (o.isMesh) { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); } });
      if (Demo.rig.root.parent) Demo.rig.root.parent.remove(Demo.rig.root);
      Demo.rig = null;
    }
  };
  Game.updateDemo = function (dt) {
    if (!Demo.rig) return;
    Demo.t += dt;
    const hw = W.halfWidth(Demo.s);
    Demo.u = Math.sin(Demo.t * .55) * hw * .55;
    Demo.spd = U.damp(Demo.spd, 15 + Math.sin(Demo.t * .4) * 3, 2, dt);
    Demo.s += Demo.spd * dt;
    if (Demo.s > 320) { Demo.s = 26; Demo.u = 0; }
    const x = W.cx(Demo.s) + Demo.u, z = -Demo.s;
    const y = W.heightAt(x, z);
    Demo.rig.root.position.set(x, y, z);
    const du = Math.cos(Demo.t * .55) * hw * .55 * .55;
    Demo.rig.root.rotation.y = Math.atan2(du * .55, Math.max(.4, Demo.spd)) * .8 + Math.atan2(W.cxd(Demo.s), 1) * .5;
    Demo.rig.root.rotation.z = -du * .02;
    ID.poseRider(Demo.rig, { tuck: .35, carve: -du * .06, t: Demo.t }, dt);
    /* carve spray */
    Demo.sprayT += dt;
    if (Demo.sprayT > .04) {
      Demo.sprayT = 0;
      ID.FX.spray(x, y + .06, z, 0, 0, 2, 1.1);
    }
  };

  /* cinematic menu camera */
  const menuCam = { a: 0, rad: 26, h: 9, target: new V3() };
  function updateMenuCamera(dt) {
    const camera = ID.renderer3d.camera;
    menuCam.a += dt * .12;
    const s = 6;
    const t = menuCam.target;
    t.set(W.cx(s) + Math.sin(menuCam.a) * menuCam.rad, W.heightAt(W.cx(s), -s) + menuCam.h + Math.sin(menuCam.a * .7) * 2, -s + Math.cos(menuCam.a) * menuCam.rad);
    camera.position.lerp(t, 1 - Math.exp(-2 * dt));
    camera.lookAt(W.cx(s + 26), W.heightAt(W.cx(s + 26), -(s + 26)) + 4, -(s + 26));
    camera.fov = U.damp(camera.fov, 58, 2, dt);
    camera.updateProjectionMatrix();
    camera.rotation.z = Math.sin(menuCam.a * .5) * .02;
  }
  Game.updateMenuCamera = updateMenuCamera;

  /* ==================================================================
     MAIN UPDATE
     ================================================================== */
  Game.update = function (dt) {
    if (G.state === 'menu' || G.state === 'garage' || G.state === 'boot' || G.state === 'loading') {
      updateMenuCamera(dt);
      /* menu idling: keep a demo rider carving the mountain behind the UI.
         Re-armed every time a run ends or the player returns to a menu screen. */
      if (!Demo.rig && W.root && !Game.rig) { Demo.waitT = (Demo.waitT || 0) + dt; if (Demo.waitT > .4) { Demo.waitT = 0; Game.startDemo(); } }
      Game.updateDemo(dt);
      if (W.root) W.update(dt, G.t, Game.demo.rig ? Math.max(0, Demo.s - 20) : 10, null);
      return;
    }
    if (G.state === 'countdown') {
      Game.countdown -= dt;
      if (Game.countdown <= 0) { G.state = 'race'; ID.A.startMusic('race'); ID.A.sfx('go'); }
      updatePlayerGroundOnly(dt);
      updateCamera(dt);
      return;
    }
    if (G.state === 'finish') {
      Game.finishT += dt;
      const pl = Game.player;
      if (pl && pl.crashT <= 0) {
        pl.speed = U.damp(pl.speed, reason0(Game.cfg), 2.2, dt);
        pl.pos.addScaledVector(fwd.set(Math.sin(pl.yaw), 0, -Math.cos(pl.yaw)), pl.speed * dt);
        pl.pos.y = W.heightAt(pl.pos.x, pl.pos.z);
        pl.yaw += Math.sin(Game.finishT * .7) * dt * .35;
        updateRiderVisual(pl, dt);
        if (Math.random() < dt * 6) FX.spray(pl.pos.x, pl.pos.y + .1, pl.pos.z, 0, 0, 2, 1.2);
      }
      updateAI(dt);
      updateCamera(dt);
      W.update(dt, G.t, pl ? pl.s : 0, null);
      /* slow-motion swoop: pull the camera back and to the side */
      const cm = Game.cam, cam = ID.renderer3d.camera;
      Game.cam.mode = Game.cam.mode;
      if (Game.finishT > (Game.resultsDelay || 1.9) + .55 && !Game._resShown) {
        Game._resShown = true;
        G.state = 'results';
        ID.UI.leaveRace();
        if (Game.results) ID.UI.showResults(Game.results);
        ID.A.startMusic('menu');
      }
      return;
    }
    if (G.state === 'results') {
      Game.finishT += dt;
      updateCamera(dt);
      if (Game.player) { Game.player.pos.y = W.heightAt(Game.player.pos.x, Game.player.pos.z); }
      return;
    }
    if (G.state !== 'race') { updateCamera(dt); return; }
    Game.run.time += dt;
    Game.clock += dt;
    updatePlayer(dt);
    updateAI(dt);
    updateCamera(dt);
    W.update(dt, G.t, Game.player.s, null);
    updateAvalanche(dt);
    updateGhost(dt);
    updateRank();
    /* music intensity */
    ID.A.setIntensity(U.clamp(Game.player.speed / 32, 0, 1));
    /* audio env */
    ID.A.env(Game.player.speed, Game.player.steer * U.clamp(Game.player.speed / 20, 0, 1), Game.player.air, Game.player.onGround);
    /* records ghost sampling */
    if (Game.cfg.ghost || true) {
      Game.player.ghostT += dt;
      if (Game.player.ghostT > .1) {
        Game.player.ghostT = 0;
        Game.ghostRec.push([+Game.player.s.toFixed(2), +Game.player.pos.x.toFixed(2), +Game.player.yaw.toFixed(2)]);
      }
    }
  };

  function updatePlayerGroundOnly(dt) {
    const p = Game.player; if (!p) return;
    /* idle pose during countdown, small push-in animation */
    p.yaw = U.damp(p.yaw, Math.atan2(W.cxd(0) || 0, 1) * .5, 3, dt);
    p.pos.y = W.heightAt(p.pos.x, p.pos.z);
    p.rig && (p.rig.root.position.copy(p.pos));
    updateRiderVisual(p, dt);
  }

  function updateGhost(dt) {
    if (!Game.ghost || !Game.ghostMesh) return;
    const g = Game.ghost;
    g.t += dt;
    const d = g.data.samples;
    /* find sample by time */
    while (g.i < d.length - 1 && d[g.i + 1][3] !== undefined && d[g.i + 1][3] <= g.t) g.i++;
    let cur = d[Math.min(g.i, d.length - 1)];
    let nxt = d[Math.min(g.i + 1, d.length - 1)];
    const tt = cur[3] !== undefined ? U.clamp((g.t - cur[3]) / Math.max(.01, (nxt[3] || 0) - cur[3]), 0, 1) : 0;
    const x = U.lerp(cur[1], nxt[1], tt), s = U.lerp(cur[0], nxt[0], tt);
    const yaw = U.lerp(cur[2], nxt[2], tt);
    const y = W.heightAt(x, -s);
    Game.ghostMesh.position.set(x, y, -s);
    Game.ghostMesh.rotation.y = yaw;
    Game.ghostMesh.rotation.z = Math.sin(G.t * 3) * .02;
  }

  function updateRank() {
    const p = Game.player;
    let rank = 1;
    for (const a of Game.ai) {
      if (a.s > p.s + .001) rank++;
    }
    p.rank = rank;
  }

  /* ==================================================================
     FINISH / RESULTS
     ================================================================== */
  Game.finish = function (reason) {
    if (Game.finished) return;
    Game.finished = true;
    G.state = 'finish';
    Game.finishT = 0;
    const p = Game.player;
    const cfg = Game.cfg;
    const rank = p.rank;
    const time = Game.run.time;
    let medal = 0;
    if (cfg.mode === 'race') {
      medal = rank === 1 ? 3 : rank === 2 ? 2 : rank === 3 ? 1 : 0;
    } else if (cfg.mode === 'slalom' || cfg.mode === 'time') {
      const target = cfg.target || (cfg.length / 17);
      medal = time <= target ? 3 : time <= target * 1.18 ? 2 : time <= target * 1.4 ? 1 : 0;
    } else if (cfg.mode === 'freestyle') {
      medal = p.trickScore > 8000 ? 3 : p.trickScore > 4500 ? 2 : p.trickScore > 1800 ? 1 : 0;
    } else {
      medal = p.dist > 2500 ? 3 : p.dist > 1200 ? 2 : p.dist > 500 ? 1 : 0;
    }
    /* rewards */
    const score = Math.round(p.score);
    const coinsEarned = Math.round(p.coins * 3 + score * .05 + (medal * 60) + 40);
    const xpEarned = Math.round(score * .06 + p.dist * .5 + p.gates * 8 + medal * 120 + 60);
    ID.SV.coins += coinsEarned;
    ID.SV.stats.runs++;
    ID.SV.stats.coins += p.coins;
    ID.SV.stats.dist += p.dist;
    ID.SV.stats.gates += p.gates;
    ID.SV.stats.topspeed = Math.max(ID.SV.stats.topspeed || 0, p.topSpeed);
    if (medal === 3) ID.SV.stats.golds++;
    if (rank === 1 && cfg.mode === 'race') ID.SV.stats.wins++;
    ID.SV.stats.bestCombo = Math.max(ID.SV.stats.bestCombo || 0, p.bestCombo);
    const ups = ID.addXP(xpEarned);
    /* ghost save */
    if ((cfg.mode === 'time' || cfg.mode === 'race') && cfg.length < 1e8 && Game.ghostRec.length > 8) {
      const key = cfg.loc + '_' + cfg.mode;
      const prev = ID.SV.ghosts[key];
      if (!prev || prev.time > time) {
        const samples = Game.ghostRec.filter((_, i) => i % 2 === 0).map((sm, i) => [sm[0], sm[1], sm[2], +(i * .2).toFixed(2)]);
        ID.SV.ghosts[key] = { time, samples };
      }
    }
    /* best score */
    const bkey = cfg.mode + '_' + cfg.loc;
    const prevBest = ID.SV.best[bkey] || 0;
    if (score > prevBest) ID.SV.best[bkey] = score;
    /* career */
    if (cfg.event) {
      const prev = ID.SV.career[cfg.event] || 0;
      if (medal > prev) ID.SV.career[cfg.event] = medal;
    }
    if (cfg.cup) {
      const cup = ID.SV.cup[cfg.cup] || { pts: 0, round: 0 };
      cup.pts = (cup.pts || 0) + [25, 18, 15, 12, 10, 8][Math.min(5, rank - 1)] * (medal ? 1 : .6);
      cup.round = (cup.round || 0) + 1;
      ID.SV.cup[cfg.cup] = cup;
    }
    ID.save();
    Game.results = {
      mode: cfg.mode, loc: cfg.loc, rank, time, medal, score, coins: p.coins, coinsEarned, xpEarned, ups,
      gates: p.gates, gatesTotal: Game.course.gates.length, perfect: p.perfect, missed: p.missed,
      dist: p.dist, crashes: p.crashes, maxAir: p.maxAir, topSpeed: p.topSpeed, combo: p.bestCombo,
      trickScore: p.trickScore, best: prevBest, newBest: score > prevBest, reason,
      rivals: Game.ai.map(a => ({ name: a.name, s: a.s, t: a.t })).sort((x, y) => y.s - x.s),
    };
    ID.A.sfx(medal >= 2 ? 'win' : 'lose');
    ID.A.startMusic('menu');
    FX.confetti(p.pos.x, p.pos.y + 3, p.pos.z, medal >= 2 ? 120 : 0);
    Game.resultsDelay = reason === 'crash' || reason === 'time' ? .9 : 1.9;
    if (ups > 0 && ID.UI) ID.UI.message('LEVEL UP! ' + ID.SV.level, 'good', 1.4);
  };

  function reason0(cfg) { return cfg && (cfg.mode === 'freestyle' || cfg.mode === 'endless' || cfg.mode === 'survival') ? 3.5 : 9; }
  Game.end = function (reason) {
    if (Game.finished) return;
    Game.finish(reason || 'end');
  };
  Game.pause = function () {
    G.prev = G.state;
    G.state = 'paused';
    ID.A.sfx('uiBack');
    ID.A.gsfx.gain.setTargetAtTime(0, ID.A.ctx.currentTime, .1);
  };
  Game.resume = function () {
    G.state = G.prev || 'race';
    ID.A.setVolumes();
  };

  /* reset per-run player references when a new run starts */
  function teardownRun() {
    const rig = Game.rig;
    if (rig && rig.root && rig.root.parent) rig.root.parent.remove(rig.root);
    if (rig) {
      for (const k in rig.parts) { const m = rig.parts[k]; m.geometry && m.geometry.dispose(); }
      if (rig.mats) rig.mats.forEach(m => m.dispose());
    }
    if (Game.ghostMesh) {
      Game.ghostMesh.traverse(o => { if (o.isMesh) { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); } });
      if (Game.ghostMesh.parent) Game.ghostMesh.parent.remove(Game.ghostMesh);
      Game.ghostMesh = null;
    }
    if (Game.aiGroup) {
      Game.aiGroup.traverse(o => {
        if (o.isMesh) { o.geometry && o.geometry.dispose(); }
        /* materials on AI riders are per-run clones; shared palette mats are flagged */
        if (o.isMesh && o.material && !o.material.userData.__shared) o.material.dispose();
      });
      W.root.remove(Game.aiGroup); Game.aiGroup = null;
    }
    Game.ai.length = 0;
    if (CC && CC.coinMat) { /* keep shared */ }
    Game.player = null; Game.rig = null;
  }
  Game.teardownRun = teardownRun;
  /* --- small public accessors (harness + HUD friendly) --- */
  Object.defineProperties(Game, {
    state: { get() { return G.state; }, enumerable: true },
    lives: { get() { return Game.cfg ? (Game.cfg.lives || 0) : 0; }, enumerable: true },
    maxLives: { get() { return Game.cfg ? (Game.cfg.maxLives || 0) : 0; }, enumerable: true },
    avalanche: { get() { return Ava.root && Ava.root.visible ? { s: Game.avaS, root: Ava.root, chunks: Ava.chunks.length } : null; }, enumerable: true },
  });

  /* mount / unmount helpers */
  Game.disposeRun = function () {
    teardownRun();
    Game.demoStop();
    if (W.root) W.start(ID.SV.lastLoc || 'valley', { seed: 3 });
    try { Game.startDemo(); } catch (e) { }
  };

  Game.resultsSummary = function () {
    const r = Game.results; if (!r) return '';
    return r.mode + ' · ' + (W.LOCBY[r.loc] ? W.LOCBY[r.loc].name : r.loc);
  };
})(window.ID);
