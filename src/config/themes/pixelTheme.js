// 像素复古主题
export default {
  key: 'pixel',
  name: '像素复古',
  desc: '8-bit 街机 · 硬边方块',
  style: 'pixel',
  palette: {
    bg: 0x0a0420,
    bullet: 0xffe23d,
    ebullet: 0xff5a4d,
    star: 0xffffff,
    player: {
      body: 0x3fd66b, dark: 0x1b7a3a, light: 0xd6ffe0,
      stroke: 0x0b2f16, outline: 0x0b2f16, accent: 0xffe23d, glow: 0x3fd66b
    },
    enemy: {
      body: 0xff5a4d, dark: 0x8a221a, light: 0xffd0cc,
      stroke: 0x5a0d09, outline: 0x5a0d09, accent: 0xffd23d, glow: 0xff5a4d
    },
    boss: {
      body: 0xb26bff, dark: 0x5a2e99, light: 0xe6d0ff,
      stroke: 0x2e0d5a, outline: 0x2e0d5a, accent: 0xffe23d, glow: 0xb26bff
    }
  },
  bg: { scrollSpeed: 0.1 },
  ui: {
    fontFamily: '"Courier New", monospace',
    textColor: '#fef6c9',
    accentColor: '#ffe23d',
    panelColor: 0x1a0a3a,
    panelStroke: 0xffe23d
  }
};
