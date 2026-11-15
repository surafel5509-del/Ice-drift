/* =====================================================================
   ICE DRIFT  ·  ui.js
   Boot / loading · menus · garage · mountains · career · HUD ·
   touch controls · results · settings
   ===================================================================== */
'use strict';
(function (ID) {
  const U = ID.U, $ = U.$, $$ = U.$$, SV = ID.SV;

  /* ------------------------------------------------------------------
     ICON SET
     ------------------------------------------------------------------ */
  const ICONS = {
    flag: '<path d="M5 21V4l9 3-9 3"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 01-8 0zM8 6H5v2a3 3 0 003 3M16 6h3v2a3 3 0 01-3 3M12 13v5M8 20h8"/>',
    star: '<path d="M12 3l2.7 5.9 6.3.7-4.7 4.3 1.3 6.4L12 17l-5.6 3.3L7.7 14 3 9.6l6.3-.7z"/>',
    shop: '<path d="M4 8h16l-1.5 11H5.5zM8 8V6a4 4 0 018 0v2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    inf: '<path d="M6 12c0-2 1.6-3.5 3.4-3.5 2.6 0 3.4 7 6 7 1.8 0 3.4-1.5 3.4-3.5S17.2 8.5 15.4 8.5c-2.6 0-3.4 7-6 7C7.6 15.5 6 14 6 12z"/>',
    warn: '<path d="M12 3l9 17H3z"/><path d="M12 9v5M12 17h.01"/>',
    gate: '<path d="M5 21V8l7-4 7 4v13M5 12h14"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    up: '<path d="M5 15l7-7 7 7"/>',
    down: '<path d="M5 9l7 7 7-7"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
    sound: '<path d="M4 9v6h3l5 4V5L7 9zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
    mute: '<path d="M4 9v6h3l5 4V5L7 9zM16 9l5 6M21 9l-5 6"/>',
    refresh: '<path d="M4 12a8 8 0 0113.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 01-13.7 5.7L4 16M4 20v-4h4"/>',
    home: '<path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h5M9.5 14h5"/>',
    bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
    board: '<path d="M3 12c2-4 4-6 4-6M21 12c-2-4-4-6-4-6"/><path d="M4 16c2 2 5 3 8 3s6-1 8-3"/>',
    ski: '<path d="M5 3l4 18M12 3l4 18M3 21h6M10 21h6"/>',
    flame: '<path d="M12 3s5 5 5 9a5 5 0 01-10 0c0-2 1-3.5 2-5 .5 2 1.5 3 2.5 3.5C11 8 12 6 12 3z"/>',
    snow: '<path d="M12 2v20M3 7l18 10M21 7L3 17"/>',
    wind: '<path d="M3 8h11a3 3 0 100-6M3 12h16a3 3 0 110 6M3 16h8"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    medal: '<circle cx="12" cy="14" r="6"/><path d="M8 3l2 6M16 3l-2 6"/>',
    tablet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 18h6"/>',
  };
  const ic = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

  const UI = ID.UI = {
    screen: 'splash', prevScreen: '', walletAnim: 0, hudT: 0,
  };

  /* ------------------------------------------------------------------
     SCREEN MANAGEMENT
     ------------------------------------------------------------------ */
  function show(id, force) {
    if (UI.screen === id && !force) return;
    const cur = document.getElementById('s-' + UI.screen);
    if (cur) cur.classList.remove('on');
    const nxt = document.getElementById('s-' + id);
    if (nxt) nxt.classList.add('on');
    UI.prevScreen = UI.screen;
    UI.screen = id;
    document.body.dataset.screen = id;
  }
  UI.show = show;
  function hideAll() { $$('.screen').forEach(s => s.classList.remove('on')); UI.screen = ''; }

  /* ------------------------------------------------------------------
     COMMON PIECES
     ------------------------------------------------------------------ */
  function wallet(extra) {
    return '<div class="wallet">' +
      (extra || '') +
      '<span class="wchip">' + ic('coin') + '<b id="wCoins">' + U.fmtNum(SV.coins) + '</b></span>' +
      '<span class="wchip gem">' + ic('sparkle') + '<b id="wGems">' + SV.gems + '</b></span>' +
      '<span class="wchip lvl">LV <b id="wLvl">' + SV.level + '</b></span>' +
      '</div>';
  }
  function xpBar() {
    const need = ID.xpFor(SV.level), pct = U.clamp(SV.xp / need * 100, 0, 100);
    return '<div class="xpwrap"><div class="xpbar"><i style="width:' + pct + '%"></i></div><span>' + Math.round(SV.xp) + ' / ' + need + ' XP</span></div>';
  }
  function stars(n) { let s = ''; for (let i = 0; i < 5; i++) s += '<span class="st' + (i < n ? ' on' : '') + '">' + '★' + '</span>'; return '<div class="stars">' + s + '</div>'; }
  function head(title, back) {
    return '<header class="topbar">' +
      (back ? '<button class="iconbtn" data-act="' + back + '">' + ic('left') + '</button>' : '<div class="brandmini">' + ic('snow') + '<span>ICE DRIFT</span></div>') +
      '<h1>' + title + '</h1>' + wallet() + '</header>';
  }
  function refreshWallet() {
    const c = document.getElementById('wCoins'), g = document.getElementById('wGems'), l = document.getElementById('wLvl');
    if (c) c.textContent = U.fmtNum(SV.coins);
    if (g) g.textContent = SV.gems;
    if (l) l.textContent = SV.level;
    for (const el of $$('.wCoins2')) el.textContent = U.fmtNum(SV.coins);
  }
  UI.refreshWallet = refreshWallet;

  /* ------------------------------------------------------------------
     SPLASH & LOAD
     ------------------------------------------------------------------ */
  UI.renderSplash = function () {
    const s = $('#s-splash');
    s.innerHTML =
      '<div class="splash-inner">' +
      '<div class="logo-big"><span class="l1">ICE</span><span class="l2">DRIFT</span></div>' +
      '<div class="logo-tag">ALPINE FREERIDE</div>' +
      '<div class="logo-rule"></div>' +
      '<p class="splash-sub">Carve endless mountains · land monster tricks · outrun the avalanche</p>' +
      '<button class="btn big go" data-act="startgame" id="bStart">' + ic('play') + ' TAP TO RIDE</button>' +
      '<div class="splash-foot">real 3D models · fully offline · ' + (U.isTouch ? 'touch + gamepad' : 'keyboard + gamepad') + '</div>' +
      '</div>';
    show('splash');
  };
  UI.renderLoading = function () {
    show('loading');
    const s = $('#s-loading');
    s.innerHTML = '<div class="loadbox"><div class="flakespin">' + ic('snow') + '</div>' +
      '<div class="loadtitle">Preparing the mountain</div>' +
      '<div class="loadbar"><i id="ldBar"></i></div>' +
      '<div class="loadinfo" id="ldInfo">Starting…</div></div>';
  };
  UI.loadProgress = function (pct, label) {
    const b = document.getElementById('ldBar'), i = document.getElementById('ldInfo');
    if (b) b.style.width = Math.round(pct * 100) + '%';
    if (i && label) i.textContent = label;
  };

  /* ------------------------------------------------------------------
     MAIN MENU
     ------------------------------------------------------------------ */
  UI.renderMenu = function () {
    const hour = new Date().getHours();
    const greet = hour < 6 ? 'Night session' : hour < 12 ? 'Morning snow' : hour < 18 ? 'Afternoon laps' : 'Evening shred';
    const loc = ID.World.LOCBY[SV.lastLoc] || ID.World.LOCS[0];
    const daily = dailyState();
    $('#s-menu').innerHTML =
      '<div class="menu-shell">' +
      '<div class="menu-left">' +
      '<div class="logo"><span class="l1">ICE</span><span class="l2">DRIFT</span><div class="logo-tag">ALPINE FREERIDE</div></div>' +
      '<div class="lvlrow">' + '<div class="lvlbadge">' + SV.level + '</div><div class="lvlmeta"><div>' + greet + '</div>' + xpBar() + '</div>' + '</div>' +
      '<nav class="mainnav">' +
      '<button class="navbtn primary" data-act="quickplay">' + ic('play') + '<span>QUICK RIDE<small>' + loc.name + ' · ' + (ID.Game.cfg ? '' : 'downhill') + '</small></span></button>' +
      '<button class="navbtn" data-act="modes">' + ic('flag') + '<span>GAME MODES</span></button>' +
      '<button class="navbtn" data-act="mountains">' + ic('globe') + '<span>MOUNTAINS</span></button>' +
      '<button class="navbtn" data-act="garage">' + ic('shop') + '<span>GEAR SHOP</span></button>' +
      '<button class="navbtn" data-act="career">' + ic('trophy') + '<span>CAREER</span></button>' +
      '<button class="navbtn ' + (daily.done ? 'done' : 'hl') + '" data-act="daily">' + ic('star') + '<span>DAILY<small>' + (daily.done ? 'completed ✓' : '+' + daily.reward + ' coins') + '</small></span></button>' +
      '<button class="navbtn" data-act="settings">' + ic('gear') + '<span>SETTINGS</span></button>' +
      '<button class="navbtn" data-act="help">' + ic('tablet') + '<span>HOW TO PLAY</span></button>' +
      '</nav>' +
      '<div class="menu-foot">v' + ID.G.build + ' · ' + (SV.rider === 'skier' ? 'Skier' : 'Snowboarder') + ' · Lv ' + SV.level + '</div>' +
      '</div>' +
      '<div class="menu-right">' +
      '<div class="statcard">' +
      '<div class="sc-head">' + ic('target') + '<span>RIDER STATS</span></div>' +
      statBars() +
      '</div>' +
      '<div class="minicard"><div class="mc-row"><span>' + ic('flag') + ' Runs</span><b>' + SV.stats.runs + '</b></div>' +
      '<div class="mc-row"><span>' + ic('trophy') + ' Golds</span><b>' + SV.stats.golds + '</b></div>' +
      '<div class="mc-row"><span>' + ic('bolt') + ' Top speed</span><b>' + Math.round((SV.stats.topspeed || 0) * 3.6) + ' km/h</b></div>' +
      '<div class="mc-row"><span>' + ic('sparkle') + ' Best combo</span><b>x' + (SV.stats.bestCombo || 1).toFixed(1) + '</b></div></div>' +
      '<div class="mfoot-actions"><button class="iconbtn" data-act="toggleSound" title="Sound">' + (SV.set.mute ? ic('mute') : ic('sound')) + '</button>' +
      '<button class="iconbtn" data-act="toggleFull" title="Fullscreen">' + '<svg class="ic" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>' + '</button></div>' +
      '</div></div>';
    show('menu');
    startMenuWorld();
  };
  function statBars() {
    const st = ID.statsOf();
    const rows = [['Speed', st.speed, 'bolt'], ['Carve', st.control, 'ski'], ['Air', st.balance, 'board'], ['Boost', st.accel, 'flame']];
    let h = '';
    for (const r of rows) {
      const v = U.clamp(r[1] / 8 * 100, 4, 100);
      h += '<div class="sbar"><span>' + ic(r[2]) + r[0] + '</span><div class="sbtrack"><i style="width:' + v + '%"></i></div><b>' + r[1] + '</b></div>';
    }
    return h;
  }
  UI.statBars = statBars;

  /* demo world behind menus */
  let menuWorldReady = false;
  function startMenuWorld() {
    if (!ID.World.root) return;
    if (ID.Game.cfg && ID.Game.rig && ID.Game.rig.root.parent) ID.Game.rig.root.parent.remove(ID.Game.rig.root);
    const loc = SV.lastLoc || 'valley';
    ID.World.start(loc, { seed: 3 });
    ID.FX.setTheme(ID.World.LOCBY[loc].theme, {});
    ID.Game.player = null; ID.Game.rig = null;
    ID.Game.cameraMenuSetup && ID.Game.cameraMenuSetup();
    ID.A.startMusic('menu');
    try { ID.Game.startDemo(); } catch (e) { }
    menuWorldReady = true;
  }
  UI.startMenuWorld = startMenuWorld;

  /* ------------------------------------------------------------------
     GAME MODES
     ------------------------------------------------------------------ */
  UI.renderModes = function () {
    const M = ID.MODES;
    const cards = Object.keys(M).map(k => {
      const m = M[k];
      const best = SV.best[k + '_' + (SV.lastLoc || 'valley')];
      return '<button class="modecard" data-act="playmode" data-mode="' + k + '">' +
        '<div class="mico">' + ic(m.icon) + '</div>' +
        '<div class="mtxt"><b>' + m.name + '</b><span>' + m.desc + '</span></div>' +
        (best ? '<div class="mbest">' + ic('star') + U.fmtNum(best) + '</div>' : '') +
        '<div class="mgo">' + ic('right') + '</div></button>';
    }).join('');
    $('#s-modes').innerHTML = head('Game Modes', 'backMenu') + '<div class="sc-body"><div class="modesgrid">' + cards + '</div></div>';
    show('modes');
  };

  /* ------------------------------------------------------------------
     MOUNTAINS
     ------------------------------------------------------------------ */
  UI.renderMountains = function () {
    const cards = ID.World.LOCS.map((l, i) => {
      const un = SV.unlocked[l.id];
      const can = SV.level >= l.lvl && SV.coins >= l.cost;
      return '<div class="mtncard' + (un ? '' : ' locked') + (SV.lastLoc === l.id ? ' sel' : '') + '" style="--th:' + themeColor(l.theme) + '">' +
        '<div class="mtntop"><div><b>' + l.name + '</b><span>' + l.tag + '</span></div>' + (un ? '' : '<div class="lack">' + ic('lock') + '</div>') + '</div>' +
        stars(l.diff) +
        '<div class="mtnmeta"><span>' + themeLabel(l.theme) + '</span><span>' + l.width + 'm wide</span><span>' + Math.round(l.slope * 100) + '% grade</span></div>' +
        (un
          ? '<button class="btn ' + (SV.lastLoc === l.id ? 'on' : 'go') + '" data-act="setloc" data-loc="' + l.id + '">' + (SV.lastLoc === l.id ? ic('check') + ' SELECTED' : 'RIDE HERE') + '</button>'
          : '<button class="btn ' + (can ? 'pri' : 'dis') + '" data-act="unlockloc" data-loc="' + l.id + '">' + ic('coin') + ' ' + U.fmtNum(l.cost) + ' · Lv ' + l.lvl + '</button>') +
        '</div>';
    }).join('');
    $('#s-mountains').innerHTML = head('Mountains', 'backMenu') + '<div class="sc-body"><div class="mtngrid">' + cards + '</div></div>';
    show('mountains');
    /* paint swatches */
    for (const c of $$('.mtncard')) {
      const cv = document.createElement('canvas'); cv.width = 480; cv.height = 120;
      paintMountain(cv, c.style.getPropertyValue('--th'));
      c.querySelector('.mtntop').appendChild(cv);
    }
  };
  function themeColor(t) { return { day: '#7fc4ff', dawn: '#ffb98a', sunset: '#ff9a6a', overcast: '#b8c8d8', storm: '#8ea6bb', dusk: '#8f8fd0', night: '#3a5a8a', aurora: '#3ad8a8', midnight: '#2a4a7a' }[t] || '#7fc4ff'; }
  function themeLabel(t) { return { day: 'Daylight', dawn: 'Dawn', sunset: 'Sunset', overcast: 'Overcast', storm: 'Storm', dusk: 'Dusk', night: 'Night', aurora: 'Aurora', midnight: 'Midnight' }[t] || t; }
  function paintMountain(cv, c) {
    const g = cv.getContext('2d'), w = cv.width, h = cv.height;
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, c); grd.addColorStop(1, darken(c, .5));
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y = h * .72 - Math.sin(x * .012 + 1) * h * .16 - Math.sin(x * .037) * h * .07;
      g.lineTo(x, y);
    }
    g.lineTo(w, h); g.closePath(); g.fill();
    g.fillStyle = darken(c, .65);
    g.beginPath(); g.moveTo(w * .3, h);
    for (let x = w * .3; x <= w * .8; x += 8) {
      const y = h * .45 - Math.sin(x * .02) * h * .11;
      g.lineTo(x, y);
    }
    g.lineTo(w * .8, h); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath(); g.moveTo(w * .3, h * .55); g.lineTo(w * .55, h * .3); g.lineTo(w * .8, h * .55); g.closePath(); g.fill();
  }
  function darken(hex, k) {
    const c = parseInt(hex.slice(1), 16);
    const r = Math.round((c >> 16 & 255) * k), g = Math.round((c >> 8 & 255) * k), b = Math.round((c & 255) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ------------------------------------------------------------------
     GARAGE / GEAR SHOP
     ------------------------------------------------------------------ */
  const CATS = [['suit', 'Suits', 'shop'], ['board', 'Boards', 'board'], ['trail', 'Trails', 'sparkle']];
  let garageCat = 'suit';
  UI.renderGarage = function (keepPreview) {
    const items = ID.ITEMS[garageCat];
    const catBtn = CATS.map(c => '<button class="tab ' + (garageCat === c[0] ? 'on' : '') + '" data-act="gcat" data-cat="' + c[0] + '">' + ic(c[2]) + c[1] + '</button>').join('');
    const cards = items.map((it, i) => {
      const owned = SV.owned[garageCat + i];
      const equipped = SV.equip[garageCat] === i;
      const can = SV.coins >= it.p;
      const locked = it.lvl && SV.level < it.lvl;
      return '<div class="gear' + (equipped ? ' eq' : '') + '">' +
        '<div class="gearsw" style="background:' + it.css + '"></div>' +
        '<div class="gearmeta"><b>' + it.n + '</b><span>' + it.desc + '</span>' +
        (Object.keys(it.b).length ? '<div class="gearb">' + Object.keys(it.b).map(k => '<i>' + k.toUpperCase() + ' +' + it.b[k] + '</i>').join('') + '</div>' : '') +
        '</div>' +
        (equipped ? '<div class="gearbtn on">' + ic('check') + '</div>'
          : owned ? '<button class="gearbtn" data-act="equip" data-cat="' + garageCat + '" data-i="' + i + '">EQUIP</button>'
            : locked ? '<div class="gearbtn lock">' + ic('lock') + 'LV ' + it.lvl + '</div>'
              : '<button class="gearbtn ' + (can ? 'buy' : 'dis') + '" data-act="buy" data-cat="' + garageCat + '" data-i="' + i + '">' + ic('coin') + U.fmtNum(it.p) + '</button>') +
        '</div>';
    }).join('');
    $('#s-garage').innerHTML =
      '<div class="garage-wrap">' +
      '<div class="garage-left">' +
      '<div class="ghead"><button class="iconbtn" data-act="backMenu">' + ic('left') + '</button><h1>GEAR SHOP</h1>' + wallet() + '</div>' +
      '<div class="tabs">' + catBtn + '</div>' +
      '<div class="gearlist">' + cards + '</div>' +
      '</div>' +
      '<div class="garage-right">' +
      '<div class="preview-label">PREVIEW</div><div id="previewHolder" class="preview3d"></div>' +
      '<div class="rider-toggle"><button class="seg ' + (SV.rider === 'skier' ? 'on' : '') + '" data-act="rider" data-v="skier">' + ic('ski') + 'SKIER</button>' +
      '<button class="seg ' + (SV.rider === 'snowboarder' ? 'on' : '') + '" data-act="rider" data-v="snowboarder">' + ic('board') + 'BOARDER</button></div>' +
      '<div class="paintpick">' + ID.RIDER_COLORS.map((c, i) => '<button class="pdot' + (SV.paint === i ? ' on' : '') + '" data-act="paint" data-v="' + i + '" style="background:#' + c.jacket.toString(16).padStart(6, '0') + '"' + '></button>').join('') + '</div>' +
      '</div></div>';
    show('garage');
    if (keepPreview && UI.previewRenderer && UI.previewPivot) {
      UI.swapPreview();
    } else UI.mountPreview();
  };
  let previewRig = null, previewCanvas = null;
  UI.mountPreview = function () {
    /* dedicated small renderer canvas for the rider */
    const holder = document.getElementById('previewHolder');
    if (!holder) return;
    holder.innerHTML = '';
    if (!UI.previewRenderer) {
      const cv = document.createElement('canvas');
      cv.className = 'pvcv';
      UI.previewRenderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
      UI.previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
      UI.previewScene = new THREE.Scene();
      UI.previewCam = new THREE.PerspectiveCamera(34, 1, .1, 60);
      const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(3, 5, 4); UI.previewScene.add(key);
      const rim = new THREE.DirectionalLight(0x8fd4ff, 1.8); rim.position.set(-4, 2, -3); UI.previewScene.add(rim);
      UI.previewScene.add(new THREE.HemisphereLight(0xdff0ff, 0x8090a0, 1.1));
      UI.previewCam.position.set(0, 1.15, 3.5);
      UI.previewCam.lookAt(0, .95, 0);
      UI.previewPivot = new THREE.Group(); UI.previewScene.add(UI.previewPivot);
      UI.previewMats = [];
    }
    if (previewRig) { UI.previewPivot.remove(previewRig.root); previewRig = null; }
    try { previewRig = ID.buildRider(SV.rider, SV.paint); } catch (e) { previewRig = null; }
    if (previewRig) { previewRig.root.position.y = -1.05; UI.previewPivot.add(previewRig.root); }
    holder.appendChild(UI.previewRenderer.domElement);
    UI.previewActive = true;
    UI.resizePreview();
  };
  UI.swapPreview = function () {
    if (previewRig) {
      UI.previewPivot.remove(previewRig.root);
      previewRig.root.traverse(o => { if (o.isMesh) { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); } });
      previewRig = null;
    }
    try { previewRig = ID.buildRider(SV.rider, SV.paint); } catch (e) { previewRig = null; }
    if (previewRig) { previewRig.root.position.y = -1.05; UI.previewPivot.add(previewRig.root); }
    UI.previewActive = true;
  };
  UI.resizePreview = function () {
    const holder = document.getElementById('previewHolder');
    if (!holder || !UI.previewRenderer) return;
    const r = holder.getBoundingClientRect();
    if (r.width < 2) return;
    UI.previewRenderer.setSize(r.width, r.height, false);
    UI.previewCam.aspect = r.width / r.height;
    UI.previewCam.updateProjectionMatrix();
  };
  UI.updatePreview = function (dt, t) {
    if (!UI.previewActive || !UI.previewRenderer) return;
    if (UI.previewPivot) UI.previewPivot.rotation.y = Math.sin(t * .5) * .6;
    if (previewRig) ID.poseRider(previewRig, { tuck: .12, carve: Math.sin(t * 1.1) * .5, t }, dt);
    UI.previewRenderer.render(UI.previewScene, UI.previewCam);
  };
  UI.unmountPreview = function () { UI.previewActive = false; };

  /* ------------------------------------------------------------------
     CAREER
     ------------------------------------------------------------------ */
  function careerEvents() {
    const out = [];
    const M = ID.MODES;
    ID.World.LOCS.forEach((loc, li) => {
      ['race', 'slalom', 'time'].forEach((mode, mi) => {
        const id = loc.id + '_' + mode;
        const diff = li + 1 + mi * .3;
        out.push({
          id, loc: loc.id, mode, diff,
          name: loc.name + ' · ' + M[mode].name,
          length: mode === 'slalom' ? 1000 : 1500,
          target: mode === 'slalom' ? 88 + li * 6 : 95 + li * 7,
          reward: 120 + li * 60,
        });
      });
    });
    return out;
  }
  UI.careerEvents = careerEvents;
  UI.renderCareer = function () {
    const ev = careerEvents();
    const done = ev.filter(e => (SV.career[e.id] || 0) > 0).length;
    let body = '';
    let lastLoc = '';
    ev.forEach((e, i) => {
      const loc = ID.World.LOCBY[e.loc];
      if (e.loc !== lastLoc) {
        body += '<div class="cseason"><span>' + loc.name + '</span>' + stars(loc.diff) + '</div>';
        lastLoc = e.loc;
      }
      const medal = SV.career[e.id] || 0;
      const prevIdx = i - 1;
      const unlocked = i === 0 || (SV.career[ev[prevIdx].id] || 0) > 0;
      body += '<button class="cevent' + (medal ? ' done' : '') + (unlocked ? '' : ' lock') + '" data-act="' + (unlocked ? 'startevent' : '') + '" data-id="' + e.id + '">' +
        '<div class="cemedal m' + medal + '">' + (medal ? ic('medal') : (unlocked ? ic('flag') : ic('lock'))) + '</div>' +
        '<div class="cemeta"><b>' + e.name + '</b><span>' + ID.MODES[e.mode].desc + '</span></div>' +
        '<div class="cetarget">' + (e.mode === 'race' ? 'Top 3' : 'Beat 0:' + String(e.target).padStart(2, '0')) + '</div>' +
        '</button>';
    });
    $('#s-career').innerHTML = head('Career · ' + done + '/' + ev.length, 'backMenu') +
      '<div class="sc-body"><div class="careerbar"><i style="width:' + (done / ev.length * 100) + '%"></i></div><div class="careerlist">' + body + '</div></div>';
    show('career');
  };

  /* ------------------------------------------------------------------
     DAILY
     ------------------------------------------------------------------ */
  function dailyState() {
    const d = new Date();
    const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    const r = U.rng(h);
    const locs = ID.World.LOCS.filter(l => SV.unlocked[l.id]);
    const loc = locs[Math.floor(r() * locs.length)] || ID.World.LOCS[0];
    const modes = ['race', 'slalom', 'time', 'freestyle'];
    const mode = modes[Math.floor(r() * modes.length)];
    const reward = 250 + Math.floor(r() * 250);
    const done = SV.daily.last === key && SV.daily.done;
    return { key, loc: loc.id, mode, reward, done, streak: SV.daily.last === key ? SV.daily.streak : SV.daily.streak };
  }
  UI.dailyState = dailyState;

  /* ------------------------------------------------------------------
     SETTINGS
     ------------------------------------------------------------------ */
  UI.renderSettings = function () {
    const S = SV.set;
    const seg = (key, opts, label) => '<div class="setrow"><span>' + label + '</span><div class="seg">' +
      opts.map(o => '<button class="segb' + (String(S[key]) === String(o[0]) ? ' on' : '') + '" data-act="set" data-k="' + key + '" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>';
    const slider = (key, label, min, max, step, fmt) => '<div class="setrow"><span>' + label + '</span><div class="sliderwrap"><input type="range" min="' + min + '" max="' + max + '" step="' + (step || .01) + '" value="' + S[key] + '" data-set="' + key + '"><b>' + (fmt ? fmt(S[key]) : Math.round(S[key] * 100) + '%') + '</b></div></div>';
    const toggle = (key, label) => '<div class="setrow"><span>' + label + '</span><button class="tog' + (S[key] ? ' on' : '') + '" data-act="tog" data-k="' + key + '"><i></i></button></div>';
    $('#s-settings').innerHTML = head('Settings', 'backMenu') + '<div class="sc-body">' +
      '<div class="setgroup"><div class="gtitle">Video</div>' +
      seg('quality', [['low', 'Low'], ['med', 'Medium'], ['high', 'High'], ['ultra', 'Ultra'], ['auto', 'Auto']], 'Graphics') +
      slider('res', 'Resolution', .5, 1, .05, v => Math.round(v * 100) + '%') +
      toggle('shake', 'Camera shake') + toggle('skidmarks', 'Ski trails') + toggle('motionblur', 'Motion blur') +
      toggle('fps', 'Show FPS') +
      '</div>' +
      '<div class="setgroup"><div class="gtitle">Audio</div>' +
      slider('vol', 'Master', 0, 1, .01) + slider('sfx', 'Effects', 0, 1, .01) + slider('music', 'Music', 0, 1, .01) +
      toggle('mute', 'Mute all') +
      '</div>' +
      '<div class="setgroup"><div class="gtitle">Gameplay</div>' +
      seg('cam', [[0, 'Chase'], [1, 'Cine'], [2, 'First']], 'Camera') +
      toggle('ghost', 'Ghost replay') + toggle('hint', 'Trick hints') +
      '</div>' +
      '<div class="setgroup"><div class="gtitle">Data</div>' +
      '<div class="setrow"><span>Save data</span><div class="seg"><button class="segb" data-act="exportSave">Export</button><button class="segb danger" data-act="resetSave">Reset</button></div></div>' +
      '<div class="setrow"><span>Version</span><b>' + ID.G.build + '</b></div>' +
      '<div class="setrow"><span>Models</span><b>' + ID.Models.order.length + ' · ' + U.bytes(ID.Models.bytes || 0) + '</b></div>' +
      '</div></div>';
    show('settings');
  };

  /* ------------------------------------------------------------------
     HOW TO PLAY
     ------------------------------------------------------------------ */
  UI.renderHelp = function () {
    const k = U.isTouch;
    $('#s-help').innerHTML = head('How to Play', 'backMenu') + '<div class="sc-body"><div class="helpgrid">' +
      '<div class="helpcard"><h3>' + ic('globe') + ' Controls</h3>' +
      (k ? '<p>Swipe / joystick to steer · hold the right pad to tuck · tap JUMP to ollie.<br>Airborne: tap SPIN or FLIP, hold GRAB.</p>'
        : '<p><kbd>←</kbd><kbd>→</kbd> or <kbd>A</kbd><kbd>D</kbd> steer · <kbd>↑</kbd>/<kbd>W</kbd> tuck for speed · <kbd>↓</kbd>/<kbd>S</kbd> brake<br>' +
        '<kbd>Space</kbd> jump · <kbd>J</kbd>/<kbd>Q</kbd> spin · <kbd>K</kbd>/<kbd>E</kbd> flip · <kbd>L</kbd> grab · <kbd>Shift</kbd>/<kbd>B</kbd> boost<br>' +
        '<kbd>C</kbd> camera · <kbd>P</kbd> pause · <kbd>R</kbd> restart · <kbd>M</kbd> mute</p>') +
      '</div>' +
      '<div class="helpcard"><h3>' + ic('flag') + ' Racing</h3><p>Pass through every gate. Perfect passes (centre) build your combo, give boost and multiply score. Missing a gate in Slalom adds 2 seconds.</p></div>' +
      '<div class="helpcard"><h3>' + ic('star') + ' Tricks</h3><p>Hit a kicker or crest, then spin (J) and flip (K). Land within a quarter turn of upright to stay clean. Chain tricks to grow your combo up to x9.</p></div>' +
      '<div class="helpcard"><h3>' + ic('bolt') + ' Boost & Carve</h3><p>Carving and perfect gates charge your boost. Hold the boost key to surge. Edging (Shift) sharpens turns on ice.</p></div>' +
      '<div class="helpcard"><h3>' + ic('warn') + ' Avalanche</h3><p>In Avalanche mode a wall of snow chases you. Any wipeout lets it catch up — keep your speed and flow.</p></div>' +
      '<div class="helpcard"><h3>' + ic('trophy') + ' Progress</h3><p>Earn coins and XP on every run. Unlock 7 mountains, 21 career events and better gear in the shop.</p></div>' +
      '</div></div>';
    show('help');
  };

  /* ------------------------------------------------------------------
     PAUSE
     ------------------------------------------------------------------ */
  UI.showPause = function () {
    $('#s-pause').innerHTML = '<div class="pause-panel"><h1>PAUSED</h1>' +
      '<button class="btn big go" data-act="resume">' + ic('play') + ' RESUME</button>' +
      '<button class="btn" data-act="restart">' + ic('refresh') + ' RESTART</button>' +
      '<button class="btn" data-act="set" data-k="__cam" data-v="cycle">' + ic('cam') + ' CAMERA</button>' +
      '<button class="btn" data-act="settings2">' + ic('gear') + ' SETTINGS</button>' +
      '<button class="btn" data-act="quit">' + ic('home') + ' QUIT TO MENU</button>' +
      '</div>';
    show('pause');
  };
  UI.hidePause = function () { const e = $('#s-pause'); e && e.classList.remove('on'); UI.screen = ''; };

  /* ------------------------------------------------------------------
     RACE HUD
     ------------------------------------------------------------------ */
  UI.enterRace = function () {
    try { ID.Game.demoStop(); } catch (e) { }
    hideAll();
    document.getElementById('hud').classList.add('on');
    const touch = U.isTouch || SV.set.ctrl === 'touch';
    document.getElementById('touchui').classList.toggle('on', touch);
    UI.hudCache = {};
    UI.setHint('Carve with ' + (touch ? 'the stick' : 'A / D') + ' · gates give boost');
    setTimeout(() => UI.setHint(''), 5200);
    /* build gate pips */
    const pips = document.getElementById('pips');
    if (pips) {
      pips.innerHTML = '';
      const total = (ID.Game.cfg && ID.Game.cfg.length < 1e8) ? 24 : 0;
      for (let i = 0; i < total; i++) pips.appendChild(document.createElement('i'));
    }
  };
  UI.message = function (text, cls, dur) {
    const el = document.getElementById('hMsg');
    if (!el) return;
    el.className = 'hmsg ' + (cls || '');
    el.textContent = text;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(UI._msgT);
    UI._msgT = setTimeout(() => el.classList.remove('show'), (dur || 1) * 1000);
  };
  UI.trick = function (label, rot, flip, score) {
    const el = document.getElementById('hTrick');
    if (!el) return;
    el.innerHTML = '<b>' + label + '</b><span>+' + U.fmtNum(score) + '</span>';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    const g = document.getElementById('hud');
    if (g) { g.classList.remove('pulse'); void g.offsetWidth; g.classList.add('pulse'); }
  };
  UI.gatePassed = function (perfect, n, total) {
    const pips = document.getElementById('pips');
    if (pips && pips.children.length) {
      const i = U.clamp(Math.floor(n / Math.max(1, total) * pips.children.length), 0, pips.children.length - 1);
      for (let k = 0; k <= i; k++) pips.children[k].classList.add('on');
      if (perfect && pips.children[i]) pips.children[i].classList.add('perfect');
    }
    if (perfect) UI.message('PERFECT', 'good', .55);
  };
  UI.coin = function () {
    UI.coinPulse = .3;
  };
  UI.setHint = function (t) {
    const el = document.getElementById('hHint');
    if (!el) return;
    el.textContent = t;
    el.classList.toggle('show', !!t);
  };
  UI.updateHUD = function (dt) {
    if (ID.G.state !== 'race' && ID.G.state !== 'finish' && ID.G.state !== 'countdown') return;
    const p = ID.Game.player; if (!p) return;
    const C = UI.hudCache;
    const set = (id, val) => { if (C[id] !== val) { C[id] = val; const e = document.getElementById(id); if (e) e.textContent = val; } };
    const cfg = ID.Game.cfg;
    set('hSpeed', String(Math.round(p.speed * 3.6)));
    set('hTime', U.fmtTime(cfg && cfg.mode === 'freestyle' ? Math.max(0, cfg.time - ID.Game.clock) : ID.Game.run.time));
    set('hScore', U.fmtNum(p.score));
    set('hCoins', String(p.coins));
    set('hGates', p.gates + '/' + ID.Game.course.gates.length);
    set('hRank', cfg && cfg.rivals > 0 ? U.ordinal(p.rank) : '—');
    set('hAir', p.air && p.airT > .25 ? p.airT.toFixed(1) + 's' : '');
    /* combo */
    const comboEl = document.getElementById('hCombo');
    if (comboEl) {
      const txt = p.combo > 1.05 ? 'x' + p.combo.toFixed(1) : '';
      if (C.combo !== txt) { C.combo = txt; comboEl.textContent = txt; comboEl.classList.toggle('on', !!txt); }
    }
    /* boost meter */
    const bf = document.getElementById('hBoostFill');
    if (bf) bf.style.width = (p.boost * 100) + '%';
    const bm = document.getElementById('hBoost');
    if (bm) bm.classList.toggle('ready', p.boost > .6);
    /* speed arc */
    const arc = document.getElementById('hSpeedArc');
    if (arc) arc.style.background = 'conic-gradient(from 135deg, #22d3ff ' + Math.round(U.clamp(p.speed / p.maxSpeed, 0, 1) * 270) + 'deg, rgba(255,255,255,.08) 0deg)';
    /* danger */
    const dg = document.getElementById('hDanger');
    if (dg) dg.style.opacity = ID.Game.danger > .05 ? String(Math.min(1, .35 + ID.Game.danger)) : '0';
    const db = document.getElementById('hDangerBarFill');
    if (db) {
      db.parentNode.style.display = ID.Game.danger > .02 ? 'block' : 'none';
      db.style.width = Math.round(ID.Game.danger * 100) + '%';
    }
    /* lives */
    const lv = document.getElementById('hLives');
    if (lv && cfg && cfg.lives) {
      const t = '●'.repeat(Math.max(0, cfg.lives)) + '○'.repeat(Math.max(0, (cfg.maxLives || 3) - cfg.lives));
      if (C.lives !== t) { C.lives = t; lv.textContent = t; }
    }
    /* countdown */
    const cd = document.getElementById('hCount');
    if (cd) {
      if (ID.G.state === 'countdown') {
        const n = Math.ceil(ID.Game.countdown - .2);
        const t = n > 0 ? String(Math.min(3, n)) : 'GO!';
        if (C.cd !== t) {
          C.cd = t; cd.textContent = t;
          cd.classList.remove('go'); void cd.offsetWidth;
          cd.classList.add('show'); cd.classList.toggle('go', t === 'GO!');
          ID.A.sfx(t === 'GO!' ? 'go' : 'count');
          if (t === 'GO!') setTimeout(() => cd.classList.remove('show'), 800);
        }
      } else if (C.cd !== '') { C.cd = ''; cd.classList.remove('show'); }
    }
    /* coin pulse */
    if (UI.coinPulse > 0) {
      UI.coinPulse -= dt;
      const cw = document.getElementById('hCoinWrap');
      if (cw) cw.style.transform = 'scale(' + (1 + UI.coinPulse * .8) + ')';
    }
    /* fps */
    if (SV.set.fps) {
      const f = document.getElementById('debugStats');
      if (f) f.textContent = Math.round(ID.G.fps) + ' fps · ' + ID.FX.renderer.info.render.calls + ' calls · ' + U.fmtNum(ID.FX.renderer.info.render.triangles) + ' tris';
    }
  };
  UI.leaveRace = function () {
    document.getElementById('hud').classList.remove('on');
    document.getElementById('touchui').classList.remove('on');
    hideAll();
  };

  /* ------------------------------------------------------------------
     RESULTS
     ------------------------------------------------------------------ */
  UI.showResults = function (r) {
    UI.leaveRace();
    const medalName = ['', 'BRONZE', 'SILVER', 'GOLD'][r.medal] || '';
    const loc = ID.World.LOCBY[r.loc];
    const tleft = U.fmtTime(r.time);
    let rankBlock = '';
    if (r.mode === 'race' && r.rivals && r.rivals.length) {
      rankBlock = '<div class="ranklines">' + r.rivals.map((a, i) => '<div class="rl"><b>' + (i + 1) + '</b><span>' + a.name + '</span><i>' + (a.t ? U.fmtTime(a.t) : '—') + '</i></div>').join('') +
        '<div class="rl me"><b>' + r.rank + '</b><span>YOU</span><i>' + U.fmtTime(r.time) + '</i></div></div>';
    }
    $('#s-results').innerHTML =
      '<div class="reswrap">' +
      '<div class="reshead"><div class="reswhere">' + loc.name + ' · ' + ID.MODES[r.mode].name + '</div>' +
      '<div class="resmedal m' + r.medal + '">' + (r.medal ? ic('medal') : ic('flag')) + '</div>' +
      '<div class="restitle">' + (r.medal >= 3 ? 'GOLD RUN!' : r.medal === 2 ? 'SILVER FINISH' : r.medal === 1 ? 'BRONZE FINISH' : (r.reason === 'crash' ? 'RUN OVER' : 'FINISHED')) + '</div>' +
      '<div class="resmedname">' + medalName + '</div></div>' +
      '<div class="resgrid">' +
      '<div class="resstat"><span>Time</span><b>' + tleft + '</b></div>' +
      '<div class="resstat"><span>Position</span><b>' + (r.rivals && r.rivals.length ? U.ordinal(r.rank) : '—') + '</b></div>' +
      '<div class="resstat"><span>Score</span><b>' + U.fmtNum(r.score) + '</b></div>' +
      '<div class="resstat"><span>Gates</span><b>' + r.gates + '/' + r.gatesTotal + '</b></div>' +
      '<div class="resstat"><span>Perfect</span><b>' + r.perfect + '</b></div>' +
      '<div class="resstat"><span>Top speed</span><b>' + Math.round(r.topSpeed * 3.6) + ' km/h</b></div>' +
      '<div class="resstat"><span>Distance</span><b>' + Math.round(r.dist) + ' m</b></div>' +
      '<div class="resstat"><span>Best combo</span><b>x' + r.combo.toFixed(1) + '</b></div>' +
      '</div>' +
      (rankBlock ? '<div class="rescol">' + rankBlock + '</div>' : '') +
      '<div class="rewardrow">' +
      '<div class="rw">' + ic('coin') + '<b>+' + U.fmtNum(r.coinsEarned) + '</b><span>coins</span></div>' +
      '<div class="rw">' + ic('star') + '<b>+' + U.fmtNum(r.xpEarned) + '</b><span>XP</span></div>' +
      (r.coins ? '<div class="rw">' + ic('sparkle') + '<b>' + r.coins + '</b><span>pickups</span></div>' : '') +
      (r.newBest ? '<div class="rw hi">' + ic('trophy') + '<b>NEW BEST</b></div>' : '') +
      '</div>' +
      '<div class="resactions">' +
      '<button class="btn big go" data-act="again">' + ic('refresh') + ' RIDE AGAIN</button>' +
      '<button class="btn" data-act="backMenu">' + ic('home') + ' MENU</button>' +
      '<button class="btn" data-act="career">' + ic('trophy') + ' CAREER</button>' +
      '</div></div>';
    show('results');
    ID.flyCoins && ID.flyCoins(8, document.querySelector('.rw'));
  };

  /* ------------------------------------------------------------------
     TOUCH CONTROLS
     ------------------------------------------------------------------ */
  UI.bindTouch = function () {
    const root = document.getElementById('touchui');
    if (!root) return;
    const stick = document.getElementById('tStick'), knob = document.getElementById('tKnob');
    let stickId = null, sx = 0, sy = 0;
    const startStick = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      stickId = t.identifier !== undefined ? t.identifier : 'm';
      const r = stick.getBoundingClientRect();
      sx = r.left + r.width / 2; sy = r.top + r.height / 2;
      moveStick(t);
    };
    const moveStick = (t) => {
      const dx = t.clientX - sx, dy = t.clientY - sy;
      const r = stick.getBoundingClientRect().width * .5;
      const len = Math.hypot(dx, dy) || 1;
      const cl = Math.min(1, len / (r * .9));
      const nx = dx / len * cl, ny = dy / len * cl;
      ID.IN.touch.steer = Math.abs(nx) > .12 ? nx : 0;
      if (knob) knob.style.transform = 'translate(' + (nx * r * .6) + 'px,' + (ny * r * .6) + 'px)';
    };
    const endStick = () => { stickId = null; ID.IN.touch.steer = 0; if (knob) knob.style.transform = ''; };
    stick.addEventListener('touchstart', (e) => { e.preventDefault(); startStick(e); }, { passive: false });
    stick.addEventListener('touchmove', (e) => { e.preventDefault(); if (stickId !== null) moveStick(e.changedTouches[0]); }, { passive: false });
    stick.addEventListener('touchend', (e) => { e.preventDefault(); endStick(); }, { passive: false });
    stick.addEventListener('touchcancel', endStick);
    /* mouse fallback */
    stick.addEventListener('mousedown', (e) => { startStick(e); const mm = (ev) => moveStick(ev); const mu = () => { endStick(); removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); }; addEventListener('mousemove', mm); addEventListener('mouseup', mu); });
    const hold = (id, key, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => { e.preventDefault(); el.classList.add('dn'); ID.IN.touch[key] = val === undefined ? 1 : val; ID.IN.lastInput = 'touch'; };
      const off = (e) => { if (e) e.preventDefault(); el.classList.remove('dn'); ID.IN.touch[key] = 0; };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off);
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
    };
    const tap = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => {
        e.preventDefault(); el.classList.add('dn');
        ID.IN.lastInput = 'touch';
        if (key === 'jump') ID.IN.jumpBuf = .18;
        if (key === 'trickA') ID.IN.trickBuf = .3;
        if (key === 'trickB') ID.IN.trickBuf2 = .3;
        if (key === 'cam') ID.Game.camCycle();
        setTimeout(() => el.classList.remove('dn'), 120);
      };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('mousedown', on);
    };
    hold('tTuck', 'acc'); hold('tBrake', 'brake'); hold('tBoost', 'boost'); hold('tGrab', 'grab');
    tap('tJump', 'jump'); tap('tSpin', 'trickA'); tap('tFlip', 'trickB'); tap('tCam', 'cam');
  };

  /* ------------------------------------------------------------------
     ACTION ROUTER
     ------------------------------------------------------------------ */
  const Actions = {
    startgame() {
      ID.A.init(); ID.A.resume();
      UI.renderMenu();
    },
    backMenu() { ID.G.state = 'menu'; ID.Game.disposeRun && ID.Game.disposeRun(); ID.UI.renderMenu(); },
    quickplay() {
      const loc = SV.lastLoc || 'valley';
      ID.UI.leaveRace();
      const ev = careerEvents()[0];
      ID.Game.start({ mode: 'race', loc, diff: (ID.World.LOCBY[loc].diff || 1) });
    },
    modes() { UI.renderModes(); },
    mountains() { UI.renderMountains(); },
    garage() { ID.G.state = 'garage'; UI.renderGarage(); },
    career() { UI.renderCareer(); },
    settings() { UI.renderSettings(); },
    ach() { UI.renderCareer(); },
    help() { UI.renderHelp(); },
    daily() {
      const d = dailyState();
      if (d.done) { ID.toast('Come back tomorrow for a new challenge', 'info'); return; }
      ID.UI.leaveRace();
      ID.Game.start({ mode: d.mode, loc: d.loc, diff: 2, daily: d.key });
      SV.daily.last = d.key; SV.daily.done = true; SV.daily.streak++; ID.SV.coins += d.reward; ID.save();
      setTimeout(() => ID.toast('Daily complete! +' + d.reward + ' coins', 'good', ic('star')), 1500);
    },
    playmode(el) {
      const mode = el.dataset.mode;
      const loc = SV.lastLoc || 'valley';
      ID.UI.leaveRace();
      ID.Game.start({ mode, loc, diff: ID.World.LOCBY[loc].diff || 1 });
    },
    setloc(el) {
      SV.lastLoc = el.dataset.loc; SV.unlocked[el.dataset.loc] = true; ID.save();
      UI.showScreenPreview();
      ID.toast('Mountain selected · ' + ID.World.LOCBY[el.dataset.loc].name, 'good');
      UI.renderMountains();
    },
    unlockloc(el) {
      const l = ID.World.LOCBY[el.dataset.loc];
      if (SV.level < l.lvl || SV.coins < l.cost) { ID.A.sfx('error'); ID.toast('Need level ' + l.lvl + ' and ' + l.cost + ' coins', 'bad'); return; }
      SV.coins -= l.cost; SV.unlocked[l.id] = true; SV.lastLoc = l.id; ID.save();
      ID.A.sfx('buy');
      ID.toast('Unlocked ' + l.name + '!', 'good', ic('globe'));
      UI.renderMountains();
    },
    gcat(el) { garageCat = el.dataset.cat; UI.renderGarage(true); },
    equip(el) {
      SV.equip[el.dataset.cat] = +el.dataset.i; ID.save(); ID.A.sfx('ui'); UI.renderGarage(true);
    },
    buy(el) {
      const cat = el.dataset.cat, i = +el.dataset.i, it = ID.ITEMS[cat][i];
      if (SV.coins < it.p) { ID.A.sfx('error'); ID.toast('Not enough coins', 'bad'); return; }
      SV.coins -= it.p; SV.owned[cat + i] = 1; SV.equip[cat] = i; ID.save();
      ID.A.sfx('buy'); ID.flyCoins(6, el); ID.toast(it.n + ' acquired!', 'good', ic('check'));
      UI.renderGarage(true);
    },
    rider(el) { SV.rider = el.dataset.v; ID.save(); ID.A.sfx('ui'); UI.renderGarage(true); },
    paint(el) { SV.paint = +el.dataset.v; ID.save(); ID.A.sfx('ui'); UI.renderGarage(true); },
    startevent(el) {
      const ev = careerEvents().find(e => e.id === el.dataset.id);
      if (!ev) return;
      ID.UI.leaveRace();
      ID.Game.start({ mode: ev.mode, loc: ev.loc, diff: ev.diff, event: ev.id, target: ev.target, length: ev.length });
    },
    resume() { UI.hidePause(); ID.Game.resume(); },
    backToPause() { UI.showPause(); },
    restart() { UI.hidePause(); ID.Game.restart(); },
    again() { ID.Game.restart(); },
    quit() {
      UI.hidePause(); ID.G.state = 'menu'; ID.Game.disposeRun && ID.Game.disposeRun(); UI.renderMenu();
    },
    settings2() { UI.renderSettings(); UI._settingsReturn = 'pause'; },
    set(el) {
      const k = el.dataset.k, v = el.dataset.v;
      if (k === '__cam') { ID.Game.camCycle(); return; }
      if (k === 'quality') { SV.set.quality = v; ID.applyQuality(true); }
      else if (['cam'].includes(k)) SV.set[k] = isNaN(+v) ? v : +v;
      else SV.set[k] = (v === 'true' || v === true) ? true : (v === 'false' ? false : v);
      ID.save(); ID.A.applySettings && ID.A.applySettings(); ID.A.sfx('ui');
      UI.renderSettings();
    },
    tog(el) {
      const k = el.dataset.k;
      SV.set[k] = !SV.set[k];
      if (k === 'mute') ID.A.setVolumes();
      ID.save(); ID.A.sfx('ui');
      el.classList.toggle('on', SV.set[k]);
    },
    cam() { ID.Game.camCycle(); },
    pause() { ID.togglePause(); },
    muteBtn() { ID.toggleMute(); },
    toggleSound() { SV.set.mute = !SV.set.mute; ID.A.setVolumes(); ID.save(); UI.renderMenu(); },
    toggleFull() {
      if (!document.fullscreenElement) (document.documentElement.requestFullscreen || function () { }).call(document.documentElement).catch(() => { });
      else document.exitFullscreen && document.exitFullscreen();
    },
    exportSave() {
      try {
        const blob = new Blob([JSON.stringify(SV)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'icedrift-save.json'; a.click();
      } catch (e) { }
    },
    resetSave() {
      if (UI._confirmReset) { ID.resetSave(); return; }
      UI._confirmReset = true;
      ID.toast('Tap reset again to confirm', 'warn');
      setTimeout(() => UI._confirmReset = false, 3000);
    },
  };
  UI.showScreenPreview = function () { };

  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (!act) return;
    e.preventDefault();
    ID.A.init(); ID.A.resume();
    if (Actions[act]) { ID.A.sfx('ui'); try { Actions[act](el); } catch (err) { console.error(err); ID.toast('Something went wrong', 'bad'); } }
  }, { passive: false });
  document.addEventListener('pointerover', function (e) {
    const el = e.target.closest && e.target.closest('.navbtn,.modecard,.gearbtn,.btn');
    if (el) { el.classList.add('hov'); }
  });
  document.addEventListener('input', function (e) {
    const el = e.target.closest('input[data-set]');
    if (!el) return;
    const k = el.dataset.set;
    SV.set[k] = parseFloat(el.value);
    if (k === 'res') { ID.E && ID.E.resize(true); }
    if (['vol', 'sfx', 'music', 'mute'].includes(k)) ID.A.setVolumes();
    ID.save();
    const b = el.parentNode.querySelector('b');
    if (b) b.textContent = Math.round(SV.set[k] * 100) + '%';
  });

  /* live preview loop for garage */
  UI.tick = function (dt, t) {
    if (UI.screen === 'garage') UI.updatePreview(dt, t);
    UI.updateHUD(dt);
  };
  UI.ic = ic;
})(window.ID);
