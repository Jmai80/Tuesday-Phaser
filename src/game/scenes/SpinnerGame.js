import { BaseGameScene } from './BaseGameScene.js';

// ─────────────────────────────────────────────────────────────────────────────
//  Snurrhjulet — ett reflexspel där spelaren stoppar ett snurrande hjul
//  precis när det pulserade målsegmentet befinner sig under pilen.
//  15 träffar för seger. Hjulet snurrar fortare för varje poäng.
// ─────────────────────────────────────────────────────────────────────────────
export class SpinnerGame extends BaseGameScene
{
    constructor ()
    {
        super('SpinnerGame');
    }

    create ()
    {
        this.ensureSparkTexture();

        // ── Hjulkonstanter ────────────────────────────────────────────────
        this.NUM_SEG  = 8;
        this.WHEEL_R  = 218;
        this.WHEEL_CX = 512;
        this.WHEEL_CY = 378;
        this.TOTAL    = 15;

        this.SEG_COLORS = [
            0xff6b6b, 0xff922b, 0xffd23b, 0x51cf66,
            0x22b8cf, 0x5c7cfa, 0x845ef7, 0xf06595
        ];
        this.SEG_EMOJIS = ['🍎','🌟','☀️','🌿','💧','🌊','🔮','🌸'];

        // ── Bakgrund ──────────────────────────────────────────────────────
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x141432, 0x141432, 0x2a1f4a, 0x3a2456, 1);
        bg.fillRect(0, 0, this.scale.width, this.scale.height);

        // ── Spelstatus ────────────────────────────────────────────────────
        this.score          = 0;
        this.finished       = false;
        this.startTime      = null;
        this.canStop        = true;
        this.pulsingTween   = null;
        this.speedTween     = null;

        // Hjultillstånd som ett separat objekt så att Phaser kan tweena det
        this.wheelState = { angle: 0, speed: 88 };

        // ── Rita hjulet ───────────────────────────────────────────────────
        this.wheelContainer = this.add.container(this.WHEEL_CX, this.WHEEL_CY);
        this.segmentGfx     = [];

        for (let i = 0; i < this.NUM_SEG; i++)
        {
            const g = this.drawSegment(i, this.SEG_COLORS[i]);
            this.wheelContainer.add(g);
            this.segmentGfx.push(g);
        }

        // Uppdelningslinjer, ytterring och nav
        const rim = this.add.graphics();
        rim.lineStyle(4, 0xffffff, 0.75);
        for (let i = 0; i < this.NUM_SEG; i++)
        {
            const rad = (i * 45 - 22.5 - 90) * Math.PI / 180;
            rim.beginPath();
            rim.moveTo(0, 0);
            rim.lineTo(Math.cos(rad) * this.WHEEL_R, Math.sin(rad) * this.WHEEL_R);
            rim.strokePath();
        }
        rim.lineStyle(7, 0xffffff, 1);
        rim.strokeCircle(0, 0, this.WHEEL_R);
        rim.fillStyle(0x1d1838, 1);
        rim.fillCircle(0, 0, 26);
        rim.lineStyle(4, 0xffd23b, 1);
        rim.strokeCircle(0, 0, 26);
        this.wheelContainer.add(rim);

        // Emojis på varje segment (roterar med hjulet)
        for (let i = 0; i < this.NUM_SEG; i++)
        {
            const rad = (i * 45 - 90) * Math.PI / 180;
            const r   = this.WHEEL_R * 0.62;
            const txt = this.add.text(
                Math.cos(rad) * r,
                Math.sin(rad) * r,
                this.SEG_EMOJIS[i], { fontSize: '36px' }
            ).setOrigin(0.5);
            this.wheelContainer.add(txt);
        }

        // ── Fast pil (roterar INTE med hjulet) ───────────────────────────
        const arrow = this.add.graphics();
        const ax    = this.WHEEL_CX;
        const ayTip = this.WHEEL_CY - this.WHEEL_R + 10;  // spetsen nere mot hjulet
        const ayTop = ayTip - 44;                          // pilbas uppåt
        arrow.fillStyle(0xff2222, 1);
        arrow.fillTriangle(ax - 17, ayTop, ax + 17, ayTop, ax, ayTip);
        arrow.lineStyle(3, 0xffffff, 1);
        arrow.strokeTriangle(ax - 17, ayTop, ax + 17, ayTop, ax, ayTip);
        // Liten rektangel ovanpå som pilstam
        arrow.fillStyle(0xdd1111, 1);
        arrow.fillRect(ax - 7, ayTop - 14, 14, 16);
        arrow.lineStyle(2, 0xffffff, 0.7);
        arrow.strokeRect(ax - 7, ayTop - 14, 14, 16);

        // ── Välj första målsegment ────────────────────────────────────────
        this.targetSegment = Math.floor(Math.random() * this.NUM_SEG);
        this.applyTargetHighlight();

