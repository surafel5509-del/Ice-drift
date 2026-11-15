/* =====================================================================
   ICE DRIFT  ·  main.js
   Renderer bootstrap · lighting rig · main loop · quality manager
   ===================================================================== */
'use strict';
(function (ID) {
  const U = ID.U, G = ID.G, FX = ID.FX;
  ID.CAMERA_FOV = 70;

  const E = ID.E = {
    ready: false, canvas: null, renderer: null, scene: null, camera: null,
    sun: null, hemi: null, amb: null, dpr: 1, resScale: 1, shadows: true,
    lastT: 0, acc: 0, frames: 0, fpsT: 0, slowFrames: 0, fastFrames: 0, autoDropped: false,
  };

  /* ------------------------------------------------------------------
     RENDERER
     ------------------------------------------------------------------ */
  function createRenderer() {
    const cv = E.canvas = document.getElementById('gl');
    const attrs = {
      canvas: cv,
      antialias: ID.Q.aa !== false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    };
    let r = null;
    try { r = new THREE.WebGLRenderer(attrs); } catch (e) { r = null; }
    if (!r) {
      try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'default' }); } catch (e) { r = null; }
    }
    if (!r) return null;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, ID.Q.dpr) * (ID.SV.set.res || 1));
    r.setSize(innerWidth, innerHeight, false);
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = ID.Q.shadow > 0;
    r.shadowMap.type = ID.Q.shadow > 1 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    r.shadowMap.autoUpdate = true;
    r.info.autoReset = false;
    r.setClearColor(0x0a1626, 1);
    return r;
  }

  /* ------------------------------------------------------------------
     LIGHTS
     ------------------------------------------------------------------ */
  function createLights() {
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.castShadow = ID.Q.shadow > 0;
    const s = 68;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 320;
    sun.shadow.mapSize.set(ID.Q.shadowSize || 2048, ID.Q.shadowSize || 2048);
    sun.shadow.bias = -0.0012;
    sun.shadow.normalBias = .035;
    E.scene.add(sun); E.scene.add(sun.target);
    E.sun = sun;
    const hemi = new THREE.HemisphereLight(0xd8ecff, 0x8fa6bc, .55);
    E.scene.add(hemi); E.hemi = hemi;
    const amb = new THREE.AmbientLight(0xffffff, .18);
    E.scene.add(amb); E.amb = amb;
    /* fill from opposite sun */
    const fill = new THREE.DirectionalLight(0x9fc8ff, .35);
    fill.position.set(-.5, .6, .7);
    E.scene.add(fill); E.fill = fill;
  }
  const LIGHTS = ID.Lights = {
    apply(theme) {
      if (!E.sun) return;
      const d = new THREE.Vector3().fromArray(theme.sunDir).normalize();
      E.sun.position.copy(d).multiplyScalar(120);
      E.sun.color.setHex(theme.sunColor);
      E.sun.intensity = theme.sunI;
      E.hemi.color.setHex(theme.hemi || theme.amb);
      E.hemi.groundColor.setHex(theme.hemiG || 0x8090a0);
      E.hemi.intensity = theme.hemiI || .5;
      E.amb.color.setHex(theme.amb);
      E.amb.intensity = theme.ambI * .35;
      if (E.fill) { E.fill.color.setHex(theme.sunColor); E.fill.intensity = theme.stars > .5 ? .22 : .4; }
      E.renderer.toneMappingExposure = theme.exposure || 1;
    },
    follow(target) {
      if (!E.sun) return;
      E.sun.target.position.copy(target);
      E.sun.position.copy(target).add(new THREE.Vector3().fromArray((FX.theme && FX.theme.sunDir) || [.4, .6, -.6]).normalize().multiplyScalar(120));
    }
  };

  /* ------------------------------------------------------------------
     RESIZE
     ------------------------------------------------------------------ */
  E.resize = function (force) {
    if (!E.renderer) return;
    const dpr = Math.min(devicePixelRatio || 1, ID.Q.dpr) * U.clamp(ID.SV.set.res || 1, .5, 1);
    E.dpr = dpr;
    const w = innerWidth, h = innerHeight;
    E.renderer.setPixelRatio(dpr);
    E.renderer.setSize(w, h, false);
    E.camera.aspect = w / Math.max(1, h);
    E.camera.updateProjectionMatrix();
    E.renderer.shadowMap.enabled = ID.Q.shadow > 0 && E.shadows;
    FX.resize(w * dpr, h * dpr, dpr);
    if (ID.UI && ID.UI.resizePreview) ID.UI.resizePreview();
  };

  /* ------------------------------------------------------------------
     QUALITY
     ------------------------------------------------------------------ */
  E.applyQuality = function () {
    const Q = ID.Q;
    if (!E.renderer) return;
    E.renderer.shadowMap.enabled = Q.shadow > 0;
    if (E.sun) {
      E.sun.castShadow = Q.shadow > 0;
      if (Q.shadow > 0) {
        E.sun.shadow.mapSize.set(Q.shadowSize, Q.shadowSize);
        if (E.sun.shadow.map) { E.sun.shadow.map.dispose(); E.sun.shadow.map = null; }
      }
    }
    /* rebuild post chain for the new profile */
    if (FX.scene) {
      FX.passes = {}; FX.composer = null;
      if (Q.post) FX.composer = FX.setupPost(E.renderer, FX.scene, E.camera);
    }
    E.resize(true);
    FX.applyQuality();
  };

  /* ------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------ */
  ID.boot = function () {
    ID.load();
    ID.applyQuality();
    ID.IN.bindKeyboard();
    if (ID.UI) ID.UI.bindTouch();
    if (ID.UI) ID.UI.renderSplash();

    const start = () => {
      ID.A.init();
      ID.UI.renderLoading();
      E.scene = new THREE.Scene();
      E.camera = new THREE.PerspectiveCamera(ID.CAMERA_FOV, innerWidth / Math.max(1, innerHeight), .1, 6000);
      E.camera.position.set(0, 12, 26);
      E.camera.lookAt(0, 0, 0);
      ID.renderer3d = { renderer: E.renderer, scene: E.scene, camera: E.camera };
      createLights();
      FX.init(E.renderer, E.scene, E.camera);
      FX.composer = FX.setupPost(E.renderer, E.scene, E.camera);
      E.resize(true);
      addEventListener('resize', () => E.resize());
      addEventListener('orientationchange', () => setTimeout(() => E.resize(true), 250));
      /* world */
      ID.World.init(E.scene);
      ID.FX.setTheme('day', {});
      ID.Lights.apply(FX.theme);
      progress(.02, 'Loading 3D models…');
      ID.Models.load((p, msg) => { progress(.02 + p * .93, msg); })
        .then(() => {
          progress(.97, 'Building the mountain…');
          ID.World.start(ID.SV.lastLoc || 'valley', { seed: 3 });
          ID.FX.setTheme((ID.World.LOCBY[ID.SV.lastLoc] || ID.World.LOCS[0]).theme, {});
          ID.Lights.apply(FX.theme);
          ID.G.state = 'menu';
          E.ready = true;
          progress(1, 'Ready');
          setTimeout(() => {
            ID.UI.renderMenu();
            if (!ID.SV.tut) { ID.SV.tut = true; ID.save(); }
            ID.toast('Welcome to Ice Drift', 'good', ID.UI.ic('snow'));
          }, 260);
          requestAnimationFrame(loop);
        })
        .catch(err => {
          console.error(err);
          progress(1, 'Failed: ' + err.message);
          showError(err);
        });
    };

    E.renderer = createRenderer();
    if (!E.renderer) { showError(new Error('WebGL is not available')); return; }
    ID.A.init && 0;
    /* click anywhere on splash starts audio + game */
    start();
  };

  function progress(p, msg) { if (ID.UI && ID.UI.loadProgress) ID.UI.loadProgress(p, msg); }
  function showError(err) {
    const c = document.getElementById('compat');
    if (!c) return;
    c.style.display = 'flex';
    c.innerHTML = '<div><h1>ICE DRIFT</h1><p>This browser could not start the 3D engine.</p><p class="dim">' + (err && err.message ? err.message : '') +
      '</p><p class="dim">WebGL 2 is required. Try Chrome, Edge, Firefox or Safari with hardware acceleration enabled.</p></div>';
  }

  /* ------------------------------------------------------------------
     LOOP
     ------------------------------------------------------------------ */
  let last = 0, fpsAcc = 0, fpsN = 0, fpsT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!E.ready) return;
    now = now || performance.now();
    let dt = (now - last) / 1000;
    if (last === 0) dt = .016;
    last = now;
    if (dt > .1) dt = .1;
    if (dt <= 0) dt = .001;
    G.t += dt; G.frame++;
    /* fps */
    fpsAcc += dt; fpsN++;
    if (fpsAcc > .5) {
      G.fps = fpsN / fpsAcc;
      E.dpr = E.dpr;
      fpsAcc = 0; fpsN = 0;
      autoTune(G.fps);
      const fe = document.getElementById('debugStats');
      if (ID.SV.set.fps && fe) fe.style.display = 'block';
    }
    if (ID.SV.set.fps === false) { const fe = document.getElementById('debugStats'); if (fe) fe.style.display = 'none'; }
    /* input */
    ID.IN.poll(dt);
    if (ID.G.paused || G.state === 'paused') {
      ID.Game.update(0);
      FX.update(dt, E.camera, { speedFx: 0 });
      ID.UI.tick(dt, G.t);
      E.renderer.info.reset();
      FX.render();
      return;
    }
    /* update */
    ID.Game.update(dt);
    FX.update(dt, E.camera, {
      speedFx: (G.state === 'race' && ID.Game.player) ? U.clamp((ID.Game.player.speed - 16) / 22, 0, 1) * (ID.SV.set.motionblur ? 1 : .25) : 0,
      damage: ID.Game.danger,
    });
    /* lights follow player */
    const focus = ID.Game.player ? ID.Game.player.pos : new THREE.Vector3(0, W0(), 0);
    ID.Lights.follow(focus);
    /* trail color from gear */
    if (FX.trailL) FX.trailL.mesh.material.uniforms.uColor.value.setHex(ID.trailColor());
    if (FX.trailR) FX.trailR.mesh.material.uniforms.uColor.value.setHex(ID.trailColor());
    ID.UI.tick(dt, G.t);
    /* render */
    E.renderer.info.reset();
    FX.render();
    if (G.state === 'race') ID.checkAchievements();
  }
  function W0() { return ID.World && ID.World.loc ? ID.World.heightAt(0, 0) : 0; }

  /* dynamic resolution / quality drops when the device struggles */
  let tuneAcc = 0;
  function autoTune(fps) {
    if (ID.SV.set.quality !== 'auto') return;
    tuneAcc++;
    if (tuneAcc < 6) return;
    if (fps < 28 && E.dpr > .8) { E.dprScale = Math.max(.7, (E.dprScale || 1) - .08); E.renderer.setPixelRatio(E.dprScale * Math.min(devicePixelRatio, 1.4)); }
    else if (fps > 55 && E.dprScale && E.dprScale < 1) { E.dprScale = Math.min(1, E.dprScale + .04); E.renderer.setPixelRatio(E.dprScale * Math.min(devicePixelRatio, 1.4)); }
  }

  /* ------------------------------------------------------------------
     GLOBAL KEYS / VISIBILITY
     ------------------------------------------------------------------ */
  ID.togglePause = function () {
    if (G.state === 'race' || G.state === 'countdown') { ID.Game.pause(); ID.UI.showPause(); }
    else if (G.state === 'paused') { ID.UI.hidePause(); ID.Game.resume(); }
  };
  ID.toggleMute = function () {
    const m = ID.A.toggleMute();
    if (ID.toast) ID.toast(m ? 'Sound off' : 'Sound on', 'info');
    const b = document.getElementById('bMute');
    if (b) b.innerHTML = ID.UI.ic(m ? 'mute' : 'sound');
  };
  ID.showHelp = function () { ID.UI.renderHelp(); };

  addEventListener('visibilitychange', () => {
    if (document.hidden && (G.state === 'race' || G.state === 'countdown')) ID.togglePause();
  });
  addEventListener('gamepadconnected', () => { if (ID.toast) ID.toast('Gamepad connected', 'info', ID.UI.ic('play')); });
  addEventListener('error', (e) => {
    if (ID.G.debug) console.error(e.error || e.message);
  });

  /* prevent accidental gestures */
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('contextmenu', e => {
    if (e.target && e.target.id === 'gl') e.preventDefault();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => ID.boot());
  else ID.boot();
})(window.ID);
