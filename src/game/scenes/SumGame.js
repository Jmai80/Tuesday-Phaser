import { BaseGameScene } from './BaseGameScene.js';

export class SumGame extends BaseGameScene
{
    constructor ()
    {
        super('SumGame');
    }

    create ()
    {
        // --- Inställningar och tillstånd ---
        this.target = 10;
        this.totalRounds = 3;
        this.round = 1;
        this.currentSum = 0;
        this.startTime = null;
        this.finished = false;
        this.locked = false;   // hindrar klick under övergångar

        // --- Gnista-textur för fyrverkerierna (en gång) ---
        this.ensureSparkTexture();

        // --- Rubrik, runda, summa, timer ---
        this.add.text(this.scale.width / 2, 50, 'Gör 10', {
            fontFamily: 'Arial', fontSize: '44px', color: '#ffd23b'
        }).setOrigin(0.5);

        this.roundText = this.add.text(this.scale.width / 2, 98,
            'Runda 1 av ' + this.totalRounds, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        this.sumText = this.add.text(this.scale.width / 2, 140, 'Din summa: 0', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
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

        // --- Rensa-knapp ---
        const clearBtn = this.add.rectangle(this.scale.width / 2, 715, 180, 48, 0x884444)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true });
        this.add.text(this.scale.width / 2, 715, 'Rensa', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);
        clearBtn.on('pointerdown', () => this.clearSelection());

        // --- Bygg första brädet ---
        this.buildBoard();
    }

    buildBoard ()
    {
        // Ta bort gamla plattor om de finns (vid ny runda)
        if (this.tiles) {
            this.tiles.forEach(t => { t.rect.destroy(); t.label.destroy(); });
        }
        this.tiles = [];

        // Talen 1..9, blandade
        const numbers = [];
        for (let i = 1; i <= 9; i++) numbers.push(i);
        this.shuffle(numbers);

        // 3x3-rutnät, centrerat
        const cols = 3, rows = 3, tileSize = 150, gap = 20, cell = tileSize + gap;
        const gridWidth = cols * tileSize + (cols - 1) * gap;
        const startX = (this.scale.width - gridWidth) / 2;
        const startY = 180;

        let index = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * cell + tileSize / 2;
                const y = startY + r * cell + tileSize / 2;
                const value = numbers[index];

                const rect = this.add.rectangle(x, y, tileSize, tileSize, 0x3366cc)
                    .setStrokeStyle(2, 0xffffff)
                    .setInteractive({ useHandCursor: true });

                const label = this.add.text(x, y, String(value), {
                    fontFamily: 'Arial', fontSize: '52px', color: '#ffffff'
                }).setOrigin(0.5);

                const tile = { rect, label, value, selected: false };
                rect.on('pointerdown', () => this.handleTileClick(tile));
                this.tiles.push(tile);

                index++;
            }
        }

        this.locked = false;
    }

    handleTileClick (tile)
    {
        if (this.locked) return;

        // Starta timern vid första trycket
        if (this.startTime === null) this.startTime = this.time.now;

        // Växla vald/ej vald
        tile.selected = !tile.selected;
        if (tile.selected) {
            tile.rect.setFillStyle(0xf1c40f);   // gul = vald
            tile.label.setColor('#333333');
            this.currentSum += tile.value;
        } else {
            tile.rect.setFillStyle(0x3366cc);    // blå = ej vald
            tile.label.setColor('#ffffff');
            this.currentSum -= tile.value;
        }

        this.updateSumText();

        if (this.currentSum === this.target) {
            this.roundWon();
        }
    }

    updateSumText ()
    {
        let msg = 'Din summa: ' + this.currentSum;
        if (this.currentSum > this.target) {
            msg += '  (för mycket!)';
            this.sumText.setColor('#ff8888');
        } else {
            this.sumText.setColor('#ffffff');
        }
        this.sumText.setText(msg);
    }

    clearSelection ()
    {
        if (this.locked) return;
        this.tiles.forEach(t => {
            t.selected = false;
            t.rect.setFillStyle(0x3366cc);
            t.label.setColor('#ffffff');
        });
        this.currentSum = 0;
        this.updateSumText();
    }

    roundWon ()
    {
        this.locked = true;

        // Flasha de valda plattorna gröna
        this.tiles.forEach(t => { if (t.selected) t.rect.setFillStyle(0x33aa33); });

        this.sound.play('correct');
        this.round++;

        if (this.round > this.totalRounds) {
            this.finished = true;
            const total = (this.time.now - this.startTime) / 1000;
            this.timerText.setText('Tid: ' + total.toFixed(1) + ' s');
            this.time.delayedCall(700, () => this.showVictory(total));
        } else {
            this.roundText.setText('Runda ' + this.round + ' av ' + this.totalRounds);
            this.time.delayedCall(700, () => {
                this.currentSum = 0;
                this.updateSumText();
                this.buildBoard();
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