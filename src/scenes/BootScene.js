// BootScene：生成全部主题的程序化纹理与占位纹理，然后进入主菜单。
import Phaser from 'phaser';
import { SCENES } from '../config/gameConfig.js';
import { generateAllTextures } from '../config/themes/index.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create() {
    // 兜底白色纹理，供子弹初始占位
    if (!this.textures.exists('__white')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 8, 8);
      g.generateTexture('__white', 8, 8);
      g.destroy();
    }

    // 为三套主题生成全部纹理
    generateAllTextures(this);

    // 移除 HTML 加载态
    const el = document.getElementById('loading');
    if (el) el.classList.add('hidden');

    this.scene.start(SCENES.MENU);
  }
}