        // ── UI-texter ─────────────────────────────────────────────────────
        // Rubrik
        this.add.text(this.WHEEL_CX, 30, 'Snurrhjulet', {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '30px', color: '#ffd23b'
        }).setOrigin(0.5);

        // Tillbaka
        const backBtn = this.add.rectangle(85, 30, 140, 44, 0x444444)
            .setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        this.add.text(85, 30, '← Meny', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5);
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x666666));
        backBtn.on('pointerout',  () => backBtn.setFillStyle(0x444444));
        backBtn.on('pointerdown', () => this.scene.start('MainMenu'));

        // Timer
        this.timerText = this.add.text(this.scale.width - 18, 30, 'Tid: 0.0 s', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(1, 0.5);

        // Mållabel (vilket segment ska stoppas på?)
        this.targetPanel = this.add.rectangle(this.WHEEL_CX, 74, 330, 46, 0x22133a)
            .setStrokeStyle(2, 0x845ef7);
        this.targetLabel = this.add.text(this.WHEEL_CX, 74, '', {
            fontFamily: 'Arial', fontSize: '25px', color: '#ffffff'
        }).setOrigin(0.5);
        this.updateTargetLabel();

        // Poängvisning
        this.scoreText = this.add.text(this.WHEEL_CX, 112, '⭐  0 / 15', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffd23b'
        }).setOrigin(0.5);

        // Feedbacktext (träff / miss)
        this.feedbackText = this.add.text(this.WHEEL_CX, 646, '', {
            fontFamily: 'Arial Black', fontSize: '38px', color: '#51cf66'
        }).setOrigin(0.5).setDepth(10);

        // ── STOPP-knapp ───────────────────────────────────────────────────
        this.makeStopButton();

        // Mellanslag som alternativ
        this.input.keyboard.on('keydown-SPACE', () => this.stopWheel());
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Rita ett färgat segment som en cirkelbåge från mitten
    // ─────────────────────────────────────────────────────────────────────
    drawSegment (idx, color)
    {
        const SEG_HALF = 360 / this.NUM_SEG / 2;   // = 22.5°
        const startDeg = idx * (360 / this.NUM_SEG) - SEG_HALF - 90;
        const endDeg   = idx * (360 / this.NUM_SEG) + SEG_HALF - 90;
        const steps    = 20;

        // Bygg polygonpunkter: center → arc → stängt
        const pts = [{ x: 0, y: 0 }];
        for (let s = 0; s <= steps; s++)
        {
            const rad = (startDeg + (endDeg - startDeg) * s / steps) * Math.PI / 180;
            pts.push({
                x: Math.cos(rad) * this.WHEEL_R,
                y: Math.sin(rad) * this.WHEEL_R
            });
        }

        const g = this.add.graphics();
        g.fillStyle(color, 1);
        g.fillPoints(pts, true);
        return g;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Sätt nytt målsegment och starta pulsanimation
    // ─────────────────────────────────────────────────────────────────────
    applyTargetHighlight ()
    {
        if (this.pulsingTween) this.pulsingTween.stop();

        // Återställ alla segment till normal opacitet
        this.segmentGfx.forEach(g => g.setAlpha(0.78));

        // Det aktiva segmentet pulsar
        const target = this.segmentGfx[this.targetSegment];
        target.setAlpha(1);
        this.pulsingTween = this.tweens.add({
            targets:  target,
            alpha:    { from: 1, to: 0.4 },
            duration: 400, yoyo: true, repeat: -1, ease: 'Sine.InOut'
        });
    }

    updateTargetLabel ()
    {
        const e = this.SEG_EMOJIS[this.targetSegment];
        this.targetLabel.setText('Stoppa på:  ' + e + '  ' + e + '  ' + e);
    }

    // ─────────────────────────────────────────────────────────────────────
    //  STOPP-knapp
    // ─────────────────────────────────────────────────────────────────────
    makeStopButton ()
    {
        const cx = this.WHEEL_CX, cy = 706, bW = 290, bH = 70, r = 20;

        const vis  = this.add.container(cx, cy);
        const base = this.add.graphics();
        base.fillStyle(0x7a1010, 1);
        base.fillRoundedRect(-bW / 2, -bH / 2 + 6, bW, bH, r);
        this.stopFace = this.add.graphics();
        this.stopFace.fillStyle(0xcc1f1f, 1);
        this.stopFace.fillRoundedRect(-bW / 2, -bH / 2, bW, bH, r);
        const lbl = this.add.text(0, 0, 'STOPP!  🛑', {
            fontFamily: 'Arial Black', fontSize: '34px', color: '#ffffff'
        }).setOrigin(0.5);
        vis.add([base, this.stopFace, lbl]);

        const hit = this.add.rectangle(cx, cy, bW, bH, 0, 0)
            .setInteractive({ useHandCursor: true });

        hit.on('pointerdown', () => {
            this.tweens.add({ targets: vis, scale: 0.93, duration: 70, yoyo: true });
            this.stopWheel();
        });
        hit.on('pointerover', () =>
            this.stopFace.clear().fillStyle(0xdd2525, 1)
                .fillRoundedRect(-bW / 2, -bH / 2, bW, bH, r));
        hit.on('pointerout', () =>
            this.stopFace.clear().fillStyle(0xcc1f1f, 1)
                .fillRoundedRect(-bW / 2, -bH / 2, bW, bH, r));
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Spelare trycker STOPP: bromsa hjulet mjukt och kolla resultatet
    // ─────────────────────────────────────────────────────────────────────
    stopWheel ()
    {
        if (!this.canStop || this.finished || this.wheelState.speed === 0) return;
        this.canStop = false;

        if (this.speedTween) this.speedTween.stop();
        this.speedTween = this.tweens.add({
            targets:    this.wheelState,
            speed:      0,
            duration:   320,
            ease:       'Cubic.Out',
            onComplete: () => this.checkResult()
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Vilket segment befinner sig under pilen när hjulet stannar?
    //
    //  Hjulet roterar medsols. Segment i är centrerat vid i×45° i hjulets
    //  lokala koordinater (0° = toppen, mätt medsols).
    //  När hjulet roterat norm° medsols befinner sig pilen vid lokal
    //  vinkel (360-norm)%360. Det närmaste segmentet är svaret.
    // ─────────────────────────────────────────────────────────────────────
    checkResult ()
    {
        const norm       = ((this.wheelState.angle % 360) + 360) % 360;
        const localArrow = (360 - norm) % 360;
        const SEG_ANG    = 360 / this.NUM_SEG;
        const segAtTop   = Math.round(localArrow / SEG_ANG) % this.NUM_SEG;

        if (segAtTop === this.targetSegment)
            this.onHit();
        else
            this.onMiss();
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Träff!
    // ─────────────────────────────────────────────────────────────────────
    onHit ()
    {
        this.score++;
        this.scoreText.setText('⭐  ' + this.score + ' / ' + this.TOTAL);
        this.showFeedback('🎉  Rätt!', '#51cf66');

        this.launchFirework(
            this.WHEEL_CX + (Math.random() - 0.5) * 160,
            this.WHEEL_CY + (Math.random() - 0.5) * 100,
            this.SEG_COLORS[this.targetSegment]
        );

        // ── Seger? ────────────────────────────────────────────────────────
        if (this.score >= this.TOTAL)
        {
            this.finished = true;
            const total   = (this.time.now - this.startTime) / 1000;
            const palette = [0xff6b6b, 0x5c7cfa, 0xffd23b, 0x51cf66, 0xf06595, 0xcc5de8];
            for (let k = 0; k < 7; k++) {
                this.time.delayedCall(k * 170, () => {
                    this.launchFirework(
                        90 + Math.random() * (this.scale.width - 180),
                        90 + Math.random() * 340,
                        palette[k % palette.length]
                    );
                });
            }
            this.time.delayedCall(900, () => this.showVictory(total));
            return;
        }

        // ── Nytt segment, lite snabbare ────────────────────────────────────
        let next;
        do { next = Math.floor(Math.random() * this.NUM_SEG); }
        while (next === this.targetSegment);
        this.targetSegment = next;
        this.applyTargetHighlight();
        this.updateTargetLabel();

        const newSpeed = Math.min(210, 88 + Math.floor(this.score / 3) * 24);
        this.time.delayedCall(560, () => {
            if (!this.finished) {
                this.wheelState.speed = newSpeed;
                this.canStop          = true;
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Miss — kort visuell reaktion och försök igen
    // ─────────────────────────────────────────────────────────────────────
    onMiss ()
    {
        this.showFeedback('Försök igen! 💨', '#ff6b6b');
        this.tweens.add({
            targets: this.wheelContainer, alpha: 0.35,
            duration: 120, yoyo: true, repeat: 1
        });

        const sameSpeed = Math.min(210, 88 + Math.floor(this.score / 3) * 24);
        this.time.delayedCall(480, () => {
            if (!this.finished) {
                this.wheelState.speed = sameSpeed;
                this.canStop          = true;
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Visa kortlivad feedbacktext
    // ─────────────────────────────────────────────────────────────────────
    showFeedback (msg, color)
    {
        this.feedbackText.setText(msg).setColor(color).setAlpha(1);
        this.tweens.add({
            targets: this.feedbackText,
            alpha:   0,
            delay:   420, duration: 900, ease: 'Quad.In'
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Spelloop
    // ─────────────────────────────────────────────────────────────────────
    update (time, delta)
    {
        if (this.finished) return;

        if (this.startTime === null) this.startTime = time;
        this.timerText.setText('Tid: ' + ((time - this.startTime) / 1000).toFixed(1) + ' s');

        if (this.wheelState.speed > 0)
        {
            this.wheelState.angle += this.wheelState.speed * (delta / 1000);
            this.wheelContainer.setAngle(this.wheelState.angle);
        }
    }
}