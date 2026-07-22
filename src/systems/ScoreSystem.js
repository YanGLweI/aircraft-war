// 计分系统：仅击杀敌机得分 + 连击倍率。
import { SCORE } from '../config/balance.js';

export default class ScoreSystem {
  constructor() {
    this.score = 0;
    this.combo = 0; // 连击次数
    this.multiplier = 1;
    this.lastKillAt = -99999;
  }

  // 击杀敌机
  addKill(basePoints, now) {
    if (now - this.lastKillAt <= SCORE.comboWindowMs) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }
    this.lastKillAt = now;
    this.multiplier = Math.min(SCORE.comboMax, 1 + (this.combo - 1) * SCORE.comboStep);
    this.score += Math.round(basePoints * this.multiplier);
    return this.multiplier;
  }

  addRaw(points) {
    this.score += Math.round(points);
  }

  // 每帧调用：仅处理连击过期（不再累加生存分）
  update(deltaMs, now) {
    if (this.combo > 0 && now - this.lastKillAt > SCORE.comboWindowMs) {
      this.combo = 0;
      this.multiplier = 1;
    }
  }
}
