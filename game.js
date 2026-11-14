// game.js — main engine
(function () {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(480, Math.floor(rect.height));
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (player) { player.w = W; player.h = H; }
  }

  // ---------- Save ----------
  let save = SaveManager.load();
  function persist() { SaveManager.save(save); }

  // ---------- State ----------
  const S = { LOADING: 0, MENU: 1, AIRCRAFT: 2, DIFFICULTY: 3, MISSIONS: 4, HANGAR: 5, SETTINGS: 6, SCORES: 7, PLAYING: 8, PAUSED: 9, LEVELCOMPLETE: 10, GAMEOVER: 11, BOSSWARN: 12 };
  let state = S.LOADING;
  let lastTime = 0;
  let player = null;
  let bullets = [];
  let enemies = [];
  let bosses = [];
  let powerups = [];
  let spawner = null;
  let effects = null;
  let currentLevel = 0;
  let levelDef = null;
  let difficulty = 'normal';
  let diffMult = 1;
  let boss = null;
  let levelCompleting = false;
  let bossWarningTimer = 0;
  let levelKills = 0;
  let levelCoins = 0;
  let runTime = 0;
  let playTimeAcc = 0;
  let selectedAircraft = save.selectedAircraft || 0;
  let unlockedSet = new Set(save.unlockedAircraft || [0]);
  // sync unlocked flags
  for (const a of AircraftData.AIRCRAFT) { a.unlocked = unlockedSet.has(a.id); }

  const input = { left: false, right: false, up: false, down: false, shoot: false };
  let touchId = null;
  const touchOffset = { x: 0, y: 0 };

  // ---------- Background ----------
  const clouds = [];
  const stars = [];
  function initBg() {
    clouds.length = 0;
    for (let i = 0; i < 16; i++) clouds.push({ x: Math.random() * W, y: Math.random() * H, s: 0.3 + Math.random() * 0.7, w: 60 + Math.random() * 90, speed: 20 + Math.random() * 40 });
    stars.length = 0;
    for (let i = 0; i < 50; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.5 + 0.5, tw: Math.random() * Math.PI * 2 });
  }
  function updateBg(dt, speed) {
    const sp = speed || 40;
    for (const c of clouds) { c.y += c.speed * 0.3 * dt * (sp / 40); if (c.y > H + 40) { c.y = -40; c.x = Math.random() * W; } }
    for (const s of stars) s.tw += dt * 2;
  }
  function drawBg(env) {
    // sky gradient based on env
    let colors;
    switch (env) {
      case 'night': colors = ['#050814', '#0a1a3a', '#1a2a5a', '#2a3a7a']; break;
      case 'space': colors = ['#000000', '#0a0020', '#1a0040', '#2a0060']; break;
      case 'desert': colors = ['#1a3a5a', '#3a6a8a', '#8a7a4a', '#c4a46a']; break;
      case 'snow': colors = ['#1a2a4a', '#3a5a8a', '#8aaacc', '#ddeeff']; break;
      case 'ocean': colors = ['#0a1a3a', '#1e4a8a', '#2e7ab8', '#4fa8d8']; break;
      case 'mountains': colors = ['#0a1a3a', '#2a4a6a', '#4a7a9a', '#8ab0cc']; break;
      default: colors = ['#0a1a3a', '#1e4a8a', '#2e7ab8', '#4fa8d8'];
    }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    if (env === 'space' || env === 'night') {
      for (const s of stars) {
        const a = 0.4 + Math.sin(s.tw) * 0.4;
        ctx.globalAlpha = a; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // clouds (not space)
    if (env !== 'space') {
      for (const c of clouds) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w * c.s, c.w * c.s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.ellipse(c.x + 20, c.y + 6, c.w * c.s * 0.7, c.w * c.s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // mountains/ocean band
    if (env === 'ocean' || env === 'mountains') {
      const oceanY = H * 0.85;
      const og = ctx.createLinearGradient(0, oceanY, 0, H);
      og.addColorStop(0, 'rgba(10,40,80,0.6)'); og.addColorStop(1, 'rgba(5,20,50,0.9)');
      ctx.fillStyle = og; ctx.fillRect(0, oceanY, W, H - oceanY);
    }
    if (env === 'desert') {
      ctx.fillStyle = 'rgba(200,160,80,0.4)';
      ctx.fillRect(0, H * 0.85, W, H * 0.15);
    }
    if (env === 'snow') {
      ctx.fillStyle = 'rgba(220,230,245,0.5)';
      ctx.fillRect(0, H * 0.85, W, H * 0.15);
    }
  }

  // ---------- DOM refs ----------
  const screens = {
    loading: document.getElementById('loadingScreen'),
    menu: document.getElementById('menuScreen'),
    aircraft: document.getElementById('aircraftScreen'),
    difficulty: document.getElementById('difficultyScreen'),
    missions: document.getElementById('missionsScreen'),
    hangar: document.getElementById('hangarScreen'),
    settings: document.getElementById('settingsScreen'),
    scores: document.getElementById('scoresScreen'),
    gameover: document.getElementById('gameoverScreen'),
  };
  const hud = document.getElementById('hud');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const levelCompleteOverlay = document.getElementById('levelCompleteOverlay');
  const bossWarnEl = document.getElementById('bossWarn');

  function showScreen(key) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    if (key && screens[key]) screens[key].classList.remove('hidden');
    const inGame = (key === null);
    hud.classList.toggle('hidden', !inGame);
    document.getElementById('pauseBtn').classList.toggle('hidden', !inGame);
  }

  // ---------- Audio UI sync ----------
  function syncAudioUI() {
    const on = AudioManager.enabled;
    const mon = AudioManager.musicEnabled;
    document.querySelectorAll('#soundToggle').forEach(b => b.textContent = on ? 'ON' : 'OFF');
  }

  // ---------- Aircraft list render ----------
  function renderAircraftList() {
    const container = document.getElementById('aircraftList');
    container.innerHTML = '';
    for (const a of AircraftData.AIRCRAFT) {
      const div = document.createElement('div');
      div.className = 'aircraft-card' + (a.id === selectedAircraft ? ' selected' : '') + (!a.unlocked ? ' locked' : '');
      div.innerHTML = `
        <div class="ac-name">${a.name}</div>
        <div class="ac-desc">${a.desc}</div>
        <div class="ac-stats">SPD:${a.speed} HP:${a.health} RATE:${a.fireRate}</div>
        <div class="ac-weapon">Weapon: ${a.bullet}</div>
        ${a.unlocked ? '<button class="btn small selectBtn" data-id="' + a.id + '">SELECT</button>' : '<button class="btn small unlockBtn" data-id="' + a.id + '">UNLOCK (' + a.unlockCost + ')</button>'}
      `;
      container.appendChild(div);
    }
    container.querySelectorAll('.selectBtn').forEach(b => b.addEventListener('click', () => {
      selectedAircraft = parseInt(b.dataset.id, 10);
      save.selectedAircraft = selectedAircraft;
      persist();
      renderAircraftList();
      AudioManager.sfx.button();
    }));
    container.querySelectorAll('.unlockBtn').forEach(b => b.addEventListener('click', () => {
      const id = parseInt(b.dataset.id, 10);
      const a = AircraftData.AIRCRAFT.find(x => x.id === id);
      if (a && save.coins >= a.unlockCost) {
        save.coins -= a.unlockCost;
        a.unlocked = true;
        unlockedSet.add(id);
        save.unlockedAircraft = [...unlockedSet];
        persist();
        renderAircraftList();
        AudioManager.sfx.powerup();
      } else {
        AudioManager.sfx.hit();
      }
    }));
  }

  function renderMissions() {
    const container = document.getElementById('missionsList');
    container.innerHTML = '';
    for (const m of MissionData.MISSIONS) {
      const prog = MissionData.progress(m, save);
      const done = prog >= m.target;
      const claimed = (save.missions[m.id] || {}).claimed;
      const div = document.createElement('div');
      div.className = 'mission-card' + (done ? ' done' : '');
      div.innerHTML = `<div class="m-name">${m.name}</div><div class="m-prog">${Math.min(prog, m.target)}/${m.target}</div><div class="m-reward">${m.reward} coins</div>` +
        (done && !claimed ? '<button class="btn small claimBtn" data-id="' + m.id + '">CLAIM</button>' : (claimed ? '<span class="claimed">CLAIMED</span>' : ''));
      container.appendChild(div);
    }
    container.querySelectorAll('.claimBtn').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id;
      const m = MissionData.MISSIONS.find(x => x.id === id);
      if (m) {
        save.coins += m.reward;
        save.missions[id] = { claimed: true };
        persist();
        renderMissions();
        updateMenuUI();
        AudioManager.sfx.powerup();
      }
    }));
  }

  function renderHangar() {
    const info = document.getElementById('hangarInfo');
    const a = AircraftData.AIRCRAFT.find(x => x.id === selectedAircraft) || AircraftData.AIRCRAFT[0];
    const up = save.aircraftUpgrades[selectedAircraft] || { health: 1, speed: 1, fireRate: 1, damage: 1 };
    info.innerHTML = `
      <h3>${a.name}</h3>
      <p>Health: ${Math.round(a.health * up.health)} (upgrade: ${Math.round(up.health * 100)}%)</p>
      <p>Speed: ${Math.round(a.speed * up.speed)} (upgrade: ${Math.round(up.speed * 100)}%)</p>
      <p>Fire Rate: ${up.fireRate.toFixed(2)}x</p>
      <p>Damage: ${up.damage.toFixed(2)}x</p>
      <div class="hangar-btns">
        <button class="btn small upgBtn" data-stat="health">+Health (200)</button>
        <button class="btn small upgBtn" data-stat="speed">+Speed (200)</button>
        <button class="btn small upgBtn" data-stat="fireRate">+FireRate (300)</button>
        <button class="btn small upgBtn" data-stat="damage">+Damage (300)</button>
      </div>
      <p>Coins: ${save.coins}</p>
    `;
    info.querySelectorAll('.upgBtn').forEach(b => b.addEventListener('click', () => {
      const stat = b.dataset.stat;
      const costs = { health: 200, speed: 200, fireRate: 300, damage: 300 };
      const cost = costs[stat];
      if (save.coins >= cost) {
        save.coins -= cost;
        if (!save.aircraftUpgrades[selectedAircraft]) save.aircraftUpgrades[selectedAircraft] = { health: 1, speed: 1, fireRate: 1, damage: 1 };
        const u = save.aircraftUpgrades[selectedAircraft];
        if (stat === 'health') u.health = Math.min(2.5, u.health + 0.15);
        if (stat === 'speed') u.speed = Math.min(2.0, u.speed + 0.1);
        if (stat === 'fireRate') u.fireRate = Math.min(2.5, u.fireRate + 0.15);
        if (stat === 'damage') u.damage = Math.min(3.0, u.damage + 0.2);
        persist();
        renderHangar();
        updateMenuUI();
        AudioManager.sfx.powerup();
      } else {
        AudioManager.sfx.hit();
      }
    }));
  }

  function updateMenuUI() {
    document.getElementById('menuHighScore').textContent = save.highScore;
    document.getElementById('menuCoins').textContent = save.coins;
    document.getElementById('bestScore').textContent = save.highScore;
    document.getElementById('totalCoins').textContent = save.coins;
    document.getElementById('levelsDone').textContent = (save.completedLevels || []).length;
  }

  // ---------- Loading ----------
  function doLoading() {
    let progress = 0;
    const fill = document.getElementById('loadingFill');
    const text = document.getElementById('loadingText');
    const iv = setInterval(() => {
      progress += 5 + Math.random() * 8;
      if (progress >= 100) { progress = 100; clearInterval(iv); }
      fill.style.width = progress + '%';
      text.textContent = 'Loading... ' + Math.floor(progress) + '%';
      if (progress >= 100) {
        setTimeout(() => { state = S.MENU; showScreen('menu'); updateMenuUI(); }, 400);
      }
    }, 60);
  }

  // ---------- Game lifecycle ----------
  function startLevel(levelIndex) {
    currentLevel = levelIndex;
    levelDef = LevelData.LEVELS[levelIndex];
    const aircraft = AircraftData.AIRCRAFT.find(a => a.id === selectedAircraft) || AircraftData.AIRCRAFT[0];
    const up = save.aircraftUpgrades[selectedAircraft] || { health: 1, speed: 1, fireRate: 1, damage: 1 };
    const diffMultMap = { easy: 0.85, normal: 1, hard: 1.25 };
    diffMult = diffMultMap[difficulty] || 1;
    player = new Player(W, H, aircraft, up, diffMult);
    // apply difficulty to player health? already via diffMult on speed only; adjust health
    if (difficulty === 'easy') player.maxHealth = Math.round(player.maxHealth * 1.2);
    if (difficulty === 'hard') player.maxHealth = Math.round(player.maxHealth * 0.85);
    player.health = player.maxHealth;
    bullets = []; enemies = []; bosses = []; powerups = [];
    spawner = new Enemies.Spawner(W, H);
    spawner.reset();
    spawner.targetKills = levelDef.targetKills;
    effects = new Effects();
    boss = null;
    bossWarningTimer = 0;
    levelKills = 0;
    levelCoins = 0;
    runTime = 0;
    levelCompleting = false;
    playTimeAcc = save.stats.playTime || 0;
    state = S.PLAYING;
    showScreen(null);
    initBg();
    if (AudioManager.musicEnabled) AudioManager.startMusic();
  }

  function triggerBoss() {
    const bossId = levelDef.boss;
    if (bossId < 0) return false;
    if (boss) return false;
    // trigger when kills reached
    if (levelKills < levelDef.targetKills) return false;
    boss = new Enemies.Boss(bossId, W, H, levelDef.difficulty * diffMult);
    bosses.push(boss);
    state = S.BOSSWARN;
    bossWarningTimer = 2.6;
    bossWarnEl.classList.remove('hidden');
    setTimeout(() => bossWarnEl.classList.add('hidden'), 2600);
    AudioManager.sfx.bossWarn();
    showScreen(null);
    return true;
  }

  function levelComplete() {
    if (levelCompleting) return;
    levelCompleting = true;
    state = S.LEVELCOMPLETE;
    AudioManager.stopMusic();
    AudioManager.sfx.powerup();
    const coinsEarned = levelCoins + levelDef.reward;
    save.coins += coinsEarned;
    if (!save.completedLevels.includes(currentLevel)) save.completedLevels.push(currentLevel);
    save.stats.levelsCompleted = (save.stats.levelsCompleted || 0) + 1;
    save.stats.playTime = playTimeAcc;
    if (player.score > save.highScore) save.highScore = player.score;
    persist();
    document.getElementById('lcScore').textContent = player.score;
    document.getElementById('lcCoins').textContent = coinsEarned;
    levelCompleteOverlay.classList.remove('hidden');
    updateMenuUI();
  }

  function gameOver() {
    if (state === S.GAMEOVER) return;
    state = S.GAMEOVER;
    AudioManager.stopMusic();
    AudioManager.sfx.gameOver();
    if (player.score > save.highScore) save.highScore = player.score;
    save.stats.playTime = playTimeAcc;
    save.stats.bestScore = Math.max(save.stats.bestScore || 0, player.score);
    persist();
    document.getElementById('finalScore').textContent = player.score;
    document.getElementById('finalHigh').textContent = save.highScore;
    document.getElementById('finalCoins').textContent = levelCoins;
    showScreen('gameover');
    updateMenuUI();
  }

  function togglePause() {
    if (state === S.PLAYING) { state = S.PAUSED; AudioManager.sfx.button(); }
    else if (state === S.PAUSED) { state = S.PLAYING; AudioManager.sfx.button(); }
    pauseOverlay.classList.toggle('hidden', state !== S.PAUSED);
  }

  // ---------- Powerups ----------
  const POWERUP_TYPES = ['health', 'shield', 'rapid', 'doubleDmg', 'invincible', 'bomb'];
  function spawnPowerup(x, y) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerups.push({ x, y, vy: 90, type, r: 14, rot: 0, life: 9 });
  }
  function applyPowerup(pu) {
    AudioManager.sfx.powerup();
    effects.powerup(pu.x, pu.y);
    effects.text(pu.x, pu.y, pu.type.toUpperCase(), '#66ffaa');
    save.stats.powerupsCollected = (save.stats.powerupsCollected || 0) + 1;
    switch (pu.type) {
      case 'health': player.health = Math.min(player.maxHealth, player.health + 40); break;
      case 'shield': player.shield = 8; break;
      case 'rapid': player.rapidFire = 10; break;
      case 'doubleDmg': player.doubleDamage = 10; break;
      case 'invincible': player.invincible = 6; break;
      case 'bomb':
        // destroy all enemies on screen
        for (const e of enemies) { if (e.alive) { e.alive = false; e.escaped = false; player.score += e.score; effects.explosion(e.x, e.y, 'normal'); } }
        for (const b of bosses) { if (b.alive) { b.takeDamage(40, effects); } }
        AudioManager.sfx.bigExplosion();
        break;
    }
  }

  // ---------- Input ----------
  function setupInput() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') input.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') input.down = true;
      if (e.key === ' ') { input.shoot = true; e.preventDefault(); }
      if (e.key === 'Escape') { if (state === S.PLAYING || state === S.PAUSED) togglePause(); }
      if (e.key === 'p' || e.key === 'P') { if (state === S.PLAYING || state === S.PAUSED) togglePause(); }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') input.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') input.down = false;
      if (e.key === ' ') input.shoot = false;
    });
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      if (player && state === S.PLAYING) {
        touchId = t.identifier;
        touchOffset.x = player.x - (t.clientX - rect.left);
        touchOffset.y = player.y - (t.clientY - rect.top);
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (state !== S.PLAYING || !player) return;
      for (const t of e.changedTouches) {
        if (touchId === null || t.identifier === touchId) {
          const rect = canvas.getBoundingClientRect();
          player.x = (t.clientX - rect.left) + touchOffset.x;
          player.y = (t.clientY - rect.top) + touchOffset.y;
          player.x = Math.max(24, Math.min(W - 24, player.x));
          player.y = Math.max(64, Math.min(H - 24, player.y));
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) { if (t.identifier === touchId) touchId = null; }
    });
    let mouseDown = false;
    canvas.addEventListener('mousedown', (e) => {
      if (state !== S.PLAYING || !player) return;
      mouseDown = true;
      const rect = canvas.getBoundingClientRect();
      touchOffset.x = player.x - (e.clientX - rect.left);
      touchOffset.y = player.y - (e.clientY - rect.top);
    });
    window.addEventListener('mousemove', (e) => {
      if (!mouseDown || state !== S.PLAYING || !player) return;
      const rect = canvas.getBoundingClientRect();
      player.x = (e.clientX - rect.left) + touchOffset.x;
      player.y = (e.clientY - rect.top) + touchOffset.y;
      player.x = Math.max(24, Math.min(W - 24, player.x));
      player.y = Math.max(64, Math.min(H - 24, player.y));
    });
    window.addEventListener('mouseup', () => { mouseDown = false; });
  }

  // ---------- Collision ----------
  function circleHit(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy <= (a.r + b.r) * (a.r + b.r);
  }

  // ---------- Update ----------
  function update(dt) {
    if (state === S.BOSSWARN) {
      bossWarningTimer -= dt;
      if (bossWarningTimer <= 0) { state = S.PLAYING; showScreen(null); }
      runTime += dt;
      updateBg(dt, levelDef ? levelDef.bgSpeed : 60);
      if (effects) effects.update(dt);
      return;
    }
    if (state !== S.PLAYING) return;

    runTime += dt;
    playTimeAcc += dt;
    updateBg(dt, levelDef ? levelDef.bgSpeed : 60);
    levelDef = levelDef || LevelData.LEVELS[currentLevel];

    player.update(dt, input, { w: W, h: H }, save.settings.sensitivity || 1);

    // auto shoot
    if (player.alive) {
      if (player.canShoot()) player.shoot(bullets);
    }

    // spawner
    spawner.update(dt, player.score, levelDef);
    if (spawner.shouldSpawn(levelDef) && !boss) {
      const type = spawner.spawnType(levelDef);
      enemies.push(new Enemies.Enemy(type, W, H, levelDef.difficulty * diffMult));
    }

    // trigger boss
    if (!boss && levelKills >= levelDef.targetKills) {
      triggerBoss();
    }

    // update enemies
    for (const e of enemies) e.update(dt, player, bullets, { w: W, h: H }, effects);
    // update bosses
    for (const b of bosses) b.update(dt, player, bullets, { w: W, h: H }, effects);

    // update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.trail) { b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 6) b.trail.shift(); }
      if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) bullets.splice(i, 1);
    }

    // collisions: player bullets vs enemies/bosses
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.owner !== 'player') continue;
      let hit = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (circleHit(b, { x: e.x, y: e.y, r: e.radius })) {
          e.takeDamage(b.dmg, effects);
          bullets.splice(i, 1); hit = true; break;
        }
      }
      if (hit) continue;
      for (const bo of bosses) {
        if (!bo.alive) continue;
        if (circleHit(b, { x: bo.x, y: bo.y, r: bo.radius })) {
          bo.takeDamage(b.dmg, effects);
          bullets.splice(i, 1); hit = true; break;
        }
      }
    }

    // enemy bullets vs player
    if (player.alive) {
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (b.owner !== 'enemy') continue;
        if (circleHit(b, { x: player.x, y: player.y, r: player.radius })) {
          bullets.splice(i, 1);
          player.score = Math.max(0, player.score - 50);
          effects.text(player.x, player.y, '-50', '#ff5a5a');
          const died = player.takeDamage(b.dmg * 10, effects);
          if (died) {
            if (player.lives <= 0) { effects.explosion(player.x, player.y, 'big'); gameOver(); }
          } else { AudioManager.sfx.hit(); }
        }
      }
    }

    // enemy/boss body vs player
    if (player.alive) {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (circleHit({ x: player.x, y: player.y, r: player.radius }, { x: e.x, y: e.y, r: e.radius })) {
          player.score = Math.max(0, player.score - 100);
          const died = player.takeDamage(e.type === 'boss' ? 30 : 20, effects);
          e.takeDamage(2, effects);
          if (died && player.lives <= 0) { effects.explosion(player.x, player.y, 'big'); gameOver(); }
        }
      }
      for (const bo of bosses) {
        if (!bo.alive) continue;
        if (circleHit({ x: player.x, y: player.y, r: player.radius }, { x: bo.x, y: bo.y, r: bo.radius })) {
          player.score = Math.max(0, player.score - 200);
          const died = player.takeDamage(30, effects);
          bo.takeDamage(2, effects);
          if (died && player.lives <= 0) { effects.explosion(player.x, player.y, 'big'); gameOver(); }
        }
      }
    }

    // powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.y += pu.vy * dt; pu.life -= dt; pu.rot += dt * 3;
      if (pu.life <= 0 || pu.y > H + 20) { powerups.splice(i, 1); continue; }
      if (player.alive && circleHit({ x: player.x, y: player.y, r: player.radius + 6 }, { x: pu.x, y: pu.y, r: pu.r })) {
        applyPowerup(pu);
        powerups.splice(i, 1);
      }
    }

    // remove dead enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive || e.escaped) {
        if (!e.alive && !e.escaped) {
          player.score += e.score;
          player.kills += 1;
          levelKills += 1;
          levelCoins += Math.round(e.score / 10);
          save.stats.enemiesKilled = (save.stats.enemiesKilled || 0) + 1;
          effects.text(e.x, e.y, '+' + e.score, '#fff');
          if (Math.random() < 0.12) spawnPowerup(e.x, e.y);
          AudioManager.sfx.explosion();
        }
        enemies.splice(i, 1);
      }
    }
    // remove dead bosses
    for (let i = bosses.length - 1; i >= 0; i--) {
      const bo = bosses[i];
      if (!bo.alive) {
        player.score += bo.score;
        levelCoins += Math.round(bo.score / 5);
        save.stats.bossesKilled = (save.stats.bossesKilled || 0) + 1;
        effects.text(bo.x, bo.y, '+' + bo.score, '#ffe066');
        for (let k = 0; k < 4; k++) spawnPowerup(bo.x + (k - 1.5) * 30, bo.y);
        AudioManager.sfx.bigExplosion();
        boss = null;
        bosses.splice(i, 1);
        // level complete after boss
        setTimeout(() => { if (state === S.PLAYING) levelComplete(); }, 1500);
      }
    }

    // check level complete (no boss levels: kills target + no enemies left)
    if (levelDef.boss < 0 && levelKills >= levelDef.targetKills && enemies.length === 0 && !boss && !levelCompleting) {
      levelComplete();
    }

    // effects
    effects.update(dt);

    // missions check
    checkMissions();

    // UI
    document.getElementById('scoreVal').textContent = player.score;
    document.getElementById('livesVal').textContent = player.lives;
    document.getElementById('levelVal').textContent = currentLevel + 1;
    document.getElementById('coinsVal').textContent = save.coins + levelCoins;
    document.getElementById('healthVal').textContent = Math.max(0, Math.round(player.health));
    document.getElementById('healthBar').style.width = Math.max(0, (player.health / player.maxHealth) * 100) + '%';
    if (boss && boss.alive) {
      document.getElementById('bossBarWrap').classList.remove('hidden');
      document.getElementById('bossBar').style.width = Math.max(0, (boss.health / boss.maxHealth) * 100) + '%';
    } else {
      document.getElementById('bossBarWrap').classList.add('hidden');
    }
    // weapon bar
    document.getElementById('weaponBar').textContent = 'WPN: ' + (player.weapon || 'normal').toUpperCase();

    if (!player.alive && player.lives <= 0) {
      gameOver();
    }
  }

  function checkMissions() {
    // update stats
    save.stats.enemiesKilled = save.stats.enemiesKilled || 0;
  }

  // ---------- Render ----------
  function render() {
    if (state === S.MENU) {
      runTime += 0.016;
      updateBg(0.016, 40);
      drawBg('sky');
      drawMenuJet();
      return;
    }
    if (state === S.LOADING) return;
    if (state === S.PLAYING || state === S.PAUSED || state === S.BOSSWARN || state === S.LEVELCOMPLETE) {
      ctx.save();
      if (effects) { ctx.translate(effects.shakeX, effects.shakeY); }
      drawBg(levelDef ? levelDef.env : 'sky');
      for (const pu of powerups) drawPowerup(ctx, pu);
      for (const b of bullets) drawBullet(ctx, b);
      for (const e of enemies) e.draw(ctx);
      for (const bo of bosses) bo.draw(ctx);
      if (player && player.alive) player.draw(ctx);
      if (effects) effects.draw(ctx);
      ctx.restore();
    }
  }

  function drawMenuJet() {
    const t = runTime;
    const x = W / 2 + Math.sin(t * 0.6) * 40;
    const y = H * 0.5 + Math.sin(t * 1.2) * 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.6) * 0.15);
    const grad = ctx.createLinearGradient(0, -28, 0, 28);
    grad.addColorStop(0, '#7bd0ff'); grad.addColorStop(1, '#1e5fa8');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -28); ctx.lineTo(10, -8); ctx.lineTo(14, 14); ctx.lineTo(6, 22); ctx.lineTo(0, 18); ctx.lineTo(-6, 22); ctx.lineTo(-14, 14); ctx.lineTo(-10, -8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.ellipse(0, -6, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawPowerup(ctx, pu) {
    ctx.save();
    ctx.translate(pu.x, pu.y);
    pu.rot += 0.05;
    ctx.rotate(pu.rot);
    const colors = { health: '#ff66aa', shield: '#66ffaa', rapid: '#66d9ff', doubleDmg: '#ffe066', invincible: '#c084fc', bomb: '#ff8a3d' };
    const col = colors[pu.type] || '#fff';
    ctx.fillStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(12, 0); ctx.lineTo(0, 12); ctx.lineTo(-12, 0);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0a2a';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const letters = { health: '+', shield: 'S', rapid: 'R', doubleDmg: 'D', invincible: 'I', bomb: 'B' };
    ctx.fillText(letters[pu.type] || '?', 0, 1);
    ctx.restore();
  }

  function drawBullet(ctx, b) {
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = b.color; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < (b.trail || []).length; i++) {
      const t = b.trail[i];
      if (i === 0) ctx.moveTo(t.x, t.y); else ctx.lineTo(t.x, t.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3);
    g.addColorStop(0, b.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- Bullets helper (drawBullet above) ----------

  // ---------- Wiring ----------
  function wireUI() {
    // loading
    doLoading();

    document.getElementById('playBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.AIRCRAFT; showScreen('aircraft'); renderAircraftList(); });
    document.getElementById('aircraftBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.AIRCRAFT; showScreen('aircraft'); renderAircraftList(); });
    document.getElementById('aircraftBack').addEventListener('click', () => { AudioManager.sfx.button(); state = S.MENU; showScreen('menu'); updateMenuUI(); });
    document.getElementById('missionsBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.MISSIONS; showScreen('missions'); renderMissions(); });
    document.getElementById('missionsBack').addEventListener('click', () => { AudioManager.sfx.button(); state = S.MENU; showScreen('menu'); updateMenuUI(); });
    document.getElementById('hangarBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.HANGAR; showScreen('hangar'); renderHangar(); });
    document.getElementById('hangarBack').addEventListener('click', () => { AudioManager.sfx.button(); state = S.MENU; showScreen('menu'); updateMenuUI(); });
    document.getElementById('settingsBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.SETTINGS; showScreen('settings'); syncSettingsUI(); });
    document.getElementById('settingsBack').addEventListener('click', () => { AudioManager.sfx.button(); state = S.MENU; showScreen('menu'); updateMenuUI(); });
    document.getElementById('scoresBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.SCORES; showScreen('scores'); updateMenuUI(); });
    document.getElementById('scoresBack').addEventListener('click', () => { AudioManager.sfx.button(); state = S.MENU; showScreen('menu'); });

    // difficulty
    document.querySelectorAll('.diffBtn').forEach(b => b.addEventListener('click', () => {
      AudioManager.sfx.button();
      difficulty = b.dataset.diff;
      startLevel(0);
    }));
    document.getElementById('diffBack').addEventListener('click', () => { AudioManager.sfx.button(); state = S.AIRCRAFT; showScreen('aircraft'); renderAircraftList(); });

    // after aircraft selection -> difficulty: hook play? We'll route Play to difficulty
    // Override playBtn to go to difficulty instead of aircraft? Keep both. Add difficulty entry from aircraft screen
    const origPlay = document.getElementById('playBtn').onclick;
    document.getElementById('playBtn').onclick = null;
    document.getElementById('playBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.DIFFICULTY; showScreen('difficulty'); });

    document.getElementById('pauseBtn').addEventListener('click', () => togglePause());
    document.getElementById('resumeBtn').addEventListener('click', () => togglePause());
    document.getElementById('quitBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.MENU; showScreen('menu'); updateMenuUI(); AudioManager.stopMusic(); pauseOverlay.classList.add('hidden'); });
    document.getElementById('lcContinue').addEventListener('click', () => {
      AudioManager.sfx.button();
      levelCompleteOverlay.classList.add('hidden');
      const next = currentLevel + 1;
      if (next < LevelData.LEVELS.length) startLevel(next);
      else { state = S.MENU; showScreen('menu'); updateMenuUI(); }
    });
    document.getElementById('playAgainBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.DIFFICULTY; showScreen('difficulty'); });
    document.getElementById('menuBtn').addEventListener('click', () => { AudioManager.sfx.button(); state = S.MENU; showScreen('menu'); updateMenuUI(); });

    // settings
    document.getElementById('soundToggle').addEventListener('click', () => {
      AudioManager.sfx.button();
      AudioManager.setEnabled(!AudioManager.enabled);
      save.settings.sound = AudioManager.enabled;
      persist();
      syncAudioUI();
    });
    document.getElementById('musicVol').addEventListener('input', (e) => {
      AudioManager.musicGain && (AudioManager.musicGain.gain.value = parseFloat(e.target.value));
      save.settings.musicVol = parseFloat(e.target.value);
      persist();
    });
    document.getElementById('sfxVol').addEventListener('input', (e) => {
      AudioManager.sfxGain && (AudioManager.sfxGain.gain.value = parseFloat(e.target.value));
      save.settings.sfxVol = parseFloat(e.target.value);
      persist();
    });
    document.getElementById('qualitySel').addEventListener('change', (e) => {
      save.settings.quality = e.target.value;
      persist();
    });
    document.getElementById('sensVol').addEventListener('input', (e) => {
      save.settings.sensitivity = parseFloat(e.target.value);
      persist();
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('Reset all progress?')) {
        SaveManager.reset();
        save = SaveManager.load();
        unlockedSet = new Set([0]);
        for (const a of AircraftData.AIRCRAFT) a.unlocked = (a.id === 0);
        selectedAircraft = 0;
        persist();
        updateMenuUI();
        AudioManager.sfx.button();
      }
    });

    // sync audio manager with save
    AudioManager.setEnabled(save.settings.sound !== false);
    AudioManager.setMusicEnabled(save.settings.music !== false);
    if (AudioManager.musicGain) AudioManager.musicGain.gain.value = save.settings.musicVol || 0.35;
    if (AudioManager.sfxGain) AudioManager.sfxGain.gain.value = save.settings.sfxVol || 0.7;

    updateMenuUI();
    syncAudioUI();
  }

  function syncSettingsUI() {
    document.getElementById('soundToggle').textContent = save.settings.sound !== false ? 'ON' : 'OFF';
    document.getElementById('musicVol').value = save.settings.musicVol || 0.35;
    document.getElementById('sfxVol').value = save.settings.sfxVol || 0.7;
    document.getElementById('qualitySel').value = save.settings.quality || 'high';
    document.getElementById('sensVol').value = save.settings.sensitivity || 1.0;
  }

  // ---------- Loop ----------
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min(0.05, (ts - lastTime) / 1000);
    lastTime = ts;

    if (state === S.PLAYING || state === S.BOSSWARN || state === S.PAUSED || state === S.LEVELCOMPLETE) {
      if (state !== S.PAUSED && state !== S.LEVELCOMPLETE) update(dt);
      render();
    } else if (state === S.MENU) {
      runTime += dt;
      updateBg(dt, 40);
      drawBg('sky');
      drawMenuJet();
    } else if (state === S.LOADING) {
      // nothing
    } else {
      // other screens: animate bg behind
      runTime += dt;
      updateBg(dt, 40);
    }

    requestAnimationFrame(loop);
  }

  // ---------- Init ----------
  window.addEventListener('load', () => {
    resize();
    initBg();
    setupInput();
    wireUI();
    state = S.LOADING;
    showScreen('loading');
    AudioManager.ensure();
    requestAnimationFrame(loop);
  });
  window.addEventListener('resize', () => { resize(); initBg(); });

  window.__game = { getState: () => state };
})();
