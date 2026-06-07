import { BaseGameScene } from './BaseGameScene.js';

// ─────────────────────────────────────────────────────────────────────────────
//  Pac-Man  –  klassisk labyrintjakt för barn
//  Samla all mat för att vinna.  Ät körsbäret så flyr spöket i 8 sekunder.
//  3 liv.  Spöket försöker hela tiden ta sig till Pac-Man.
// ─────────────────────────────────────────────────────────────────────────────
export class PacManGame extends BaseGameScene
{
    constructor () { super('PacManGame'); }

    // ─────────────────────────────────────────────────────────────────────────
    preload ()
    {
        this.load.image('pac_right',  'assets/pacman_right.png');
        this.load.image('pac_left',   'assets/pacman_left.png');
        this.load.image('pac_up',     'assets/pacman_up.png');
        this.load.image('pac_down',   'assets/pacman_down.png');
        this.load.image('pac_closed', 'assets/pacman_closed.png');
        this.load.image('ghost',      'assets/blueGhost.png');
        this.load.image('pellet',     'assets/foodPellet.png');
        this.load.image('cherry',     'assets/cherry.png');
    }

    // ─────────────────────────────────────────────────────────────────────────
    create ()
    {
        this.ensureSparkTexture();

        // ── Rutnätskonstanter ─────────────────────────────────────────────
        this.CELL = 46;
        this.COLS = 13;
        this.ROWS = 11;
        this.OX   = Math.floor((1024 - this.COLS * this.CELL) / 2); // 213
        this.OY   = 62;

        // ── Labyrintkarta ─────────────────────────────────────────────────
        //  # = vägg   . = mat   P = Pac-Man start   G = spöke start
        const MAP = [
            '#############',
            '#.....#.....#',
            '#.##.....##.#',
            '#.#.......#.#',
            '#.##.....##.#',
            '#...P...G...#',
            '#.##.....##.#',
            '#.#.......#.#',
            '#.##.....##.#',
            '#.....#.....#',
            '#############'
        ];

        // Bygg rutnät: 0=vägg 1=mat 2=tom
        this.grid        = [];
        this.PAC_START   = null;
        this.GHOST_START = null;
        this.CHERRY_POS  = { col: 6, row: 5 };   // mittcellen

        for (let r = 0; r < this.ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.COLS; c++) {
                const ch = MAP[r][c];
                if      (ch === '#') { this.grid[r][c] = 0; }
                else if (ch === '.') { this.grid[r][c] = 1; }
                else if (ch === 'P') { this.grid[r][c] = 2; this.PAC_START   = { col: c, row: r }; }
                else if (ch === 'G') { this.grid[r][c] = 2; this.GHOST_START = { col: c, row: r }; }
                else                 { this.grid[r][c] = 2; }
            }
        }

        this.totalPellets = this.grid.reduce((s, row) => s + row.filter(v => v === 1).length, 0);
        this.pelletsLeft  = this.totalPellets;

        // ── Bakgrund ──────────────────────────────────────────────────────
        this.add.graphics().fillStyle(0x000022, 1).fillRect(0, 0, 1024, 768);

