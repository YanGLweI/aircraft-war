// 武器系统：根据玩家等级的弹型生成子弹。
import { WEAPON_LEVELS, MAX_LEVEL } from '../config/balance.js';

const UP = -1; // 向上

export default class WeaponSystem {
  constructor(scene, theme) {
    this.scene = scene;
    this.theme = theme;
    this.bulletTex = `${theme.key}_bullet`;
  }

  fire(player) {
    const w = WEAPON_LEVELS[Math.min(player.level, MAX_LEVEL) - 1];
    const x = player.x;
    const y = player.y - player.displayHeight / 2;
    const dmg = w.damage;
    const speed = 560;
    const shots = [];

    switch (w.pattern) {
      case 'single':
        shots.push([x, y, 0, UP * speed]);
        break;
      case 'double':
        shots.push([x - 10, y, 0, UP * speed], [x + 10, y, 0, UP * speed]);
        break;
      case 'triple':
        shots.push(
          [x, y, 0, UP * speed],
          [x - 12, y, -120, UP * speed],
          [x + 12, y, 120, UP * speed]
        );
        break;
      case 'penta':
        shots.push(
          [x, y, 0, UP * speed],
          [x - 12, y, -120, UP * speed],
          [x + 12, y, 120, UP * speed],
          [x - 18, y, -240, UP * speed * 0.9],
          [x + 18, y, 240, UP * speed * 0.9]
        );
        break;
      case 'homing':
        this._homing(x - 14, y, dmg, speed);
        this._homing(x + 14, y, dmg, speed);
        shots.push([x, y, 0, UP * speed]);
        break;
      default:
        shots.push([x, y, 0, UP * speed]);
    }

    shots.forEach(([bx, by, vx, vy]) => {
      const b = this.scene.playerBullets.get(bx, by);
      if (b) b.fire(bx, by, vx, vy, { texture: this.bulletTex, damage: dmg });
    });

    if (this.scene.audio) this.scene.audio.shoot();
  }

  _homing(x, y, dmg, speed) {
    const b = this.scene.playerBullets.get(x, y);
    if (b) b.fire(x, y, 0, UP * speed, { texture: this.bulletTex, damage: dmg, homing: true, speed });
  }
}
