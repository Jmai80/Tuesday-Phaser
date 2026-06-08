import { BaseGameScene } from './BaseGameScene.js';
import { Math as PMath, Utils } from 'phaser';

// ─────────────────────────────────────────────────────────────────────────────
//  KlockSpelet – Tidsmaskinen
//  Lär barn att läsa analoga klockor. 8 runder med ökande svårighet.
//  Passar 6–10 år.
// ─────────────────────────────────────────────────────────────────────────────

export class ClockGame extends BaseGameScene
{
    constructor () { super('ClockGame'); }

    get W () { return this.scale.width;  }
    get H () { return this.scale.height; }

    // ── Svårighetsgrad → tillåtna minuter ───────────────────────────────────
    levelMinutes (lvl)
    {
        if (lvl === 1) return [0, 15, 30, 45];
        if (lvl === 2) return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
        return Array.from({ length: 60 }, (_, i) => i);
    }

    randomInt (min, max)
    {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randomTime (lvl)
    {
        const mins = this.levelMinutes(lvl);
        const hour = this.randomInt(1, 12);
        const min  = mins[this.randomInt(0, mins.length - 1)];
        return { hour, min };
    }

    timeText ({ hour, min })
    {
        return `${hour}:${String(min).padStart(2, '0')}`;
    }

    // Vinkel i radianer (0 = höger, -90° = upp)
    minAngle (min)      { return (min * 6 - 90)  * Math.PI / 180; }
    hourAngle (h, min)  { return ((h % 12) * 30 + min * 0.5 - 90) * Math.PI / 180; }

    // ── Urtavlan ─────────────────────────────────────────────────────────────
    buildClock (cx, cy, r)
    {
        const g = this.add.graphics();

        // Skugga
        g.fillStyle(0x000000, 0.25);
        g.fillCircle(cx + 6, cy + 6, r);

        // Yttre ring
        g.fillStyle(0x1b2a4a, 1);
        g.fillCircle(cx, cy, r);

        // Vit urtavla
        g.fillStyle(0xf5f0e8, 1);
        g.fillCircle(cx, cy, r - 10);

        // Minut- och timmarmarkeringar
        for (let i = 0; i < 60; i++) {
            const ang = (i * 6 - 90) * Math.PI / 180;
            const big = i % 5 === 0;
            const len = big ? 14 : 6;
            const w   = big ? 3  : 1;
            const r1  = r - 14;
            const r2  = r1 - len;
            g.lineStyle(w, big ? 0x1b2a4a : 0x999999, 1);
            g.beginPath();
            g.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
            g.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
            g.strokePath();
        }

        // Siffror 1–12
        for (let i = 1; i <= 12; i++) {
            const ang = (i * 30 - 90) * Math.PI / 180;
            const sr  = r - 38;
            this.add.text(
                cx + Math.cos(ang) * sr,
                cy + Math.sin(ang) * sr,
                String(i),
                { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#1b2a4a' }
            ).setOrigin(0.5);
        }

        // Mittpunkt
        g.fillStyle(0x1b2a4a, 1);
        g.fillCircle(cx, cy, 7);

        return g;
    }

    // ── Rita en visare ───────────────────────────────────────────────────────
    drawHand (g, cx, cy, len, width, color, angle)
    {
        g.clear();
        g.lineStyle(width, color, 1);
        // Fram
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        g.strokePath();
        // Liten bakdel
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx - Math.cos(angle) * (len * 0.18), cy - Math.sin(angle) * (len * 0.18));
        g.strokePath();
    }

    // ── create ───────────────────────────────────────────────────────────────
    create ()
    {
        this.createBackButton();

        this.score       = 0;
        this.round       = 0;
        this.totalRounds = 8;
        this.level       = 1;
        this.startTime   = this.time.now;
        this.answered    = false;

        // Bakgrund
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a0e3a, 0x1a0e3a, 0x0e2a4a, 0x0e2a4a, 1);
        bg.fillRect(0, 0, this.W, this.H);

        // Stjärnor
        for (let i = 0; i < 60; i++) {
            const star = this.add.circle(
                this.randomInt(0, this.W),
                this.randomInt(0, this.H),
                Math.random() * 1.5 + 0.5,
                0xffffff,
                Math.random() * 0.7 + 0.3
            );
            this.tweens.add({
                targets: star, alpha: 0.1,
                duration: this.randomInt(800, 2000),
                yoyo: true, repeat: -1,
                delay: this.randomInt(0, 2000)
            });
        }

        // HUD
        this.scoreTxt = this.add.text(20, 16, 'Poäng: 0', {
            fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffd23b'
        });
        this.roundTxt = this.add.text(this.W - 20, 16, `Runda 1/${this.totalRounds}`, {
            fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(1, 0);

        // Instruktionstext
        this.instrTxt = this.add.text(this.W / 2, 56, '', {
            fontFamily: 'Arial', fontSize: '26px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);

        // Feedback
        this.feedbackTxt = this.add.text(this.W / 2, this.H - 158, '', {
            fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#3bff6b',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(5);

        // Klocka
        this.clockR = 160;
        this.clockX = this.W / 2;
        this.clockY = this.H / 2 - 20;

        this.buildClock(this.clockX, this.clockY, this.clockR);

        this.hourHand  = this.add.graphics().setDepth(3);
        this.minHand   = this.add.graphics().setDepth(4);
        this.add.circle(this.clockX, this.clockY, 8, 0xffd23b).setDepth(5);

        // Svarsalternativ – 4 knappar i 2×2-grid
        this.choices     = [];  // { hour, min } shuffled
        this.correctIdx  = 0;
        this.choiceButtons = [];

        const btnW = 175, btnH = 58;
        const row1Y = this.H - 124, row2Y = this.H - 58;
        const bPositions = [
            { x: this.W / 2 - btnW - 16, y: row1Y },
            { x: this.W / 2 + 16,        y: row1Y },
            { x: this.W / 2 - btnW - 16, y: row2Y },
            { x: this.W / 2 + 16,        y: row2Y },
        ];
        const btnColors = [0x5c7cfa, 0x339af0, 0x20c997, 0xf06595];

        bPositions.forEach((pos, i) => {
            const g   = this.add.graphics();
            const lbl = this.add.text(
                pos.x + btnW / 2, pos.y + btnH / 2, '', {
                    fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff'
                }
            ).setOrigin(0.5).setDepth(2);

            const zone = this.add.zone(pos.x, pos.y, btnW, btnH)
                .setOrigin(0, 0).setInteractive({ useHandCursor: true });

            zone.on('pointerover',  () => { if (!this.answered) g.setAlpha(0.8); });
            zone.on('pointerout',   () => g.setAlpha(1));
            zone.on('pointerdown',  () => { if (!this.answered) this.onAnswer(i); });

            this.choiceButtons.push({ g, lbl, zone, ...pos, w: btnW, h: btnH, baseColor: btnColors[i] });
        });

        this.nextRound();
    }

    // ── Nästa runda ──────────────────────────────────────────────────────────
    nextRound ()
    {
        if (this.round >= this.totalRounds) { this.endGame(); return; }

        this.answered = false;
        this.round++;
        this.feedbackTxt.setText('');

        // Svårighet
        this.level = this.round <= 3 ? 1 : this.round <= 6 ? 2 : 3;
        this.roundTxt.setText(`Runda ${this.round}/${this.totalRounds}`);

        // Rätt svar
        this.correctTime = this.randomTime(this.level);

        // 3 unika fel svar
        const choices = [this.correctTime];
        let attempts = 0;
        while (choices.length < 4 && attempts < 200) {
            attempts++;
            const t = this.randomTime(this.level);
            if (!choices.some(c => c.hour === t.hour && c.min === t.min)) {
                choices.push(t);
            }
        }

        // Blanda
        for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }
        this.correctIdx = choices.findIndex(c => c.hour === this.correctTime.hour && c.min === this.correctTime.min);

        // Rita klockan
        this.drawHand(this.hourHand, this.clockX, this.clockY, this.clockR * 0.55, 9, 0x1b2a4a, this.hourAngle(this.correctTime.hour, this.correctTime.min));
        this.drawHand(this.minHand,  this.clockX, this.clockY, this.clockR * 0.82, 5, 0x333366, this.minAngle(this.correctTime.min));

        // Uppdatera knappar
        this.choiceButtons.forEach(({ g, lbl, x, y, w, h, baseColor }, i) => {
            g.clear();
            g.fillStyle(baseColor, 1);
            g.fillRoundedRect(x, y, w, h, 14);
            g.lineStyle(3, 0xffffff, 0.35);
            g.strokeRoundedRect(x, y, w, h, 14);
            lbl.setText(this.timeText(choices[i]));
            lbl.setColor('#ffffff');
            g.setAlpha(1);
        });

        const instr = this.level === 1 ? 'Vad är klockan?' : this.level === 2 ? 'Vad visar klockan?' : 'Läs av klockan!';
        this.instrTxt.setText(instr);
    }

    // ── Svar ─────────────────────────────────────────────────────────────────
    onAnswer (idx)
    {
        this.answered = true;
        const correct = idx === this.correctIdx;

        this.choiceButtons.forEach(({ g, lbl, x, y, w, h }, i) => {
            g.clear();
            const col = i === this.correctIdx ? 0x33aa33 : i === idx ? 0xcc2222 : 0x444466;
            g.fillStyle(col, 1);
            g.fillRoundedRect(x, y, w, h, 14);
            g.lineStyle(3, 0xffffff, 0.25);
            g.strokeRoundedRect(x, y, w, h, 14);
        });

        if (correct) {
            this.score++;
            this.scoreTxt.setText(`Poäng: ${this.score}`);
            this.feedbackTxt.setText('✓ Rätt!').setColor('#3bff6b');
            this.launchFirework(
                this.clockX + this.randomInt(-80, 80),
                this.clockY + this.randomInt(-60, 60),
                0xffd23b
            );
        } else {
            this.feedbackTxt.setText(`✗ Det var ${this.timeText(this.correctTime)}`).setColor('#ff6b6b');
        }

        this.time.delayedCall(1800, () => this.nextRound());
    }

    // ── Spelet slut ──────────────────────────────────────────────────────────
    endGame ()
    {
        const secs = (this.time.now - this.startTime) / 1000;
        const cx = this.W / 2, cy = this.H / 2;

        this.add.rectangle(cx, cy, this.W, this.H, 0x000000, 0.65).setDepth(10).setInteractive();

        const palette = [0xff3b3b, 0xffd23b, 0x3bff6b, 0x3bb0ff, 0xc23bff, 0xff8c3b];
        for (let i = 0; i < 8; i++) {
            this.time.delayedCall(i * 200, () => {
                this.launchFirework(
                    200 + Math.random() * (this.W - 400),
                    120 + Math.random() * 260,
                    palette[Math.floor(Math.random() * palette.length)]
                );
            });
        }

        const panel  = this.add.container(cx, cy).setDepth(20);
        const bg     = this.add.rectangle(0, 0, 560, 430, 0x1b2a4a).setStrokeStyle(4, 0xffd23b);
        const title  = this.add.text(0, -155, 'Bra jobbat! ⏰', {
            fontFamily: 'Arial Black, Arial', fontSize: '44px', color: '#ffd23b'
        }).setOrigin(0.5);
        const score  = this.add.text(0, -80, `${this.score} av ${this.totalRounds} rätt`, {
            fontFamily: 'Arial', fontSize: '36px', color: '#ffffff'
        }).setOrigin(0.5);
        const time   = this.add.text(0, -28, `Tid: ${secs.toFixed(1)} s`, {
            fontFamily: 'Arial', fontSize: '28px', color: '#aaaaff'
        }).setOrigin(0.5);
        const stars  = this.score >= this.totalRounds * 0.75 ? '⭐⭐⭐' : this.score >= this.totalRounds * 0.5 ? '⭐⭐' : '⭐';
        const starT  = this.add.text(0, 28, stars, { fontSize: '44px' }).setOrigin(0.5);

        const againBtn = this.add.rectangle(0, 108, 400, 64, 0x33aa33).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
        const againLbl = this.add.text(0, 108, 'Spela igen', { fontFamily: 'Arial', fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);
        const menuBtn  = this.add.rectangle(0, 186, 400, 64, 0x3366cc).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
        const menuLbl  = this.add.text(0, 186, 'Tillbaka till menyn', { fontFamily: 'Arial', fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);

        panel.add([bg, title, score, time, starT, againBtn, againLbl, menuBtn, menuLbl]);

        againBtn.on('pointerover', () => againBtn.setFillStyle(0x44bb44));
        againBtn.on('pointerout',  () => againBtn.setFillStyle(0x33aa33));
        menuBtn.on('pointerover',  () => menuBtn.setFillStyle(0x4477dd));
        menuBtn.on('pointerout',   () => menuBtn.setFillStyle(0x3366cc));
        againBtn.on('pointerdown', () => this.scene.restart());
        menuBtn.on('pointerdown',  () => this.scene.start('MainMenu'));

        panel.setScale(0);
        this.tweens.add({ targets: panel, scale: 1, ease: 'Back.Out', duration: 400 });
    }
}