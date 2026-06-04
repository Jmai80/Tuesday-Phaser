import { BaseGameScene } from './BaseGameScene.js';

export class StarGame extends BaseGameScene
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
        this.ensureSparkTexture();

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

        this.sound.play('correct');
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
}