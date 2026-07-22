// 排行榜：Top10 列表 + 清空 + 返回。
import Phaser from 'phaser';
import { SCENES, REG, GAME_WIDTH as W, GAME_HEIGHT as H } from '../config/gameConfig.js';
import { getTheme, THEME_MAP } from '../config/themes/index.js';
import { createBackground } from '../config/themes/background.js';
import Button from '../ui/Button.js';
import { getLeaderboard, clearLeaderboard } from '../storage/leaderboard.js';

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super(SCENES.LEADERBOARD);
  }

  create() {
    this.themeKey = this.registry.get(REG.THEME) || 'cyber';
    this.theme = getTheme(this.themeKey);
    this.audio = this.registry.get('audio');
    this.bgCtrl = createBackground(this, this.theme);
    const font = this.theme.ui.fontFamily;

    this.add.text(W / 2, 70, '排行榜', { fontFamily: font, fontSize: '40px', color: '#eaf6ff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(W / 2, 108, 'TOP 10 · 本地记录', { fontFamily: font, fontSize: '13px', color: '#8fb3d9' }).setOrigin(0.5);

    this.listContainer = this.add.container(0, 0);
    this._renderList();

    new Button(this, W / 2 - 90, H - 60, '清空记录', { width: 150, height: 46, accent: 0xff5a6a, onClick: () => this._clear() });
    new Button(this, W / 2 + 90, H - 60, '返回', { width: 150, height: 46, accent: 0x36e07a, onClick: () => this.scene.start(SCENES.MENU) });

    this.cameras.main.fadeIn(250);
  }

  _renderList() {
    this.listContainer.removeAll(true);
    const font = this.theme.ui.fontFamily;
    const list = getLeaderboard();
    const top = 150;
    const rowH = 46;

    if (!list.length) {
      const empty = this.add.text(W / 2, top + 120, '还没有记录，快去开一局吧！', {
        fontFamily: font,
        fontSize: '16px',
        color: '#9fb0d0'
      }).setOrigin(0.5);
      this.listContainer.add(empty);
      return;
    }

    list.forEach((e, i) => {
      const y = top + i * rowH;
      const row = this.add.graphics();
      row.fillStyle(i % 2 === 0 ? 0x11203a : 0x0c1830, 0.7);
      row.fillRoundedRect(30, y, W - 60, rowH - 6, 8);
      if (i < 3) {
        row.lineStyle(2, [0xffd23d, 0xc0c0c0, 0xcd7f32][i], 0.9);
        row.strokeRoundedRect(30, y, W - 60, rowH - 6, 8);
      }
      this.listContainer.add(row);

      const rankColor = i < 3 ? ['#ffd23d', '#d8d8d8', '#e39a5a'][i] : '#8fb3d9';
      const rank = this.add.text(52, y + (rowH - 6) / 2, `${i + 1}`, { fontFamily: font, fontSize: '20px', color: rankColor, fontStyle: 'bold' }).setOrigin(0.5);
      const name = this.add.text(80, y + (rowH - 6) / 2, e.name, { fontFamily: font, fontSize: '17px', color: '#eaf6ff' }).setOrigin(0, 0.5);
      const themeName = (THEME_MAP[e.theme] || this.theme).name;
      const meta = this.add.text(80, y + (rowH - 6) / 2 + 13, `${themeName} · ${e.date}`, { fontFamily: font, fontSize: '10px', color: '#7f92b5' }).setOrigin(0, 0.5);
      const score = this.add.text(W - 52, y + (rowH - 6) / 2, `${e.score}`, { fontFamily: font, fontSize: '20px', color: '#ffd23d', fontStyle: 'bold' }).setOrigin(1, 0.5);
      this.listContainer.add([rank, name, meta, score]);
    });
  }

  _clear() {
    clearLeaderboard();
    if (this.audio) this.audio.hit();
    this._renderList();
  }

  update(time, delta) {
    if (this.bgCtrl) this.bgCtrl.update(delta);
  }
}