        // ── Väggar ────────────────────────────────────────────────────────
        const wg = this.add.graphics();
        wg.fillStyle(0x1a1aff, 1);
        wg.lineStyle(2, 0x5555ff, 1);
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.grid[r][c] === 0) {
                    const x = this.OX + c * this.CELL + 1;
                    const y = this.OY + r * this.CELL + 1;
                    const s = this.CELL - 2;
                    wg.fillRoundedRect(x, y, s, s, 5);
                    wg.strokeRoundedRect(x, y, s, s, 5);
                }
            }
        }

        // ── Matprickar (group för enkel borttagning) ──────────────────────
        this.pelletGroup = this.add.group();
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.grid[r][c] === 1) {
                    const img = this.add.image(this.toWorldX(c), this.toWorldY(r), 'pellet')
                        .setDisplaySize(13, 13);
                    img.setData('col', c);
                    img.setData('row', r);
                    this.pelletGroup.add(img);
                }
            }
        }

        // ── Pac-Man-animationer (kors-textur-stil, Phaser 3 stödjer detta) ─
        ['right', 'left', 'up', 'down'].forEach(dir => {
            if (!this.anims.exists('pac_' + dir)) {
                this.anims.create({
                    key:       'pac_' + dir,
                    frames:    [{ key: 'pac_' + dir }, { key: 'pac_closed' }],
                    frameRate: 8,
                    repeat:    -1
                });
            }
        });

        // ── Pac-Man-sprite ────────────────────────────────────────────────
        this.pac = {
            col:      this.PAC_START.col,
            row:      this.PAC_START.row,
            dir:      'right',
            nextDir:  null,
            isMoving: false,
            isDead:   false,
            sprite:   null
        };
        this.pac.sprite = this.add.sprite(
            this.toWorldX(this.PAC_START.col),
            this.toWorldY(this.PAC_START.row),
            'pac_right'
        ).setDisplaySize(this.CELL - 8, this.CELL - 8).setDepth(5);
        this.pac.sprite.play('pac_right');

        // ── Spöket ────────────────────────────────────────────────────────
        this.ghost = {
            col:      this.GHOST_START.col,
            row:      this.GHOST_START.row,
            dir:      'left',
            isMoving: false,
            isScared: false,
            sprite:   null
        };
        this.ghost.sprite = this.add.image(
            this.toWorldX(this.GHOST_START.col),
            this.toWorldY(this.GHOST_START.row),
            'ghost'
        ).setDisplaySize(this.CELL - 4, this.CELL - 4).setDepth(5);

        // ── Körsbär (gömts tills det spawnar) ────────────────────────────
        this.cherrySprite = this.add.image(
            this.toWorldX(this.CHERRY_POS.col),
            this.toWorldY(this.CHERRY_POS.row),
            'cherry'
        ).setDisplaySize(30, 30).setDepth(4).setVisible(false);
        this.cherryActive  = false;
        this.cherrySpawned = false;

        // ── UI ────────────────────────────────────────────────────────────
        const back = this.add.rectangle(85, 32, 140, 44, 0x333333)
            .setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        this.add.text(85, 32, '← Meny', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5);
        back.on('pointerover', () => back.setFillStyle(0x555555));
        back.on('pointerout',  () => back.setFillStyle(0x333333));
        back.on('pointerdown', () => this.scene.start('MainMenu'));

        this.add.text(512, 32, 'Pac-Man', {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '28px', color: '#ffd23b'
        }).setOrigin(0.5);

        this.scoreText = this.add.text(752, 32, 'Poäng: 0', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.livesText = this.add.text(978, 32, '❤️❤️❤️', {
            fontFamily: 'Arial', fontSize: '20px'
        }).setOrigin(1, 0.5);

        // ── Spelstatus ────────────────────────────────────────────────────
        this.score            = 0;
        this.lives            = 3;
        this.finished         = false;
        this.gameOver         = false;
        this.startTime        = null;
        this.ghostTimerEvent  = null;
        this.scaredTimerEvent = null;
        this.scaredFlashTween = null;

        // ── Tangentbord + D-knappar ───────────────────────────────────────
        // heldDir = den riktning vars tangent/knapp just nu är nedtryckt.
        // Pac-Man rör sig bara medan heldDir är satt → stoppas direkt vid release.
        this.heldDir = null;

        const kb = this.input.keyboard;
        const setHeld   = (dir) => { this.heldDir = dir;                           this.queueDir(dir); };
        const clearHeld = (dir) => { if (this.heldDir === dir) this.heldDir = null; };

        kb.on('keydown-UP',    () => setHeld('up'));
        kb.on('keydown-DOWN',  () => setHeld('down'));
        kb.on('keydown-LEFT',  () => setHeld('left'));
        kb.on('keydown-RIGHT', () => setHeld('right'));
        kb.on('keyup-UP',    () => clearHeld('up'));
        kb.on('keyup-DOWN',  () => clearHeld('down'));
        kb.on('keyup-LEFT',  () => clearHeld('left'));
        kb.on('keyup-RIGHT', () => clearHeld('right'));

        this.makeDpad();

        // ── Starta spökets AI ─────────────────────────────────────────────
        this.scheduleGhostMove();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Koordinathjälpare
    // ─────────────────────────────────────────────────────────────────────────
    toWorldX (col) { return this.OX + col * this.CELL + this.CELL / 2; }
    toWorldY (row) { return this.OY + row * this.CELL + this.CELL / 2; }

    isWall (c, r)
    {
        return c < 0 || c >= this.COLS || r < 0 || r >= this.ROWS || this.grid[r][c] === 0;
    }

    delta (dir)
    {
        return ({ right:[1,0], left:[-1,0], up:[0,-1], down:[0,1] })[dir] || [0,0];
    }

    opposite (dir)
    {
        return ({ right:'left', left:'right', up:'down', down:'up' })[dir];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PAC-MAN-RÖRELSE
    // ─────────────────────────────────────────────────────────────────────────
    queueDir (dir)
    {
        this.pac.nextDir = dir;
        if (!this.pac.isMoving && !this.pac.isDead) this.tryMove();
    }

    tryMove ()
    {
        if (this.pac.isDead || this.finished || this.gameOver || this.pac.isMoving) return;

        // 1) Prova köad riktning (från en knapptryckning som kom mitt i en rörelse)
        if (this.pac.nextDir) {
            const [dc, dr] = this.delta(this.pac.nextDir);
            if (!this.isWall(this.pac.col + dc, this.pac.row + dr)) {
                this.pac.dir     = this.pac.nextDir;
                this.pac.nextDir = null;
                this.beginMove(this.pac.dir);
                return;
            }
            this.pac.nextDir = null;   // blockerad, rensa
        }

        // 2) Fortsätt bara om en tangent/knapp fortfarande hålls nere
        if (this.heldDir) {
            const [dc, dr] = this.delta(this.heldDir);
            if (!this.isWall(this.pac.col + dc, this.pac.row + dr)) {
                this.pac.dir = this.heldDir;
                this.beginMove(this.pac.dir);
            }
            // Om heldDir är blockerad (vägg): stanna vid aktuell cell
        }
        // Ingen tangent hålls → pac-man stannar, inget behöver göras
    }

    beginMove (dir)
    {
        const [dc, dr] = this.delta(dir);
        this.pac.col     += dc;
        this.pac.row     += dr;
        this.pac.isMoving = true;
        this.pac.sprite.play('pac_' + dir, true);

        this.tweens.add({
            targets:    this.pac.sprite,
            x:          this.toWorldX(this.pac.col),
            y:          this.toWorldY(this.pac.row),
            duration:   145,
            ease:       'Linear',
            onComplete: () => { this.pac.isMoving = false; this.onLanded(); }
        });
    }

    onLanded ()
    {
        if (this.pac.isDead || this.finished || this.gameOver) return;
        const c = this.pac.col;
        const r = this.pac.row;

        // Äta mat
        if (this.grid[r][c] === 1) {
            this.grid[r][c] = 2;
            this.score += 10;
            this.scoreText.setText('Poäng: ' + this.score);
            this.pelletsLeft--;

            const sprite = this.pelletGroup.getChildren()
                .find(img => img.getData('col') === c && img.getData('row') === r);
            if (sprite) sprite.destroy();

            // Körsbär spawnar vid halva mängden mat kvar
            if (!this.cherrySpawned && this.pelletsLeft <= Math.floor(this.totalPellets / 2)) {
                this.spawnCherry();
            }

            if (this.pelletsLeft === 0) { this.onWin(); return; }
        }

        // Äta körsbär
        if (this.cherryActive && c === this.CHERRY_POS.col && r === this.CHERRY_POS.row) {
            this.eatCherry();
        }

        this.checkCollision();
        if (!this.pac.isDead) this.tryMove();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SPÖKE-AI
    // ─────────────────────────────────────────────────────────────────────────
    scheduleGhostMove ()
    {
        if (this.finished || this.gameOver) return;
        const delay = this.ghost.isScared ? 430 : 275;
        this.ghostTimerEvent = this.time.delayedCall(delay, () => {
            if (this.finished || this.gameOver) return;
            if (!this.ghost.isMoving) this.doGhostMove();
            else this.scheduleGhostMove();
        });
    }

    doGhostMove ()
    {
        const dir = this.pickGhostDir();
        if (!dir) { this.scheduleGhostMove(); return; }

        const [dc, dr]     = this.delta(dir);
        this.ghost.col    += dc;
        this.ghost.row    += dr;
        this.ghost.dir     = dir;
        this.ghost.isMoving = true;

        this.tweens.add({
            targets:    this.ghost.sprite,
            x:          this.toWorldX(this.ghost.col),
            y:          this.toWorldY(this.ghost.row),
            duration:   this.ghost.isScared ? 430 : 275,
            ease:       'Linear',
            onComplete: () => {
                this.ghost.isMoving = false;
                this.checkCollision();
                this.scheduleGhostMove();
            }
        });
    }

    pickGhostDir ()
    {
        const all = ['right', 'left', 'up', 'down'];
        const opp = this.opposite(this.ghost.dir);

        // Tillåtna riktningar (ej bakåt, ej vägg)
        let choices = all.filter(d => {
            if (d === opp) return false;
            const [dc, dr] = this.delta(d);
            return !this.isWall(this.ghost.col + dc, this.ghost.row + dr);
        });

        // Om ingen framåt-väg: tillåt omvändning
        if (choices.length === 0) {
            choices = all.filter(d => {
                const [dc, dr] = this.delta(d);
                return !this.isWall(this.ghost.col + dc, this.ghost.row + dr);
            });
        }
        if (choices.length === 0) return null;
        if (choices.length === 1) return choices[0];

        // Poängsätt varje riktning med Manhattan-avstånd till Pac-Man
        const scored = choices.map(d => {
            const [dc, dr] = this.delta(d);
            return {
                dir:  d,
                dist: Math.abs(this.ghost.col + dc - this.pac.col) +
                      Math.abs(this.ghost.row + dr - this.pac.row)
            };
        });

        if (this.ghost.isScared) {
            // 65 % fly undan, 35 % slumpmässigt
            if (Math.random() < 0.65)
                return scored.reduce((a, b) => b.dist > a.dist ? b : a).dir;
        } else {
            // 85 % jaga, 15 % slumpmässigt (förhindrar fastloopning)
            if (Math.random() < 0.85)
                return scored.reduce((a, b) => b.dist < a.dist ? b : a).dir;
        }
        return choices[Math.floor(Math.random() * choices.length)];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  KOLLISION
    // ─────────────────────────────────────────────────────────────────────────
    checkCollision ()
    {
        if (this.pac.isDead || this.finished || this.gameOver) return;
        if (this.pac.col !== this.ghost.col || this.pac.row !== this.ghost.row) return;
        this.ghost.isScared ? this.eatGhost() : this.loseLife();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  KÖRSBÄR
    // ─────────────────────────────────────────────────────────────────────────
    spawnCherry ()
    {
        this.cherrySpawned = true;
        this.cherryActive  = true;
        this.cherrySprite.setVisible(true).setAlpha(1).setScale(1);

        // Pulsanimation
        this.tweens.add({
            targets:  this.cherrySprite,
            scale:    { from: 1, to: 1.28 },
            duration: 380, yoyo: true, repeat: -1, ease: 'Sine.InOut'
        });

        // Försvinner efter 10 sekunder
        this.time.delayedCall(10000, () => {
            if (this.cherryActive) {
                this.tweens.killTweensOf(this.cherrySprite);
                this.cherryActive = false;
                this.cherrySprite.setVisible(false);
            }
        });
    }

    eatCherry ()
    {
        this.tweens.killTweensOf(this.cherrySprite);
        this.cherryActive = false;
        this.cherrySprite.setVisible(false);
        this.score += 200;
        this.scoreText.setText('Poäng: ' + this.score);
        this.launchFirework(this.toWorldX(this.CHERRY_POS.col), this.toWorldY(this.CHERRY_POS.row), 0xff2255);
        this.floatText('+200  🍒  Spöket flyr!', 512, this.OY - 18, '#ff88cc');
        this.startScared();
    }

    startScared ()
    {
        this.ghost.isScared = true;
        this.ghost.sprite.setAlpha(1);
        this.ghost.sprite.setTint(0x888888);   // grå tint = rädd

        if (this.scaredTimerEvent) this.scaredTimerEvent.remove();
        if (this.scaredFlashTween) this.scaredFlashTween.stop();

        // Blinka de sista 2 sekunderna, avsluta sedan
        this.scaredTimerEvent = this.time.delayedCall(6000, () => {
            if (!this.ghost.isScared) return;
            this.scaredFlashTween = this.tweens.add({
                targets: this.ghost.sprite, alpha: { from: 1, to: 0.2 },
                duration: 160, yoyo: true, repeat: 12,
                onComplete: () => this.endScared()
            });
        });
    }

    endScared ()
    {
        this.ghost.isScared = false;
        if (this.scaredTimerEvent) { this.scaredTimerEvent.remove(); this.scaredTimerEvent = null; }
        if (this.scaredFlashTween) { this.scaredFlashTween.stop();   this.scaredFlashTween = null; }
        this.ghost.sprite.clearTint();
        this.ghost.sprite.setAlpha(1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  LIV-HÄNDELSER
    // ─────────────────────────────────────────────────────────────────────────
    loseLife ()
    {
        if (this.pac.isDead) return;
        this.pac.isDead = true;

        // Stoppa spökets rörelse
        if (this.ghostTimerEvent) { this.ghostTimerEvent.remove(); this.ghostTimerEvent = null; }
        this.tweens.killTweensOf(this.pac.sprite);
        this.tweens.killTweensOf(this.ghost.sprite);
        this.pac.isMoving   = false;
        this.ghost.isMoving = false;

        this.lives--;
        this.livesText.setText('❤️'.repeat(Math.max(0, this.lives)));

        // Blinka-dödanimation
        this.tweens.add({
            targets: this.pac.sprite, alpha: 0,
            duration: 120, yoyo: true, repeat: 5,
            onComplete: () => {
                if (this.lives <= 0) this.showGameOver();
                else this.respawn();
            }
        });
    }

    respawn ()
    {
        // Återställ Pac-Man
        this.pac.col      = this.PAC_START.col;
        this.pac.row      = this.PAC_START.row;
        this.pac.dir      = 'right';
        this.pac.nextDir  = null;
        this.pac.isMoving = false;
        this.pac.isDead   = false;
        this.pac.sprite
            .setAlpha(1)
            .setPosition(this.toWorldX(this.PAC_START.col), this.toWorldY(this.PAC_START.row))
            .play('pac_right');

        // Återställ spöket
        this.ghost.col      = this.GHOST_START.col;
        this.ghost.row      = this.GHOST_START.row;
        this.ghost.dir      = 'left';
        this.ghost.isMoving = false;
        this.ghost.sprite.setPosition(
            this.toWorldX(this.GHOST_START.col), this.toWorldY(this.GHOST_START.row)
        );

        if (this.ghost.isScared) this.endScared();
        this.scheduleGhostMove();
    }

    eatGhost ()
    {
        this.score += 500;
        this.scoreText.setText('Poäng: ' + this.score);
        this.launchFirework(
            this.toWorldX(this.ghost.col), this.toWorldY(this.ghost.row), 0x845ef7
        );
        this.floatText('+500', this.toWorldX(this.ghost.col), this.toWorldY(this.ghost.row), '#cc99ff');

        // Spöket återföds vid startpunkten
        if (this.ghostTimerEvent) { this.ghostTimerEvent.remove(); this.ghostTimerEvent = null; }
        this.tweens.killTweensOf(this.ghost.sprite);
        this.ghost.isMoving = false;
        this.ghost.col      = this.GHOST_START.col;
        this.ghost.row      = this.GHOST_START.row;
        this.ghost.sprite.setPosition(
            this.toWorldX(this.GHOST_START.col), this.toWorldY(this.GHOST_START.row)
        );
        this.endScared();
        this.scheduleGhostMove();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FLYTANDE BONUSTEXT
    // ─────────────────────────────────────────────────────────────────────────
    floatText (msg, x, y, color)
    {
        const t = this.add.text(x, y, msg, {
            fontFamily: 'Arial Black', fontSize: '26px', color: color
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({
            targets: t, y: y - 58, alpha: 0,
            duration: 1400, ease: 'Quad.Out',
            onComplete: () => t.destroy()
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEGER / GAME OVER
    // ─────────────────────────────────────────────────────────────────────────
    onWin ()
    {
        this.finished = true;
        const total = (this.time.now - (this.startTime || this.time.now)) / 1000;
        const pal   = [0xffd23b, 0xff6b6b, 0x51cf66, 0x5c7cfa, 0xf06595];
        for (let k = 0; k < 6; k++) {
            this.time.delayedCall(k * 200, () => {
                this.launchFirework(
                    100 + Math.random() * 820,
                    80  + Math.random() * 420,
                    pal[k % pal.length]
                );
            });
        }
        this.time.delayedCall(700, () => this.showVictory(total));
    }

    showGameOver ()
    {
        this.gameOver = true;
        const cx = 512, cy = 384;

        this.add.rectangle(cx, cy, 1024, 768, 0x000000, 0.75)
            .setDepth(10).setInteractive();

        const panel = this.add.container(cx, cy).setDepth(20);
        const bg    = this.add.rectangle(0, 0, 500, 300, 0x080020).setStrokeStyle(4, 0xff3333);
        const title = this.add.text(0, -98, 'GAME OVER', {
            fontFamily: 'Arial Black', fontSize: '52px', color: '#ff3333'
        }).setOrigin(0.5);
        const sub = this.add.text(0, -36, 'Poäng: ' + this.score, {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffffff'
        }).setOrigin(0.5);

        const bW = 360, bH = 56;
        const againBtn = this.add.rectangle(0, 40, bW, bH, 0x229922)
            .setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
        const againLbl = this.add.text(0, 40, 'Spela igen', {
            fontFamily: 'Arial', fontSize: '26px', color: '#ffffff'
        }).setOrigin(0.5);
        const menuBtn  = this.add.rectangle(0, 108, bW, bH, 0x224499)
            .setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
        const menuLbl  = this.add.text(0, 108, 'Tillbaka till menyn', {
            fontFamily: 'Arial', fontSize: '26px', color: '#ffffff'
        }).setOrigin(0.5);

        panel.add([bg, title, sub, againBtn, againLbl, menuBtn, menuLbl]);

        againBtn.on('pointerover', () => againBtn.setFillStyle(0x33bb33));
        againBtn.on('pointerout',  () => againBtn.setFillStyle(0x229922));
        menuBtn.on('pointerover',  () => menuBtn.setFillStyle(0x3355bb));
        menuBtn.on('pointerout',   () => menuBtn.setFillStyle(0x224499));

        // Armed guard mot slumpartad touch
        let a1 = false, a2 = false;
        againBtn.on('pointerdown', () => { a1 = true; });
        againBtn.on('pointerup',   () => { if (a1) this.scene.restart();        a1 = false; });
        menuBtn.on('pointerdown',  () => { a2 = true; });
        menuBtn.on('pointerup',    () => { if (a2) this.scene.start('MainMenu'); a2 = false; });

        panel.setScale(0);
        this.tweens.add({ targets: panel, scale: 1, ease: 'Back.Out', duration: 380 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  D-KNAPPAR
    // ─────────────────────────────────────────────────────────────────────────
    makeDpad ()
    {
        const cy     = this.OY + this.ROWS * this.CELL + 88;  // 62+506+88 = 656
        const cx     = 512;
        const bS     = 50;
        const stride = 54;

        const btns = [
            { x: cx,          y: cy - stride, label: '▲', action: 'up'    },
            { x: cx,          y: cy + stride, label: '▼', action: 'down'  },
            { x: cx - stride, y: cy,          label: '◀', action: 'left'  },
            { x: cx + stride, y: cy,          label: '▶', action: 'right' }
        ];

        for (const btn of btns) {
            const vis  = this.add.container(btn.x, btn.y);
            const base = this.add.graphics();
            base.fillStyle(0x0a0a22, 1);
            base.fillRoundedRect(-bS / 2, -bS / 2 + 4, bS, bS, 11);
            const face = this.add.graphics();
            face.fillStyle(0x334488, 1);
            face.fillRoundedRect(-bS / 2, -bS / 2, bS, bS, 11);
            const lbl = this.add.text(0, 0, btn.label, {
                fontFamily: 'Arial Black', fontSize: '26px', color: '#ffffff'
            }).setOrigin(0.5);
            vis.add([base, face, lbl]);

            const hit = this.add.rectangle(btn.x, btn.y, bS, bS, 0, 0)
                .setInteractive({ useHandCursor: true });

            hit.on('pointerdown', () => {
                this.tweens.add({ targets: vis, scale: 0.88, duration: 60, yoyo: true });
                this.heldDir = btn.action;
                this.queueDir(btn.action);
            });
            hit.on('pointerup',  () => { if (this.heldDir === btn.action) this.heldDir = null; });
            hit.on('pointerout', () => {
                if (this.heldDir === btn.action) this.heldDir = null;
                face.clear().fillStyle(0x334488, 1).fillRoundedRect(-bS/2, -bS/2, bS, bS, 11);
            });
            hit.on('pointerover', () =>
                face.clear().fillStyle(0x5566bb, 1).fillRoundedRect(-bS/2, -bS/2, bS, bS, 11));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  UPPDATERA  –  all inmatning sker nu via event-lyssnare (keydown/keyup)
    //  istället för polling, så update behöver bara starta timern.
    // ─────────────────────────────────────────────────────────────────────────
    update (time)
    {
        if (this.startTime === null && !this.finished && !this.gameOver && !this.pac.isDead) {
            this.startTime = time;
        }
    }
}