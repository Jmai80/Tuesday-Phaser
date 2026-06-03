import { Scene } from 'phaser';

export class StarGame extends Scene
{
    constructor ()
    {
        super('StarGame');
    }

    create ()
    {
        // --- Inställningar ---
        this.goal = 30;
        this.collected = 0;
        this.maxDur = 1600;   // synlig tid i början (ms)
        this.minDur = 450;    // synlig tid på slutet (ms) – riktigt kvickt
        this.startTime = null;
        this.finished = false;

        // Spelyta (håller stjärnorna borta från rubrik/knappar)
        this.playLeft = 100;
        this.playRight = 924;
        this.playTop = 160;
        this.playBottom = 690;

        // --- Gnista-textur (en gång) ---
        if (!this.textures.exists('spark')) {
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(5, 5, 5);
            g.generateTexture('spark', 10, 10);
            g.destroy();
        }

        // --- Header ---
        this.add.text(this.scale.width / 2, 55, 'Fånga stjärnorna!', {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffffff'
        }).setOrigin(0.5);

        this.collectedText = this.add.text(this.scale.width / 2, 95,
            'Stjärnor: 0 / ' + this.goal, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffd23b'
        }).setOrigin(0.5);

        this.timerText = this.add.text(this.scale.width - 20, 30, 'Tid: 0.0 s', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(1, 0);

        const backBtn = this.add.rectangle(90, 30, 140, 44, 0x444444)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true });
        this.add.text(90, 30, '← Meny', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5);
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x666666));
        backBtn.on('pointerout',  () => backBtn.setFillStyle(0x444444));
        backBtn.on('pointerdown', () => this.scene.start('MainMenu'));

        // --- Första stjärnan ---
        this.spawnStar();
    }

    spawnStar ()
    {
        if (this.finished) return;

        const x = this.playLeft + Math.random() * (this.playRight - this.playLeft);
        const y = this.playTop + Math.random() * (this.playBottom - this.playTop);

        const star = this.add.star(x, y, 5, 24, 50, 0xffd23b)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true });
        star.on('pointerdown', () => this.collectStar(star));

        // Synlig tid: kortare ju närmare målet man kommer
        const dur = Math.max(
            this.minDur,
            this.maxDur - (this.maxDur - this.minDur) * (this.collected / this.goal)
        );

        // Stjärnan krymper och bleknar = sin egen nedräkning
        this.tweens.add({
            targets: star,
            scale: 0.2,
            alpha: 0.3,
            duration: dur,
            onComplete: () => {
                star.destroy();
                this.spawnStar();   // missad – ny stjärna, inget straff
            }
        });
    }

    collectStar (star)
    {
        if (this.finished) return;

        this.tweens.killTweensOf(star);   // stoppa nedräkningen
        if (this.startTime === null) this.startTime = this.time.now;

        this.collected++;
        this.collectedText.setText('Stjärnor: ' + this.collected + ' / ' + this.goal);
        this.launchFirework(star.x, star.y, 0xffd23b);
        star.destroy();

        if (this.collected >= this.goal) {
            this.finished = true;
            const total = (this.time.now - this.startTime) / 1000;
            this.timerText.setText('Tid: ' + total.toFixed(1) + ' s');
            this.time.delayedCall(400, () => this.showVictory(total));
        } else {
            this.spawnStar();
        }
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
}