// 通用按钮：圆角面板 + 文本 + 悬停/按下反馈。
import Phaser from 'phaser';

export default class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    this.w = opts.width || 200;
    this.h = opts.height || 52;
    this.baseColor = opts.color ?? 0x14243c;
    this.accent = opts.accent ?? 0x22d3ee;
    this.textColor = opts.textColor || '#eaf6ff';
    this.fontFamily = opts.fontFamily || '"Segoe UI", system-ui, sans-serif';
    this.fontSize = opts.fontSize || 22;
    this.radius = opts.radius ?? 14;

    this.bg = scene.add.graphics();
    this.add(this.bg);

    this.txt = scene.add
      .text(0, 0, label, {
        fontFamily: this.fontFamily,
        fontSize: `${this.fontSize}px`,
        color: this.textColor,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.add(this.txt);

    this._drawBg(0.16);

    this.setSize(this.w, this.h);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.w, this.h),
      Phaser.Geom.Rectangle.Contains
    );

    this.on('pointerover', () => {
      this._drawBg(0.32);
      scene.tweens.add({ targets: this, scale: 1.04, duration: 120 });
    });
    this.on('pointerout', () => {
      this._drawBg(0.16);
      scene.tweens.add({ targets: this, scale: 1, duration: 120 });
    });
    this.on('pointerdown', () => {
      scene.tweens.add({ targets: this, scale: 0.96, duration: 80, yoyo: true });
    });
    if (opts.onClick) this.on('pointerdown', opts.onClick);
  }

  _drawBg(fillAlpha) {
    const g = this.bg;
    g.clear();
    g.fillStyle(this.baseColor, 0.85);
    g.fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, this.radius);
    g.fillStyle(this.accent, fillAlpha);
    g.fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, this.radius);
    g.lineStyle(2, this.accent, 0.9);
    g.strokeRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, this.radius);
  }

  setLabel(s) {
    this.txt.setText(s);
    return this;
  }
}
