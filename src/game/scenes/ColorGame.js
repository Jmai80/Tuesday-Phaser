import { Scene } from 'phaser';

export class ColorGame extends Scene
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
        if (!this.textures.exists('spark')) {
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(5, 5, 5);
            g.generateTexture('spark', 10, 10);
            g.destroy();
        }

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

    showVictory (totalSeconds)
    {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.6)
            .setDepth(10)
            .setInteractive();

        const colors = [0xff3b3b, 0xffd23b, 0x3bff6b, 0x3bb0ff, 0xc23bff, 0xff8c3b];
        for (let i = 0; i < 8; i++) {
            this.time.delayedCall(i * 200, () => {
                const fx = 200 + Math.random() * (this.scale.width - 400);
                const fy = 120 + Math.random() * 260;
                const color = colors[Math.floor(Math.random() * colors.length)];
                this.launchFirework(fx, fy, color);
            });
        }

        const panel = this.add.container(cx, cy).setDepth(20);

        const bg = this.add.rectangle(0, 0, 540, 380, 0x1b2a4a)
            .setStrokeStyle(4, 0xffd23b);
        const title = this.add.text(0, -130, 'Bra jobbat!', {
            fontFamily: 'Arial', fontSize: '52px', color: '#ffd23b'
        }).setOrigin(0.5);
        const timeText = this.add.text(0, -55, 'Tid: ' + totalSeconds.toFixed(1) + ' s', {
            fontFamily: 'Arial', fontSize: '36px', color: '#ffffff'
        }).setOrigin(0.5);

        const againBtn = this.add.rectangle(0, 40, 400, 64, 0x33aa33)
            .setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
        const againLbl = this.add.text(0, 40, 'Spela igen', {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffffff'
        }).setOrigin(0.5);

        const menuBtn = this.add.rectangle(0, 120, 400, 64, 0x3366cc)
            .setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
        const menuLbl = this.add.text(0, 120, 'Tillbaka till menyn', {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffffff'
        }).setOrigin(0.5);

        panel.add([bg, title, timeText, againBtn, againLbl, menuBtn, menuLbl]);

        againBtn.on('pointerover', () => againBtn.setFillStyle(0x44bb44));
        againBtn.on('pointerout',  () => againBtn.setFillStyle(0x33aa33));
        menuBtn.on('pointerover',  () => menuBtn.setFillStyle(0x4477dd));
        menuBtn.on('pointerout',   () => menuBtn.setFillStyle(0x3366cc));
        againBtn.on('pointerdown', () => this.scene.restart());
        menuBtn.on('pointerdown',  () => this.scene.start('MainMenu'));

        panel.setScale(0);
        this.tweens.add({ targets: panel, scale: 1, ease: 'Back.Out', duration: 400 });
    }

    launchFirework (x, y, color)
    {
        const emitter = this.add.particles(x, y, 'spark', {
            speed: { min: 80, max: 260 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 700,
            gravityY: 220,
            tint: color,
            emitting: false
        });
        emitter.setDepth(15);
        emitter.explode(24);
        this.time.delayedCall(1000, () => emitter.destroy());
    }

    shuffle (array)
    {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}