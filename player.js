// player.js
(function (global) {
  'use strict';
  class Player {
    constructor(w, h, aircraft, upgrades, diffMult) {
      this.w = w; this.h = h;
      const a = aircraft || AircraftData.AIRCRAFT[0];
      this.aircraft = a;
      const up = upgrades || {};
      this.speed = a.speed * (up.speed || 1) * (diffMult || 1);
      this.maxHealth = Math.round(a.health * (up.health || 1));
      this.health = this.maxHealth;
      this.fireRateMult = (up.fireRate || 1);
      this.damageMult = (up.damage || 1);
      this.resetPos();
      this.lives = 3;
      this.score = 0;
      this.coins = 0;
      this.alive = true;
      this.invincible = 0;
      this.shield = 0;
      this.rapidFire = 0;
      this.doubleDamage = 0;
      this.weapon = a.bullet || 'normal';
      this.shootCooldown = 0;
      this.trail = [];
      this.engineFlicker = 0;
      this.level = 1;
      this.kills = 0;
      this.powerups = 0;
    }
    resetPos() { this.x = this.w / 2; this.y = this.h * 0.78; this.vx = 0; this.vy = 0; }
    resetForLevel() { this.resetPos(); this.health = this.maxHealth; this.alive = true; this.invincible = 2; this.shield = 0; this.rapidFire = 0; this.doubleDamage = 0; }
    update(dt, input, bounds, sensitivity) {
      if (!this.alive) return;
      let mx = 0, my = 0;
      if (input.left) mx -= 1;
      if (input.right) mx += 1;
      if (input.up) my -= 1;
      if (input.down) my += 1;
      const len = Math.hypot(mx, my) || 1;
      if (mx || my) { mx /= len; my /= len; }
      const sens = sensitivity || 1;
      const sp = this.speed * sens;
      this.vx = mx * sp; this.vy = my * sp;
      this.x += this.vx * dt; this.y += this.vy * dt;
      const pad = 24;
      this.x = Math.max(pad, Math.min(bounds.w - pad, this.x));
      this.y = Math.max(pad + 40, Math.min(bounds.h - pad, this.y));
      if (this.invincible > 0) this.invincible -= dt;
      if (this.shield > 0) this.shield -= dt;
      if (this.rapidFire > 0) this.rapidFire -= dt;
      if (this.doubleDamage > 0) this.doubleDamage -= dt;
      this.shootCooldown -= dt;
      this.engineFlicker += dt * 12;
      this.trail.push({ x: this.x, y: this.y + 18, a: 1 });
      if (this.trail.length > 14) this.trail.shift();
      for (const t of this.trail) t.a -= dt * 3;
    }
    canShoot() { return this.shootCooldown <= 0; }
    shoot(bullets) {
      const weapon = this.weapon;
      const up = { fireRate: this.fireRateMult, damage: this.damageMult * (this.doubleDamage > 0 ? 2 : 1) };
      const ok = Weapons.fire(this, bullets, weapon, up);
      if (ok && AudioManager) AudioManager.sfx.shoot();
      return ok;
    }
    takeDamage(dmg, effects) {
      if (this.invincible > 0 || this.shield > 0) return false;
      this.health -= dmg;
      if (effects) effects.hit(this.x, this.y);
      if (this.health <= 0) {
        this.lives -= 1;
        if (this.lives > 0) {
          this.health = this.maxHealth;
          this.invincible = 2.5;
          if (effects) effects.explosion(this.x, this.y, 'big');
        } else {
          this.alive = false;
          if (effects) effects.explosion(this.x, this.y, 'big');
        }
        return true;
      }
      return false;
    }
    draw(ctx) {
      for (const t of this.trail) {
        ctx.globalAlpha = Math.max(0, t.a) * 0.5;
        ctx.fillStyle = '#ff8a3d';
        ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) ctx.globalAlpha = 0.4;
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.shield > 0) {
        ctx.strokeStyle = 'rgba(80,200,255,0.8)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(80,200,255,0.15)'; ctx.fill();
      }
      const c = this.aircraft.color;
      const grad = ctx.createLinearGradient(0, -28, 0, 28);
      grad.addColorStop(0, c); grad.addColorStop(1, '#1e3a6a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -30); ctx.lineTo(12, -8); ctx.lineTo(16, 16); ctx.lineTo(8, 24); ctx.lineTo(0, 20); ctx.lineTo(-8, 24); ctx.lineTo(-16, 16); ctx.lineTo(-12, -8);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0a2a5a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.ellipse(0, -6, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a7fd4';
      ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-28, 10); ctx.lineTo(-26, 16); ctx.lineTo(-10, 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(28, 10); ctx.lineTo(26, 16); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill();
      const fl = 6 + Math.sin(this.engineFlicker) * 4;
      const fg = ctx.createLinearGradient(0, 18, 0, 18 + fl);
      fg.addColorStop(0, '#fff'); fg.addColorStop(0.3, '#ffaa33'); fg.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(-4, 18); ctx.lineTo(0, 18 + fl); ctx.lineTo(4, 18); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  global.Player = Player;
})(window);
