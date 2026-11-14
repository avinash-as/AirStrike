// bullets.js — bullet management helpers
(function (global) {
  'use strict';

  // Bullets are plain objects managed by game.js arrays.
  // This module provides factory + update + draw utilities.

  function makeBullet(opts) {
    return Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, r: 4, dmg: 1,
      owner: 'player', color: '#fff', life: 3, trail: []
    }, opts);
  }

  function updateBullet(b, dt, bounds) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 6) b.trail.shift();
    return (
      b.life > 0 &&
      b.x > -20 && b.x < bounds.w + 20 &&
      b.y > -20 && b.y < bounds.h + 20
    );
  }

  function drawBullet(ctx, b) {
    // trail
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      if (i === 0) ctx.moveTo(t.x, t.y);
      else ctx.lineTo(t.x, t.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // glow
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3);
    g.addColorStop(0, b.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  global.Bullets = { makeBullet, updateBullet, drawBullet };
})(window);
