// Night Ledger — shared constants.
// One clear job: every tunable number for the game lives here.

'use strict';

const NL = {};

NL.TILE = 32;
NL.COLS = 30;
NL.ROWS = 18;
NL.MAP_OFFSET_Y = 24; // HUD strip at the top of the canvas.
NL.CANVAS_W = NL.COLS * NL.TILE; // 960
NL.CANVAS_H = NL.MAP_OFFSET_Y + NL.ROWS * NL.TILE; // 600

NL.PLAYER_WALK_SPEED = 130; // px per second
NL.PLAYER_RUN_SPEED = 200; // px per second (Shift, louder)
NL.PLAYER_RADIUS = 11;

NL.GUARD_PATROL_SPEED = 55; // px per second
NL.GUARD_CHASE_SPEED = 105; // px per second
NL.GUARD_SUSPICIOUS_SPEED = 70; // px per second
NL.GUARD_WAYPOINT_PAUSE = 0.8; // seconds at each waypoint
NL.GUARD_CATCH_DISTANCE = 20; // px: guard touching the player = caught
NL.GUARD_CHASE_TIME = 6; // seconds of chase before giving up
NL.GUARD_INVESTIGATE_TIME = 4; // seconds spent at a heard noise

NL.VIEW_DISTANCE = 230; // px: guard vision cone length
NL.VIEW_HALF_ANGLE = 42 * Math.PI / 180; // radians either side of facing
NL.VIEW_RAY_STEP = 8; // px between line-of-sight samples
NL.HIDE_RADIUS = 48; // px: guard closer than this still sees a hidden player
NL.DETECTION_RISE = 42; // meter per second while the player is visible
NL.DETECTION_RISE_CLOSE = 70; // meter per second while visible within 90 px
NL.DETECTION_CLOSE_RANGE = 90; // px
NL.DETECTION_DECAY = 32; // meter per second while the player is unseen
// Tuned so a brief cone crossing (~1 s) reaches ~40 and fades fast: the
// player gets a chance to recover instead of one slip ending the floor.
NL.SUSPICIOUS_THRESHOLD = 40; // meter at which a guard turns suspicious

NL.RUN_NOISE_RADIUS = 150; // px: running is heard this far
NL.COIN_NOISE_RADIUS = 170; // px: a landed coin is heard this far
NL.COINS_PER_LEVEL = 3;

NL.LIVES_START = 3;
NL.SCORE_LOOT = 150; // points per loot dot
NL.SCORE_TIME_BONUS = 10; // points per second left under par
NL.SCORE_GHOST_BONUS = 1000; // points for never raising an alarm on a level
NL.LEVEL_PAR_SECONDS = [150, 180, 210]; // par time per level, index 0..2

NL.TILE_WALL = '#';
NL.TILE_FLOOR = '.';
NL.TILE_CRATE = 'C';
NL.TILE_BUSH = 'B';
NL.TILE_PLAYER = 'P';
NL.TILE_EXIT = 'E';
NL.TILE_GUARD = 'G';
NL.TILE_LOOT = 'o';

// Tile kinds that block movement.
NL.SOLID_TILES = new Set([NL.TILE_WALL, NL.TILE_CRATE]);
// Tile kinds that block a guard's line of sight.
NL.SIGHT_BLOCKING_TILES = new Set([NL.TILE_WALL, NL.TILE_CRATE]);

if (typeof module !== 'undefined' && module.exports) module.exports = NL;
