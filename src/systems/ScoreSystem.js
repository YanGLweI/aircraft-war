// 计分系统：击杀得分 + 连击倍率 + 生存加成。
import { SCORE } from '../config/balance.js';

export default class ScoreSystem {
  constructor() {
    this.score = 0;
    this.combo = 0; // 连击次数
    this.multiplier = 1;
    this.lastKillAt = -99999;
    this._survivalAcc = 0;
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

  // 每帧调用累计生存分，并处理连击过期
  update(deltaMs, now) {
    this._survivalAcc += (SCORE.survivalPerSec * deltaMs) / 1000;
    if (this._survivalAcc >= 1) {
      const whole = Math.floor(this._survivalAcc);
      this.score += whole;
      this._survivalAcc -= whole;
    }
    if (this.combo > 0 && now - this.lastKillAt > SCORE.comboWindowMs) {
      this.combo = 0;
      this.multiplier = 1;
    }
  }
}
