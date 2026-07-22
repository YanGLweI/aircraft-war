// 程序化纹理生成工具：根据主题的 style + palette 生成全部游戏纹理。
// 三种风格：'neon'(赛博霓虹) | 'pixel'(像素复古) | 'metal'(写实太空)。
// 生成的纹理统一以 `${theme.key}_xxx` 命名，实体按当前主题取用。
import { ENEMY_TYPES } from '../balance.js';

// 飞船轮廓（归一化 0..1 坐标，x 向右、y 向下）。玩家机头朝上，敌机机头朝下。
const POLY = {
  player: [
    [0.5, 0.0],
    [0.62, 0.35],
    [0.95, 0.62],
    [0.95, 0.78],
    [0.6, 0.66],
    [0.56, 0.95],
    [0.44, 0.95],
    [0.4, 0.66],
    [0.05, 0.78],
    [0.05, 0.62],
    [0.38, 0.35]
  ],
  // 敌机机头朝下
  dart: [
    [0.5, 1.0],
    [0.28, 0.7],
    [0.1, 0.78],
    [0.22, 0.45],
    [0.4, 0.1],
    [0.6, 0.1],
    [0.78, 0.45],
    [0.9, 0.78],
    [0.72, 0.7]
  ],
  weaver: [
    [0.5, 1.0],
    [0.15, 0.72],
    [0.02, 0.5],
    [0.3, 0.5],
    [0.35, 0.12],
    [0.65, 0.12],
    [0.7, 0.5],
    [0.98, 0.5],
    [0.85, 0.72]
  ],
  diver: [
    [0.5, 1.0],
    [0.32, 0.55],
    [0.08, 0.35],
    [0.42, 0.2],
    [0.5, 0.0],
    [0.58, 0.2],
    [0.92, 0.35],
    [0.68, 0.55]
  ],
  elite: [
    [0.5, 1.0],
    [0.2, 0.82],
    [0.05, 0.55],
    [0.2, 0.42],
    [0.34, 0.15],
    [0.5, 0.25],
    [0.66, 0.15],
    [0.8, 0.42],
    [0.95, 0.55],
    [0.8, 0.82]
  ],
  boss: [
    [0.5, 1.0],
    [0.3, 0.9],
    [0.12, 0.62],
    [0.0, 0.4],
    [0.2, 0.34],
    [0.3, 0.1],
    [0.42, 0.24],
    [0.5, 0.16],
    [0.58, 0.24],
    [0.7, 0.1],
    [0.8, 0.34],
    [1.0, 0.4],
    [0.88, 0.62],
    [0.7, 0.9]
  ],
  // 环形弹旋转体：菱形主体 + 侧翼尖刺
  spinner: [
    [0.5, 1.0],
    [0.24, 0.74],
    [0.02, 0.62],
    [0.22, 0.5],
    [0.08, 0.28],
    [0.5, 0.0],
    [0.92, 0.28],
    [0.78, 0.5],
    [0.98, 0.62],
    [0.76, 0.74]
  ],
  // 坦克：宽厚重甲
  tank: [
    [0.5, 1.0],
    [0.14, 0.86],
    [0.06, 0.58],
    [0.16, 0.5],
    [0.1, 0.22],
    [0.34, 0.28],
    [0.5, 0.08],
    [0.66, 0.28],
    [0.9, 0.22],
    [0.84, 0.5],
    [0.94, 0.58],
    [0.86, 0.86]
  ],
  // 急折线兵：细长带侧刺
  zigzag: [
    [0.5, 1.0],
    [0.3, 0.64],
    [0.06, 0.66],
    [0.36, 0.42],
    [0.42, 0.06],
    [0.58, 0.06],
    [0.64, 0.42],
    [0.94, 0.66],
    [0.7, 0.64]
  ]
};

function scalePoly(poly, w, h, pad = 0.06) {
  const s = 1 - pad * 2;
  return poly.map(([x, y]) => ({ x: (x * s + pad) * w, y: (y * s + pad) * h }));
}

function newG(scene) {
  return scene.make.graphics({ x: 0, y: 0, add: false });
}

