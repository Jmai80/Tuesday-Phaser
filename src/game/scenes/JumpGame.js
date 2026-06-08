import { BaseGameScene } from './BaseGameScene.js';

// ─────────────────────────────────────────────────────────────────────────────
//  Hopphjalten – ett spring-och-hoppa-spel i stil med Google Dino.
//  Karaktären springer automatiskt. Hinder rullar in från höger i allt
//  snabbare takt. Mål: överlev och samla poäng!
//  Passar 6–10 år. Spelas med mellanslag, piltangent upp, eller tryck/klick.
// ─────────────────────────────────────────────────────────────────────────────

export class JumpGame extends BaseGameScene
{
    constructor () { super('JumpGame'); }

    // ── Konstanter ────────────────────────────────────────────────────────────
    get W () { return this.scale.width;  }   // 1024
    get H () { return this.scale.height; }   // 768

    get GROUND_Y ()   { return 580; }        // marknivå (karaktärens fot)
    get CHAR_X ()     { return 160; }        // karaktären rör sig aldrig i x
    get CHAR_W ()     { return 52; }
    get CHAR_H ()     { return 64; }

    // ── create ───────────────────────────────────────────────────────────────
    create ()
    {
        this.createBackButton();

        // Spelstatus
        this.score        = 0;
        this.hiScore      = 0;
        this.speed        = 320;          // px/s – ökar med tid
        this.gameOver     = false;
        this.started      = false;
        this.charY        = this.GROUND_Y;
        this.velY         = 0;
        this.onGround     = true;
        this.obstacles    = [];
        this.clouds       = [];
        this.groundTiles  = [];
        this.spawnTimer   = 0;
        this.spawnDelay   = 1.4;          // sekunder till nästa hinder
        this.elapsed      = 0;

        this.buildBackground();
        this.buildGround();
        this.buildCharacter();
        this.buildClouds();
        this.buildHUD();
        this.buildStartOverlay();
        this.buildControls();
    }

    // ── Bakgrund ─────────────────────────────────────────────────────────────
    buildBackground ()
    {
        // Himmel – gradient via Graphics
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xd4f1ff, 0xd4f1ff, 1);
        sky.fillRect(0, 0, this.W, this.GROUND_Y);

