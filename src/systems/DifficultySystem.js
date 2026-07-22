// 难度系统：由存活时间与得分推导难度等级与刷怪参数。
import { computeDifficulty, spawnParamsForDifficulty, enemyPoolForDifficulty } from '../config/balance.js';

export default class DifficultySystem {
  constructor() {
    this.elapsedSec = 0;
    this.level = 1;
  }

  update(deltaMs, score) {
    this.elapsedSec += deltaMs / 1000;
    this.level = computeDifficulty(this.elapsedSec, score);
    return this.level;
  }

  get intLevel() {
    return Math.floor(this.level);
  }

  spawnParams() {
    return spawnParamsForDifficulty(this.level);
  }

  enemyPool() {
    return enemyPoolForDifficulty(this.intLevel);
  }
}
