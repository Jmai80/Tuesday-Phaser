import { BaseGameScene } from './BaseGameScene';

export class ColorGame extends BaseGameScene
{
    constructor ()
    {
        super('ColorGame');
    }

    preload () {
        this.load.audio('pop', 'assets/pop.mp3');
    }

    create ()
    {
        // --- Färgpalett: namn (att läsa) + färgkod ---
        this.palette = [
            { namn: 'röd',  hex: 0xe74c3c },
            { namn: 'blå',  hex: 0x3b8bd4 },
            { namn: 'gul',  hex: 0xf1c40f },
            { namn: 'grön', hex: 0x2ecc71 },
            { namn: 'lila', hex: 0x9b59b6 }
        ];

        // --- Tillstånd ---
        this.totalRounds = 5;
        this.round = 1;
        this.startTime = null;
        this.finished = false;
        this.locked = false;

        // --- Gnista-textur för partiklarna (en gång) ---
        this.ensureSparkTexture();

        // --- Header: runda, instruktion, mål-ord, timer ---
        this.roundText = this.add.text(this.scale.width / 2, 90,
            'Färg 1 av ' + this.totalRounds, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 150, 'Tryck på färgen:', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        }).setOrigin(0.5);

        this.wordText = this.add.text(this.scale.width / 2, 230, '', {
            fontFamily: 'Arial', fontSize: '72px', color: '#ffffff'
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

        // --- Första rundan ---
        this.newRound();
    }

    newRound ()
    {
        // Städa bort förra rundans ballonger
        if (this.balloons) {
            this.balloons.forEach(b => { b.circle.destroy(); b.string.destroy(); });
        }
        this.balloons = [];

        // Välj mål-färg och visa ordet
        this.targetColor = this.palette[Math.floor(Math.random() * this.palette.length)];
        this.wordText.setText(this.targetColor.namn);

        // Blanda ordningen så de inte ligger på samma plats varje gång
        const order = this.palette.slice();
        this.shuffle(order);

        const spacing = 170;
        const startX = this.scale.width / 2 - ((order.length - 1) * spacing) / 2;
        const y = 470;

        order.forEach((color, i) => {
            const x = startX + i * spacing;

            const circle = this.add.circle(x, y, 55, color.hex)
                .setStrokeStyle(3, 0xffffff)
                .setInteractive({ useHandCursor: true });

            const string = this.add.rectangle(x, y + 70, 2, 22, 0xffffff, 0.6);

            const balloon = { circle, string, color };
            circle.on('pointerdown', () => this.handleBalloonClick(balloon));
            this.balloons.push(balloon);
        });

        this.locked = false;
    }

    handleBalloonClick (balloon)
    {
        if (this.locked) return;
        if (this.startTime === null) this.startTime = this.time.now;

        if (balloon.color.namn === this.targetColor.namn) {
            // Rätt!
            this.sound.play('pop');
            this.locked = true;
            this.popBalloon(balloon);
            this.round++;

            if (this.round > this.totalRounds) {
                this.finished = true;
                const total = (this.time.now - this.startTime) / 1000;
                this.timerText.setText('Tid: ' + total.toFixed(1) + ' s');
                this.time.delayedCall(600, () => this.showVictory(total));
            } else {
                this.roundText.setText('Färg ' + this.round + ' av ' + this.totalRounds);
                this.time.delayedCall(600, () => this.newRound());
            }
        } else {
            // Fel – skaka ballongen, inget straff
            this.shakeBalloon(balloon);
        }
    }

    popBalloon (balloon)
    {
        this.launchFirework(balloon.circle.x, balloon.circle.y, balloon.color.hex);
        this.tweens.add({
            targets: [balloon.circle, balloon.string],
            scale: 1.6,
            alpha: 0,
            duration: 250,
            ease: 'Quad.Out'
        });
    }

    shakeBalloon (balloon)
    {
        const x0 = balloon.circle.x;
        this.tweens.add({
            targets: [balloon.circle, balloon.string],
            x: x0 - 12,
            duration: 60,
            yoyo: true,
            repeat: 3,
            onComplete: () => { balloon.circle.setX(x0); balloon.string.setX(x0); }
        });
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