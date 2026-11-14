// aircraft.js — aircraft definitions
(function (global) {
  'use strict';
  const AIRCRAFT = [
    { id: 0, name: 'Falcon',  desc: 'Balanced fighter',     speed: 380, health: 100, fireRate: 1, bullet: 'normal', color: '#7bd0ff', unlockCost: 0,    unlocked: true },
    { id: 1, name: 'Raptor',  desc: 'Fast & agile',         speed: 460, health: 80,  fireRate: 1.2, bullet: 'double', color: '#66ffaa', unlockCost: 500,  unlocked: false },
    { id: 2, name: 'Titan',   desc: 'Heavy armor',          speed: 300, health: 160, fireRate: 0.8, bullet: 'triple', color: '#ffb347', unlockCost: 1200, unlocked: false },
    { id: 3, name: 'Phantom', desc: 'Stealth laser',        speed: 400, health: 90,  fireRate: 1.4, bullet: 'laser',  color: '#c084fc', unlockCost: 2000, unlocked: false },
    { id: 4, name: 'Valkyrie',desc: 'Missile barrage',      speed: 360, health: 110, fireRate: 1.0, bullet: 'missile',color: '#ff66aa', unlockCost: 3500, unlocked: false },
  ];

  function get(id) { return AIRCRAFT.find(a => a.id === id) || AIRCRAFT[0]; }

  global.AircraftData = { AIRCRAFT, get };
})(window);
