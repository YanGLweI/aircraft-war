// 数值平衡表：难度曲线、掉落权重、伤害/血量。集中调参，方便打磨。

export const PLAYER = {
  maxHp: 100,
  speed: 320,
  fireBaseInterval: 260, // ms，等级越高越快
  invulnMsAfterHit: 700, // 受击短暂无敌
  hitboxRadius: 10 // 判定半径小于外观，手感更宽容
};

// 玩家武器等级：单发 -> 双发 -> 三向 -> 五向 -> 追踪
export const WEAPON_LEVELS = [
  { level: 1, damage: 10, interval: 260, pattern: 'single' },
  { level: 2, damage: 12, interval: 230, pattern: 'double' },
  { level: 3, damage: 14, interval: 210, pattern: 'triple' },
  { level: 4, damage: 16, interval: 190, pattern: 'penta' },
  { level: 5, damage: 20, interval: 170, pattern: 'homing' }
];
export const MAX_LEVEL = WEAPON_LEVELS.length;

// 敌机类型定义
export const ENEMY_TYPES = {
  dart: { hp: 20, speed: 150, score: 100, size: 34, move: 'straight', canShoot: false, color: 0xff5577 },
  weaver: { hp: 30, speed: 120, score: 150, size: 38, move: 'weave', canShoot: true, fireInterval: 1800, color: 0xffaa33 },
  diver: { hp: 26, speed: 210, score: 180, size: 36, move: 'dive', canShoot: false, color: 0x66ddff },
  elite: { hp: 90, speed: 90, score: 400, size: 52, move: 'weave', canShoot: true, fireInterval: 1200, color: 0xcc66ff }
};

// 随难度解锁的敌种（难度等级 -> 可用类型）
export function enemyPoolForDifficulty(d) {
  const pool = ['dart'];
  if (d >= 2) pool.push('weaver');
  if (d >= 3) pool.push('diver');
  if (d >= 5) pool.push('elite');
  return pool;
}

// 难度曲线：由 存活时间(秒) 与 得分 共同推导难度等级 (1..∞)
export function computeDifficulty(elapsedSec, score) {
  const byTime = elapsedSec / 25; // 每 25 秒 +1
  const byScore = score / 4000; // 每 4000 分 +1
  return 1 + byTime + byScore;
}

// 难度等级 -> 具体刷怪参数
export function spawnParamsForDifficulty(d) {
  return {
    interval: Math.max(320, 1200 - d * 70), // 刷新间隔(ms)，越来越快
    hpMul: 1 + d * 0.14, // 敌机血量倍率
    speedMul: 1 + d * 0.05, // 敌机速度倍率
    batchMax: Math.min(4, 1 + Math.floor(d / 3)) // 一次最多刷几只
  };
}

// Boss 触发：达到时间阈值或分数阈值
export const BOSS = {
  firstAtSec: 60,
  intervalSec: 75, // 之后每隔多久再来一只
  baseHp: 1200,
  hpGrowthPerWave: 900,
  score: 3000,
  speed: 60,
  size: 130
};

// 道具掉落
export const LOOT = {
  dropChance: 0.22, // 普通敌机掉落概率
  eliteDropChance: 0.6, // 精英必给更好
  // 权重（会做归一化）
  weights: { upgrade: 12, weapon: 18, heal: 22, shield: 16 },
  healAmount: 30,
  shieldMs: 6000,
  shieldHits: 3,
  fallSpeed: 120
};

// 计分
export const SCORE = {
  comboWindowMs: 2500, // 连击窗口
  comboStep: 0.1, // 每次连击 +0.1 倍率
  comboMax: 5, // 最高 5x
  survivalPerSec: 5 // 每秒生存分
};
