// 核心游戏场景：循环、刷怪、难度、Boss、碰撞、道具、计分。
import Phaser from 'phaser';
import { SCENES, REG, EV, DEPTH, GAME_WIDTH as W, GAME_HEIGHT as H } from '../config/gameConfig.js';
import { getTheme } from '../config/themes/index.js';
import { createBackground } from '../config/themes/background.js';
import { PLAYER, LOOT, BOSS, REVIVE } from '../config/balance.js';
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
    this.revivesUsed = 0;
    this.awaitingRevive = false;
    this.awaitingResume = false;

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
      // 鼠标/触摸：位置向指针平滑靠拢（鼠标不偏移且更跟手）
      const isTouch = pointer.wasTouch;
      const offY = isTouch ? PLAYER.touchOffsetY : 0;
      const lerp = isTouch ? PLAYER.followLerpTouch : PLAYER.followLerpMouse;
      const tx = Phaser.Math.Clamp(pointer.worldX, 20, W - 20);
      const ty = Phaser.Math.Clamp(pointer.worldY - offY, 40, H - 20);
      p.setVelocity(0, 0);
      p.x = Phaser.Math.Linear(p.x, tx, lerp);
      p.y = Phaser.Math.Linear(p.y, ty, lerp);
      return;
    }
    // 键盘：目标速度 + 平滑逐帧逐近（含松手减速），避免步幅过大
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;
    const len = Math.hypot(vx, vy) || 1;
    const targetVx = (vx / len) * PLAYER.speed * (vx || vy ? 1 : 0);
    const targetVy = (vy / len) * PLAYER.speed * (vx || vy ? 1 : 0);
    const body = p.body;
    const nvx = Phaser.Math.Linear(body.velocity.x, targetVx, PLAYER.moveLerp);
    const nvy = Phaser.Math.Linear(body.velocity.y, targetVy, PLAYER.moveLerp);
    p.setVelocity(nvx, nvy);
  }

  // ---------- 敌方射击 ----------
  enemyShoot(enemy) {
    const p = this.player;
    const aim = p && p.alive
      ? Phaser.Math.Angle.Between(enemy.x, enemy.y, p.x, p.y)
      : Math.PI / 2;
    const sp = enemy.cfg.bulletSpeed || 240;
    const x = enemy.x;
    const y = enemy.y + 10;
    switch (enemy.attack) {
      case 'spread': {
        // 以矄准角为中心的 3 发扇形（±18°）
        const d = Phaser.Math.DegToRad(18);
        this._fireEnemyBullet(x, y, aim - d, sp);
        this._fireEnemyBullet(x, y, aim, sp);
        this._fireEnemyBullet(x, y, aim + d, sp);
        break;
      }
      case 'radial': {
        // 8 发 360° 环形
        for (let i = 0; i < 8; i++) {
          this._fireEnemyBullet(x, y, (Math.PI * 2 * i) / 8, sp);
        }
        break;
      }
      case 'dual': {
        // 两发平行下落（左右偏移）
        const down = Math.PI / 2;
        this._fireEnemyBullet(x - 12, y, down, sp);
        this._fireEnemyBullet(x + 12, y, down, sp);
        break;
      }
      case 'burst': {
        // 连发 3 发矄准弹（间隔 ~120ms）
        for (let i = 0; i < 3; i++) {
          this.time.delayedCall(i * 120, () => {
            if (!enemy.active) return;
            const a = p && p.alive
              ? Phaser.Math.Angle.Between(enemy.x, enemy.y, p.x, p.y)
              : Math.PI / 2;
            this._fireEnemyBullet(enemy.x, enemy.y + 10, a, sp);
          });
        }
        break;
      }
      case 'aimed':
      default:
        this._fireEnemyBullet(x, y, aim, sp);
        break;
    }
    if (this.audio) this.audio.enemyShoot();
  }

  // 发射一发敌机子弹（按角度/速度）
  _fireEnemyBullet(x, y, angle, speed) {
    const b = this.enemyBullets.get(x, y);
    if (!b) return;
    b.fire(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
      texture: `${this.theme.key}_ebullet`,
      damage: DMG.enemyBullet,
      isEnemy: true
    });
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
    if (died) this.onPlayerDeath();
  }

  killEnemy(enemy) {
    const sizeScale = Phaser.Math.Clamp((enemy.cfg.size || 40) / 40, 0.8, 1.8);
    this.score.addKill(enemy.score, this.time.now);
    this.explode(enemy.x, enemy.y, this.theme.palette.enemy.glow, sizeScale);
    if (this.audio) this.audio.explosion();
    this.loot.maybeDrop(enemy);
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
      label = ok ? '飞机升级！' : '火力已满 +血';
      if (!ok) this.player.heal(15);
      else if (this.audio) this.audio.levelUp();
    } else if (type === 'weapon') {
      const ok = this.player.levelUp();
      label = ok ? '强化炮弹！' : '火力已满 +血';
      if (!ok) this.player.heal(15);
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
    if (this.isOver || this.awaitingRevive || this.awaitingResume) return;
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
    // 兼容旧入口：走死亡流程（可能触发复活）
    this.onPlayerDeath();
  }

  // 玩家死亡：优先提供复活，用尽后才真正结束
  onPlayerDeath() {
    if (this.isOver || this.awaitingRevive) return;
    this.spawner.setPaused(true);
    if (this.audio) {
      this.audio.stopMusic();
      this.audio.gameOver();
    }
    this.explode(this.player.x, this.player.y, this.theme.palette.player.accent, 2.2);
    this.cameras.main.shake(400, 0.014);
    this.player.setVisible(false);
    if (this.player.trail) this.player.trail.stop();

    if (this.revivesUsed < REVIVE.maxRevives) {
      // 冻结并提供复活
      this.awaitingRevive = true;
      this.physics.pause();
      this.events.emit(EV.REVIVE_OFFER, { count: this.revivesUsed });
    } else {
      this._realGameOver();
    }
  }

  // 真正结束：切到结算页
  _realGameOver() {
    if (this.isOver) return;
    this.isOver = true;
    this.awaitingRevive = false;
    this.spawner.setPaused(true);
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

  // 确认复活：恢复玩家、清场，随后进入暂停态等待“开始”
  reviveNow() {
    if (!this.awaitingRevive) return;
    this.revivesUsed += 1;
    this.awaitingRevive = false;
    const p = this.player;
    p.alive = true;
    p.hp = p.maxHp;
    p.setVisible(true);
    p.setAlpha(1);
    p.setPosition(W / 2, H - 120);
    p.setVelocity(0, 0);
    p.invulnUntil = this.time.now + REVIVE.graceMs;
    if (p.trail) p.trail.start();
    // 清场：普通敌机 + 敌方子弹（保留 Boss）
    this.enemies.children.each((e) => { if (e.active) e.deactivate(); });
    this.enemyBullets.children.each((b) => { if (b.active) b.deactivate(); });
    // 复活后暂停，等待玩家点击“开始”
    this.isPaused = true;
    this.awaitingResume = true;
    this.physics.pause();
    this.events.emit(EV.REVIVE_DONE);
  }

  // 复活后点击“开始”继续
  resumeAfterRevive() {
    this.awaitingResume = false;
    this.isPaused = false;
    this.physics.resume();
    this.spawner.setPaused(false);
    if (this.audio) this.audio.startMusic();
  }

  // 放弃复活：直接结算
  declineRevive() {
    this.awaitingRevive = false;
    this._realGameOver();
  }

  // ---------- 主循环 ----------
  update(time, delta) {
    if (this.bgCtrl) this.bgCtrl.update(delta);
    if (this.isPaused || this.isOver || this.awaitingRevive || this.awaitingResume) return;

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
