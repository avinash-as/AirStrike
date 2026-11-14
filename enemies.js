// enemies.js
(function (global) {
  'use strict';
  let uid = 1;

  const ENEMY_DEFS = {
    small:  { radius: 16, health: 1,   score: 100, speed: 110, shoot: 2.0, color1: '#ff7a7a', color2: '#a81010' },
    fast:   { radius: 14, health: 1,   score: 150, speed: 180, shoot: 1.6, color1: '#ffdd55', color2: '#aa7700' },
    medium: { radius: 22, health: 4,   score: 250, speed: 70,  shoot: 1.5, color1: '#ffb347', color2: '#8a3a00' },
    heavy:  { radius: 28, health: 8,   score: 400, speed: 50,  shoot: 1.2, color1: '#ff9966', color2: '#662200' },
    elite:  { radius: 20, health: 5,   score: 350, speed: 100, shoot: 1.0, color1: '#c084fc', color2: '#4a0a8a' },
  };

  class Enemy {
    constructor(type, w, h, difficulty) {
      this.id = uid++;
      this.type = type;
      this.w = w; this.h = h;
      this.difficulty = difficulty || 1;
      this.def = ENEMY_DEFS[type] || ENEMY_DEFS.small;
      this.alive = true;
      this.escaped = false;
      this.hitFlash = 0;
      this.shootTimer = 0.5 + Math.random() * 1.5;
      this.age = 0;
      this.radius = this.def.radius;
      this.health = Math.round(this.def.health * (1 + (difficulty - 1) * 0.3));
      this.maxHealth = this.health;
      this.score = this.def.score;
      this.speed = this.def.speed + (difficulty - 1) * 8;
      this.shootInterval = Math.max(0.6, this.def.shoot - (difficulty - 1) * 0.1);
      this.x = 40 + Math.random() * (w - 80);
      this.y = -40;
      this.vx = (Math.random() - 0.5) * 40;
      this.vy = this.speed;
      this.phase = Math.random() * Math.PI * 2;
      this.amp = 50 + Math.random() * 60;
      this.pattern = this.pickPattern(type);
    }
    pickPattern(type) {
      if (type === 'fast') return 'zigzag';
      if (type === 'medium' || type === 'heavy') return 'sine';
      if (type === 'elite') return 'circle';
      return Math.random() < 0.5 ? 'straight' : 'zigzag';
    }
    update(dt, player, bullets, bounds, effects) {
      if (!this.alive) return;
      this.age += dt;
      if (this.hitFlash > 0) this.hitFlash -= dt;
      if (this.pattern === 'straight') {
        this.y += this.vy * dt; this.x += this.vx * dt;
      } else if (this.pattern === 'zigzag') {
        this.y += this.vy * dt;
        this.x += Math.sin(this.age * 4 + this.phase) * 140 * dt;
      } else if (this.pattern === 'sine') {
        this.y += this.vy * dt;
        this.x = bounds.w / 2 + Math.sin(this.age * 1.4 + this.phase) * this.amp;
      } else if (this.pattern === 'circle') {
        this.y += this.vy * dt * 0.6;
        this.x += Math.cos(this.age * 2) * 60 * dt;
      }
      if (this.x < 16) { this.x = 16; this.vx = Math.abs(this.vx); }
      if (this.x > bounds.w - 16) { this.x = bounds.w - 16; this.vx = -Math.abs(this.vx); }
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = this.shootInterval;
        this.doShoot(player, bullets, effects);
      }
      if (this.y > bounds.h + 60) { this.escaped = true; this.alive = false; }
    }
    doShoot(player, bullets, effects) {
      const ang = Math.atan2(player.y - this.y, player.x - this.x);
      const sp = 280 + this.difficulty * 10;
      if (this.type === 'heavy') {
        for (let i = -2; i <= 2; i++) {
          const a = ang + i * 0.15;
          bullets.push({ x: this.x, y: this.y + this.radius, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5, dmg: 1, owner: 'enemy', color: '#ff5a5a', life: 4, trail: [] });
        }
      } else if (this.type === 'elite') {
        for (let i = 0; i < 5; i++) {
          const a = ang + (i - 2) * 0.2;
          bullets.push({ x: this.x, y: this.y + this.radius, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 4, dmg: 1, owner: 'enemy', color: '#c084fc', life: 4, trail: [] });
        }
      } else {
        bullets.push({ x: this.x, y: this.y + this.radius, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 4, dmg: 1, owner: 'enemy', color: '#ff5a5a', life: 4, trail: [] });
        if (this.type === 'medium') {
          bullets.push({ x: this.x, y: this.y + this.radius, vx: Math.cos(ang + 0.2) * sp, vy: Math.sin(ang + 0.2) * sp, r: 4, dmg: 1, owner: 'enemy', color: '#ff5a5a', life: 4, trail: [] });
          bullets.push({ x: this.x, y: this.y + this.radius, vx: Math.cos(ang - 0.2) * sp, vy: Math.sin(ang - 0.2) * sp, r: 4, dmg: 1, owner: 'enemy', color: '#ff5a5a', life: 4, trail: [] });
        }
      }
      if (effects) effects.enemyShoot();
      if (AudioManager) AudioManager.sfx.enemyShoot();
    }
    takeDamage(dmg, effects) {
      this.health -= dmg;
      this.hitFlash = 0.1;
      if (this.health <= 0) {
        this.alive = false;
        if (effects) effects.explosion(this.x, this.y, 'normal');
        return true;
      }
      return false;
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y);
      const d = this.def;
      const c1 = this.hitFlash > 0 ? '#fff' : d.color1;
      const c2 = this.hitFlash > 0 ? '#ddd' : d.color2;
      const grad = ctx.createLinearGradient(0, -this.radius, 0, this.radius);
      grad.addColorStop(0, c1); grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      if (this.type === 'heavy') {
        ctx.beginPath();
        ctx.moveTo(0, -this.radius); ctx.lineTo(this.radius + 6, -4); ctx.lineTo(this.radius + 10, this.radius - 4); ctx.lineTo(6, this.radius + 4); ctx.lineTo(0, this.radius); ctx.lineTo(-6, this.radius + 4); ctx.lineTo(-this.radius - 10, this.radius - 4); ctx.lineTo(-this.radius - 6, -4);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -this.radius); ctx.lineTo(this.radius * 0.7, 0); ctx.lineTo(this.radius * 0.5, this.radius); ctx.lineTo(0, this.radius * 0.7); ctx.lineTo(-this.radius * 0.5, this.radius); ctx.lineTo(-this.radius * 0.7, 0);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = c2; ctx.lineWidth = 1.2; ctx.stroke();
      // health bar for tanky
      if (this.maxHealth > 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-this.radius, -this.radius - 8, this.radius * 2, 4);
        ctx.fillStyle = '#66ffaa';
        ctx.fillRect(-this.radius, -this.radius - 8, this.radius * 2 * (this.health / this.maxHealth), 4);
      }
      ctx.restore();
    }
  }

  const BOSS_DEFS = [
    { name: 'Dreadnought', color1: '#c084fc', color2: '#4a0a8a', health: 120, radius: 56 },
    { name: 'Leviathan', color1: '#ff6b6b', color2: '#7a0000', health: 200, radius: 64 },
    { name: 'Overlord', color1: '#ffd93d', color2: '#7a5a00', health: 320, radius: 72 },
  ];

  class Boss {
    constructor(id, w, h, difficulty) {
      this.id = id;
      this.type = 'boss';
      this.w = w; this.h = h;
      this.difficulty = difficulty || 1;
      const def = BOSS_DEFS[id % BOSS_DEFS.length];
      this.name = def.name;
      this.color1 = def.color1; this.color2 = def.color2;
      this.radius = def.radius;
      this.health = Math.round(def.health * (1 + (difficulty - 1) * 0.4));
      this.maxHealth = this.health;
      this.score = 1000 + id * 500;
      this.alive = true;
      this.escaped = false;
      this.hitFlash = 0;
      this.age = 0;
      this.x = w / 2;
      this.y = -100;
      this.state = 'enter';
      this.attack = 0;
      this.shootTimer = 1.0;
      this.shootInterval = Math.max(0.7, 1.1 - (difficulty - 1) * 0.08);
      this.phase = 0;
    }
    update(dt, player, bullets, bounds, effects) {
      if (!this.alive) return;
      this.age += dt;
      if (this.hitFlash > 0) this.hitFlash -= dt;
      if (this.state === 'enter') {
        this.y += 50 * dt;
        if (this.y >= 90) { this.y = 90; this.state = 'fight'; }
        return;
      }
      this.x += Math.sin(this.age * 0.7) * 90 * dt;
      if (this.x < 90) this.x = 90;
      if (this.x > bounds.w - 90) this.x = bounds.w - 90;
      this.attack += dt;
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = this.shootInterval;
        this.doShoot(player, bullets, effects);
      }
    }
    doShoot(player, bullets, effects) {
      const phase = Math.floor(this.attack / 4) % 3;
      const sp = 300 + this.difficulty * 15;
      if (phase === 0) {
        for (let i = -4; i <= 4; i++) {
          const ang = Math.PI / 2 + i * 0.16;
          bullets.push({ x: this.x, y: this.y + this.radius, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 5, dmg: 1, owner: 'enemy', color: '#ff3333', life: 5, trail: [] });
        }
      } else if (phase === 1) {
        for (let i = -2; i <= 2; i++) {
          const ang = Math.atan2(player.y - this.y, player.x - this.x) + i * 0.12;
          bullets.push({ x: this.x, y: this.y + this.radius, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 5, dmg: 1, owner: 'enemy', color: '#ff3333', life: 5, trail: [] });
        }
      } else {
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2;
          bullets.push({ x: this.x, y: this.y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, r: 4, dmg: 1, owner: 'enemy', color: '#ff66aa', life: 5, trail: [] });
        }
      }
      if (effects) effects.enemyShoot();
      if (AudioManager) AudioManager.sfx.enemyShoot();
    }
    takeDamage(dmg, effects) {
      this.health -= dmg;
      this.hitFlash = 0.1;
      if (this.health <= 0) {
        this.alive = false;
        if (effects) effects.explosion(this.x, this.y, 'big');
        return true;
      }
      return false;
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y);
      const c1 = this.hitFlash > 0 ? '#fff' : this.color1;
      const c2 = this.hitFlash > 0 ? '#ddd' : this.color2;
      const grad = ctx.createLinearGradient(0, -this.radius, 0, this.radius);
      grad.addColorStop(0, c1); grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -this.radius); ctx.lineTo(this.radius * 0.6, -this.radius * 0.4); ctx.lineTo(this.radius, 0); ctx.lineTo(this.radius * 0.8, this.radius * 0.6); ctx.lineTo(this.radius * 0.3, this.radius); ctx.lineTo(0, this.radius * 0.8); ctx.lineTo(-this.radius * 0.3, this.radius); ctx.lineTo(-this.radius * 0.8, this.radius * 0.6); ctx.lineTo(-this.radius, 0); ctx.lineTo(-this.radius * 0.6, -this.radius * 0.4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = 2; ctx.stroke();
      // wings
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.moveTo(-this.radius * 0.4, -this.radius * 0.2); ctx.lineTo(-this.radius * 1.6, this.radius * 0.3); ctx.lineTo(-this.radius * 1.4, this.radius * 0.7); ctx.lineTo(-this.radius * 0.3, this.radius * 0.4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(this.radius * 0.4, -this.radius * 0.2); ctx.lineTo(this.radius * 1.6, this.radius * 0.3); ctx.lineTo(this.radius * 1.4, this.radius * 0.7); ctx.lineTo(this.radius * 0.3, this.radius * 0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath(); ctx.ellipse(0, -this.radius * 0.2, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
      // engine flames
      const fl = 10 + Math.sin(this.age * 10) * 6;
      ctx.fillStyle = 'rgba(255,120,0,0.8)';
      ctx.beginPath(); ctx.moveTo(-12, this.radius * 0.7); ctx.lineTo(-6, this.radius * 0.7 + fl); ctx.lineTo(0, this.radius * 0.7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, this.radius * 0.7); ctx.lineTo(6, this.radius * 0.7 + fl); ctx.lineTo(12, this.radius * 0.7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  class Spawner {
    constructor(w, h) { this.w = w; this.h = h; this.reset(); }
    reset() { this.timer = 0; this.difficulty = 1; this.bossActive = false; this.kills = 0; this.targetKills = 20; }
    update(dt, score, levelDef) {
      const ld = levelDef || {};
      this.difficulty = ld.difficulty || 1;
      this.timer -= dt;
    }
    shouldSpawn(levelDef) {
      const interval = (levelDef && levelDef.spawnInterval) || 1.0;
      if (this.timer <= 0) { this.timer = interval; return true; }
      return false;
    }
    spawnType(levelDef) {
      const pool = (levelDef && levelDef.enemyPool) || ['small'];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  global.Enemies = { Enemy, Boss, Spawner, ENEMY_DEFS, BOSS_DEFS };
})(window);
