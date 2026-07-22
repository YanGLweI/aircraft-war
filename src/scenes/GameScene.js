// 核心游戏场景：循环、刷怪、难度、Boss、碰撞、道具、计分。
import Phaser from 'phaser';
import { SCENES, REG, EV, DEPTH, GAME_WIDTH as W, GAME_HEIGHT as H } from '../config/gameConfig.js';
import { getTheme } from '../config/themes/index.js';
import { createBackground } from '../config/themes/background.js';
import { PLAYER, LOOT, BOSS, ENEMY_TYPES } from '../config/balance.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import Boss from '../entities/Boss.js';
import Bullet from '../entities/Bullet.js';
import PowerUp from '../entities/PowerUp.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import SpawnSystem from '../systems/SpawnSystem.js';
import DifficultySystem from '../systems/DifficultySystem.js';
import LootSystem from '../systems/LootSystem.js';
import ScoreSystem from '../systems/ScoreSystem.js';

const DMG = { enemyBody: 18, enemyBullet: 10, bossBody: 34, bossBullet: 12, playerVsEnemy: 9999 };

export default class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAME);
  }

  init(data) {
    this.themeKey = (data && data.themeKey) || this.registry.get(REG.THEME) || 'cyber';
  }

  create() {
    this.theme = getTheme(this.themeKey);
    this.audio = this.registry.get('audio');
    this.isOver = false;
    this.isPaused = false;
    this.bossActive = false;
    this.bossWave = 0;

    this.bgCtrl = createBackground(this, this.theme);

    // 物理组（对象池）
    this.playerBullets = this.physics.add.group({ classType: Bullet, maxSize: 250, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, maxSize: 300, runChildUpdate: true });
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: 60, runChildUpdate: true });
    this.powerups = this.physics.add.group({ classType: PowerUp, maxSize: 30, runChildUpdate: true });
    this.bossGroup = this.physics.add.group();

    // 玩家
    this.player = new Player(this, W / 2, H - 120, this.theme);

    // 系统
    this.weapon = new WeaponSystem(this, this.theme);
    this.difficulty = new DifficultySystem();
    this.spawner = new SpawnSystem(this, this.theme, this.difficulty);
    this.loot = new LootSystem(this, this.theme);
    this.score = new ScoreSystem();
    this.nextBossSec = BOSS.firstAtSec;

    this._setupColliders();
    this._setupInput();

    // 启动 HUD（重开时先停后启，保证状态干净）
    this.scene.stop(SCENES.UI);
    this.scene.launch(SCENES.UI, { themeKey: this.themeKey });
    this.scene.bringToTop(SCENES.UI);

    if (this.audio) this.audio.startMusic();
    this.cameras.main.fadeIn(250);

    this.events.once('shutdown', () => {
      if (this.audio) this.audio.stopMusic();
    });
  }

  _setupColliders() {
    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.playerBullets, this.bossGroup, this.onBulletHitBoss, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.bossGroup, this.onBossHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.onEnemyBulletHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.powerups, this.onGrabPowerup, null, this);
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
  }

  // ---------- 输入与移动 ----------
  handleInput() {
    const p = this.player;
    if (!p || !p.alive) return;
    const pointer = this.input.activePointer;
    if (pointer && pointer.isDown) {
      const tx = Phaser.Math.Clamp(pointer.worldX, 20, W - 20);
      const ty = Phaser.Math.Clamp(pointer.worldY - 44, 40, H - 20);
      p.setVelocity(0, 0);
      p.x = Phaser.Math.Linear(p.x, tx, 0.25);
      p.y = Phaser.Math.Linear(p.y, ty, 0.25);
      return;
    }
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;
    const len = Math.hypot(vx, vy) || 1;
    p.setVelocity((vx / len) * PLAYER.speed, (vy / len) * PLAYER.speed);
  }

  // ---------- 敌方射击 ----------
  enemyShoot(enemy) {
    const b = this.enemyBullets.get(enemy.x, enemy.y);
    if (!b) return;
    const p = this.player;
    const ang = p && p.alive ? Phaser.Math.Angle.Between(enemy.x, enemy.y, p.x, p.y) : Math.PI / 2;
    const sp = 240;
    b.fire(enemy.x, enemy.y + 10, Math.cos(ang) * sp, Math.sin(ang) * sp, {
      texture: `${this.theme.key}_ebullet`,
      damage: DMG.enemyBullet,
      isEnemy: true
    });
    if (this.audio) this.audio.enemyShoot();
  }

  spawnBossBullet(x, y, vx, vy) {
    const b = this.enemyBullets.get(x, y);
    if (!b) return;
    b.fire(x, y, vx, vy, {
      texture: `${this.theme.key}_ebullet`,
      damage: DMG.bossBullet,
      isEnemy: true,
      tint: this.theme.palette.boss.accent
    });
  }

  getNearestEnemy(x, y) {
    let best = null;
    let bestD = Infinity;
    this.enemies.children.each((e) => {
      if (!e.active) return;
      const d = Phaser.Math.Distance.Squared(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    });
    if (this.boss && this.boss.active) {
      const d = Phaser.Math.Distance.Squared(x, y, this.boss.x, this.boss.y);
      if (d < bestD) best = this.boss;
    }
    return best;
  }

  // ---------- 碰撞回调 ----------
  onBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.deactivate();
    const dead = enemy.takeDamage(bullet.damage);
    if (this.audio) this.audio.hit();
    if (dead) this.killEnemy(enemy);
  }

  onBulletHitBoss(bullet, boss) {
    if (!bullet.active || !boss.active) return;
    bullet.deactivate();
    const dead = boss.takeDamage(bullet.damage);
    if (this.audio) this.audio.hit();
    if (dead) this.killBoss(boss);
  }

  onEnemyHitPlayer(player, enemy) {
    if (!enemy.active || !player.alive) return;
    this.explode(enemy.x, enemy.y, this.theme.palette.enemy.glow, 1);
    enemy.deactivate();
    this.damagePlayer(DMG.enemyBody);
  }

  onBossHitPlayer(player, boss) {
    if (!boss.active || !player.alive) return;
    this.damagePlayer(DMG.bossBody);
  }

  onEnemyBulletHitPlayer(player, bullet) {
    if (!bullet.active || !player.alive) return;
    bullet.deactivate();
    this.damagePlayer(bullet.damage);
  }

  onGrabPowerup(player, pu) {
    if (!pu.active) return;
    const type = pu.puType;
    pu.deactivate();
    this.applyPowerup(type);
  }

  // ---------- 效果 ----------
  damagePlayer(amount) {
    const now = this.time.now;
    const died = this.player.takeDamage(amount, now);
    if (this.player.shieldActive(now) || this.player.isInvulnerable(now - 1)) {
      // 被护盾/无敌吸收时不强烈反馈
    }
    this.cameras.main.shake(120, 0.006);
    if (this.audio) this.audio.hit();
    if (died) this.gameOver();
  }

  killEnemy(enemy) {
    const isElite = enemy.enemyType === 'elite';
    this.score.addKill(enemy.score, this.time.now);
    this.explode(enemy.x, enemy.y, this.theme.palette.enemy.glow, isElite ? 1.6 : 1);
    if (this.audio) this.audio.explosion();
    this.loot.maybeDrop(enemy.x, enemy.y, isElite);
    enemy.deactivate();
  }

  killBoss(boss) {
    this.score.addRaw(boss.score);
    this.bossActive = false;
    this.boss = null;
    // 连环爆炸
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 70, () => {
        this.explode(
          boss.x + Phaser.Math.Between(-50, 50),
          boss.y + Phaser.Math.Between(-40, 40),
          this.theme.palette.boss.glow,
          1.4
        );
      });
    }
    if (this.audio) this.audio.bossExplosion();
    this.cameras.main.shake(500, 0.012);
    this.loot.dropMany(boss.x, boss.y, 4);
    boss.destroy();
    this.events.emit(EV.BOSS_DEAD);
    // 下一波 Boss 计时 + 难度抬升
    this.nextBossSec = this.difficulty.elapsedSec + BOSS.intervalSec;
    this.spawner.setPaused(false);
  }

  explode(x, y, color, scale = 1) {
    const p = this.add.particles(x, y, `${this.theme.key}_spark`, {
      speed: { min: 60, max: 240 * scale },
      lifespan: 420,
      scale: { start: 0.9 * scale, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: color,
      blendMode: this.theme.style === 'pixel' ? 'NORMAL' : 'ADD',
      emitting: false
    });
    p.setDepth(DEPTH.PARTICLE);
    p.explode(Math.round(14 * scale));
    this.time.delayedCall(500, () => p.destroy());
  }

  applyPowerup(type) {
    if (this.audio) this.audio.pickup();
    let label = '';
    if (type === 'upgrade') {
      const ok = this.player.levelUp();
      label = ok ? '飞机升级！' : '火力已满 +分';
      if (!ok) this.score.addRaw(300);
      else if (this.audio) this.audio.levelUp();
    } else if (type === 'weapon') {
      const ok = this.player.levelUp();
      label = ok ? '强化炮弹！' : '火力已满 +分';
      if (!ok) this.score.addRaw(300);
    } else if (type === 'heal') {
      this.player.heal(LOOT.healAmount);
      label = `回血 +${LOOT.healAmount}`;
    } else if (type === 'shield') {
      this.player.addShield(LOOT.shieldMs, LOOT.shieldHits);
      label = '护盾展开！';
    }
    this.events.emit(EV.PICKUP, { type, label });
  }

  // ---------- Boss ----------
  spawnBoss() {
    this.bossWave += 1;
    this.bossActive = true;
    this.spawner.setPaused(true);
    const hp = BOSS.baseHp + (this.bossWave - 1) * BOSS.hpGrowthPerWave;
    this.boss = new Boss(this, this.theme, hp);
    this.bossGroup.add(this.boss);
    if (this.audio) this.audio.bossWarn();
    this.events.emit(EV.BOSS_SPAWN, { maxHp: hp, wave: this.bossWave });
  }

  onBossHp(ratio) {
    this.events.emit(EV.BOSS_HP, ratio);
  }

  // ---------- 暂停 / 结束 ----------
  togglePause() {
    if (this.isOver) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      if (this.audio) this.audio.stopMusic();
    } else {
      this.physics.resume();
      if (this.audio) this.audio.startMusic();
    }
    this.events.emit('pause', this.isPaused);
  }

  restartGame() {
    if (this.audio) this.audio.stopMusic();
    this.isPaused = false;
    this.physics.resume();
    this.scene.restart({ themeKey: this.themeKey });
  }

  quitToMenu() {
    if (this.audio) this.audio.stopMusic();
    this.physics.resume();
    this.scene.stop(SCENES.UI);
    this.scene.start(SCENES.MENU);
  }

  gameOver() {
    if (this.isOver) return;
    this.isOver = true;
    this.spawner.setPaused(true);
    if (this.audio) {
      this.audio.stopMusic();
      this.audio.gameOver();
    }
    this.explode(this.player.x, this.player.y, this.theme.palette.player.accent, 2.2);
    this.cameras.main.shake(400, 0.014);
    this.player.setVisible(false);
    if (this.player.trail) this.player.trail.stop();
    this.events.emit(EV.GAME_OVER);

    this.time.delayedCall(1200, () => {
      this.scene.stop(SCENES.UI);
      this.scene.start(SCENES.GAMEOVER, {
        score: this.score.score,
        wave: this.bossWave,
        themeKey: this.themeKey
      });
    });
  }

  // ---------- 主循环 ----------
  update(time, delta) {
    if (this.bgCtrl) this.bgCtrl.update(delta);
    if (this.isPaused || this.isOver) return;

    this.handleInput();

    // 自动开火
    if (this.player.alive && this.player.tryFire(time)) {
      this.weapon.fire(this.player);
    }

    // 难度与计分
    this.difficulty.update(delta, this.score.score);
    this.score.update(delta, time);

    // 刷怪
    this.spawner.update(time);

    // Boss 触发
    if (!this.bossActive && this.difficulty.elapsedSec >= this.nextBossSec) {
      this.spawnBoss();
    }
  }
}
