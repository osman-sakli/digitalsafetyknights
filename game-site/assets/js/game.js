/* Knight's Duel: The Game — endless-runner rebuild
   3-lane dodge + jump, Subway Surfers/Temple Run style. Informative, not
   combat: obstacles are real online threats to dodge/jump, coins carry
   safety facts shown as toasts at distance milestones. Self-hosted
   Phaser 3 (no CDN). Same subdomain/infra as before. */

// ---------- language ----------
var GLang = (navigator.language || 'en').slice(0, 2);
if (GLang !== 'tr' && GLang !== 'es') GLang = 'en';
var GIsTr = GLang === 'tr';
var GIsEs = GLang === 'es';

var STR = GIsTr ? {
  tagline: 'Şövalyen dijital dünyada sonsuz koşuyor! Şeritler arasında geç, engellerden atla, altınları topla.',
  namePlaceholder: 'Şövalye adın', start: '🏃 Koşuya Başla',
  gameOverTitle: 'Yakalandın!', save: '⬇️ Skor Kartını Kaydet', home: '🏠 Ana Sayfaya Dön',
  playAgain: '🏃 Tekrar Koş',
  controlsDesktop: 'Şerit değiştir: ← →  ·  Zıpla: ↑ / SPACE',
  controlsMobile: 'Sağa/sola kaydır: şerit değiştir  ·  Yukarı kaydır: zıpla',
  scoreLabel: 'SKOR', bestLabel: 'REKOR', shieldLabel: 'KALKAN',
  zoneScam: 'Dolandırıcı Sokağı', zoneStranger: 'Yabancı Ormanı', zoneAi: 'Yapay Zeka Sisi', zonePrivacy: 'Gizlilik Tepeleri',
  zoneEnter: 'BÖLGE {n}', shieldGot: '🛡️ Kalkan alındı! Bir darbeyi durdurur.', shieldUsed: '🛡️ Kalkan seni korudu!',
  tip1: 'Bilgi: "HEMEN tıkla, süre doluyor!" gibi acele ettiren mesajlar klasik bir hile — gerçek fırsatlar seni acele ettirmez.',
  tip2: 'Bilgi: Gerçek adını, okulunu ya da adresini asla internette tanımadığın biriyle paylaşma.',
  tip3: 'Bilgi: Bir "arkadaş" senden bunu ailenden saklamanı isterse, bu kırmızı bayrağın kendisidir.',
  tip4: 'Bilgi: Mavi tik/onay işareti sahte olabilir — biriyle davranışlarına göre güven, rozetine göre değil.',
  tip5: 'Bilgi: "Kaybolan" mesajlar bile ekran görüntüsüyle saklanabilir — göndermeden önce düşün.'
} : GIsEs ? {
  tagline: '¡Tu Caballero corre sin parar por el mundo digital! Cambia de carril, salta obstáculos, junta monedas.',
  namePlaceholder: 'Tu nombre de Caballero', start: '🏃 Comenzar a Correr',
  gameOverTitle: '¡Te Atraparon!', save: '⬇️ Guardar Tarjeta', home: '🏠 Volver al Inicio',
  playAgain: '🏃 Correr de Nuevo',
  controlsDesktop: 'Cambiar carril: ← →  ·  Saltar: ↑ / ESPACIO',
  controlsMobile: 'Desliza izq/der: cambiar carril  ·  Desliza arriba: saltar',
  scoreLabel: 'PUNTOS', bestLabel: 'RÉCORD', shieldLabel: 'ESCUDO',
  zoneScam: 'Callejón de Estafas', zoneStranger: 'Bosque de Extraños', zoneAi: 'Niebla de IA', zonePrivacy: 'Cumbres de Privacidad',
  zoneEnter: 'ZONA {n}', shieldGot: '🛡️ ¡Escudo obtenido! Bloquea un golpe.', shieldUsed: '🛡️ ¡El escudo te protegió!',
  tip1: 'Dato: mensajes que apuran ("¡haz clic YA, se acaba el tiempo!") son un truco clásico — las oportunidades reales no te apresuran.',
  tip2: 'Dato: nunca compartas tu nombre real, escuela o dirección con alguien que no conoces en línea.',
  tip3: 'Dato: si un "amigo" te pide ocultar algo de tus padres, esa es la señal de alerta.',
  tip4: 'Dato: la marca de verificación azul puede ser falsa — confía según el comportamiento, no la insignia.',
  tip5: 'Dato: hasta los mensajes que "desaparecen" se pueden guardar con una captura — piensa antes de enviar.'
} : {
  tagline: "Your Knight is on an endless run through the digital world! Switch lanes, jump obstacles, collect coins.",
  namePlaceholder: 'Your Knight name', start: '🏃 Start Running',
  gameOverTitle: 'Caught!', save: '⬇️ Save Score Card', home: '🏠 Back Home',
  playAgain: '🏃 Run Again',
  controlsDesktop: 'Switch lane: ← →  ·  Jump: ↑ / SPACE',
  controlsMobile: 'Swipe left/right: switch lane  ·  Swipe up: jump',
  scoreLabel: 'SCORE', bestLabel: 'BEST', shieldLabel: 'SHIELD',
  zoneScam: 'Scam Alley', zoneStranger: 'Stranger Woods', zoneAi: 'AI Fog', zonePrivacy: 'Privacy Peaks',
  zoneEnter: 'ZONE {n}', shieldGot: '🛡️ Shield picked up! Blocks one hit.', shieldUsed: '🛡️ Your shield saved you!',
  tip1: 'Fact: rush messages ("click NOW, time is running out!") are a classic trick — real opportunities never rush you.',
  tip2: "Fact: never share your real name, school, or address with someone you don't know online.",
  tip3: "Fact: if a \"friend\" asks you to hide something from your parents, that's the red flag itself.",
  tip4: "Fact: a blue checkmark can be faked — trust behavior over badges.",
  tip5: 'Fact: even "disappearing" messages can be saved with a screenshot — think before you send.'
};

