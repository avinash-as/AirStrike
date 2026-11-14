// weapons.js — weapon definitions and bullet spawning
(function (global) {
  'use strict';
  const WEAPONS = {
    normal:  { name: 'Normal',  cooldown: 0.16, dmg: 1, count: 1, spread: 0, color: '#ffe066', speed: 720 },
    double:  { name: 'Double',  cooldown: 0.16, dmg: 1, count: 2, spread: 0.18, color: '#ffe066', speed: 720 },
    triple:  { name: 'Triple',  cooldown: 0.18, dmg: 1, count: 3, spread: 0.22, color: '#ffe066', speed: 720 },
    laser:   { name: 'Laser',   cooldown: 0.08, dmg: 2, count: 1, spread: 0, color: '#c084fc', speed: 900 },
    missile: { name: 'Missile', cooldown: 0.35, dmg: 4, count: 2, spread: 0.35, color: '#ff66aa', speed: 520 },
  };

  function fire(player, bullets, weaponKey, upgrades) {
    const w = WEAPONS[weaponKey] || WEAPONS.normal;
    const cd = w.cooldown / (upgrades && upgrades.fireRate ? upgrades.fireRate : 1) / (player.rapidFire > 0 ? 1.6 : 1);
    if (player.shootCooldown > 0) return false;
    player.shootCooldown = cd;
    const sp = w.speed;
    const dmg = w.dmg * (upgrades && upgrades.damage ? upgrades.damage : 1);
    const n = w.count;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * w.spread;
      const vx = Math.sin(off) * sp * 0.4;
      const vy = -Math.cos(off) * sp;
      bullets.push({ x: player.x + (i - (n-1)/2)*6, y: player.y - 26, vx, vy, r: weaponKey === 'laser' ? 3 : 4, dmg, owner: 'player', color: w.color, life: 3, trail: [], weapon: weaponKey });
    }
    // missile homing handled in update? keep simple
    return true;
  }

  global.Weapons = { WEAPONS, fire };
})(window);
