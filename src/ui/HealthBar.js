// 通用血条组件，玩家/敌机/Boss 复用。基于 Graphics 绘制，可跟随目标或固定。
export default class HealthBar {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.w = opts.width || 40;
    this.h = opts.height || 5;
    this.fillColor = opts.fillColor ?? 0x36e07a;
    this.lowColor = opts.lowColor ?? 0xff5555;
    this.bgColor = opts.bgColor ?? 0x000000;
    this.borderColor = opts.borderColor ?? 0xffffff;
    this.showBorder = opts.showBorder ?? false;
    this.gfx = scene.add.graphics();
    if (opts.depth != null) this.gfx.setDepth(opts.depth);
    this.ratio = 1;
    this.visibleFlag = true;
  }

  setDepth(d) {
    this.gfx.setDepth(d);
    return this;
  }

  setVisible(v) {
    this.visibleFlag = v;
    this.gfx.setVisible(v);
    return this;
  }

  // x,y 为血条左上角
  draw(x, y, ratio) {
    this.ratio = Math.max(0, Math.min(1, ratio));
    const g = this.gfx;
    g.clear();
    if (!this.visibleFlag) return;
    g.fillStyle(this.bgColor, 0.6);
    g.fillRect(x, y, this.w, this.h);
    const col = this.ratio < 0.3 ? this.lowColor : this.fillColor;
    g.fillStyle(col, 1);
    g.fillRect(x, y, this.w * this.ratio, this.h);
    if (this.showBorder) {
      g.lineStyle(1, this.borderColor, 0.8);
      g.strokeRect(x, y, this.w, this.h);
    }
  }

  destroy() {
    this.gfx.destroy();
  }
}
