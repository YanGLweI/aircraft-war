// 道具：从被击败敌机位置下落，玩家碰撞拾取。四类：升级/强化/回血/护盾。
import Phaser from 'phaser';
import { DEPTH } from '../config/gameConfig.js';
import { LOOT } from '../config/balance.js';

export default class PowerUp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, '__white');
    this.puType = 'heal';
  }

  spawn(x, y, type, themeKey) {
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.puType = type;
    this.setTexture(`${themeKey}_pu_${type}`);
    this.setDepth(DEPTH.POWERUP);
    this.setVelocity(Phaser.Math.Between(-20, 20), LOOT.fallSpeed);
    this.setScale(0.9);
    this.clearTint();
    if (this.body) this.body.setSize(this.width, this.height, true);
    // 旋转脉冲
    this._tw = this.scene.tweens.add({
      targets: this,
      scale: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
    return this;
  }

  deactivate() {
    if (this._tw) {
      this._tw.stop();
      this._tw = null;
    }
    this.setScale(1);
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.y > this.scene.scale.height + 40) this.deactivate();
  }
}
