# Air Strike

A browser-based 2D vertical-scrolling airplane shooter built with HTML5 Canvas, JavaScript, and Web Audio.

## Live Demo

https://avinash-as.github.io/AirStrike/

## Run Locally

Open `index.html` in any modern browser, or serve the folder with a local HTTP server:

```
python -m http.server 8765
```

Then visit http://localhost:8765.

## Controls

- Desktop: WASD / Arrow keys to move, Space to shoot, Esc to pause. Mouse drag also supported.
- Mobile: touch and drag to move; shooting is automatic.

## Features

- 5 unlockable aircraft with upgrades
- 10 levels with increasing difficulty and boss fights
- Multiple enemy types, power-ups, and weapon upgrades
- Coin economy, missions, and achievements
- Settings and progress saved locally
- Responsive design for desktop and mobile

## Project Structure

```
index.html      # Page layout and screens
style.css       # Arcade UI styling
game.js         # Main game loop and mechanics
player.js       # Player aircraft
enemies.js      # Enemies and bosses
weapons.js      # Weapon definitions
aircraft.js     # Aircraft roster
levels.js       # Level definitions
missions.js     # Mission definitions
storage.js      # Save/load system
audio.js        # Sound and music
effects.js      # Particles and effects
bullets.js      # Bullet helpers
```

## License

Original game. Free to use and modify.
