// effects.js — particles, explosions, floating text
(function (global) {
  'use strict';

  class Effects {
    constructor() {
      this.particles = [];
      this.texts = [];
      this.shake = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }

    reset() {
      this.particles = [];
      this.texts = [];
      this.shake = 0;
    }

    explosion(x, y, kind) {
      const count = kind === 'big' ? 60 : 24;
      const colors = kind === 'big'
        ? ['#fff', '#ffe066', '#ff8a3d', '#ff3b3b', '#ff66aa']
        : ['#fff', '#ffe066', '#ff8a3d', '#ff3b3b'];
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (kind === 'big' ? 80 : 50) + Math.random() * (kind === 'big' ? 260 : 160);
        this.particles.push({
          x, y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0.6 + Math.random() * 0.6,
          maxLife: 1.2,
          size: 1.5 + Math.random() * (kind === 'big' ? 4 : 2.5),
          color: colors[Math.floor(Math.random() * colors.length)],
          gravity: 60,
        });
      }
      // shockwave ring
      this.particles.push({
        x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4,
        size: kind === 'big' ? 8 : 4, color: '#fff', ring: true,
        ringMax: kind === 'big' ? 90 : 40,
      });
      if (kind === 'big') this.shake = 0.4;
    }

    hit(x, y) {
      for (let i = 0; i < 8; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 80;
        this.particles.push({
          x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 0.3 + Math.random() * 0.3, maxLife: 0.6,
          size: 1 + Math.random() * 2, color: '#ffe066', gravity: 40,
        });
      }
    }

    powerup(x, y) {
      for (let i = 0; i < 20; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 120;
        this.particles.push({
          x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
          size: 2 + Math.random() * 2, color: '#66ffaa', gravity: -20,
        });
      }
    }

    text(x, y, str, color) {
      this.texts.push({ x, y, str, color: color || '#fff', life: 1.0, vy: -60 });
    }

    enemyShoot() {}

    update(dt) {
      // particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) { this.particles.splice(i, 1); continue; }
        if (p.ring) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity || 0) * dt;
        p.vx *= 0.98;
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life -= dt;
        t.y += t.vy * dt;
        if (t.life <= 0) this.texts.splice(i, 1);
      }
      if (this.shake > 0) {
        this.shake -= dt;
        this.shakeX = (Math.random() - 0.5) * this.shake * 12;
        this.shakeY = (Math.random() - 0.5) * this.shake * 12;
      } else {
        this.shakeX = 0; this.shakeY = 0;
      }
    }

    draw(ctx) {
      for (const p of this.particles) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        if (p.ring) {
          const r = p.ringMax * (1 - a);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      for (const t of this.texts) {
        const a = Math.max(0, t.life);
        ctx.globalAlpha = a;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  }

  global.Effects = Effects;
})(window);
