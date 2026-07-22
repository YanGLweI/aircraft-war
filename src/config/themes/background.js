// 主题背景：生成可平铺的背景纹理 + 视差星层，返回带 update 的滚动控制器。
import { GAME_WIDTH as W, GAME_HEIGHT as H, DEPTH } from '../gameConfig.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildTile(scene, key, theme) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const p = theme.palette;
  const rand = rng(theme.key.length * 9973 + 12345);
  g.fillStyle(p.bg, 1);
  g.fillRect(0, 0, W, H);

  if (theme.style === 'neon') {
    // 透视网格线
    g.lineStyle(1, p.player.accent, 0.08);
    for (let x = 0; x <= W; x += 40) {
      g.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y <= H; y += 40) {
      g.lineBetween(0, y, W, y);
    }
  } else if (theme.style === 'metal') {
    // 星云软色块
    const blobs = [p.boss.accent, p.player.accent, 0x6644aa];
    for (let i = 0; i < 5; i++) {
      const cx = rand() * W;
      const cy = rand() * H;
      const r = 80 + rand() * 140;
      const col = blobs[Math.floor(rand() * blobs.length)];
      for (let j = 5; j >= 1; j--) {
        g.fillStyle(col, 0.03);
        g.fillCircle(cx, cy, (r * j) / 5);
      }
    }
  }
  g.generateTexture(key, W, H);
  g.destroy();
}

function buildStars(scene, key, theme, count, sizeMax) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const rand = rng(theme.key.length * 31 + count);
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const s = 1 + rand() * sizeMax;
    const a = 0.4 + rand() * 0.6;
    if (theme.style === 'pixel') {
      g.fillStyle(rand() > 0.7 ? theme.palette.player.body : 0xffffff, a);
      g.fillRect(x, y, s, s);
    } else {
      g.fillStyle(0xffffff, a);
      g.fillCircle(x, y, s * 0.6);
    }
  }
  g.generateTexture(key, W, H);
  g.destroy();
}

export function createBackground(scene, theme) {
  const k = theme.key;
  scene.cameras.main.setBackgroundColor(theme.palette.bg);

  const tileKey = `${k}_bgtile`;
  const farKey = `${k}_stars_far`;
  const nearKey = `${k}_stars_near`;
  if (!scene.textures.exists(tileKey)) buildTile(scene, tileKey, theme);
  if (!scene.textures.exists(farKey)) buildStars(scene, farKey, theme, 60, 1.6);
  if (!scene.textures.exists(nearKey)) buildStars(scene, nearKey, theme, 32, 2.6);

  const base = scene.add.tileSprite(W / 2, H / 2, W, H, tileKey).setDepth(DEPTH.BG);
  const far = scene.add.tileSprite(W / 2, H / 2, W, H, farKey).setDepth(DEPTH.BG_STARS).setAlpha(0.7);
  const near = scene.add.tileSprite(W / 2, H / 2, W, H, nearKey).setDepth(DEPTH.BG_STARS);

  const sp = theme.bg.scrollSpeed;
  return {
    layers: [base, far, near],
    update(delta) {
      base.tilePositionY -= sp * 0.25 * delta;
      far.tilePositionY -= sp * 0.6 * delta;
      near.tilePositionY -= sp * 1.2 * delta;
    },
    destroy() {
      base.destroy();
      far.destroy();
      near.destroy();
    }
  };
}
