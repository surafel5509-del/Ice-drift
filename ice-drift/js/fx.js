/* =====================================================================
   ICE DRIFT  ·  fx.js
   Sky / aurora / clouds · GPU snowfall · particle systems ·
   ski trails · post-processing (bloom, grade, speed blur, vignette)
   ===================================================================== */
'use strict';
(function (ID) {
  const U = ID.U;
  const FX = ID.FX = {
    ready: false, time: 0, theme: null, particles: {}, sprites: {},
    trails: [], snowLayers: [], clouds: [], fires: [], motes: null,
    composer: null, passes: {}, envMap: null, renderTarget: null,
    quality: 'high',
  };

  /* ------------------------------------------------------------------
     THEMES
     ------------------------------------------------------------------ */
  const THEMES = FX.THEMES = {
    day: {
      skyTop: 0x2b6fd0, skyMid: 0x76b6ef, horizon: 0xd6e9fb, sunColor: 0xfff2d6, sunDir: [0.42, 0.5, -0.75], sunI: 2.6,
      fog: 0xcfe4f7, fogNear: .0009, fogDensity: .0011, amb: 0x9cc4e8, ambI: .62, hemi: 0xe8f4ff, hemiG: 0x93aabd, hemiI: .55,
      stars: 0, aurora: 0, clouds: .8, snow: 1, snowTint: 0xffffff, exposure: 1.0, bloom: .42, sun: 1, moon: 0, snowSpeed: 1, godrays: .35,
      groundTint: 0xffffff,
    },
    dawn: {
      skyTop: 0x1e3a72, skyMid: 0x8f6ea8, horizon: 0xffc39a, sunColor: 0xffd6a3, sunDir: [0.7, 0.12, -0.6], sunI: 2.2,
      fog: 0xf2c5a8, fogNear: .0008, fogDensity: .0014, amb: 0xb79ec8, ambI: .55, hemi: 0xffd9c0, hemiG: 0x7f7f99, hemiI: .5,
      stars: .3, aurora: 0, clouds: .7, snow: 1, snowTint: 0xffe6d8, exposure: 1.05, bloom: .55, sun: 1, moon: 0, snowSpeed: .8,
      groundTint: 0xffe8e0,
    },
    sunset: {
      skyTop: 0x241d52, skyMid: 0xa04a70, horizon: 0xff9a52, sunColor: 0xffb066, sunDir: [0.78, 0.16, -0.42], sunI: 2.4,
      fog: 0xe8a073, fogNear: .0007, fogDensity: .0015, amb: 0xc08aa0, ambI: .5, hemi: 0xffb894, hemiG: 0x6b5a72, hemiI: .48,
      stars: .12, aurora: 0, clouds: .8, snow: 1, snowTint: 0xffd8c4, exposure: 1.02, bloom: .62, sun: 1, moon: 0, snowSpeed: .9,
      groundTint: 0xffd9c9,
    },
    overcast: {
      skyTop: 0x7f9bb5, skyMid: 0xb4c8d8, horizon: 0xdde7ef, sunColor: 0xe8f0f8, sunDir: [0.1, 0.72, -0.4], sunI: 1.5,
      fog: 0xccd9e4, fogNear: .001, fogDensity: .0017, amb: 0xc6d5e2, ambI: .72, hemi: 0xe8f1f8, hemiG: 0x9aabba, hemiI: .7,
      stars: 0, aurora: 0, clouds: 1, snow: 1.5, snowTint: 0xffffff, exposure: 1.0, bloom: .3, sun: .3, moon: 0, snowSpeed: 1.15,
      groundTint: 0xffffff,
    },
    storm: {
      skyTop: 0x6a7f92, skyMid: 0x93a7b7, horizon: 0xc0cdd8, sunColor: 0xdfe9f2, sunDir: [0.2, 0.6, -0.5], sunI: 1.1,
      fog: 0xb8c6d3, fogNear: .0012, fogDensity: .0034, amb: 0xc9d6e2, ambI: .82, hemi: 0xdfe9f2, hemiG: 0x93a3b2, hemiI: .8,
      stars: 0, aurora: 0, clouds: 1, snow: 3.2, snowTint: 0xffffff, exposure: .98, bloom: .28, sun: .18, moon: 0, snowSpeed: 2.4,
      groundTint: 0xffffff,
    },
    dusk: {
      skyTop: 0x121b3c, skyMid: 0x35497e, horizon: 0xc46f7e, sunColor: 0xffbca0, sunDir: [-0.6, 0.14, -0.5], sunI: 1.1,
      fog: 0x7a7aa0, fogNear: .0008, fogDensity: .0018, amb: 0x7d86b8, ambI: .45, hemi: 0x9aa6d8, hemiG: 0x4d5470, hemiI: .4,
      stars: .55, aurora: .2, clouds: .5, snow: 1, snowTint: 0xdfe6ff, exposure: 1.05, bloom: .58, sun: .5, moon: .4, snowSpeed: .9,
      groundTint: 0xe6e9ff,
    },
    night: {
      skyTop: 0x02060f, skyMid: 0x0a1a38, horizon: 0x183454, sunColor: 0xaec8ff, sunDir: [-0.35, 0.55, -0.5], sunI: .55,
      fog: 0x0d1f36, fogNear: .0009, fogDensity: .0019, amb: 0x4b6a9c, ambI: .32, hemi: 0x7ea0d8, hemiG: 0x24304a, hemiI: .3,
      stars: 1, aurora: .35, clouds: .25, snow: 1, snowTint: 0xd8e4ff, exposure: 1.18, bloom: .8, sun: .25, moon: 1, snowSpeed: .8,
      groundTint: 0xdfe8ff,
    },
    aurora: {
      skyTop: 0x01040c, skyMid: 0x07162e, horizon: 0x0f2a44, sunColor: 0x9fe8ff, sunDir: [-0.3, 0.6, -0.55], sunI: .5,
      fog: 0x0a2038, fogNear: .0009, fogDensity: .0017, amb: 0x4a7a94, ambI: .36, hemi: 0x88c8d8, hemiG: 0x1e2c40, hemiI: .34,
      stars: 1, aurora: 1, clouds: .2, snow: 1, snowTint: 0xd8fff4, exposure: 1.2, bloom: .95, sun: .2, moon: 1, snowSpeed: .8,
      groundTint: 0xd8fff0,
    },
    midnight: {
      skyTop: 0x000206, skyMid: 0x040c1c, horizon: 0x0a1a30, sunColor: 0x88aaff, sunDir: [0.2, 0.7, -0.3], sunI: .4,
      fog: 0x061224, fogNear: .0012, fogDensity: .0022, amb: 0x3a5a8a, ambI: .28, hemi: 0x6a90c8, hemiG: 0x161e2e, hemiI: .26,
      stars: 1, aurora: .6, clouds: .15, snow: 1, snowTint: 0xc8d8ff, exposure: 1.25, bloom: .9, sun: .15, moon: 1, snowSpeed: .7,
      groundTint: 0xd0dcff,
    },
  };

  /* ------------------------------------------------------------------
     PROCEDURAL TEXTURES
     ------------------------------------------------------------------ */
  function canvasTex(size, draw, opts) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    draw(g, size);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    if (opts && opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
    t.needsUpdate = true;
    return t;
  }
  const TEX = FX.tex = {};
  function buildTextures() {
    TEX.puff = canvasTex(128, (g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(.35, 'rgba(255,255,255,.85)');
      grd.addColorStop(.7, 'rgba(255,255,255,.22)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
    });
    TEX.spark = canvasTex(64, (g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(.25, 'rgba(255,255,255,.95)');
      grd.addColorStop(.55, 'rgba(255,255,255,.25)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(s / 2, 2); g.lineTo(s / 2, s - 2); g.moveTo(2, s / 2); g.lineTo(s - 2, s / 2); g.stroke();
    });
    TEX.flake = canvasTex(64, (g, s) => {
      g.translate(s / 2, s / 2);
      g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        g.rotate(Math.PI / 3);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, s * .42); g.stroke();
        g.beginPath(); g.moveTo(0, s * .22); g.lineTo(s * .1, s * .16); g.moveTo(0, s * .3); g.lineTo(-s * .09, s * .24); g.stroke();
      }
    });
    TEX.cloud = canvasTex(256, (g, s) => {
      g.clearRect(0, 0, s, s);
      const r = U.rng(7);
      for (let i = 0; i < 26; i++) {
        const x = s * (.15 + r() * .7), y = s * (.4 + r() * .3), rad = s * (.1 + r() * .22);
        const grd = g.createRadialGradient(x, y, 0, x, y, rad);
        grd.addColorStop(0, 'rgba(255,255,255,' + (.24 + r() * .3) + ')');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
      }
    });
    TEX.flare = canvasTex(256, (g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, 'rgba(255,250,235,1)');
      grd.addColorStop(.12, 'rgba(255,245,220,.85)');
      grd.addColorStop(.35, 'rgba(255,225,180,.22)');
      grd.addColorStop(1, 'rgba(255,200,140,0)');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(255,240,210,.22)'; g.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(s / 2, s / 2); const a = i / 6 * 7 + .3; g.lineTo(s / 2 + Math.cos(a) * s / 2, s / 2 + Math.sin(a) * s / 2); g.stroke(); }
    });
    TEX.smoke = TEX.puff;
    TEX.streak = canvasTex(128, (g, s) => {
      const grd = g.createLinearGradient(0, 0, s, 0);
      grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(.5, 'rgba(255,255,255,.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, s * .42, s, s * .16);
    });
    TEX.glow = canvasTex(128, (g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.4, 'rgba(255,255,255,.4)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
    });
  }

  /* ------------------------------------------------------------------
     SKY DOME
     ------------------------------------------------------------------ */
  const SKY_VS = `
    varying vec3 vDir;
    void main(){
      vDir = normalize(position);
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      gl_Position = projectionMatrix * mv;
    }`;
  const SKY_FS = `
    precision highp float;
    varying vec3 vDir;
    uniform vec3 uTop, uMid, uHorizon, uSunColor, uSunDir, uGround;
    uniform float uSunI, uStars, uAurora, uTime, uCloud, uMoon, uGodrays;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
      return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
    }
    float fbm(vec2 p){
      float v=0.0, a=0.5;
      for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; }
      return v;
    }
    void main(){
      vec3 d = normalize(vDir);
      float h = clamp(d.y, -1.0, 1.0);
      float hh = max(h, 0.0);
      // gradient sky
      vec3 col = mix(uHorizon, uMid, pow(hh, 0.42));
      col = mix(col, uTop, pow(hh, 1.25));
      // below horizon haze
      col = mix(col, uGround, clamp(-h*3.0, 0.0, 1.0)*0.9);
      // sun / moon
      float sd = max(dot(d, normalize(uSunDir)), 0.0);
      float sunDisc = smoothstep(0.9993, 0.99985, sd);
      float sunGlow = pow(sd, 220.0)*1.6 + pow(sd, 18.0)*0.28 + pow(sd, 4.0)*0.06;
      col += uSunColor * (sunGlow*uSunI*0.55 + sunDisc*uSunI*1.4);
      // god ray wedge
      float rays = 0.0;
      if(uGodrays > 0.001){
        vec2 sp = normalize(uSunDir.xz + vec2(0.0001));
        vec2 dp = normalize(d.xz + vec2(0.0001));
        float ang = acos(clamp(dot(sp, dp), -1.0, 1.0));
        rays = pow(max(0.0, 1.0 - ang*1.8), 4.0) * pow(sd, 1.5) * (0.5 + 0.5*noise(vec2(ang*40.0, uTime*0.15)));
      }
      col += uSunColor * rays * uGodrays * 0.16;
      // moon
      float md = max(dot(d, normalize(-uSunDir + vec3(0.3,0.5,0.1))), 0.0);
      col += vec3(0.75,0.85,1.0) * (smoothstep(0.9995,0.99985,md)*1.3 + pow(md,90.0)*0.22) * uMoon;
      // stars
      if(uStars > 0.001 && d.y > -0.05){
        vec2 uv = vec2(atan(d.z,d.x)*2.6, d.y*7.0);
        float s1 = hash(floor(uv*90.0));
        float tw = 0.55 + 0.45*sin(uTime*2.2 + s1*40.0);
        float star = smoothstep(0.9975, 1.0, s1) * tw;
        float s2 = hash(floor(uv*220.0)+7.7);
        star += smoothstep(0.9988, 1.0, s2)*0.7;
        // milky band
        float band = exp(-pow((uv.y-0.34)*3.4,2.0))*0.5;
        float neb = fbm(uv*7.0)*0.35;
        col += vec3(0.82,0.9,1.0) * (star*1.6 + band*neb*0.22) * uStars * smoothstep(-0.05,0.25,d.y);
      }
      // aurora curtains
      if(uAurora > 0.001){
        float a = 0.0;
        for(int i=0;i<3;i++){
          float fi = float(i);
          vec2 uv2 = vec2(atan(d.z,d.x)*(1.0+fi*0.35) + fi*3.7, d.y*3.0 - 0.4);
          float n = fbm(uv2*1.6 + vec2(uTime*0.045 + fi*1.3, uTime*0.02));
          float band = smoothstep(0.42, 0.95, n) * smoothstep(0.02, 0.35, d.y) * smoothstep(0.85, 0.42, d.y);
          vec3 ac = mix(vec3(0.12,0.95,0.62), vec3(0.35,0.55,1.0), fi*0.4 + n*0.3);
          a += band * (0.7 + 0.3*sin(uTime*0.7+fi));
          col += ac * band * 0.55;
        }
        col += vec3(0.1,0.4,0.3) * a * 0.12;
      }
      // cloud veil
      if(uCloud > 0.001 && d.y > 0.0){
        vec2 cuv = d.xz / max(d.y + 0.18, 0.06) * 0.65 + vec2(uTime*0.006, uTime*0.003);
        float c = fbm(cuv*1.3);
        c = smoothstep(0.42, 0.92, c) * uCloud;
        float sunlit = 1.0 + pow(sd, 6.0)*2.4;
        col = mix(col, mix(vec3(0.86,0.9,0.96), uSunColor, 0.35) * (0.82 + 0.3*sunlit*0.4), c*0.62*smoothstep(0.0,0.25,d.y));
      }
      // horizon glow band
      float bandGlow = exp(-pow((h-0.02)*14.0, 2.0)) * pow(sd, 3.0);
      col += uSunColor * bandGlow * 0.22;
      gl_FragColor = vec4(col, 1.0);
    }`;
  function makeSky(theme) {
    const geo = new THREE.SphereGeometry(4000, 32, 20);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(theme.skyTop) },
        uMid: { value: new THREE.Color(theme.skyMid) },
        uHorizon: { value: new THREE.Color(theme.horizon) },
        uSunColor: { value: new THREE.Color(theme.sunColor) },
        uSunDir: { value: new THREE.Vector3().fromArray(theme.sunDir).normalize() },
        uGround: { value: new THREE.Color(theme.fog) },
        uSunI: { value: theme.sunI * .55 }, uStars: { value: theme.stars }, uAurora: { value: theme.aurora },
        uTime: { value: 0 }, uCloud: { value: theme.clouds }, uMoon: { value: theme.moon || 0 }, uGodrays: { value: theme.godrays || 0 },
      },
      vertexShader: SKY_VS, fragmentShader: SKY_FS,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false; m.renderOrder = -1000; m.name = 'sky';
    return m;
  }

  /* ------------------------------------------------------------------
     GPU SNOWFALL — 3 depth layers, wrap around camera
     ------------------------------------------------------------------ */
  const SNOW_VS = `
    attribute vec3 aSeed;
    attribute float aSize;
    attribute float aSpeed;
    uniform float uTime, uBox, uFall, uSpeed, uWindX, uWindZ, uScale;
    uniform vec3 uCam;
    varying float vAlpha;
    varying float vFlip;
    void main(){
      vec3 p = aSeed * uBox;
      p.y -= uTime * aSpeed * uSpeed * 6.0;
      p.x += sin(uTime*0.7 + aSeed.z*9.0)*1.4 + uTime*uWindX*4.0;
      p.z += cos(uTime*0.5 + aSeed.y*7.0)*1.2 + uTime*uWindZ*4.0;
      p = mod(p, vec3(uBox, uBox*0.9, uBox));
      vec3 w = p + vec3(uCam.x - uBox*0.5, uCam.y - uBox*0.32, uCam.z - uBox*0.5);
      vec4 mv = viewMatrix * vec4(w,1.0);
      gl_Position = projectionMatrix * mv;
      float dist = -mv.z;
      gl_PointSize = aSize * uScale / max(dist, 0.6);
      gl_PointSize = clamp(gl_PointSize, 1.0, 34.0);
      vAlpha = smoothstep(0.0, 6.0, dist) * (1.0 - smoothstep(uBox*0.34, uBox*0.5, dist)) * 0.85;
      vFlip = 0.0;
    }`;
  const SNOW_FS = `
    precision mediump float;
    uniform vec3 uTint;
    uniform float uOpacity;
    varying float vAlpha;
    void main(){
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if(d > 0.5) discard;
      float a = smoothstep(0.5, 0.06, d) * vAlpha * uOpacity;
      gl_FragColor = vec4(uTint, a);
    }`;
  function makeSnow(theme) {
    const layers = [];
    const Q = ID.Q;
    const conf = [
      { n: Math.round(Q.snowfall * .5), box: 34, size: 1.6, speed: .7, op: .95 },
      { n: Math.round(Q.snowfall * .32), box: 60, size: 2.6, speed: 1.0, op: .75 },
      { n: Math.round(Q.snowfall * .18), box: 110, size: 4.2, speed: 1.4, op: .5 },
    ];
    for (const c of conf) {
      const g = new THREE.BufferGeometry();
      const seed = new Float32Array(c.n * 3), size = new Float32Array(c.n), sp = new Float32Array(c.n);
      for (let i = 0; i < c.n; i++) { seed[i * 3] = Math.random(); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random(); size[i] = c.size * (.55 + Math.random() * .9); sp[i] = c.speed * (.6 + Math.random() * .8); }
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(c.n * 3), 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      g.setAttribute('aSpeed', new THREE.BufferAttribute(sp, 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uBox: { value: c.box }, uFall: { value: 1 }, uSpeed: { value: theme.snowSpeed },
          uWindX: { value: .12 }, uWindZ: { value: -.08 }, uCam: { value: new THREE.Vector3() },
          uScale: { value: 620 }, uTint: { value: new THREE.Color(theme.snowTint) }, uOpacity: { value: c.op * Math.min(theme.snow, 2) },
        },
        vertexShader: SNOW_VS, fragmentShader: SNOW_FS,
        transparent: true, depthWrite: false, blending: THREE.NormalBlending, fog: false,
      });
      const pts = new THREE.Points(g, mat);
      pts.frustumCulled = false; pts.renderOrder = 800;
      layers.push(pts);
    }
    return layers;
  }

  /* ------------------------------------------------------------------
     CLOUD BILLBOARDS
     ------------------------------------------------------------------ */
  function makeClouds(theme) {
    const grp = new THREE.Group(); grp.name = 'clouds';
    const r = U.rng(99);
    const n = 26;
    for (let i = 0; i < n; i++) {
      const m = new THREE.SpriteMaterial({
        map: TEX.cloud, transparent: true, depthWrite: false, fog: false,
        color: new THREE.Color(theme.horizon).lerp(new THREE.Color(0xffffff), .55),
        opacity: .32 + r() * .38,
      });
      const s = new THREE.Sprite(m);
      const ang = r() * Math.PI * 2, rad = 700 + r() * 1400;
      s.position.set(Math.cos(ang) * rad, 180 + r() * 420, Math.sin(ang) * rad);
      const sc = 420 + r() * 640;
      s.scale.set(sc, sc * (.34 + r() * .2), 1);
      s.userData.drift = .4 + r() * .8;
      s.renderOrder = -500;
      grp.add(s);
    }
    return grp;
  }

  /* ------------------------------------------------------------------
     PARTICLES — pooled ring buffer, GPU-animated
     ------------------------------------------------------------------ */
  const PVS = `
    attribute vec3 aVel;
    attribute float aBirth;
    attribute float aLife;
    attribute float aSize;
    attribute float aRot;
    attribute float aGrow;
    attribute float aDrag;
    attribute vec3 aColor;
    uniform float uTime, uScale, uGrav, uPixel;
    varying float vA;
    varying float vT;
    varying float vRot;
    varying vec3 vCol;
    void main(){
      float age = uTime - aBirth;
      float t = clamp(age / aLife, 0.0, 1.0);
      float dt = age;
      float dragK = max(aDrag, 0.001);
      float dispF = (1.0 - exp(-dragK*dt))/dragK;
      vec3 p = position + aVel * dispF;
      p.y -= 0.5 * uGrav * dt * dt * (1.0 - min(t,1.0)*0.35);
      vec4 mv = viewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float dist = max(-mv.z, 0.4);
      gl_PointSize = aSize * uScale * mix(1.0, aGrow, t) / dist;
      gl_PointSize = clamp(gl_PointSize, 1.0, 300.0);
      vA = (1.0 - t) * smoothstep(0.0, 0.055, t) * smoothstep(0.0, 1.2, dist);
      vT = t; vRot = aRot; vCol = aColor;
    }`;
  const PFS = `
    precision mediump float;
    uniform sampler2D uTex;
    uniform vec3 uColor;
    uniform float uOpacity, uAdd, uSpin;
    varying float vA;
    varying float vT;
    varying float vRot;
    varying vec3 vCol;
    void main(){
      vec2 uv = gl_PointCoord - 0.5;
      float c = cos(vRot + vT*uSpin), s = sin(vRot + vT*uSpin);
      uv = mat2(c,-s,s,c) * uv + 0.5;
      vec4 tx = texture2D(uTex, uv);
      float a = tx.a * vA * uOpacity;
      if(a < 0.004) discard;
      vec3 col = uColor * vCol * tx.rgb;
      if(uAdd > 0.5) gl_FragColor = vec4(col * a, a);
      else gl_FragColor = vec4(col, a);
    }`;

  function ParticleSystem(cap, opts) {
    opts = opts || {};
    const g = new THREE.BufferGeometry();
    this.cap = cap;
    const pos = new Float32Array(cap * 3), vel = new Float32Array(cap * 3);
    const birth = new Float32Array(cap).fill(-1e5), life = new Float32Array(cap).fill(1);
    const size = new Float32Array(cap), rot = new Float32Array(cap), grow = new Float32Array(cap).fill(1), drag = new Float32Array(cap).fill(1);
    const col = new Float32Array(cap * 3).fill(1);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    g.setAttribute('aBirth', new THREE.BufferAttribute(birth, 1));
    g.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aRot', new THREE.BufferAttribute(rot, 1));
    g.setAttribute('aGrow', new THREE.BufferAttribute(grow, 1));
    g.setAttribute('aDrag', new THREE.BufferAttribute(drag, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uScale: { value: 700 }, uGrav: { value: opts.grav !== undefined ? opts.grav : 9 },
        uTex: { value: opts.tex || TEX.puff }, uColor: { value: new THREE.Color(0xffffff) }, uOpacity: { value: opts.opacity || 1 },
        uAdd: { value: opts.add ? 1 : 0 }, uSpin: { value: opts.spin || 0 },
      },
      vertexShader: PVS, fragmentShader: PFS,
      transparent: true, depthWrite: false, blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = opts.add ? 850 : 810;
    this.geo = g; this.mat = mat;
    this.pos = pos; this.vel = vel; this.birth = birth; this.life = life; this.size = size; this.rot = rot; this.grow = grow; this.drag = drag; this.col = col;
    this.head = 0; this.active = 0;
    this.dirty = false;
    this.conf = opts;
  }
  ParticleSystem.prototype.emit = function (x, y, z, vx, vy, vz, lifespan, sz, o) {
    const i = this.head; this.head = (this.head + 1) % this.cap;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.birth[i] = FX.time; this.life[i] = lifespan; this.size[i] = sz;
    this.rot[i] = Math.random() * 6.283;
    this.grow[i] = o && o.grow !== undefined ? o.grow : 1.6;
    this.drag[i] = o && o.drag !== undefined ? o.drag : 2.2;
    if (o && o.color) { const c = o.color; this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b; }
    else { this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 1; }
    this.dirty = true;
  };
  ParticleSystem.prototype.update = function (t) {
    this.mat.uniforms.uTime.value = t;
    if (this.dirty) {
      for (const k of ['position', 'aVel', 'aBirth', 'aLife', 'aSize', 'aRot', 'aGrow', 'aDrag', 'aColor']) this.geo.attributes[k].needsUpdate = true;
      this.dirty = false;
    }
  };
  ParticleSystem.prototype.dispose = function () { this.geo.dispose(); this.mat.dispose(); };

  /* ------------------------------------------------------------------
     SKI TRAIL RIBBON
     ------------------------------------------------------------------ */
  function TrailMesh(maxSeg, color, width, additive) {
    const g = new THREE.BufferGeometry();
    const verts = maxSeg * 2;
    const pos = new Float32Array(verts * 3), alpha = new Float32Array(verts), uv = new Float32Array(verts * 2);
    for (let s = 0; s < maxSeg; s++) { uv[s * 4] = 0; uv[s * 4 + 1] = s / maxSeg; uv[s * 4 + 2] = 1; uv[s * 4 + 3] = s / maxSeg; }
    const idx = [];
    for (let s = 0; s < maxSeg - 1; s++) { const a = s * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uAdd: { value: additive ? 1 : 0 } },
      vertexShader: `attribute float aAlpha; varying float vA; varying vec2 vUv;
        void main(){ vA=aAlpha; vUv=uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `precision mediump float; uniform vec3 uColor; uniform float uOpacity, uAdd; varying float vA; varying vec2 vUv;
        void main(){ float e = smoothstep(0.0,0.25,vUv.x)*smoothstep(1.0,0.75,vUv.x); float a = vA*e*uOpacity; if(a<0.004) discard;
          gl_FragColor = vec4(uColor, a); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    this.maxSeg = maxSeg; this.count = 0; this.head = 0;
    this.pos = pos; this.alpha = alpha;
    this.width = width;
    this.g = g;
    this.lastL = null; this.lastR = null;
  }
  TrailMesh.prototype.push = function (l, r) {
    if (this.lastL) {
      const d = l.distanceTo(this.lastL);
      if (d < .12) return false;
    }
    this.lastL = l.clone(); this.lastR = r.clone();
    const i = this.head;
    this.pos[i * 6] = l.x; this.pos[i * 6 + 1] = l.y; this.pos[i * 6 + 2] = l.z;
    this.pos[i * 6 + 3] = r.x; this.pos[i * 6 + 4] = r.y; this.pos[i * 6 + 5] = r.z;
    this.alpha[i * 2] = 1; this.alpha[i * 2 + 1] = 1;
    this.head = (this.head + 1) % this.maxSeg;
    this.count = Math.min(this.count + 1, this.maxSeg);
    this.g.attributes.position.needsUpdate = true;
    this.g.attributes.aAlpha.needsUpdate = true;
    return true;
  };
  TrailMesh.prototype.fade = function (dt, rate) {
    const a = this.alpha;
    let any = false;
    for (let i = 0; i < a.length; i++) { if (a[i] > 0) { a[i] = Math.max(0, a[i] - dt * rate); any = true; } }
    if (any) this.g.attributes.aAlpha.needsUpdate = true;
  };
  TrailMesh.prototype.clear = function () { this.alpha.fill(0); this.g.attributes.aAlpha.needsUpdate = true; this.count = 0; this.head = 0; this.lastL = null; this.lastR = null; };

  /* ------------------------------------------------------------------
     EXPLOSIONS / EMITTER HELPERS
     ------------------------------------------------------------------ */
  const tmpC = new THREE.Color();
  FX.spray = function (x, y, z, vx, vz, amount, spread, tint) {
    const p = FX.particles.spray; if (!p) return;
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * 6.283, r = Math.random() * spread;
      p.emit(x + (Math.random() - .5) * .3, y + Math.random() * .12, z + (Math.random() - .5) * .3,
        vx * .22 + Math.cos(a) * r, 1.4 + Math.random() * spread * 2.2 + Math.abs(vx) * .05, vz * .22 + Math.sin(a) * r,
        .55 + Math.random() * .75, .34 + Math.random() * .5,
        { grow: 3.4, drag: 2.4, color: tint || tmpC.setHex(0xffffff) });
    }
  };
  FX.powder = function (x, y, z, amount, tint) {
    const p = FX.particles.spray; if (!p) return;
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * 6.283, r = 1.5 + Math.random() * 3.5;
      p.emit(x, y + Math.random() * .3, z, Math.cos(a) * r, 2 + Math.random() * 4, Math.sin(a) * r,
        1 + Math.random() * 1.1, .55 + Math.random() * .8, { grow: 3.8, drag: 1.5, color: tint || tmpC.setHex(0xffffff) });
    }
  };
  FX.sparks = function (x, y, z, amount, color, speed) {
    const p = FX.particles.spark; if (!p) return;
    const c = tmpC.setHex(color === undefined ? 0xffd27a : color);
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * 6.283, e = Math.random() * Math.PI;
      const sp = (speed || 5) * (.4 + Math.random());
      p.emit(x, y, z, Math.cos(a) * Math.sin(e) * sp, Math.cos(e) * sp + 2, Math.sin(a) * Math.sin(e) * sp,
        .4 + Math.random() * .6, .1 + Math.random() * .18, { grow: .3, drag: 1.2, color: c });
    }
  };
  FX.ring = function (x, y, z, color, size) {
    const p = FX.particles.ring; if (!p) return;
    const c = tmpC.setHex(color === undefined ? 0x9fe8ff : color);
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * 6.283;
      p.emit(x + Math.cos(a) * .3, y + .1, z + Math.sin(a) * .3, Math.cos(a) * (size || 6), .6, Math.sin(a) * (size || 6),
        .55, .28, { grow: 1.4, drag: 3.6, color: c });
    }
  };
  FX.confetti = function (x, y, z, n, colors) {
    const p = FX.particles.confetti || FX.particles.spray;
    if (!p) return;
    const pal = colors || [0xff4d5e, 0xffd24a, 0x3ddc84, 0x22d3ff, 0xff8a1f, 0xffffff, 0x9b6bff];
    for (let i = 0; i < (n || 90); i++) {
      const a = Math.random() * 6.283, r = 1 + Math.random() * 7;
      p.emit(x, y + Math.random() * .6, z, Math.cos(a) * r, 5 + Math.random() * 9, Math.sin(a) * r,
        2.2 + Math.random() * 2.4, .2 + Math.random() * .16, { grow: .8, drag: .9, color: tmpC.setHex(pal[i % pal.length]) });
    }
  };
  FX.flash = function (x, y, z, color, size) {
    const s = FX.sprites.flash;
    if (!s) return;
    const sp = s.clone();
    sp.position.set(x, y, z); sp.material = s.material.clone(); sp.material.color.setHex(color || 0xffffff);
    sp.scale.setScalar(size || 6);
    FX.scene.add(sp);
    const t0 = FX.time;
    FX.tweens.push({ obj: sp, t0, dur: .45, fn: (k) => { sp.material.opacity = (1 - k) * .9; sp.scale.setScalar((size || 6) * (1 + k * 1.8)); }, done: () => { FX.scene.remove(sp); sp.material.dispose(); } });
  };

  /* ------------------------------------------------------------------
     POST PROCESSING
     ------------------------------------------------------------------ */
  const FINAL_FS = `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime, uSpeed, uVig, uGrain, uAberr, uSat, uContrast, uExposure, uFade, uFadeWhite, uFrost, uAspect;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c,c);
      // radial speed blur
      vec3 col;
      if(uSpeed > 0.001){
        float amt = uSpeed * 0.055 * smoothstep(0.02, 0.34, r2);
        vec3 acc = vec3(0.0);
        for(int i=0;i<6;i++){
          float k = float(i)/5.0;
          vec2 off = c * amt * k;
          acc += texture2D(tDiffuse, uv - off).rgb;
        }
        col = acc/6.0;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }
      // chromatic aberration
      if(uAberr > 0.001){
        vec2 dir = c * uAberr * (0.6 + uSpeed*0.9);
        col.r = texture2D(tDiffuse, uv + dir).r;
        col.b = texture2D(tDiffuse, uv - dir).b;
      }
      // grade
      col *= uExposure;
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(vec3(l), col, uSat);
      col = (col - 0.5) * uContrast + 0.5;
      // cold shadows / warm highlights
      col.b += (1.0 - l) * 0.018;
      col.r += l * 0.012;
      // vignette
      float vig = smoothstep(0.95, 0.22, r2 * 1.32);
      col *= mix(1.0, vig, uVig);
      // frost at edges
      if(uFrost > 0.001){
        float f = smoothstep(0.42, 0.95, length(c*vec2(uAspect,1.0)));
        float n = hash(floor(uv*vec2(220.0,140.0))) * 0.5 + 0.5;
        col = mix(col, col*1.04 + vec3(0.05,0.07,0.09)*n, f*uFrost);
      }
      // film grain
      float g = hash(uv*vec2(1920.0,1080.0) + fract(uTime)*97.0) - 0.5;
      col += g * uGrain;
      // fades
      col = mix(col, vec3(0.0), clamp(uFade,0.0,1.0));
      col = mix(col, vec3(1.0), clamp(uFadeWhite,0.0,1.0));
      gl_FragColor = vec4(col, 1.0);
    }`;
  function setupPost(renderer, scene, camera) {
    if (!THREE.EffectComposer) return null;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType, stencilBuffer: false,
    });
    const comp = new THREE.EffectComposer(renderer, rt);
    comp.addPass(new THREE.RenderPass(scene, camera));
    let bloom = null;
    if (ID.Q.bloom && THREE.UnrealBloomPass) {
      bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x, size.y), .42, .62, .85);
      comp.addPass(bloom);
    }
    const final = new THREE.ShaderPass(new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, uTime: { value: 0 }, uSpeed: { value: 0 }, uVig: { value: .55 },
        uGrain: { value: .028 }, uAberr: { value: .0012 }, uSat: { value: 1.1 }, uContrast: { value: 1.045 },
        uExposure: { value: 1 }, uFade: { value: 0 }, uFadeWhite: { value: 0 }, uFrost: { value: .0 }, uAspect: { value: 1 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: FINAL_FS,
    }));
    final.renderToScreen = true;
    comp.addPass(final);
    FX.composer = comp; FX.passes = { bloom, final };
    return comp;
  }

  /* ------------------------------------------------------------------
     ENVIRONMENT MAP (procedural sky -> PMREM)
     ------------------------------------------------------------------ */
  function buildEnvMap(renderer, theme) {
    if (!THREE.PMREMGenerator) return null;
    try {
      const pm = new THREE.PMREMGenerator(renderer);
      pm.compileCubemapShader();
      const envScene = new THREE.Scene();
      const sky = makeSky(theme);
      sky.material.uniforms.uCloud.value = 0;
      envScene.add(sky);
      const ground = new THREE.Mesh(new THREE.SphereGeometry(3900, 16, 8, 0, 6.283, Math.PI / 2, Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.fog).multiplyScalar(.7), side: THREE.BackSide, fog: false }));
      envScene.add(ground);
      const rt = pm.fromScene(envScene, 0.02);
      sky.geometry && sky.geometry.dispose();
      ground.geometry.dispose(); ground.material.dispose();
      pm.dispose();
      return rt;
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------
     INIT / THEME SWITCH
     ------------------------------------------------------------------ */
  FX.init = function (renderer, scene, camera) {
    FX.renderer = renderer; FX.scene = scene; FX.camera = camera;
    FX.tweens = [];
    buildTextures();
    /* particle systems */
    const Q = ID.Q;
    FX.particles.spray = new ParticleSystem(Math.round(Q.particles * .55), { tex: TEX.puff, grav: 5.5, opacity: .92 });
    FX.particles.spark = new ParticleSystem(Math.round(Q.particles * .3), { tex: TEX.spark, grav: 12, add: true, opacity: .95 });
    FX.particles.confetti = new ParticleSystem(Math.round(Q.particles * .25), { tex: TEX.puff, grav: 6.5, opacity: 1, spin: 2 });
    FX.particles.ring = new ParticleSystem(160, { tex: TEX.glow, grav: 0.4, add: true, opacity: .8 });
    FX.particles.fire = new ParticleSystem(Math.round(Q.particles * .2), { tex: TEX.puff, grav: -2.2, add: true, opacity: .8 });
    FX.particleGroup = new THREE.Group(); FX.particleGroup.name = 'particles';
    for (const k in FX.particles) FX.particleGroup.add(FX.particles[k].points);
    scene.add(FX.particleGroup);
    /* sprites */
    FX.spriteGroup = new THREE.Group(); FX.spriteGroup.name = 'fxsprites';
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
    FX.sprites.flash = flash;
    const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flare, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, opacity: .85 }));
    FX.sprites.flare = flare;
    scene.add(flare);
    scene.add(FX.spriteGroup);
    /* trails */
    FX.trailL = new TrailMesh(120, 0xdfeaf7, .5);
    FX.trailR = new TrailMesh(120, 0xdfeaf7, .5);
    FX.trailGroup = new THREE.Group(); FX.trailGroup.name = 'trails';
    FX.trailGroup.add(FX.trailL.mesh, FX.trailR.mesh);
    FX.trailGroup.visible = false;
    scene.add(FX.trailGroup);
    /* post */
    FX.composer = null;
    FX.ready = true;
  };

  FX.setTheme = function (name, opts) {
    const theme = Object.assign({}, THEMES[name] || THEMES.day, opts || {});
    FX.theme = theme; FX.themeName = name;
    const scene = FX.scene; if (!scene) return;
    /* identical theme + nothing to override: reuse the existing sky/clouds/snow.
       This is the common case on restart, where rebuilding churned ~30 geometries. */
    const sig = name + '|' + JSON.stringify(opts || {});
    if (FX._themeSig === sig && FX.sky && FX.sky.parent === scene) {
      scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);
      scene.background = new THREE.Color(theme.fog);
      if (FX.passes.final) {
        const u = FX.passes.final.material.uniforms;
        u.uExposure.value = theme.exposure || 1;
        u.uSat.value = theme.aurora > .5 ? 1.18 : 1.08;
        u.uFrost.value = theme.stars > .5 ? .35 : .0;
      }
      if (FX.passes.bloom) FX.passes.bloom.strength = theme.bloom !== undefined ? theme.bloom : .42;
      FX.time0 = FX.time;
      return;
    }
    FX._themeSig = sig;
    /* dispose previous world fx objects */
    if (FX.sky) { scene.remove(FX.sky); FX.sky.geometry.dispose(); FX.sky.material.dispose(); }
    if (FX.cloudGroup) scene.remove(FX.cloudGroup);
    if (FX.snowGroup) scene.remove(FX.snowGroup);
    FX.sky = makeSky(theme); scene.add(FX.sky);
    FX.cloudGroup = makeClouds(theme); scene.add(FX.cloudGroup);
    FX.snowGroup = new THREE.Group(); FX.snowGroup.name = 'snowfall';
    FX.snowLayers = makeSnow(theme);
    FX.snowLayers.forEach(l => FX.snowGroup.add(l));
    scene.add(FX.snowGroup);
    /* flare */
    if (FX.sprites.flare) {
      FX.sprites.flare.material.color.setHex(theme.sunColor);
      FX.sprites.flare.material.opacity = theme.sun * .8;
      FX.sprites.flare.visible = theme.sun > .15;
    }
    /* fog */
    scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);
    scene.background = new THREE.Color(theme.fog);
    /* env map for reflections */
    if (ID.Q.envMap && FX.renderer) {
      const env = buildEnvMap(FX.renderer, theme);
      if (env) {
        /* free the previous target's GPU framebuffer too (not just its texture) */
        if (FX.envMap && FX.envMap.isWebGLRenderTarget) FX.envMap.dispose();
        else if (FX.envMap && FX.envMap.dispose) FX.envMap.dispose();
        FX.envMap = env;
        scene.environment = env.texture;
      }
    } else { scene.environment = null; }
    /* tune post */
    if (FX.passes.final) {
      const u = FX.passes.final.material.uniforms;
      u.uExposure.value = theme.exposure || 1;
      u.uSat.value = theme.aurora > .5 ? 1.18 : 1.08;
      u.uFrost.value = theme.stars > .5 ? .35 : .0;
    }
    if (FX.passes.bloom) FX.passes.bloom.strength = theme.bloom !== undefined ? theme.bloom : .42;
    FX.time0 = FX.time;
  };

  FX.applyQuality = function () {
    const Q = ID.Q;
    /* rebuild particle capacities by scaling emission counts instead of reallocating */
    FX.qScale = Q.particles / 3000;
    if (FX.snowLayers) FX.snowLayers.forEach(l => { l.visible = true; });
  };

  FX.resize = function (w, h, dpr) {
    if (FX.composer) {
      FX.composer.setSize(Math.floor(w), Math.floor(h));
      const u = FX.passes.final && FX.passes.final.material.uniforms;
      if (u) u.uAspect.value = w / Math.max(1, h);
    }
    if (FX.snowLayers) FX.snowLayers.forEach(l => { l.material.uniforms.uScale.value = (h * .5) * (1 / Math.tan(ID.CAMERA_FOV * .5 * U.DEG)) * .035; });
  };

  /* per-frame */
  const camPos = new THREE.Vector3();
  FX.update = function (dt, camera, ctx) {
    if (!FX.ready) return;
    FX.time += dt;
    const t = FX.time;
    camPos.setFromMatrixPosition(camera.matrixWorld);
    /* sky follows camera; flare sits toward sun */
    if (FX.sky) FX.sky.position.copy(camPos);
    if (FX.sky) FX.sky.material.uniforms.uTime.value = t;
    if (FX.sprites.flare && FX.theme) {
      const d = new THREE.Vector3().fromArray(FX.theme.sunDir).normalize().multiplyScalar(2600);
      FX.sprites.flare.position.copy(camPos).add(d);
      FX.sprites.flare.material.opacity = FX.theme.sun * .55 * (FX.theme.stars > .5 ? .4 : 1);
    }
    /* snow layers follow camera */
    for (const l of FX.snowLayers) {
      const u = l.material.uniforms;
      u.uTime.value = t; u.uCam.value.copy(camPos);
      u.uWindX.value = (FX.wind ? FX.wind.x : .12); u.uWindZ.value = (FX.wind ? FX.wind.z : -.08);
    }
    /* clouds drift */
    if (FX.cloudGroup) {
      const cx = camPos.x;
      for (const c of FX.cloudGroup.children) {
        c.userData.ang = (c.userData.ang || Math.atan2(c.position.z, c.position.x)) + dt * .0035 * c.userData.drift;
        const rad = Math.hypot(c.position.x, c.position.z);
        c.position.x = Math.cos(c.userData.ang) * rad;
        c.position.z = Math.sin(c.userData.ang) * rad;
        c.position.x += dt * 4 * c.userData.drift;
        if (c.position.x - cx > 1800) c.position.x -= 3600;
        if (c.position.x - cx < -1800) c.position.x += 3600;
      }
    }
    /* particles */
    for (const k in FX.particles) FX.particles[k].update(t);
    /* tweens */
    for (let i = FX.tweens.length - 1; i >= 0; i--) {
      const tw = FX.tweens[i];
      const k = U.clamp((t - tw.t0) / tw.dur, 0, 1);
      tw.fn(k);
      if (k >= 1) { tw.done && tw.done(); FX.tweens.splice(i, 1); }
    }
    /* post uniforms */
    if (FX.passes.final) {
      const u = FX.passes.final.material.uniforms;
      u.uTime.value = t;
      u.uSpeed.value = U.damp(u.uSpeed.value, (ctx && ctx.speedFx) || 0, 6, dt);
      u.uAberr.value = U.damp(u.uAberr.value, .0012 + (ctx && ctx.speedFx || 0) * .004, 5, dt);
      u.uVig.value = .5 + (ctx && ctx.damage || 0) * .25;
    }
    /* trails fade */
    if (FX.trailGroup && FX.trailGroup.visible) { FX.trailL.fade(dt, .30); FX.trailR.fade(dt, .30); }
    /* fire emitters */
    for (const f of FX.fires) {
      if (Math.random() < dt * 45 * (f.intensity || 1)) {
        const p = FX.particles.fire;
        const a = Math.random() * 6.283, r = Math.random() * .22 * (f.scale || 1);
        p.emit(f.pos.x + Math.cos(a) * r, f.pos.y + .1, f.pos.z + Math.sin(a) * r,
          Math.cos(a) * .3, 1.2 + Math.random() * 1.4, Math.sin(a) * .3,
          .5 + Math.random() * .5, .5 * (f.scale || 1) * (.6 + Math.random() * .6),
          { grow: .4, drag: .9, color: f.color || new THREE.Color(0xff9a3c) });
      }
    }
  };

  FX.render = function () {
    if (FX.composer) FX.composer.render();
    else if (FX.renderer && FX.scene && FX.camera) FX.renderer.render(FX.scene, FX.camera);
  };

  FX.setupPost = function (renderer, scene, camera) {
    if (!ID.Q.post) return null;
    return setupPost(renderer, scene, camera);
  };

  FX.fade = function (to, dur, white) {
    const u = FX.passes.final && FX.passes.final.material.uniforms;
    if (!u) return;
    const key = white ? 'uFadeWhite' : 'uFade';
    const from = u[key].value;
    FX.tweens.push({ t0: FX.time, dur: dur || .5, fn: (k) => { u[key].value = U.lerp(from, to, U.ease.inOut(k)); } });
  };
  FX.setFade = function (v, white) {
    const u = FX.passes.final && FX.passes.final.material.uniforms;
    if (u) u[white ? 'uFadeWhite' : 'uFade'].value = v;
  };

  /* skid trails */
  FX.trailBegin = function () { if (!FX.trailGroup) return; FX.trailGroup.visible = ID.Q.trails !== false; FX.trailL.clear(); FX.trailR.clear(); };
  FX.trailEnd = function () { };
  FX.trailPoint = function (l, r) {
    if (!FX.trailGroup || !FX.trailGroup.visible) return;
    FX.trailL.push(l, r);
  };
  FX.addSparksAt = function (pos, n, col) { FX.sparks(pos.x, pos.y, pos.z, n, col); };
})(window.ID);
