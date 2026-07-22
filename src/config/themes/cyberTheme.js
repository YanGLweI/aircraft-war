// 赛博霓虹主题
export default {
  key: 'cyber',
  name: '赛博霓虹',
  desc: '深空网格 · 青紫霓虹辉光',
  style: 'neon',
  palette: {
    bg: 0x05060f,
    bullet: 0x22d3ee,
    ebullet: 0xff5577,
    star: 0x66e0ff,
    player: {
      body: 0x0a2a3a, dark: 0x061620, light: 0x7fffff,
      stroke: 0x22d3ee, outline: 0x0891b2, accent: 0x22d3ee, glow: 0x22d3ee
    },
    enemy: {
      body: 0x3a0a2a, dark: 0x220617, light: 0xff9ec4,
      stroke: 0xff4d8d, outline: 0x99163f, accent: 0xff8fb0, glow: 0xff4d8d
    },
    boss: {
      body: 0x2a0a3a, dark: 0x180524, light: 0xe9d5ff,
      stroke: 0xc084fc, outline: 0x6b21a8, accent: 0xe9d5ff, glow: 0xa855f7
    }
  },
  bg: { scrollSpeed: 0.08 },
  ui: {
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    textColor: '#dffbff',
    accentColor: '#22d3ee',
    panelColor: 0x0a1424,
    panelStroke: 0x22d3ee
  }
};