document.getElementById('ov-tagline').textContent = STR.tagline;
document.getElementById('nickname-input').placeholder = STR.namePlaceholder;
document.getElementById('start-btn').textContent = STR.start;
document.getElementById('download-btn').textContent = STR.save;
document.getElementById('victory-home').textContent = STR.home;

var isTouch = 'ontouchstart' in window;
document.getElementById('controls-hint').textContent = isTouch ? STR.controlsMobile : STR.controlsDesktop;

var nickname = localStorage.getItem('dsk_nickname') || '';
if (nickname) document.getElementById('nickname-input').value = nickname;

// ---------- shared knight-points-lite (own origin for now) ----------
var LEVELS = [
  { name: 'Squire', emoji: '🪖', min: 0 },
  { name: 'Knight', emoji: '⚔️', min: 100 },
  { name: 'Sentinel', emoji: '🛡️', min: 250 },
  { name: 'Champion', emoji: '👑', min: 500 }
];
function getPoints() { return parseInt(localStorage.getItem('dsk_knight_points') || '0', 10); }
function addPoints(n) {
  var total = getPoints() + n;
  localStorage.setItem('dsk_knight_points', String(total));
  return total;
}
function levelFor(points) {
  var cur = LEVELS[0];
  for (var i = 0; i < LEVELS.length; i++) { if (points >= LEVELS[i].min) cur = LEVELS[i]; }
  return cur;
}
function getHighScore() { return parseInt(localStorage.getItem('dsk_runner_highscore') || '0', 10); }
function setHighScore(n) { localStorage.setItem('dsk_runner_highscore', String(n)); }

// ---------- toast ----------
function showToast(text) {
  var el = document.getElementById('kd-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'kd-toast';
    el.style.cssText = 'position:fixed;top:90px;left:50%;transform:translateX(-50%);background:#0d1b3e;color:#e8c56a;padding:11px 20px;border-radius:18px;font-weight:800;font-size:0.8rem;max-width:86vw;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.4);z-index:50;border:2px solid #c9a84c;opacity:0;transition:opacity 0.3s;';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.style.opacity = '0'; }, 2800);
}

