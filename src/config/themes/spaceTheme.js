// 写实太空主题
export default {
  key: 'space',
  name: '写实太空',
  desc: '金属战舰 · 星云视差',
  style: 'metal',
  palette: {
    bg: 0x03040a,
    bullet: 0x88ddff,
    ebullet: 0xff7744,
    star: 0xffffff,
    player: {
      body: 0x2e4a72, dark: 0x14233c, light: 0x9fc0ef,
      stroke: 0x66ccff, outline: 0x0a1526, accent: 0x66ccff, glow: 0x66ccff
    },
    enemy: {
      body: 0x6e3a3a, dark: 0x3a1f1f, light: 0xe0a0a0,
      stroke: 0xff8855, outline: 0x1a0a0a, accent: 0xff8855, glow: 0xff8855
    },
    boss: {
      body: 0x4a3a6e, dark: 0x241a3a, light: 0xc0a0e0,
      stroke: 0xff66aa, outline: 0x120a1a, accent: 0xff66aa, glow: 0xff66aa
    }
  },
  bg: { scrollSpeed: 0.06 },
  ui: {
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    textColor: '#e6eeff',
    accentColor: '#66ccff',
    panelColor: 0x0a1024,
    panelStroke: 0x66ccff
  }
};
