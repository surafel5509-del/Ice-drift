/* =====================================================================
   ICE DRIFT  ·  data.js
   Gear catalogue · achievements · tips
   ===================================================================== */
'use strict';
(function (ID) {
  const SV = ID.SV;
  const G = (n, css, desc, p, lvl, b) => ({ n, css, desc, p, lvl: lvl || 1, b: b || {} });

  ID.ITEMS = {
    suit: [
      G('Summit Blue', 'linear-gradient(135deg,#2f7bff,#0d3f8f)', 'The classic resort kit. Balanced all-rounder.', 0, 1),
      G('Crimson Pro', 'linear-gradient(135deg,#ff4d5e,#8f1020)', 'Race-cut shell with a stiffer collar.', 320, 2, { control: 1 }),
      G('Forest Shell', 'linear-gradient(135deg,#3ddc84,#126a3c)', 'Recycled alpine shell. Warm and quiet.', 380, 3, { balance: 1 }),
      G('Glacier White', 'linear-gradient(135deg,#ffffff,#a8c4dd)', 'Snow-camo hardshell, ultra visible.', 520, 4, { control: 1, balance: 1 }),
      G('Stealth Black', 'linear-gradient(135deg,#3a3f4c,#0c0e13)', 'Matte black with hidden venting.', 760, 6, { speed: 1 }),
      G('Aurora Violet', 'linear-gradient(135deg,#a06bff,#4a1fa8)', 'Chromatic membrane, glows at night.', 1150, 8, { accel: 1, control: 1 }),
      G('Magma Edition', 'linear-gradient(135deg,#ff8a1f,#8f2a00)', 'Limited heat-bonded shell.', 1800, 10, { speed: 2, accel: 1 }),
      G('Aurora Prime', 'linear-gradient(135deg,#26f7d0,#0a63a8)', 'Pro-team kit. Every panel tuned.', 2800, 13, { speed: 2, control: 2, balance: 1 }),
    ],
    board: [
      G('Rookie Rails', 'linear-gradient(135deg,#eef4ff,#7d93a8)', 'Forgiving all-mountain board.', 0, 1),
      G('Carve Pro', 'linear-gradient(135deg,#22d3ff,#065a80)', 'Narrow waist, sharp edge grip.', 340, 2, { control: 1 }),
      G('Velocity X', 'linear-gradient(135deg,#ff3b30,#2b0704)', 'Sintered race base. Very fast.', 700, 4, { speed: 1 }),
      G('Glacier Blade', 'linear-gradient(135deg,#bfefff,#1b6fa8)', 'Ice-specific edge profile.', 1250, 6, { speed: 1, control: 1 }),
      G('Aurora Racer', 'linear-gradient(135deg,#7b2cff,#2affc4)', 'Carbon layup, tuned flex.', 1900, 8, { speed: 1, accel: 1, control: 1 }),
      G('Phantom Edge', 'linear-gradient(135deg,#161a22,#5b6b82)', 'Tour-pro stealth deck.', 3000, 11, { speed: 2, accel: 1 }),
    ],
    trail: [
      G('Fresh Powder', 'linear-gradient(90deg,#ffffff,#c7dcf0)', 'Clean white ski tracks.', 0, 1),
      G('Glacier Blue', 'linear-gradient(90deg,#8fe3ff,#1e9ad8)', 'Aurora blue tracks.', 260, 3),
      G('Sunset Coral', 'linear-gradient(90deg,#ffb08a,#ff5e5e)', 'Warm coral carve lines.', 420, 5),
      G('Neon Lime', 'linear-gradient(90deg,#c8ff5a,#3ddc84)', 'Hi-vis race lines.', 560, 6),
      G('Aurora', 'linear-gradient(90deg,#7bffd8,#a06bff)', 'Shimmering aurora wake.', 900, 9),
    ],
  };
  ID.TRAIL_COLORS = [0xffffff, 0x8fe3ff, 0xffb08a, 0xc8ff5a, 0x7bffd8];
  ID.trailColor = function () { return ID.TRAIL_COLORS[ID.SV.equip.trail] || 0xffffff; };

  ID.ACH = [
    { id: 'first', n: 'First Turns', d: 'Complete your first run', ic: 'flag', test: s => s.runs >= 1, reward: 100 },
    { id: 'gold', n: 'Golden Hour', d: 'Earn a gold medal', ic: 'medal', test: s => s.golds >= 1, reward: 200 },
    { id: 'g10', n: 'Collector', d: 'Earn 10 gold medals', ic: 'trophy', test: s => s.golds >= 10, reward: 900 },
    { id: 'trick', n: 'Spin to Win', d: 'Land 25 tricks', ic: 'star', test: s => s.tricks >= 25, reward: 350 },
    { id: 'combo', n: 'Combo King', d: 'Reach a x6 combo', ic: 'flame', test: s => (s.bestCombo || 0) >= 6, reward: 500 },
    { id: 'speed', n: 'Terminal Velocity', d: 'Hit 120 km/h', ic: 'bolt', test: s => (s.topspeed || 0) >= 33.3, reward: 400 },
    { id: 'dist', n: 'Long Haul', d: 'Ride 10,000 m in total', ic: 'globe', test: s => (s.dist || 0) >= 10000, reward: 600 },
    { id: 'air', n: 'Airtime', d: 'Stay airborne for 2 seconds', ic: 'board', test: s => (s.air || 0) >= 2, reward: 450 },
    { id: 'gates', n: 'Gatekeeper', d: 'Pass 250 gates', ic: 'gate', test: s => (s.gates || 0) >= 250, reward: 500 },
    { id: 'crashes', n: 'Send It', d: 'Wipe out 25 times (it happens)', ic: 'heart', test: s => s.crashes >= 25, reward: 250 },
  ];
  ID.checkAchievements = function () {
    let earned = [];
    const s = ID.SV.stats;
    for (const a of ID.ACH) {
      if (!ID.SV.ach[a.id] && a.test(s)) {
        ID.SV.ach[a.id] = 1; ID.SV.coins += a.reward;
        earned.push(a);
        if (ID.toast) ID.toast('Achievement: ' + a.n + ' +' + a.reward, 'good', ID.UI.ic ? ID.UI.ic('trophy') : '');
      }
    }
    if (earned.length) ID.save();
    return earned;
  };

  ID.TIPS = [
    'Carve hard into a gate for a PERFECT pass — it charges boost.',
    'Hold tuck on the straights. Every bit of speed is distance.',
    'Land tricks within a quarter turn of upright to stay clean.',
    'Chain tricks without crashing to grow the combo multiplier.',
    'The avalanche punishes hesitation — keep flowing downhill.',
    'Skid trails mark your line. Study them to find the fast route.',
    'Boost right before a kicker for maximum airtime.',
    'Off-piste powder is deep and slow. Stay on the corduroy.',
  ];
})(window.ID);