// ---------- game constants ----------
var GAME_W = 500, GAME_H = 800;
var LANE_X = [GAME_W * 0.25, GAME_W * 0.5, GAME_W * 0.75];
var PLAYER_Y = GAME_H - 150;
var MAX_LIVES = 3;
var TIPS = [STR.tip1, STR.tip2, STR.tip3, STR.tip4, STR.tip5];

// Each zone is a real threat category, with its own look, obstacle mix and
// facts — so the run teaches something different as it goes rather than
// repeating one generic level. Zones advance every ZONE_SPAN points and
// cycle once the last one is cleared, getting harder each lap.
var ZONE_SPAN = 150;
var ZONES = [
  { key: 'scam',    bg: '#132552', accent: 0xe63946, icon: '⚠️',  monster: 0.15, tips: [STR.tip1, STR.tip4] },
  { key: 'stranger',bg: '#12331f', accent: 0xd06035, icon: '🚩',  monster: 0.42, tips: [STR.tip2, STR.tip3] },
  { key: 'ai',      bg: '#2a1840', accent: 0x8a5fbf, icon: '🤖',  monster: 0.30, tips: [STR.tip4, STR.tip5] },
  { key: 'privacy', bg: '#0f2f33', accent: 0x2a9d8f, icon: '🔒',  monster: 0.22, tips: [STR.tip2, STR.tip5] }
];

var runActive = false;
var score = 0;
var lives = MAX_LIVES;
var lastTipScore = 0;
var zoneIndex = 0;
var lap = 0;
var hasShield = false;

function resetRunState() {
  runActive = true;
  score = 0;
  lives = MAX_LIVES;
  lastTipScore = 0;
  zoneIndex = 0;
  lap = 0;
  hasShield = false;
}

function zoneForScore(s) { return Math.floor(s / ZONE_SPAN); }

// A proper ES6 class extending Phaser.Scene — custom methods on a plain
// object-literal scene silently don't attach in this Phaser build
// (learned the hard way on the previous build of this game), a class
// guarantees every method lands on the prototype.
class RunnerScene extends Phaser.Scene {
  constructor() { super('runner'); }

  preload() {
    this.load.image('shieldy', 'assets/characters/shieldy-cutout.png');
    this.load.image('glitch', 'assets/characters/glitch-cutout.png');
  }

  create() {
    this.cameras.main.setBackgroundColor('#132552');

    // lane guide lines
    var g = this.add.graphics();
    g.lineStyle(3, 0x2a3d6e, 0.6);
    for (var i = 0; i < LANE_X.length; i++) {
      g.lineBetween(LANE_X[i], 0, LANE_X[i], GAME_H);
    }

    this.currentLane = 1;
    this.player = this.physics.add.sprite(LANE_X[1], PLAYER_Y, 'shieldy');
    this.player.setDisplaySize(90, 161);
    this.playerBaseY = PLAYER_Y;
    this.isJumping = false;

    this.obstacles = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.shields = this.physics.add.group();

    this.speed = 260;
    this.spawnTimer = 0;
    this.spawnInterval = 1100;
    this.elapsed = 0;

    // HUD
    this.scoreText = this.add.text(20, 52, STR.scoreLabel + ': 0', { fontFamily: 'Arial', fontSize: '20px', fontStyle: '900', color: '#e8c56a' });
    this.bestText = this.add.text(20, 80, STR.bestLabel + ': ' + getHighScore(), { fontFamily: 'Arial', fontSize: '14px', fontStyle: '700', color: '#8899bb' });
    this.hearts = [];
    for (var h = 0; h < MAX_LIVES; h++) {
      this.hearts.push(this.add.text(GAME_W - 40 - h * 34, 56, '❤️', { fontSize: '22px' }));
    }
    this.zoneText = this.add.text(20, 104, '', { fontFamily: 'Arial', fontSize: '13px', fontStyle: '900', color: '#ffffff' }).setAlpha(0.85);
    this.shieldIcon = this.add.text(GAME_W - 40, 90, '🛡️', { fontSize: '20px' }).setAlpha(0.18);
    this.lastZoneStep = -1;

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('A,D,W,SPACE');
    this.lastLaneSwitch = 0;

    if (isTouch) this.setupSwipe();

    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.shields, this.collectShield, null, this);

