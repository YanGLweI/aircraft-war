// 主题注册表
import cyber from './cyberTheme.js';
import pixel from './pixelTheme.js';
import space from './spaceTheme.js';
import { generateThemeTextures } from './texKit.js';

export const THEMES = [cyber, pixel, space];
export const THEME_MAP = { cyber, pixel, space };
export const DEFAULT_THEME = 'cyber';

export function getTheme(key) {
  return THEME_MAP[key] || THEME_MAP[DEFAULT_THEME];
}

// 为所有主题生成纹理（在 BootScene 调用）
export function generateAllTextures(scene) {
  THEMES.forEach((t) => generateThemeTextures(scene, t));
}
