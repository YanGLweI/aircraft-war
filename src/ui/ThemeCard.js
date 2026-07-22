// 主菜单主题预览卡片：迷你预览 + 名称 + 选中态。
import Phaser from 'phaser';

export default class ThemeCard extends Phaser.GameObjects.Container {
  constructor(scene, x, y, theme, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    this.theme = theme;
    this.w = opts.width || 128;
    this.h = opts.height || 168;
    this.selected = false;
    this.onSelect = opts.onSelect;

    const p = theme.palette;
    this.bg = scene.add.graphics();
    this.add(this.bg);

    // 预览区裁剪一个迷你星空
    this.preview = scene.add.graphics();
    this.add(this.preview);
    this._drawPreview();

    // 迷你飞船
    const py = -this.h / 2 + 74;
    this.playerIcon = scene.add.image(0, py, `${theme.key}_player`).setDisplaySize(38, 38);
    this.enemyIcon = scene.add.image(-30, py - 34, `${theme.key}_enemy_dart`).setDisplaySize(24, 24);
    this.enemyIcon2 = scene.add.image(32, py - 24, `${theme.key}_enemy_weaver`).setDisplaySize(22, 22);
    this.add(this.playerIcon);
    this.add(this.enemyIcon);
    this.add(this.enemyIcon2);

    this.nameTxt = scene.add
      .text(0, this.h / 2 - 34, theme.name, {
        fontFamily: theme.ui.fontFamily,
        fontSize: '17px',
        color: theme.ui.textColor,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.descTxt = scene.add
      .text(0, this.h / 2 - 15, theme.desc, {
        fontFamily: theme.ui.fontFamily,
        fontSize: '10px',
        color: '#9fb0d0'
      })
      .setOrigin(0.5);
    this.add(this.nameTxt);
    this.add(this.descTxt);

    this._drawBg();
    this.setSize(this.w, this.h);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.w / 2, -this.h / 2, this.w, this.h),
      Phaser.Geom.Rectangle.Contains
    );
    this.on('pointerover', () => !this.selected && this._drawBg(0.5));
    this.on('pointerout', () => !this.selected && this._drawBg());
    this.on('pointerup', () => this.onSelect && this.onSelect(theme.key));

    // 迷你飞船漂浮动画
    scene.tweens.add({ targets: this.playerIcon, y: py + 6, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  _drawPreview() {
    const p = this.theme.palette;
    const g = this.preview;
    const pw = this.w - 16;
    const ph = 96;
    const px = -pw / 2;
    const py = -this.h / 2 + 12;
    g.fillStyle(p.bg, 1);
    g.fillRect(px, py, pw, ph);
    // 星点
    const rnd = new Phaser.Math.RandomDataGenerator([this.theme.key]);
    for (let i = 0; i < 22; i++) {
      g.fillStyle(0xffffff, 0.3 + rnd.frac() * 0.6);
      g.fillCircle(px + rnd.frac() * pw, py + rnd.frac() * ph, 1 + rnd.frac());
    }
  }

  _drawBg(hoverAlpha) {
    const g = this.bg;
    const p = this.theme.palette;
    const stroke = this.selected ? this.theme.ui.panelStroke : 0x3a4a66;
    g.clear();
    g.fillStyle(this.theme.ui.panelColor, 0.92);
    g.fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, 12);
    if (hoverAlpha) {
      g.fillStyle(p.player.accent, hoverAlpha * 0.15);
      g.fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, 12);
    }
    g.lineStyle(this.selected ? 3 : 1.5, stroke, this.selected ? 1 : 0.7);
    g.strokeRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, 12);
  }

  setSelected(v) {
    this.selected = v;
    this._drawBg();
    this.scene.tweens.add({ targets: this, scale: v ? 1.06 : 1, duration: 150 });
    return this;
  }
}
