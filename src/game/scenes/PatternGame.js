import { BaseGameScene } from './BaseGameScene.js';

export class PatternGame extends BaseGameScene
{
    constructor ()
    {
        super('PatternGame');
    }

    create ()
    {
        // --- Färgpalett ---
        this.palette = [
            { hex: 0xe74c3c },
            { hex: 0x3b8bd4 },
            { hex: 0xf1c40f },
            { hex: 0x2ecc71 },
            { hex: 0x9b59b6 }
        ];

        // --- Tillstånd ---
        this.totalRounds = 5;
        this.round = 1;
        this.startTime = null;
        this.finished = false;
        this.locked = false;

        this.ensureSparkTexture();

        // --- Header (statiskt) ---
        this.roundText = this.add.text(this.scale.width / 2, 90,
            'Mönster 1 av ' + this.totalRounds, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 165, 'Vad kommer sen?', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 425, 'Välj rätt:', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5);

        this.timerText = this.add.text(this.scale.width - 20, 30, 'Tid: 0.0 s', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(1, 0);

        // --- Tillbaka-knapp ---
        const backBtn = this.add.rectangle(90, 30, 140, 44, 0x444444)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true });
        this.add.text(90, 30, '← Meny', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5);
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x666666));
        backBtn.on('pointerout',  () => backBtn.setFillStyle(0x444444));
        backBtn.on('pointerdown', () => this.scene.start('MainMenu'));

        // --- Första mönstret ---
        this.newRound();
    }

    newRound ()
    {
        // Städa förra rundans figurer
        if (this.roundObjects) this.roundObjects.forEach(o => o.destroy());
        this.roundObjects = [];
        this.locked = false;

        // --- Skapa mönstret ---
        const unitLen = Math.random() < 0.5 ? 2 : 3;   // ibland tre färger
        const cols = this.palette.slice();
        this.shuffle(cols);
        const unit = cols.slice(0, unitLen);            // distinkta färger
        const filledCount = unitLen === 2 ? 4 : 5;

        const filled = [];
        for (let i = 0; i < filledCount; i++) filled.push(unit[i % unitLen]);
        this.answer = unit[filledCount % unitLen];      // rätt nästa färg

        // --- Rita mönsterraden + frågetecken ---
        const stripR = 38, stripGap = 24;
        const stripCell = stripR * 2 + stripGap;
        const cellCount = filledCount + 1;
        const stripStartX = this.scale.width / 2 - ((cellCount - 1) * stripCell) / 2;
        const stripY = 295;

        for (let i = 0; i < filledCount; i++) {
            const cx = stripStartX + i * stripCell;
            const c = this.add.circle(cx, stripY, stripR, filled[i].hex)
                .setStrokeStyle(2, 0xffffff);
            this.roundObjects.push(c);
        }

        const qx = stripStartX + filledCount * stripCell;
        const qCircle = this.add.circle(qx, stripY, stripR, 0x222a44)
            .setStrokeStyle(3, 0xffffff);
        const qText = this.add.text(qx, stripY, '?', {
            fontFamily: 'Arial', fontSize: '40px', color: '#ffffff'
        }).setOrigin(0.5);
        this.roundObjects.push(qCircle, qText);

        // --- Valen: rätt färg + två distraktorer ---
        const distractors = this.palette.filter(c => c.hex !== this.answer.hex);
        this.shuffle(distractors);
        const choices = [this.answer, distractors[0], distractors[1]];
        this.shuffle(choices);

        const choiceR = 50, choiceGap = 60;
        const choiceCell = choiceR * 2 + choiceGap;
        const choiceStartX = this.scale.width / 2 - ((choices.length - 1) * choiceCell) / 2;
        const choiceY = 520;

        choices.forEach((color, i) => {
            const x = choiceStartX + i * choiceCell;
            const circle = this.add.circle(x, choiceY, choiceR, color.hex)
                .setStrokeStyle(3, 0xffffff)
                .setInteractive({ useHandCursor: true });
            circle.on('pointerdown', () => this.handleChoice(circle, color));
            this.roundObjects.push(circle);
        });
    }

    handleChoice (circle, color)
    {
        if (this.locked) return;
        if (this.startTime === null) this.startTime = this.time.now;

        if (color.hex === this.answer.hex) {
            // Rätt!
            this.sound.play('correct');
            this.locked = true;
            this.launchFirework(circle.x, circle.y, color.hex);
            this.tweens.add({
                targets: circle, scale: 1.4, alpha: 0, duration: 250, ease: 'Quad.Out'
            });
            this.round++;

            if (this.round > this.totalRounds) {
                this.finished = true;
                const total = (this.time.now - this.startTime) / 1000;
                this.timerText.setText('Tid: ' + total.toFixed(1) + ' s');
                this.time.delayedCall(600, () => this.showVictory(total));
            } else {
                this.roundText.setText('Mönster ' + this.round + ' av ' + this.totalRounds);
                this.time.delayedCall(600, () => this.newRound());
            }
        } else {
            // Fel – skaka, inget straff
            const x0 = circle.x;
            this.tweens.add({
                targets: circle, x: x0 - 12, duration: 60, yoyo: true, repeat: 3,
                onComplete: () => circle.setX(x0)
            });
        }
    }

    update ()
    {
        if (this.startTime !== null && !this.finished) {
            const elapsed = (this.time.now - this.startTime) / 1000;
            this.timerText.setText('Tid: ' + elapsed.toFixed(1) + ' s');
        }
    }

    shuffle (array)
    {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}