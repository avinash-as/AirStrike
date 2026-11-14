// levels.js — level definitions
(function (global) {
  'use strict';
  const ENVS = ['sky', 'mountains', 'ocean', 'desert', 'snow', 'night', 'space'];
  const LEVELS = [];
  for (let i = 0; i < 10; i++) {
    const env = ENVS[i % ENVS.length];
    const diff = 1 + i * 0.5;
    LEVELS.push({
      id: i,
      name: 'Sector ' + (i + 1),
      env: env,
      difficulty: diff,
      spawnInterval: Math.max(0.35, 1.4 - i * 0.1),
      enemyPool: i < 3 ? ['small'] : (i < 6 ? ['small', 'medium'] : ['small', 'medium', 'heavy', 'fast', 'elite']),
      boss: (i + 1) % 3 === 0 ? (i % 3) : -1, // boss id 0/1/2 every 3rd level
      targetKills: 20 + i * 8,
      reward: 200 + i * 100,
      bgSpeed: 60 + i * 8,
    });
  }

  global.LevelData = { LEVELS, ENVS };
})(window);