    resetRunState();
    this.updateHud();
    this.checkZone();
  }

  setupSwipe() {
    var g = this;
    var startX = 0, startY = 0;
    this.input.on('pointerdown', function (p) { startX = p.x; startY = p.y; });
    this.input.on('pointerup', function (p) {
      var dx = p.x - startX, dy = p.y - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        g.switchLane(dx > 0 ? 1 : -1);
      } else if (dy < -30) {
        g.jump();
      }
    });
  }

  switchLane(dir) {
    var now = this.time.now;
    if (now - this.lastLaneSwitch < 180) return;
    var next = Phaser.Math.Clamp(this.currentLane + dir, 0, LANE_X.length - 1);
    if (next === this.currentLane) return;
    this.currentLane = next;
    this.lastLaneSwitch = now;
    this.tweens.add({ targets: this.player, x: LANE_X[next], duration: 150, ease: 'Power1' });
  }

  jump() {
    if (this.isJumping) return;
    this.isJumping = true;
    this.tweens.add({
      targets: this.player, y: this.playerBaseY - 130, duration: 260, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { this.isJumping = false; }
    });
  }

  hitObstacle(player, obstacle) {
    if (!runActive || obstacle.hit || (this.isJumping && obstacle.getData('jumpable'))) return;
    obstacle.hit = true;
    obstacle.destroy();
    if (hasShield) {
      hasShield = false;
      this.updateHud();
      this.cameras.main.flash(180, 42, 157, 143);
      showToast(STR.shieldUsed);
      return;
    }
    lives--;
    this.updateHud();
    this.cameras.main.shake(180, 0.01);
    this.player.setTint(0xff4444);
    this.time.delayedCall(150, () => this.player.clearTint());
    if (lives <= 0) this.endRun();
  }

  collectCoin(player, coin) {
    if (!runActive || coin.hit) return;
    coin.hit = true;
    coin.destroy();
    score += 10;
    this.updateHud();
    this.checkZone();
    this.maybeShowTip();
  }

  maybeShowTip() {
    if (score - lastTipScore >= 100) {
      lastTipScore = score;
      var tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      showToast(tip);
    }
  }

  updateHud() {
    this.scoreText.setText(STR.scoreLabel + ': ' + score);
    for (var i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setAlpha(i < lives ? 1 : 0.15);
    }
    if (this.shieldIcon) this.shieldIcon.setAlpha(hasShield ? 1 : 0.18);
  }

  spawnRow() {
    var zone = ZONES[zoneIndex % ZONES.length];
    var lane = Phaser.Math.Between(0, 2);
    var kind = Math.random();

    if (kind < zone.monster) {
      // themed creature blocker — must switch lanes
      var monster = this.physics.add.sprite(LANE_X[lane], -60, 'glitch');
      monster.setDisplaySize(70, 125);
      monster.setTint(zone.accent);
      monster.body.setVelocityY(this.speed);
      monster.body.setImmovable(true);
      monster.setData('jumpable', false);
      this.obstacles.add(monster);
    } else if (kind < zone.monster + 0.35) {
      // low hurdle — jumpable
      var hurdle = this.add.rectangle(LANE_X[lane], -40, 70, 26, 0xc9a84c, 0.9).setStrokeStyle(2, 0xffffff, 0.4);
      this.physics.add.existing(hurdle);
      hurdle.body.setVelocityY(this.speed);
      hurdle.body.setImmovable(true);
      hurdle.setData('jumpable', true);
      this.obstacles.add(hurdle);
    } else {
      // full-lane blocker, badged with the zone's threat icon. Rect + icon
      // live in one Container so the icon travels and is destroyed with the
      // obstacle — a detached label would leak one object per spawn.
      var block = this.add.container(LANE_X[lane], -40, [
        this.add.rectangle(0, 0, 80, 70, zone.accent, 0.85).setStrokeStyle(3, 0xffffff, 0.5),
        this.add.text(0, 0, zone.icon, { fontSize: '26px' }).setOrigin(0.5)
      ]);
      this.physics.add.existing(block);
      block.body.setSize(80, 70);
      block.body.setVelocityY(this.speed);
      block.body.setImmovable(true);
      block.setData('jumpable', false);
      this.obstacles.add(block);
    }

    // coin row in a different lane sometimes
    if (Math.random() < 0.6) {
      var coinLane = (lane + 1 + Phaser.Math.Between(0, 1)) % 3;
      for (var c = 0; c < 3; c++) {
        var coin = this.add.circle(LANE_X[coinLane], -40 - c * 50, 12, 0xe8c56a).setStrokeStyle(2, 0xffffff, 0.6);
        this.physics.add.existing(coin);
        coin.body.setVelocityY(this.speed);
        this.coins.add(coin);
      }
    }

    // occasional shield pickup, always in a lane the obstacle isn't in
    if (!hasShield && Math.random() < 0.12) {
      var sLane = (lane + 1 + Phaser.Math.Between(0, 1)) % 3;
      var orb = this.add.container(LANE_X[sLane], -120, [
        this.add.circle(0, 0, 17, 0x2a9d8f, 0.9).setStrokeStyle(3, 0xe8c56a),
        this.add.text(0, 0, '🛡️', { fontSize: '19px' }).setOrigin(0.5)
      ]);
      this.physics.add.existing(orb);
      orb.body.setSize(34, 34);
      orb.body.setVelocityY(this.speed);
      this.shields.add(orb);
    }
  }

  collectShield(player, orb) {
    if (!runActive || orb.hit) return;
    orb.hit = true;
    orb.destroy();
    hasShield = true;
    this.updateHud();
    showToast(STR.shieldGot);
  }

  checkZone() {
    var z = zoneForScore(score);
    if (z === this.lastZoneStep) return;
    this.lastZoneStep = z;
    zoneIndex = z % ZONES.length;
    lap = Math.floor(z / ZONES.length);
    var zone = ZONES[zoneIndex];

    this.cameras.main.setBackgroundColor(zone.bg);
    this.zoneText.setText(this.zoneName(zone.key));
    this.showZoneBanner(z + 1, this.zoneName(zone.key));
    // Each new zone leads with one of its own facts.
    showToast(zone.tips[Math.floor(Math.random() * zone.tips.length)]);
  }

  zoneName(key) {
    return key === 'scam' ? STR.zoneScam
      : key === 'stranger' ? STR.zoneStranger
      : key === 'ai' ? STR.zoneAi
      : STR.zonePrivacy;
  }

  showZoneBanner(num, name) {
    var label = STR.zoneEnter.replace('{n}', num);
    var banner = this.add.container(GAME_W / 2, GAME_H * 0.42, [
      this.add.rectangle(0, 0, 340, 92, 0x000000, 0.62).setStrokeStyle(2, 0xe8c56a),
      this.add.text(0, -20, label, { fontFamily: 'Arial', fontSize: '15px', fontStyle: '900', color: '#e8c56a' }).setOrigin(0.5),
      this.add.text(0, 12, name, { fontFamily: 'Arial', fontSize: '23px', fontStyle: '900', color: '#ffffff' }).setOrigin(0.5)
    ]).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 260, yoyo: true, hold: 1100,
      onComplete: function () { banner.destroy(); } });
  }

  endRun() {
    if (!runActive) return;
    runActive = false;
    this.physics.pause();
    var best = getHighScore();
    if (score > best) { setHighScore(score); best = score; }
    var earned = Math.max(5, Math.floor(score / 5));
    addPoints(earned);
    window.dispatchEvent(new CustomEvent('kd-run-end', { detail: { score: score, best: best } }));
  }

  update(time, delta) {
    if (!runActive) return;
    this.elapsed += delta;
    // Speed ramps with time, plus a step per completed lap of all zones.
    this.speed = 260 + Math.min(260, this.elapsed / 25) + lap * 40;
    this.spawnInterval = Math.max(480, 1100 - this.elapsed / 40 - lap * 60);

    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnRow();
    }

    this.obstacles.children.each(function (o) {
      if (o.body) o.body.setVelocityY(this.speed);
      if (o.y > GAME_H + 80) o.destroy();
    }, this);
    this.coins.children.each(function (c) {
      if (c.body) c.body.setVelocityY(this.speed);
      if (c.y > GAME_H + 80) c.destroy();
    }, this);
    this.shields.children.each(function (o) {
      if (o.body) o.body.setVelocityY(this.speed);
      if (o.y > GAME_H + 80) o.destroy();
    }, this);

    if (this.cursors.left.isDown || this.wasd.A.isDown) this.switchLane(-1);
    if (this.cursors.right.isDown || this.wasd.D.isDown) this.switchLane(1);
    if (Phaser.Input.Keyboard.JustDown(this.wasd.SPACE) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.jump();
  }
}