        // Mark – brun remsa
        this.groundGraphic = this.add.graphics();
        this.groundGraphic.fillStyle(0x8b6914, 1);
        this.groundGraphic.fillRect(0, this.GROUND_Y + 10, this.W, this.H - this.GROUND_Y - 10);
    }

    // ── Marklinje (rörliga tiles) ─────────────────────────────────────────────
    buildGround ()
    {
        // Ritad som en grön grästopp + brun mark
        this.groundLine = this.add.graphics();
        this.redrawGroundLine(0);
    }

    redrawGroundLine (offset)
    {
        const g = this.groundLine;
        g.clear();
        // Grästopp
        g.fillStyle(0x4caf50, 1);
        g.fillRect(0, this.GROUND_Y, this.W, 12);
        // Mörkt gräs accent
        g.fillStyle(0x388e3c, 1);
        for (let x = (offset % 60) - 60; x < this.W + 60; x += 60) {
            g.fillRect(x, this.GROUND_Y, 30, 6);
        }
    }

    // ── Karaktären ─────────────────────────────────────────────────────────
    buildCharacter ()
    {
        // Enkel robot/figur ritad med Graphics, utan externa assets
        this.charGfx  = this.add.graphics().setDepth(5);
        this.charFrame = 0;
        this.frameTimer = 0;
        this.drawChar(this.CHAR_X, this.charY, false);
    }

    drawChar (x, y, jumping)
    {
        const g = this.charGfx;
        g.clear();

        const bx = x - this.CHAR_W / 2;
        const by = y - this.CHAR_H;

        // Kropp – blå
        g.fillStyle(0x1565c0, 1);
        g.fillRoundedRect(bx + 8, by + 22, 36, 30, 6);

        // Huvud – hudfärg
        g.fillStyle(0xffcc80, 1);
        g.fillRoundedRect(bx + 10, by + 2, 32, 26, 8);

        // Ögon
        g.fillStyle(0x111111, 1);
        g.fillCircle(bx + 19, by + 12, 4);
        g.fillCircle(bx + 33, by + 12, 4);

        // Mun (leende)
        g.lineStyle(2, 0x333333, 1);
        g.beginPath();
        g.arc(bx + 26, by + 20, 6, 0, Math.PI, false);
        g.strokePath();

        // Ben (animerade vid löpning)
        g.fillStyle(0x0d47a1, 1);
        if (jumping) {
            // Hoppar – böjda ben bakåt
            g.fillRoundedRect(bx + 10, by + 50, 14, 16, 4);
            g.fillRoundedRect(bx + 28, by + 50, 14, 16, 4);
        } else {
            const f  = this.charFrame;
            const l1 = f === 0 ? 14 : 6;
            const l2 = f === 0 ? 6  : 14;
            g.fillRoundedRect(bx + 10, by + 50, 14, l1, 4);
            g.fillRoundedRect(bx + 28, by + 50, 14, l2, 4);
        }

        // Armar
        g.fillStyle(0x1565c0, 1);
        if (jumping) {
            g.fillRoundedRect(bx, by + 24, 10, 20, 4);
            g.fillRoundedRect(bx + 42, by + 24, 10, 20, 4);
        } else {
            const af = this.charFrame;
            g.fillRoundedRect(bx, by + 22 + (af === 0 ? 6 : 0), 10, 20, 4);
            g.fillRoundedRect(bx + 42, by + 22 + (af === 0 ? 0 : 6), 10, 20, 4);
        }
    }

    // ── Moln ─────────────────────────────────────────────────────────────────
    buildClouds ()
    {
        for (let i = 0; i < 5; i++) {
            this.spawnCloud(Math.random() * this.W);
        }
    }

    spawnCloud (x)
    {
        const y = 80 + Math.random() * 180;
        const s = 0.6 + Math.random() * 0.8;
        const g = this.add.graphics();
        this.drawCloud(g, 0, 0, s);
        g.x = x; g.y = y;
        this.clouds.push(g);
    }

    drawCloud (g, x, y, s)
    {
        g.fillStyle(0xffffff, 0.85);
        g.fillCircle(x, y, 28 * s);
        g.fillCircle(x + 28 * s, y + 8 * s, 36 * s);
        g.fillCircle(x + 62 * s, y + 4 * s, 30 * s);
        g.fillCircle(x + 90 * s, y + 12 * s, 24 * s);
        g.fillRect(x, y + 8 * s, 90 * s, 20 * s);
    }

    // ── HUD ──────────────────────────────────────────────────────────────────
    buildHUD ()
    {
        this.scoreTxt = this.add.text(this.W / 2, 24, 'Poäng: 0', {
            fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#1a237e',
            stroke: '#ffffff', strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);

        this.hiTxt = this.add.text(this.W - 20, 24, 'Rekord: 0', {
            fontFamily: 'Arial', fontSize: '22px', color: '#555555'
        }).setOrigin(1, 0.5).setDepth(10);
    }

    // ── Start-overlay ─────────────────────────────────────────────────────────
    buildStartOverlay ()
    {
        this.overlay = this.add.container(this.W / 2, this.H / 2).setDepth(20);

        const bg  = this.add.rectangle(0, 0, 480, 220, 0x1b2a4a, 0.9)
            .setStrokeStyle(3, 0xffd23b);
        const t1  = this.add.text(0, -70, '🏃 Hopphjalten', {
            fontFamily: 'Arial Black, Arial', fontSize: '36px', color: '#ffd23b'
        }).setOrigin(0.5);
        const t2  = this.add.text(0, 0, 'Hoppa över hindren!', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);
        const t3  = this.add.text(0, 60, 'Tryck, klicka eller mellanslag', {
            fontFamily: 'Arial', fontSize: '20px', color: '#aaccff'
        }).setOrigin(0.5);

        this.overlay.add([bg, t1, t2, t3]);
    }

    // ── On-screen hoppknapp (mobil) ────────────────────────────────────────
    buildControls ()
    {
        // Tangentbord
        this.jumpKey = this.input.keyboard.addKey('SPACE');
        this.upKey   = this.input.keyboard.addKey('UP');

        // Pekskärm / mus – hela skärmen fungerar som hoppknapp
        this.input.on('pointerdown', () => this.tryJump());

        // Knapp längst ner för mobil
        const btn = document.createElement('button');
        btn.textContent = '⬆ Hoppa';
        Object.assign(btn.style, {
            position: 'fixed', fontFamily: '"Arial Black", Arial',
            fontSize: '20px', color: '#ffffff', background: '#1565c0',
            border: '3px solid #ffffff', borderRadius: '14px',
            padding: '12px 30px', cursor: 'pointer',
            zIndex: '100', touchAction: 'manipulation', userSelect: 'none'
        });
        document.body.appendChild(btn);

        const repos = () => {
            const r = this.sys.game.canvas.getBoundingClientRect();
            btn.style.left   = Math.round(r.left  + this.W / 2 - 80) + 'px';
            btn.style.bottom = Math.round(window.innerHeight - r.bottom + 12) + 'px';
        };
        repos();
        this.scale.on('resize', repos);
        btn.addEventListener('pointerdown', () => this.tryJump());

        const cleanup = () => { btn.remove(); this.scale.off('resize', repos); };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy',  cleanup);
    }

    // ── Hoppa ─────────────────────────────────────────────────────────────────
    tryJump ()
    {
        // Vid game over sköter popup-knapparna omstart/meny — gör inget här.
        if (this.gameOver) return;
        if (!this.started) { this.startGame(); }
        if (this.onGround) {
            this.velY    = -820;
            this.onGround = false;
        }
    }

    startGame ()
    {
        this.started = true;
        if (this.overlay) { this.overlay.destroy(); this.overlay = null; }
    }

    // ── Skapa ett hinder ───────────────────────────────────────────────────
    spawnObstacle ()
    {
        // Slumpa typ: kaktusar i olika storlekar
        const types = [
            { w: 28, h: 60 }, { w: 44, h: 52 }, { w: 56, h: 74 },
            { w: 34, h: 80 }, { w: 22, h: 48 }
        ];
        const t   = types[Math.floor(Math.random() * types.length)];
        const obs = this.add.graphics().setDepth(4);
        const x   = this.W + 40;
        const y   = this.GROUND_Y;

        this.drawObstacle(obs, x, y, t.w, t.h);
        obs._x  = x;
        obs._w  = t.w;
        obs._h  = t.h;
        this.obstacles.push(obs);
    }

    drawObstacle (g, x, y, w, h)
    {
        g.clear();
        // Kaktusliknande grön figur
        g.fillStyle(0x2e7d32, 1);
        // Stam
        g.fillRoundedRect(x - w / 2, y - h, w, h, 8);
        // Grenar (större hinder får grenar)
        if (w >= 40) {
            g.fillRoundedRect(x - w / 2 - 16, y - h * 0.7, 18, h * 0.35, 6);
            g.fillRoundedRect(x + w / 2 - 2, y - h * 0.6, 18, h * 0.3, 6);
        }
        // Mörk kant
        g.lineStyle(3, 0x1b5e20, 1);
        g.strokeRoundedRect(x - w / 2, y - h, w, h, 8);
    }

    // ── Kollisionskontroll (enkel AABB) ────────────────────────────────────
    checkCollision (obs)
    {
        const cx  = this.CHAR_X;
        const cy  = this.charY;
        const cw  = this.CHAR_W - 16;   // lite mer förlåtande
        const ch  = this.CHAR_H - 10;

        const ox  = obs._x;
        const ow  = obs._w - 8;
        const oh  = obs._h - 6;
        const oy  = this.GROUND_Y;

        return (
            cx + cw / 2 > ox - ow / 2 &&
            cx - cw / 2 < ox + ow / 2 &&
            cy          > oy - oh &&
            cy - ch     < oy
        );
    }

    // ── Game over ──────────────────────────────────────────────────────────
    triggerGameOver ()
    {
        this.gameOver = true;
        if (this.score > this.hiScore) this.hiScore = this.score;
        this.hiTxt.setText('Rekord: ' + this.hiScore);

        // Rödblinka karaktären
        this.tweens.add({
            targets: this.charGfx, alpha: 0,
            duration: 80, yoyo: true, repeat: 5
        });

        // Panel
        const cx = this.W / 2, cy = this.H / 2;
        const panel = this.add.container(cx, cy).setDepth(30);
        const bg    = this.add.rectangle(0, 0, 480, 260, 0x1b2a4a, 0.95)
            .setStrokeStyle(4, 0xff6b6b);
        const t1    = this.add.text(0, -88, '💥 Du slog i ett hinder!', {
            fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#ff6b6b'
        }).setOrigin(0.5);
        const t2    = this.add.text(0, -36, 'Poäng: ' + this.score, {
            fontFamily: 'Arial', fontSize: '34px', color: '#ffd23b'
        }).setOrigin(0.5);
        const t3    = this.add.text(0, 16, 'Rekord: ' + this.hiScore, {
            fontFamily: 'Arial', fontSize: '24px', color: '#aaaaff'
        }).setOrigin(0.5);

        const againBtn = this.add.rectangle(0, 80, 340, 60, 0x33aa33)
            .setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
        const againLbl = this.add.text(0, 80, 'Försök igen', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        }).setOrigin(0.5);

        const menuBtn = this.add.rectangle(0, 152, 340, 60, 0x3366cc)
            .setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
        const menuLbl = this.add.text(0, 152, 'Tillbaka till menyn', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        panel.add([bg, t1, t2, t3, againBtn, againLbl, menuBtn, menuLbl]);

        againBtn.on('pointerover', () => againBtn.setFillStyle(0x44bb44));
        againBtn.on('pointerout',  () => againBtn.setFillStyle(0x33aa33));
        menuBtn.on('pointerover',  () => menuBtn.setFillStyle(0x4477dd));
        menuBtn.on('pointerout',   () => menuBtn.setFillStyle(0x3366cc));
        againBtn.on('pointerdown', () => this.restartGame());
        menuBtn.on('pointerdown',  () => this.scene.start('MainMenu'));

        panel.setScale(0);
        this.tweens.add({ targets: panel, scale: 1, ease: 'Back.Out', duration: 350 });
    }

    restartGame ()
    {
        this.scene.restart();
    }

    // ── update ────────────────────────────────────────────────────────────────
    update (time, delta)
    {
        const dt = delta / 1000;

        // Tangentbord
        if ((this.jumpKey.isDown || this.upKey.isDown) && !this._keyHeld) {
            this._keyHeld = true;
            this.tryJump();
        }
        if (!this.jumpKey.isDown && !this.upKey.isDown) this._keyHeld = false;

        if (!this.started || this.gameOver) return;

        this.elapsed += dt;

        // ── Poäng & hastighet ─────────────────────────────────────────────
        this.score = Math.floor(this.elapsed * 8);
        this.scoreTxt.setText('Poäng: ' + this.score);
        this.speed = 320 + this.elapsed * 20;   // accelererar med tiden

        // ── Markrullning ──────────────────────────────────────────────────
        this.redrawGroundLine(this.elapsed * this.speed);

        // ── Moln ──────────────────────────────────────────────────────────
        this.clouds.forEach(c => {
            c.x -= 40 * dt;
            if (c.x < -200) {
                c.x = this.W + 100;
                c.y = 80 + Math.random() * 180;
            }
        });

        // ── Gravitation & hopp ────────────────────────────────────────────
        if (!this.onGround) {
            this.velY   += 2200 * dt;
            this.charY  += this.velY * dt;
            if (this.charY >= this.GROUND_Y) {
                this.charY  = this.GROUND_Y;
                this.velY   = 0;
                this.onGround = true;
            }
        }

        // Animera löpcykeln
        this.frameTimer += dt;
        if (this.frameTimer > 0.15) {
            this.frameTimer = 0;
            this.charFrame  = this.charFrame === 0 ? 1 : 0;
        }
        this.drawChar(this.CHAR_X, this.charY, !this.onGround);

        // ── Hinder ────────────────────────────────────────────────────────
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnObstacle();
            // Spawn-delay minskar med tid (min 0.7 s)
            this.spawnDelay = Math.max(0.7, 1.4 - this.elapsed * 0.02);
            this.spawnTimer = this.spawnDelay + (Math.random() * 0.4 - 0.2);
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs._x -= this.speed * dt;
            this.drawObstacle(obs, obs._x, this.GROUND_Y, obs._w, obs._h);

            if (this.checkCollision(obs)) {
                this.triggerGameOver();
                return;
            }

            if (obs._x < -80) {
                obs.destroy();
                this.obstacles.splice(i, 1);
            }
        }
    }
}