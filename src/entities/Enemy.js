// 敌机：类型化、独立血条、移动 AI、可射击。通过物理组做对象池复用。
import Phaser from 'phaser';
import { DEPTH } from '../config/gameConfig.js';
import { ENEMY_TYPES } from '../config/balance.js';
import HealthBar from '../ui/HealthBar.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, '__white');
    this.enemyType = 'dart';
    this.hpBar = new HealthBar(scene, { width: 40, height: 4, fillColor: 0x36e07a, depth: DEPTH.ENEMY + 1 });
    this.hpBar.setVisible(false);
  }

  spawn(x, y, type, themeKey, mods = {}) {
    const cfg = ENEMY_TYPES[type];
    this.enemyType = type;
    this.cfg = cfg;
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.setTexture(`${themeKey}_enemy_${type}`);
    this.setDepth(DEPTH.ENEMY);
    this.clearTint();
    this.setAlpha(1);

    this.maxHp = Math.round(cfg.hp * (mods.hpMul || 1));
    this.hp = this.maxHp;
    this.speed = cfg.speed * (mods.speedMul || 1);
    this.score = cfg.score;
    this.moveKind = cfg.move;
    this.attack = cfg.attack || 'none';
    this.canShoot = this.attack !== 'none';
    this.fireInterval = cfg.fireInterval || 1500;
    this.nextFire = this.scene.time.now + Phaser.Math.Between(400, this.fireInterval);
    this.moveTime = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.baseVX = 0;
    // 急折线横向方向（zigzag 用）
    this.zigDir = Phaser.Math.Between(0, 1) ? 1 : -1;
    this.nextZig = this.scene.time.now + Phaser.Math.Between(500, 900);
    // 下降悬停目标 Y（descendStop 用，屏高 18%~32%）
    this.holdY = this.scene.scale.height * Phaser.Math.FloatBetween(0.18, 0.32);
    this.reachedHold = false;
    this.patrolDir = Phaser.Math.Between(0, 1) ? 1 : -1;
    // 同造型辨识色
    this.baseTint = cfg.tint != null ? cfg.tint : null;
    if (this.baseTint != null) this.setTint(this.baseTint);

    const disp = cfg.size;
    this.setDisplaySize(disp, disp);
    if (this.body) {
      this.body.setSize(this.width * 0.7, this.height * 0.7, true);
    }
    this.setVelocity(0, this.speed);
    this.hpBar.setVisible(true);
    return this;
  }

  takeDamage(amount) {
    this.hp -= amount;
    // 受击闪白
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (!this.active) return;
      if (this.baseTint != null) this.setTint(this.baseTint);
      else this.clearTint();
    });
    return this.hp <= 0;
  }

  deactivate() {
    this.hpBar.setVisible(false);
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.moveTime += delta / 1000;

    // 移动模式
    if (this.moveKind === 'weave') {
      this.setVelocityX(Math.cos(this.moveTime * 2) * this.speed * 0.8);
      this.setVelocityY(this.speed * 0.7);
    } else if (this.moveKind === 'dive') {
      this.setVelocityY(this.speed);
    } else if (this.moveKind === 'zigzag') {
      // 定时反向的水平速度 + 持续下降
      if (time > this.nextZig) {
        this.zigDir *= -1;
        this.nextZig = time + Phaser.Math.Between(500, 900);
      }
      this.setVelocityX(this.zigDir * this.speed * 0.9);
      this.setVelocityY(this.speed * 0.7);
    } else if (this.moveKind === 'descendStop') {
      // 下降到 holdY 后停住，横向巡逻
      if (!this.reachedHold && this.y >= this.holdY) this.reachedHold = true;
      if (this.reachedHold) {
        this.setVelocityY(0);
        this.setVelocityX(this.patrolDir * this.speed * 0.6);
        // 碰到左右边界则反向
        const m = this.displayWidth * 0.5;
        if (this.x < m + 10) this.patrolDir = 1;
        else if (this.x > this.scene.scale.width - m - 10) this.patrolDir = -1;
      } else {
        this.setVelocityY(this.speed);
      }
    } else {
      this.setVelocityY(this.speed);
    }

    // 射击
    if (this.canShoot && time > this.nextFire && this.y < this.scene.scale.height * 0.7) {
      this.nextFire = time + this.fireInterval;
      if (this.scene.enemyShoot) this.scene.enemyShoot(this);
    }

    // 血条跟随
    const dispH = this.displayHeight;
    this.hpBar.draw(this.x - 20, this.y - dispH / 2 - 8, this.hp / this.maxHp);

    // 出界回收（底部离场）
    if (this.y > this.scene.scale.height + 60) this.deactivate();
  }

  destroy(fromScene) {
    if (this.hpBar) this.hpBar.destroy();
    super.destroy(fromScene);
  }
}