var gameConfig = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#0a1122',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: RunnerScene
};

var phaserGame = null;

function startBattle() {
  var input = document.getElementById('nickname-input');
  var n = input.value.trim();
  if (n.length < 2) {
    input.style.borderColor = '#e63946';
    input.placeholder = GIsTr ? 'Önce bir isim gir!' : GIsEs ? '¡Ingresa un nombre primero!' : 'Enter a name first!';
    input.focus();
    input.classList.remove('shake-error'); void input.offsetWidth; input.classList.add('shake-error');
    return;
  }
  input.style.borderColor = '';
  nickname = n;
  localStorage.setItem('dsk_nickname', nickname);

  document.getElementById('overlay').classList.remove('show');
  if (!phaserGame) {
    phaserGame = new Phaser.Game(gameConfig);
  } else {
    phaserGame.scene.scenes[0].scene.restart();
  }
}

window.addEventListener('kd-run-end', function (e) {
  document.getElementById('ov-intro').style.display = 'none';
  document.getElementById('ov-victory').style.display = 'block';
  document.getElementById('victory-title').textContent = STR.gameOverTitle;
  document.getElementById('victory-sub').textContent = STR.scoreLabel + ': ' + e.detail.score + '  ·  ' + STR.bestLabel + ': ' + e.detail.best;
  document.getElementById('overlay').classList.add('show');
  renderResultCard(e.detail.score, e.detail.best);
});

