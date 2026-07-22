// 主菜单：标题、主题选择卡片、开始/排行榜、音量设置。
import Phaser from 'phaser';
import { SCENES, REG, GAME_WIDTH as W, GAME_HEIGHT as H } from '../config/gameConfig.js';
import { THEMES, getTheme } from '../config/themes/index.js';
import { createBackground } from '../config/themes/background.js';
import ThemeCard from '../ui/ThemeCard.js';
import Button from '../ui/Button.js';
import { getBestScore, getSettings, saveSettings } from '../storage/leaderboard.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create() {
    this.audio = this.registry.get('audio');
    this.selectedKey = this.registry.get(REG.THEME) || 'cyber';
    this.bgCtrl = createBackground(this, getTheme(this.selectedKey));

    // 标题
    this.title = this.add
      .text(W / 2, 84, '星际飞机大战', {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '40px',
        color: '#eaf6ff',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.title.setShadow(0, 0, '#22d3ee', 18, true, true);

    this.subtitle = this.add
      .text(W / 2, 126, 'ENDLESS AIRCRAFT WAR', {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        color: '#8fb3d9'
      })
      .setOrigin(0.5);
    this.subtitle.setLetterSpacing?.(4);

    this.bestTxt = this.add
      .text(W / 2, 158, `最高分  ${getBestScore()}`, {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffd23d'
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 210, '选择场景主题', {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '15px',
        color: '#cbd5f5'
      })
      .setOrigin(0.5);

    // 主题卡片
    this.cards = [];
    const xs = [W / 2 - 150, W / 2, W / 2 + 150];
    THEMES.forEach((t, i) => {
      const card = new ThemeCard(this, xs[i], 320, t, {
        onSelect: (key) => this.selectTheme(key)
      });
      card.setSelected(t.key === this.selectedKey);
      this.cards.push(card);
    });

    // 开始/排行榜
    this.startBtn = new Button(this, W / 2, 470, '开始游戏', {
      width: 240,
      height: 58,
      fontSize: 26,
      accent: 0x36e07a,
      onClick: () => this.startGame()
    });
    this.lbBtn = new Button(this, W / 2, 540, '排 行 榜', {
      width: 200,
      height: 46,
      fontSize: 20,
      onClick: () => this.scene.start(SCENES.LEADERBOARD)
    });

    // 设置区
    this.buildSettings();

    this.add
      .text(W / 2, H - 30, '方向键/WASD 移动 · 拖动屏幕移动 · 自动开火', {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '12px',
        color: '#7f92b5'
      })
      .setOrigin(0.5);

    this.cameras.main.fadeIn(300);
  }

  buildSettings() {
    const s = getSettings();
    this.volume = s.volume;
    this.muted = s.muted;
    const y = 620;

    this.muteBtn = new Button(this, W / 2 - 96, y, this.muted ? '🔇 静音' : '🔊 音效', {
      width: 120,
      height: 40,
      fontSize: 16,
      onClick: () => this.toggleMute()
    });

    this.volDown = new Button(this, W / 2 + 20, y, '−', {
      width: 44,
      height: 40,
      fontSize: 22,
      onClick: () => this.changeVolume(-0.1)
    });
    this.volTxt = this.add
      .text(W / 2 + 74, y, `${Math.round(this.volume * 100)}`, {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '18px',
        color: '#eaf6ff'
      })
      .setOrigin(0.5);
    this.volUp = new Button(this, W / 2 + 128, y, '+', {
      width: 44,
      height: 40,
      fontSize: 22,
      onClick: () => this.changeVolume(0.1)
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    this.audio.setMuted(this.muted);
    this.muteBtn.setLabel(this.muted ? '🔇 静音' : '🔊 音效');
    saveSettings({ muted: this.muted });
    this.registry.set(REG.MUTED, this.muted);
  }

  changeVolume(d) {
    this.volume = Math.max(0, Math.min(1, Math.round((this.volume + d) * 10) / 10));
    this.audio.setVolume(this.volume);
    this.volTxt.setText(`${Math.round(this.volume * 100)}`);
    saveSettings({ volume: this.volume });
    this.registry.set(REG.VOLUME, this.volume);
    this.audio.pickup();
  }

  selectTheme(key) {
    if (key === this.selectedKey) return;
    this.selectedKey = key;
    this.cards.forEach((c) => c.setSelected(c.theme.key === key));
    this.registry.set(REG.THEME, key);
    saveSettings({ theme: key });
    // 重建背景
    if (this.bgCtrl) this.bgCtrl.destroy();
    this.bgCtrl = createBackground(this, getTheme(key));
    // 背景在最底层，重新压低标题等已在其上
    this.audio.pickup();
  }

  startGame() {
    this.audio.levelUp();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.GAME, { themeKey: this.selectedKey });
    });
  }

  update(time, delta) {
    if (this.bgCtrl) this.bgCtrl.update(delta);
  }
}
