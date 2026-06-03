import { Scene } from 'phaser';

export class OrderGame extends Scene
{
    constructor ()
    {
        super('OrderGame');
    }

    create ()
    {
        // --- Inställningar för rutnätet ---
        const cols = 4;
        const rows = 4;
        const tileSize = 140;
        const gap = 20;
        const cell = tileSize + gap;

        const gridWidth = cols * tileSize + (cols - 1) * gap;
        const gridHeight = rows * tileSize + (rows - 1) * gap;
        const startX = (this.scale.width - gridWidth) / 2;
        const startY = (this.scale.height - gridHeight) / 2 + 40;

        // --- Spelets tillstånd ---
        this.nextExpected = 1;
        this.totalTiles = cols * rows;
        this.startTime = null;
        this.finished = false;

        // --- Gnista-textur för fyrverkerierna (skapas bara en gång) ---
        if (!this.textures.exists('spark')) {
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(5, 5, 5);
            g.generateTexture('spark', 10, 10);
            g.destroy();
        }

        // --- Rubrik, status och timer ---
        this.add.text(this.scale.width / 2, 40, 'Klicka i stigande ordning', {
            fontFamily: 'Arial', fontSize: '36px', color: '#ffffff'
        }).setOrigin(0.5);

        this.statusText = this.add.text(this.scale.width / 2, 80, 'Nästa: 1', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffff66'
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

        // --- Blandad lista med talen 1..16 ---
        const numbers = [];
        for (let i = 1; i <= this.totalTiles; i++) {
            numbers.push(i);
        }
        this.shuffle(numbers);

        // --- Bygg plattorna ---
        let index = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * cell + tileSize / 2;
                const y = startY + r * cell + tileSize / 2;
                const value = numbers[index];

                const rect = this.add.rectangle(x, y, tileSize, tileSize, 0x3366cc)
                    .setStrokeStyle(2, 0xffffff)
                    .setInteractive({ useHandCursor: true });

                this.add.text(x, y, String(value), {
                    fontFamily: 'Arial', fontSize: '48px', color: '#ffffff'
                }).setOrigin(0.5);

                const tile = { rect, value, solved: false };
                rect.on('pointerdown', () => this.handleClick(tile));

                index++;
            }
        }
    }

    update ()
    {
        if (this.startTime !== null && !this.finished) {
            const elapsed = (this.time.now - this.startTime) / 1000;
            this.timerText.setText('Tid: ' + elapsed.toFixed(1) + ' s');
        }
    }

    handleClick (tile)
    {
        if (tile.solved) return;

        if (tile.value === this.nextExpected) {
            if (this.nextExpected === 1) {
                this.startTime = this.time.now;
            }

            tile.solved = true;
            tile.rect.setFillStyle(0x33aa33);
            tile.rect.disableInteractive();
            this.nextExpected++;

            if (this.nextExpected > this.totalTiles) {
                this.finished = true;
                const total = (this.time.now - this.startTime) / 1000;
                this.timerText.setText('Tid: ' + total.toFixed(1) + ' s');
                this.showVictory(total);
            } else {
                this.statusText.setText('Nästa: ' + this.nextExpected);
            }
        } else {
            const original = tile.rect.fillColor;
            tile.rect.setFillStyle(0xcc3333);
            this.time.delayedCall(250, () => {
                if (!tile.solved) tile.rect.setFillStyle(original);
            });
        }
    }

    showVictory (totalSeconds)
    {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        // Mörk halvgenomskinlig bakgrund som fångar klick
        this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.6)
            .setDepth(10)
            .setInteractive();

        // Avfyra några snabba fyrverkerier
        const colors = [0xff3b3b, 0xffd23b, 0x3bff6b, 0x3bb0ff, 0xc23bff, 0xff8c3b];
        for (let i = 0; i < 8; i++) {
            this.time.delayedCall(i * 200, () => {
                const fx = 200 + Math.random() * (this.scale.width - 400);
                const fy = 120 + Math.random() * 260;
                const color = colors[Math.floor(Math.random() * colors.length)];
                this.launchFirework(fx, fy, color);
            });
        }

        // --- Popup-panel: allt samlat i en container ---
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
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true });
        const againLbl = this.add.text(0, 40, 'Spela igen', {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffffff'
        }).setOrigin(0.5);

        const menuBtn = this.add.rectangle(0, 120, 400, 64, 0x3366cc)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true });
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

        // "Studs in"-animation för panelen
        panel.setScale(0);
        this.tweens.add({
            targets: panel, scale: 1, ease: 'Back.Out', duration: 400
        });
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