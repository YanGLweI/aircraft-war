// 玩家飞机：血条(HP)、护盾、飞机等级/武器、受击无敌。
import Phaser from 'phaser';
import { DEPTH } from '../config/gameConfig.js';
import { PLAYER, WEAPON_LEVELS, MAX_LEVEL } from '../config/balance.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, theme) {
    super(scene, x, y, `${theme.key}_player`);
    this.theme = theme;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.PLAYER);
    this.setCollideWorldBounds(true);

    this.maxHp = PLAYER.maxHp;
    this.hp = PLAYER.maxHp;
    this.level = 1;
    this.nextFire = 0;
    this.invulnUntil = 0;
    this.shieldHits = 0;
    this.shieldUntil = 0;
    this.alive = true;

    // 命中判定圆
    const r = PLAYER.hitboxRadius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);

    // 护盾环
    this.shieldSprite = scene.add
      .image(x, y, `${theme.key}_shield`)
      .setDepth(DEPTH.SHIELD)
      .setVisible(false);
    scene.tweens.add({ targets: this.shieldSprite, angle: 360, duration: 4000, repeat: -1 });

    // 引擎拖尾粒子
    this.trail = scene.add.particles(0, 0, `${theme.key}_spark`, {
      speedY: { min: 60, max: 140 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 300,
      frequency: 40,
      tint: theme.palette.player.accent,
      follow: this,
      followOffset: { x: 0, y: this.height / 2 }
    });
    this.trail.setDepth(DEPTH.PLAYER - 1);
  }

  get weapon() {
    return WEAPON_LEVELS[Math.min(this.level, MAX_LEVEL) - 1];
  }

  isInvulnerable(now) {
    return now < this.invulnUntil || this.shieldActive(now);
  }

  shieldActive(now) {
    return this.shieldHits > 0 && now < this.shieldUntil;
  }

  tryFire(now) {
    if (!this.alive) return false;
    if (now < this.nextFire) return false;
    this.nextFire = now + this.weapon.interval;
    return true;
  }

  levelUp() {
    if (this.level >= MAX_LEVEL) return false;
    this.level += 1;
    this.scene.tweens.add({ targets: this, scale: 1.25, duration: 120, yoyo: true });
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addShield(ms, hits) {
    const now = this.scene.time.now;
    this.shieldUntil = Math.max(this.shieldUntil, now) + ms;
    this.shieldHits = Math.max(this.shieldHits, hits);
    this.shieldSprite.setVisible(true);
  }

  // 返回实际造成的伤害是否致死
  takeDamage(amount, now) {
    if (!this.alive || this.isInvulnerable(now)) return false;
    if (this.shieldActive(now)) {
      this.shieldHits -= 1;
      if (this.shieldHits <= 0) this.shieldSprite.setVisible(false);
      return false;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.invulnUntil = now + PLAYER.invulnMsAfterHit;
    // 受击闪烁
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 90,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.setAlpha(1)
    });
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.shieldSprite.setPosition(this.x, this.y);
    if (this.shieldHits > 0 && time >= this.shieldUntil) {
      this.shieldHits = 0;
      this.shieldSprite.setVisible(false);
    }
  }

  destroyAll() {
    if (this.trail) this.trail.destroy();
    if (this.shieldSprite) this.shieldSprite.destroy();
    this.destroy();
  }
}