document.getElementById('start-btn').addEventListener('click', startBattle);
document.getElementById('nickname-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') startBattle(); });
document.getElementById('victory-home').addEventListener('click', function () {
  window.location.href = 'https://digitalsafetyknights.org';
});
document.getElementById('download-btn').addEventListener('click', function () {
  var canvas = document.getElementById('result-canvas');
  var link = document.createElement('a');
  link.download = 'knight-run-score.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// re-run button reuses the victory overlay's structure — wire a play-again action
(function addPlayAgainButton() {
  var btn = document.createElement('button');
  btn.className = 'btn-ghost';
  btn.id = 'play-again-btn';
  btn.textContent = STR.playAgain;
  btn.addEventListener('click', function () {
    document.getElementById('overlay').classList.remove('show');
    startBattle();
  });
  document.getElementById('ov-victory').appendChild(btn);
})();

function renderResultCard(finalScore, best) {
  var canvas = document.getElementById('result-canvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a2f6e');
  grad.addColorStop(1, '#0d1b3e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c56a';
  ctx.font = '900 22px Arial';
  ctx.fillText('DIGITAL SAFETY KNIGHTS', W / 2, 80);

  ctx.font = '900 34px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(GIsTr ? 'ŞÖVALYE KOŞUSU' : GIsEs ? 'CARRERA DE CABALLERO' : "KNIGHT'S RUN", W / 2, 150);

  ctx.font = '80px Arial';
  ctx.fillText('🏃‍♂️⚔️', W / 2, 300);

  var level = levelFor(getPoints());
  ctx.font = '55px Arial';
  ctx.fillText(level.emoji, W / 2, 385);

  ctx.font = '900 28px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nickname, W / 2, 430);

  ctx.font = '700 22px Arial';
  ctx.fillStyle = '#e8c56a';
  ctx.fillText(STR.scoreLabel + ': ' + finalScore + '   ' + STR.bestLabel + ': ' + best, W / 2, 470);

  ctx.font = '600 16px Arial';
  ctx.fillStyle = '#8899bb';
  ctx.fillText('play.digitalsafetyknights.org', W / 2, 560);
}