// 根据风格绘制一艘飞船到 graphics
function drawShip(g, w, h, poly, style, palette) {
  const pts = scalePoly(poly, w, h);
  if (style === 'neon') {
    // 外发光：多层描边
    for (let i = 4; i >= 1; i--) {
      g.lineStyle(i * 3, palette.glow, 0.12);
      g.strokePoints(pts, true, true);
    }
    g.fillStyle(palette.body, 0.4);
    g.fillPoints(pts, true);
    g.lineStyle(2, palette.stroke, 1);
    g.strokePoints(pts, true, true);
    // 座舱发光点
    g.fillStyle(palette.accent, 0.9);
    g.fillCircle(w * 0.5, h * 0.5, Math.max(3, w * 0.09));
  } else if (style === 'pixel') {
    g.fillStyle(palette.body, 1);
    g.fillPoints(pts, true);
    g.lineStyle(3, palette.outline, 1);
    g.strokePoints(pts, true, true);
    // 方块细节
    g.fillStyle(palette.accent, 1);
    g.fillRect(w * 0.42, h * 0.42, w * 0.16, h * 0.18);
    g.fillStyle(palette.light, 1);
    g.fillRect(w * 0.46, h * 0.2, w * 0.08, h * 0.12);
  } else {
    // metal：分层明暗
    g.fillStyle(palette.dark, 1);
    g.fillPoints(pts, true);
    const inner = scalePoly(poly, w, h, 0.24);
    g.fillStyle(palette.body, 1);
    g.fillPoints(inner, true);
    const core = scalePoly(poly, w, h, 0.38);
    g.fillStyle(palette.light, 0.85);
    g.fillPoints(core, true);
    g.lineStyle(1.5, palette.outline, 0.9);
    g.strokePoints(pts, true, true);
    // 引擎光晕
    g.fillStyle(palette.accent, 0.9);
    g.fillCircle(w * 0.5, h * 0.5, Math.max(3, w * 0.08));
  }
}

function genShip(scene, name, size, poly, style, palette) {
  const g = newG(scene);
  drawShip(g, size, size, poly, style, palette);
  g.generateTexture(name, size, size);
  g.destroy();
}

// 子弹纹理
function genBullet(scene, name, color, style, isEnemy) {
  const g = newG(scene);
  const w = 12;
  const h = isEnemy ? 12 : 22;
  if (style === 'pixel') {
    g.fillStyle(color, 1);
    if (isEnemy) g.fillRect(2, 2, 8, 8);
    else {
      g.fillRect(3, 0, 6, h);
      g.fillStyle(0xffffff, 1);
      g.fillRect(4, 2, 4, 4);
    }
  } else {
    // 发光弹
    g.fillStyle(color, 0.25);
    g.fillCircle(w / 2, h / 2, w / 2);
    g.fillStyle(color, 1);
    if (isEnemy) g.fillCircle(w / 2, h / 2, w / 2 - 2);
    else {
      g.fillRoundedRect(3, 1, 6, h - 2, 3);
      g.fillStyle(0xffffff, 0.9);
      g.fillRoundedRect(4.5, 3, 3, 6, 1.5);
    }
  }
  g.generateTexture(name, w, h);
  g.destroy();
}

// 道具徽章：圆底 + 符号
const POWERUP_COLORS = {
  upgrade: 0x7CFF6B,
  weapon: 0xFFB020,
  heal: 0xFF5E7E,
  shield: 0x49B8FF
};

