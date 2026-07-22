// Boss：大血条、多阶段攻击（扇形/瞄准/环形）、入场与横向巡逻。
import Phaser from 'phaser';
import { DEPTH } from '../config/gameConfig.js';
import { BOSS } from '../config/balance.js';

export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, theme, hp) {
    super(scene, scene.scale.width / 2, -120, `${theme.key}_boss`);
    this.theme = theme;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.ENEMY);
    this.setDisplaySize(BOSS.size, BOSS.size);

    this.maxHp = hp;
    this.hp = hp;
    this.score = BOSS.score;
    this.entering = true;
    this.targetY = 140;
    this.patrolDir = 1;
    this.nextFire = 0;
    this.alive = true;

    if (this.body) {
      this.body.setSize(this.width * 0.8, this.height * 0.7, true);
      this.body.setAllowGravity(false);
    }
  }

  phase() {
    const r = this.hp / this.maxHp;
    if (r > 0.66) return 1;
    if (r > 0.33) return 2;
    return 3;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => this.active && this.clearTint());
    if (this.scene.onBossHp) this.scene.onBossHp(this.hp / this.maxHp);
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  _fireFan(now, count, spread) {
    const cx = this.x;
    const cy = this.y + this.displayHeight / 2;
    const base = Math.PI / 2; // 向下
    for (let i = 0; i < count; i++) {
      const a = base - spread / 2 + (spread * i) / (count - 1 || 1);
      this.scene.spawnBossBullet(cx, cy, Math.cos(a) * 220, Math.sin(a) * 220);
    }
  }

  _fireAimed(now) {
    const p = this.scene.player;
    if (!p || !p.alive) return;
    const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    for (let i = -1; i <= 1; i++) {
      const aa = a + i * 0.12;
      this.scene.spawnBossBullet(this.x, this.y + 20, Math.cos(aa) * 300, Math.sin(aa) * 300);
    }
  }

  _fireRadial(now, count) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (now / 1000) % Math.PI;
      this.scene.spawnBossBullet(this.x, this.y, Math.cos(a) * 200, Math.sin(a) * 200);
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.entering) {
      this.y += (this.targetY - this.y) * 0.05;
      if (Math.abs(this.y - this.targetY) < 2) {
        this.entering = false;
        this.setVelocityX(BOSS.speed * this.patrolDir);
      }
      return;
    }

    // 横向巡逻，触边反弹
    const half = this.displayWidth / 2;
    if (this.x < half + 10 && this.body.velocity.x < 0) this.setVelocityX(BOSS.speed);
    if (this.x > this.scene.scale.width - half - 10 && this.body.velocity.x > 0)
      this.setVelocityX(-BOSS.speed);

    // 阶段化攻击
    const ph = this.phase();
    if (time > this.nextFire) {
      if (ph === 1) {
        this._fireFan(time, 6, Math.PI * 0.5);
        this.nextFire = time + 1300;
      } else if (ph === 2) {
        this._fireFan(time, 8, Math.PI * 0.7);
        this._fireAimed(time);
        this.nextFire = time + 1100;
      } else {
        this._fireRadial(time, 14);
        this._fireAimed(time);
        this.nextFire = time + 900;
      }
    }
  }
}
