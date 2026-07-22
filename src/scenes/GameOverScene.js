// 结算页：本局分数、是否新纪录、名字输入（画布内键盘输入）、再来一局/排行榜/菜单。
import Phaser from 'phaser';
import { SCENES, GAME_WIDTH as W, GAME_HEIGHT as H } from '../config/gameConfig.js';
import { getTheme } from '../config/themes/index.js';
import { createBackground } from '../config/themes/background.js';
import Button from '../ui/Button.js';
import { addScore, getBestScore, qualifies, getSettings, saveSettings } from '../storage/leaderboard.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAMEOVER);
  }

  init(data) {
    this.finalScore = (data && data.score) || 0;
    this.wave = (data && data.wave) || 0;
    this.themeKey = (data && data.themeKey) || 'cyber';
  }

  create() {
    this.theme = getTheme(this.themeKey);
    this.audio = this.registry.get('audio');
    this.bgCtrl = createBackground(this, this.theme);
    const font = this.theme.ui.fontFamily;
    const accent = this.theme.ui.accentColor;

    this.rank = qualifies(this.finalScore);
    this.prevBest = getBestScore();
    this.saved = false;
    this.name = (getSettings().lastName || '').slice(0, 12);

    this.add.text(W / 2, 110, '游戏结束', { fontFamily: font, fontSize: '44px', color: '#ff5a7a', fontStyle: 'bold' }).setOrigin(0.5);

    this.add.text(W / 2, 180, '本局得分', { fontFamily: font, fontSize: '16px', color: '#cbd5f5' }).setOrigin(0.5);
    this.add.text(W / 2, 220, `${this.finalScore}`, { fontFamily: font, fontSize: '52px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const isRecord = this.finalScore > this.prevBest && this.finalScore > 0;
    this.add
      .text(W / 2, 270, isRecord ? '🏆 新纪录！' : `最高分 ${Math.max(this.prevBest, this.finalScore)}`, {
        fontFamily: font,
        fontSize: '18px',
        color: isRecord ? '#ffd23d' : '#9fb0d0'
      })
      .setOrigin(0.5);

    if (this.wave > 0) {
      this.add.text(W / 2, 300, `击败 Boss ${this.wave} 波`, { fontFamily: font, fontSize: '14px', color: accent }).setOrigin(0.5);
    }

    // 名字输入区
    this.add.text(W / 2, 350, '输入飞行员代号（回车保存）', { fontFamily: font, fontSize: '13px', color: '#9fb0d0' }).setOrigin(0.5);
    this.nameBg = this.add.graphics();
    this.nameBg.fillStyle(0x000000, 0.4);
    this.nameBg.fillRoundedRect(W / 2 - 130, 372, 260, 44, 10);
    this.nameBg.lineStyle(2, this._hex(accent), 0.9);
    this.nameBg.strokeRoundedRect(W / 2 - 130, 372, 260, 44, 10);
    this.nameText = this.add.text(W / 2, 394, '', { fontFamily: font, fontSize: '22px', color: '#eaf6ff' }).setOrigin(0.5);
    this._refreshName();
    this._caretOn = true;
    this.time.addEvent({ delay: 500, loop: true, callback: () => { this._caretOn = !this._caretOn; this._refreshName(); } });

    this._setupTyping();

    // 按钮
    this.saveBtn = new Button(this, W / 2, 470, '保存成绩', { width: 240, height: 52, accent: 0x36e07a, onClick: () => this.save(true) });
    new Button(this, W / 2, 532, '再 来 一 局', { width: 220, height: 46, onClick: () => this.retry() });
    new Button(this, W / 2, 590, '排 行 榜', { width: 200, height: 42, onClick: () => this.gotoLeaderboard() });
    new Button(this, W / 2, 644, '返回主菜单', { width: 200, height: 42, onClick: () => this.gotoMenu() });

    this.cameras.main.fadeIn(300);
  }

  _hex(css) {
    return parseInt(css.replace('#', '0x'));
  }

  _refreshName() {
    const caret = this._caretOn && !this.saved ? '|' : '';
    this.nameText.setText((this.name || '无名飞行员') + caret);
  }

  _setupTyping() {
    this.input.keyboard.on('keydown', (e) => {
      if (this.saved) return;
      if (e.key === 'Backspace') {
        this.name = this.name.slice(0, -1);
      } else if (e.key === 'Enter') {
        this.save(true);
      } else if (e.key.length === 1 && this.name.length < 12 && /[\w\u4e00-\u9fa5 .\-]/.test(e.key)) {
        this.name += e.key;
      }
      this._refreshName();
    });
  }

  save(goLeaderboard) {
    if (this.saved) {
      if (goLeaderboard) this.gotoLeaderboard();
      return;
    }
    const finalName = (this.name || '无名飞行员').trim() || '无名飞行员';
    addScore({ name: finalName, score: this.finalScore, theme: this.themeKey, wave: this.wave });
    saveSettings({ lastName: finalName });
    this.saved = true;
    this.saveBtn.setLabel('已保存 ✔');
    if (this.audio) this.audio.pickup();
    this._refreshName();
    if (goLeaderboard) this.time.delayedCall(300, () => this.gotoLeaderboard());
  }

  retry() {
    this.scene.start(SCENES.GAME, { themeKey: this.themeKey });
  }

  gotoLeaderboard() {
    this.scene.start(SCENES.LEADERBOARD, { from: 'gameover' });
  }

  gotoMenu() {
    this.scene.start(SCENES.MENU);
  }

  update(time, delta) {
    if (this.bgCtrl) this.bgCtrl.update(delta);
  }
}
