// 掉落系统：按权重随机道具类型，生成下落道具。
import Phaser from 'phaser';
import { LOOT } from '../config/balance.js';

export default class LootSystem {
  constructor(scene, theme) {
    this.scene = scene;
    this.theme = theme;
  }

  _rollType() {
    const w = LOOT.weights;
    const entries = Object.entries(w);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    let r = Math.random() * total;
    for (const [type, weight] of entries) {
      r -= weight;
      if (r <= 0) return type;
    }
    return entries[0][0];
  }

  // 敌机被击败时调用，按敌机类型的 dropChance 概率掉落
  maybeDrop(enemy) {
    const chance = (enemy && enemy.cfg && enemy.cfg.dropChance != null)
      ? enemy.cfg.dropChance
      : LOOT.dropChance;
    if (Math.random() > chance) return;
    this.drop(enemy.x, enemy.y, this._rollType());
  }

  // 指定掉落（Boss 掉多个）
  drop(x, y, type) {
    const pu = this.scene.powerups.get();
    if (pu) pu.spawn(x, y, type, this.theme.key);
  }

  dropMany(x, y, count) {
    const types = ['upgrade', 'weapon', 'heal', 'shield'];
    for (let i = 0; i < count; i++) {
      const t = Phaser.Utils.Array.GetRandom(types);
      this.drop(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-20, 20), t);
    }
  }
}
