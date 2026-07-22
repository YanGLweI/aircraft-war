// 刷怪系统：按难度参数定时生成敌机，Boss 期间暂停普通刷怪。
import Phaser from 'phaser';

export default class SpawnSystem {
  constructor(scene, theme, difficulty) {
    this.scene = scene;
    this.theme = theme;
    this.difficulty = difficulty;
    this.nextSpawn = 0;
    this.paused = false;
  }

  setPaused(v) {
    this.paused = v;
  }

  update(now) {
    if (this.paused) return;
    if (now < this.nextSpawn) return;
    const params = this.difficulty.spawnParams();
    this.nextSpawn = now + params.interval;

    const pool = this.difficulty.enemyPool();
    const count = Phaser.Math.Between(1, params.batchMax);
    for (let i = 0; i < count; i++) {
      this._spawnOne(pool, params);
    }
  }

  _spawnOne(pool, params) {
    const type = Phaser.Utils.Array.GetRandom(pool);
    const cfg = this.scene.enemies.get();
    if (!cfg) return;
    const x = Phaser.Math.Between(40, this.scene.scale.width - 40);
    const y = -40;
    cfg.spawn(x, y, type, this.theme.key, {
      hpMul: params.hpMul,
      speedMul: params.speedMul
    });
  }
}