function drawSymbol(g, type, cx, cy, r) {
  g.lineStyle(3, 0xffffff, 1);
  g.fillStyle(0xffffff, 1);
  if (type === 'upgrade') {
    g.beginPath();
    g.moveTo(cx, cy - r);
    g.lineTo(cx + r, cy + r * 0.2);
    g.lineTo(cx + r * 0.4, cy + r * 0.2);
    g.lineTo(cx + r * 0.4, cy + r);
    g.lineTo(cx - r * 0.4, cy + r);
    g.lineTo(cx - r * 0.4, cy + r * 0.2);
    g.lineTo(cx - r, cy + r * 0.2);
    g.closePath();
    g.fillPath();
  } else if (type === 'weapon') {
    // 闪电
    g.beginPath();
    g.moveTo(cx + r * 0.3, cy - r);
    g.lineTo(cx - r * 0.5, cy + r * 0.15);
    g.lineTo(cx, cy + r * 0.15);
    g.lineTo(cx - r * 0.3, cy + r);
    g.lineTo(cx + r * 0.5, cy - r * 0.15);
    g.lineTo(cx, cy - r * 0.15);
    g.closePath();
    g.fillPath();
  } else if (type === 'heal') {
    const t = r * 0.42;
    g.fillRect(cx - t, cy - r, t * 2, r * 2);
    g.fillRect(cx - r, cy - t, r * 2, t * 2);
  } else if (type === 'shield') {
    g.beginPath();
    g.moveTo(cx, cy - r);
    g.lineTo(cx + r * 0.85, cy - r * 0.5);
    g.lineTo(cx + r * 0.85, cy + r * 0.25);
    g.lineTo(cx, cy + r);
    g.lineTo(cx - r * 0.85, cy + r * 0.25);
    g.lineTo(cx - r * 0.85, cy - r * 0.5);
    g.closePath();
    g.fillPath();
  }
}

function genPowerup(scene, name, type, style, palette) {
  const g = newG(scene);
  const s = 40;
  const c = POWERUP_COLORS[type];
  if (style !== 'pixel') {
    g.fillStyle(c, 0.25);
    g.fillCircle(s / 2, s / 2, s / 2);
  }
  g.fillStyle(c, 1);
  if (style === 'pixel') g.fillRect(4, 4, s - 8, s - 8);
  else g.fillCircle(s / 2, s / 2, s / 2 - 4);
  g.lineStyle(3, palette.accent, 1);
  if (style === 'pixel') g.strokeRect(4, 4, s - 8, s - 8);
  else g.strokeCircle(s / 2, s / 2, s / 2 - 4);
  drawSymbol(g, type, s / 2, s / 2, s * 0.26);
  g.generateTexture(name, s, s);
  g.destroy();
}

// 星星（背景）
function genStar(scene, name, color) {
  const g = newG(scene);
  g.fillStyle(color, 0.35);
  g.fillCircle(4, 4, 4);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 1.6);
  g.generateTexture(name, 8, 8);
  g.destroy();
}

// 粒子火花
function genSpark(scene, name, color) {
  const g = newG(scene);
  g.fillStyle(color, 1);
  g.fillCircle(6, 6, 6);
  g.generateTexture(name, 12, 12);
  g.destroy();
}

// 护盾环
function genShieldRing(scene, name, color) {
  const g = newG(scene);
  const s = 96;
  g.lineStyle(4, color, 0.9);
  g.strokeCircle(s / 2, s / 2, s / 2 - 6);
  g.lineStyle(10, color, 0.18);
  g.strokeCircle(s / 2, s / 2, s / 2 - 6);
  g.generateTexture(name, s, s);
  g.destroy();
}

// 生成一个主题的全部纹理
export function generateThemeTextures(scene, theme) {
  const k = theme.key;
  const st = theme.style;
  const p = theme.palette;
  if (scene.textures.exists(`${k}_player`)) return; // 避免重复生成

  genShip(scene, `${k}_player`, 56, POLY.player, st, p.player);
  // 遍历所有敌机类型，按各自 shape 生成纹理
  Object.entries(ENEMY_TYPES).forEach(([type, cfg]) => {
    const poly = POLY[cfg.shape] || POLY.dart;
    genShip(scene, `${k}_enemy_${type}`, 52, poly, st, p.enemy);
  });
  genShip(scene, `${k}_boss`, 150, POLY.boss, st, p.boss);

  genBullet(scene, `${k}_bullet`, p.bullet, st, false);
  genBullet(scene, `${k}_ebullet`, p.ebullet, st, true);

  ['upgrade', 'weapon', 'heal', 'shield'].forEach((t) => {
    genPowerup(scene, `${k}_pu_${t}`, t, st, p);
  });

  genStar(scene, `${k}_star`, p.star);
  genSpark(scene, `${k}_spark`, p.bullet);
  genSpark(scene, `${k}_spark2`, p.enemy.body);
  genShieldRing(scene, `${k}_shield`, p.player.accent);
}
