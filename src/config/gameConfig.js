// 全局游戏配置与常量
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;

// 场景 key 常量，避免手写字符串出错
export const SCENES = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  UI: 'UIScene',
  GAMEOVER: 'GameOverScene',
  LEADERBOARD: 'LeaderboardScene'
};

// registry / 事件 key
export const REG = {
  THEME: 'themeKey',
  MUTED: 'muted',
  VOLUME: 'volume'
};

// GameScene 通过 events 与 UIScene 通信的事件名
export const EV = {
  HP: 'player-hp',
  SHIELD: 'player-shield',
  LEVEL: 'player-level',
  SCORE: 'score',
  COMBO: 'combo',
  BOSS_SPAWN: 'boss-spawn',
  BOSS_HP: 'boss-hp',
  BOSS_DEAD: 'boss-dead',
  PICKUP: 'pickup',
  GAME_OVER: 'game-over',
  DIFFICULTY: 'difficulty',
  REVIVE_OFFER: 'revive-offer',
  REVIVE_DONE: 'revive-done'
};

export const DEPTH = {
  BG: -2,
  BG_STARS: -1,
  ENEMY_BULLET: 5,
  ENEMY: 6,
  POWERUP: 7,
  PLAYER_BULLET: 8,
  PLAYER: 10,
  SHIELD: 11,
  PARTICLE: 12,
  HUD: 100
};
