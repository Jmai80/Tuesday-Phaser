import { BaseGameScene } from './BaseGameScene.js';

export class OrderGame extends BaseGameScene
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
        this.ensureSparkTexture();

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

    shuffle (array)
    {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}