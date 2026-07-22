// 数值平衡表：难度曲线、掉落权重、伤害/血量。集中调参，方便打磨。

export const PLAYER = {
  maxHp: 100,
  speed: 300, // 基础移动速度（px/s）
  moveLerp: 0.22, // 键盘速度平滑（越小越缓，避免步幅过大）
  followLerpMouse: 0.55, // 鼠标跟随平滑（越大越跟手）
  followLerpTouch: 0.4, // 触摸跟随平滑
  touchOffsetY: 44, // 仅触摸时抬高机身（鼠标不偏移）
  fireBaseInterval: 260, // ms，等级越高越快
  invulnMsAfterHit: 700, // 受击短暂无敌
  hitboxRadius: 10 // 判定半径小于外观，手感更宽容
};

// 复活（假付费）：每局最多 3 次；首次需扫码并等 60s，后续点击即可
export const REVIVE = {
  maxRevives: 3,
  firstWaitSec: 60,
  trollText: '哈哈哈哈哈哈哈真够菜的',
  graceMs: 2000 // 复活后短暂无敌
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
// shape: 引用 texKit 的 POLY 造型；tint: 同造型间的辨识色（可选）；
// move: straight|weave|dive|zigzag|descendStop；attack: none|aimed|spread|radial|dual|burst
export const ENEMY_TYPES = {
  // 直冲小兵：血极低、无攻击、掉落极少
  scout: { shape: 'dart', hp: 10, speed: 180, score: 80, size: 30, move: 'straight', attack: 'none', dropChance: 0.06, tint: 0xffd1e0 },
  // 轻微摆动小兵
  dart: { shape: 'dart', hp: 16, speed: 150, score: 100, size: 34, move: 'weave', attack: 'none', dropChance: 0.10 },
  // 高速俯冲兵
  diver: { shape: 'diver', hp: 20, speed: 235, score: 150, size: 36, move: 'dive', attack: 'none', dropChance: 0.12, tint: 0x9be7ff },
  // 急折线兵
  zigzag: { shape: 'zigzag', hp: 24, speed: 150, score: 160, size: 36, move: 'zigzag', attack: 'none', dropChance: 0.12, tint: 0xffe08a },
  // 下降悬停 + 瞄准射击
  gunner: { shape: 'weaver', hp: 30, speed: 130, score: 180, size: 40, move: 'descendStop', attack: 'aimed', fireInterval: 1500, bulletSpeed: 250, dropChance: 0.18 },
  // 摆动 + 扇形弹
  spreader: { shape: 'weaver', hp: 42, speed: 100, score: 240, size: 44, move: 'weave', attack: 'spread', fireInterval: 2000, bulletSpeed: 220, dropChance: 0.24, tint: 0xffb3d1 },
  // 悬停 + 环形弹
  spinner: { shape: 'spinner', hp: 58, speed: 90, score: 320, size: 48, move: 'descendStop', attack: 'radial', fireInterval: 2300, bulletSpeed: 180, dropChance: 0.30, tint: 0xd9b3ff },
  // 高血慢速坦克 + 双直弹
  tank: { shape: 'tank', hp: 130, speed: 62, score: 400, size: 58, move: 'straight', attack: 'dual', fireInterval: 2400, bulletSpeed: 210, dropChance: 0.38, tint: 0xbfe0ff },
  // 精英兵 + 爆发弹
  elite: { shape: 'elite', hp: 100, speed: 90, score: 460, size: 54, move: 'weave', attack: 'burst', fireInterval: 1600, bulletSpeed: 260, dropChance: 0.6 }
};

// 随难度解锁的敌种（难度等级 -> 可用类型），低难度只有基础小兵
export function enemyPoolForDifficulty(d) {
  const pool = ['scout'];
  if (d >= 2) pool.push('dart');
  if (d >= 3) pool.push('diver');
  if (d >= 4) pool.push('zigzag');
  if (d >= 5) pool.push('gunner');
  if (d >= 6) pool.push('spreader');
  if (d >= 8) pool.push('spinner');
  if (d >= 9) pool.push('tank');
  if (d >= 10) pool.push('elite');
  return pool;
}

// 难度曲线：由 存活时间(秒) 与 得分 共同推导难度等级 (1..∞)
export function computeDifficulty(elapsedSec, score) {
  const byTime = elapsedSec / 20; // 每 20 秒 +1
  const byScore = score / 4000; // 每 4000 分 +1
  return 1 + byTime + byScore;
}

// 难度等级 -> 具体刷怪参数（血量/速度倍率有上限，避免失控）
export function spawnParamsForDifficulty(d) {
  return {
    interval: Math.max(320, 1200 - d * 70), // 刷新间隔(ms)，越来越快
    hpMul: Math.min(2.2, 1 + d * 0.1), // 敌机血量倍率（封顶 2.2x）
    speedMul: Math.min(1.6, 1 + d * 0.04), // 敌机速度倍率（封顶 1.6x）
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
  dropChance: 0.16, // 默认回退概率（敌机类型未指定时）
  // 权重（会做归一化）
  weights: { upgrade: 12, weapon: 18, heal: 22, shield: 16 },
  healAmount: 30,
  shieldMs: 6000,
  shieldHits: 3,
  fallSpeed: 120
};

// 计分（仅击落敌机得分：生存分为 0）
export const SCORE = {
  comboWindowMs: 2500, // 连击窗口
  comboStep: 0.1, // 每次连击 +0.1 倍率
  comboMax: 5, // 最高 5x
  survivalPerSec: 0 // 不再给被动生存分
};
