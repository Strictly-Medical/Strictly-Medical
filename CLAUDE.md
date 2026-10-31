# Strictly Medical: notes for working on this repo

Plain HTML, CSS and JavaScript with no build step. Hosted on GitHub Pages from `main` at the repo root.

## Layout
- `index.html`: the page. Loads the scripts below in order as classic scripts that share one global scope (no modules, no bundler). Order matters only for code that runs at load time.
- `css/style.css`: page and dialogue-panel styles.
- `js/sprites.js`: size and anchor (`w`, `h`, `ax`, `ay`, in game pixels) for each image in `assets/sprites/`.
- `js/core.js`: canvas setup, sprite loading (`art()`, `drawArt()`), math helpers.
- `js/data.js`: classes, failure rules, wounded knights, enemy types, and `S`, the saved game state.
- `js/world.js`: scene object `SC`, village and dungeon layouts, party creation, grid movement, BFS pathfinding. The village is a 34x34 island; `VO` is the offset applied to the original 22x22 village layout, and `SC.gate` marks the Barrow gate.
- `js/input.js`: keyboard, mouse and touch. On touch screens, movement is either the isometric D-pad (a plus-shaped pad rotated 45° so each arm is a grid direction; the default) or the left-half joystick, set in Options (`OPTS.pad`). Action buttons sit in a thumb arc around Strike.
- `js/combat.js`: damage, attacks, projectiles, telegraphed attack tiles, medic actions (stabilize, carry, deliver).
- `js/actors.js`: player control, companion AI, enemies, the Lantern Warden.
- `js/ui.js`: end of run, dialogue panels, shops, quests.
- `js/title.js`: title screen (menu, options, credits, ember particles over the backdrop's braziers) and the pause menu (pause button, Esc or P). Options persist in localStorage under `sm-options` and are shared by the title and pause menus. Any open panel pauses the game loop.
- `js/render.js`: all drawing and the HUD. The HUD is Souls-style: unboxed health/stamina/skill bars top left with a lingering damage trail, purse top right under the pause button, boss bar along the bottom.
- `js/main.js`: game loop and start-up.
- `assets/sprites/`: game-ready sprites, already scaled for the 64x32 tile grid.
- Character sprite sheets (`CHARS` in `js/core.js`): frames side by side at 3x game size. A unit's `look.sprite` picks the sheet; units without one are drawn procedurally in `drawFigure`. So far only the knight class has one (`knight-walk.png`: 4-frame walk plus a standing frame, front facing, mirrored for left and reused for back facing until a back sheet exists). Source sheets are in `art/characters/`; `art/characters/knight/build.py` rebuilds the knight sheet from them.
- `manifest.webmanifest`, `sw.js`, `assets/icons/`: makes the game installable to a home screen and playable offline. Bump `VERSION` in `sw.js` when adding or renaming files.
- `assets/ui/`: title backdrop and emblem, compressed from the originals in `art/`.
- `art/`: source art (`emblem.png` is the logo and app-icon master; `title-bg.png` and `title-mockup.png` are the title screen backdrop and its reference mockup) (full-size tile cut-outs, the original ChatGPT tile sheet, SpriteCook character sprites). Not loaded by the game.

## Conventions
- Grid coordinates are tiles. `iso(x,y)` maps to screen as `[(x-y)*32, (x+y)*16]`. Movement is 4-directional along the grid in real time.
- Draw order: floors first, then a diagonal sweep where tile columns (walls, building tiles) and actors/objects are interleaved by `x+y`.
- Every enemy and boss attack telegraphs the exact tiles it will hit before it lands.
- World scale: characters are about 60px tall. `FIG`, `BS` and `PROP` in `js/core.js` scale code-drawn figures, buildings and village props up from their original sizes to match.
- Sprites come from generated art. Tile art from ChatGPT is about 1.6:1, so tiles are squashed to 2:1 when packed into `assets/sprites/`.

## Design decisions so far
- Title: Strictly Medical. The guild is the Order of the Ninety and Nine. Running gag: the guild insists everything it kills was self-defense.
- 2 to 4 player co-op is the goal; companions are AI for now. Online play is planned (WebRTC peer-to-peer works on GitHub Pages).
- Failure rule is undecided; Mercy, Standard and Grim are all selectable for testing.
- Being considered: every player is a knight (four distinct knight designs), and class comes from the equipped weapon.
- Character art direction: pale white/silver holy knights in a detailed, solemn HD pixel style.
- Don't spend SpriteCook credits unless the owner asks.
