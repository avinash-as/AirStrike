// storage.js — save/load with validation
(function (global) {
  'use strict';
  const KEY = 'airstrike_save_v2';
  const DEFAULTS = {
    highScore: 0,
    coins: 0,
    selectedAircraft: 0,
    unlockedAircraft: [0],
    aircraftUpgrades: {}, // id -> {health, speed, fireRate}
    completedLevels: [],
    levelStars: {},
    missions: {},
    achievements: [],
    settings: { sound: true, music: true, musicVol: 0.35, sfxVol: 0.7, quality: 'high', sensitivity: 1.0 },
    stats: { enemiesKilled: 0, bossesKilled: 0, powerupsCollected: 0, playTime: 0, levelsCompleted: 0 },
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function validate(s) {
    if (!s || typeof s !== 'object') return clone(DEFAULTS);
    const out = clone(DEFAULTS);
    // merge carefully
    if (typeof s.highScore === 'number') out.highScore = s.highScore;
    if (typeof s.coins === 'number') out.coins = s.coins;
    if (typeof s.selectedAircraft === 'number') out.selectedAircraft = s.selectedAircraft;
    if (Array.isArray(s.unlockedAircraft)) out.unlockedAircraft = s.unlockedAircraft.filter(n => typeof n === 'number');
    if (s.aircraftUpgrades && typeof s.aircraftUpgrades === 'object') out.aircraftUpgrades = s.aircraftUpgrades;
    if (Array.isArray(s.completedLevels)) out.completedLevels = s.completedLevels.filter(n => typeof n === 'number');
    if (s.levelStars && typeof s.levelStars === 'object') out.levelStars = s.levelStars;
    if (s.missions && typeof s.missions === 'object') out.missions = s.missions;
    if (Array.isArray(s.achievements)) out.achievements = s.achievements;
    if (s.settings && typeof s.settings === 'object') Object.assign(out.settings, s.settings);
    if (s.stats && typeof s.stats === 'object') Object.assign(out.stats, s.stats);
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULTS);
      return validate(JSON.parse(raw));
    } catch (e) {
      return clone(DEFAULTS);
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  global.SaveManager = { load, save, reset, DEFAULTS, validate };
})(window);
