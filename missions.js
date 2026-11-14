// missions.js — mission definitions
(function (global) {
  'use strict';
  const MISSIONS = [
    { id: 'm1', name: 'Destroy 50 enemies', type: 'kills', target: 50, reward: 300 },
    { id: 'm2', name: 'Complete 3 levels', type: 'levels', target: 3, reward: 500 },
    { id: 'm3', name: 'Defeat a boss', type: 'bosses', target: 1, reward: 400 },
    { id: 'm4', name: 'Collect 10 power-ups', type: 'powerups', target: 10, reward: 250 },
    { id: 'm5', name: 'Survive 5 minutes total', type: 'playtime', target: 300, reward: 600 },
    { id: 'm6', name: 'Reach 10000 score', type: 'score', target: 10000, reward: 800 },
    { id: 'm7', name: 'Unlock 3 aircraft', type: 'unlock', target: 3, reward: 700 },
  ];

  function progress(mission, save) {
    const s = save.stats || {};
    const st = save;
    switch (mission.type) {
      case 'kills': return s.enemiesKilled || 0;
      case 'levels': return s.levelsCompleted || 0;
      case 'bosses': return s.bossesKilled || 0;
      case 'powerups': return s.powerupsCollected || 0;
      case 'playtime': return Math.floor(s.playTime || 0);
      case 'score': return Math.max(s.bestScore || 0, save.highScore || 0);
      case 'unlock': return (save.unlockedAircraft || []).length;
      default: return 0;
    }
  }

  global.MissionData = { MISSIONS, progress };
})(window);
