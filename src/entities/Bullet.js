// 子弹：玩家/敌方共用，通过物理组做对象池复用。
import Phaser from 'phaser';
import { DEPTH } from '../config/gameConfig.js';

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, '__white');
    this.damage = 10;
    this.homing = false;
  }

  // 发射并激活
  fire(x, y, vx, vy, opts = {}) {
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.setTexture(opts.texture);
    this.damage = opts.damage ?? 10;
    this.homing = opts.homing ?? false;
    this.homingSpeed = opts.speed ?? 500;
    this.setDepth(opts.isEnemy ? DEPTH.ENEMY_BULLET : DEPTH.PLAYER_BULLET);
    this.setVelocity(vx, vy);
    if (opts.tint != null) this.setTint(opts.tint);
    else this.clearTint();
    const rot = Math.atan2(vy, vx) + Math.PI / 2;
    this.setRotation(rot);
    // 命中判定略小
    if (this.body) this.body.setSize(this.width * 0.7, this.height * 0.7, true);
    return this;
  }

  deactivate() {
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    // 追踪弹：朝最近敌机转向
    if (this.homing && this.scene && this.scene.enemies) {
      const target = this.scene.getNearestEnemy
        ? this.scene.getNearestEnemy(this.x, this.y)
        : null;
      if (target) {
        const ang = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        const cur = this.body.velocity.clone();
        const desired = new Phaser.Math.Vector2(
          Math.cos(ang) * this.homingSpeed,
          Math.sin(ang) * this.homingSpeed
        );
        const nx = Phaser.Math.Linear(cur.x, desired.x, 0.08);
        const ny = Phaser.Math.Linear(cur.y, desired.y, 0.08);
        this.setVelocity(nx, ny);
        this.setRotation(Math.atan2(ny, nx) + Math.PI / 2);
      }
    }
    // 出界回收
    const m = 40;
    if (
      this.y < -m ||
      this.y > this.scene.scale.height + m ||
      this.x < -m ||
      this.x > this.scene.scale.width + m
    ) {
      this.deactivate();
    }
  }
}
