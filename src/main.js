// 游戏入口：创建 Phaser.Game、注册场景、配置自适应缩放与全局音频。
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES, REG } from './config/gameConfig.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import LeaderboardScene from './scenes/LeaderboardScene.js';
import AudioManager from './systems/AudioManager.js';
import { getSettings } from './storage/leaderboard.js';

const settings = getSettings();

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#05060f',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  render: { pixelArt: false, antialias: true },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene, LeaderboardScene]
};

const game = new Phaser.Game(config);

// 输入坐标同步：窗口/布局变化时完整重算缩放与居中
const refreshScale = () => game.scale.refresh();
window.addEventListener('load', refreshScale);
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => setTimeout(refreshScale, 100));
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(refreshScale, 100); });
// 输入坐标防御：实时从 getBoundingClientRect 计算世界坐标，避免 canvasBounds 缓存过期
game.events.once('ready', () => {
  const canvas = game.canvas;
  const baseW = game.scale.baseSize.width;   // 480
  const baseH = game.scale.baseSize.height;  // 800

  game.scale.transformX = function (pageX) {
    const rect = canvas.getBoundingClientRect();
    return (pageX - (window.pageXOffset || 0) - rect.left) * (baseW / rect.width);
  };
  game.scale.transformY = function (pageY) {
    const rect = canvas.getBoundingClientRect();
    return (pageY - (window.pageYOffset || 0) - rect.top) * (baseH / rect.height);
  };
});

// 开发环境调试钩子
if (import.meta.env && import.meta.env.DEV) {
  window.__game = game;
}

// 全局音频管理器与设置存入 registry
const audio = new AudioManager();
audio.setVolume(settings.volume);
audio.setMuted(settings.muted);
game.registry.set('audio', audio);
game.registry.set(REG.THEME, settings.theme);
game.registry.set(REG.VOLUME, settings.volume);
game.registry.set(REG.MUTED, settings.muted);

// 首次用户手势解锁 WebAudio
const unlock = () => {
  audio.unlock();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// 兜底移除加载态
window.setTimeout(() => {
  const el = document.getElementById('loading');
  if (el) el.classList.add('hidden');
}, 3000);
