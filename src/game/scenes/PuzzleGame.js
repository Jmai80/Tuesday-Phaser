import { BaseGameScene } from './BaseGameScene.js';

export class PuzzleGame extends BaseGameScene
{
    constructor ()
    {
        super('PuzzleGame');
    }

    preload ()
    {
        this.load.image('rainbow', 'assets/rainbow.jpg');
    }

    create ()
    {
        this.startTime = null;
        this.finished = false;
        this.placedCount = 0;

        // --- Gnista-textur (en gång) ---
        this.ensureSparkTexture();

        // --- Dela upp bilden i 3x3 bit-rutor (frames) ---
        const cols = 3, rows = 3;
        this.totalPieces = cols * rows;
        const tex = this.textures.get('rainbow');
        const srcW = tex.getSourceImage().width;
        const srcH = tex.getSourceImage().height;
        const fcw = srcW / cols, fch = srcH / rows;

        if (!tex.has('piece0')) {
            let n = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    tex.add('piece' + n, 0,
                        Math.floor(c * fcw), Math.floor(r * fch),
                        Math.floor(fcw), Math.floor(fch));
                    n++;
                }
            }
        }

        // --- Brädet (där bitarna ska hamna), i bildens proportioner ---
        const boardH = 558;
        const boardW = boardH * (srcW / srcH);   // behåller bildens form
        const boardX = 120;
        const boardY = 140;
        const cellW = boardW / cols;
        const cellH = boardH / rows;

        // Svag förhandsvisning av hela bilden som ledtråd
        this.add.image(boardX + boardW / 2, boardY + boardH / 2, 'rainbow')
            .setDisplaySize(boardW, boardH)
            .setAlpha(0.25)
            .setDepth(0);
        this.add.rectangle(boardX + boardW / 2, boardY + boardH / 2, boardW, boardH)
            .setStrokeStyle(3, 0xffffff)
            .setDepth(0);

        // Räkna ut varje ruta-position
        this.slots = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.slots.push({
                    x: boardX + c * cellW + cellW / 2,
                    y: boardY + r * cellH + cellH / 2
                });
            }
        }

        // --- Header ---
        this.add.text(this.scale.width / 2, 50, 'Lägg pusslet!', {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffffff'
        }).setOrigin(0.5);

        this.progressText = this.add.text(this.scale.width / 2, 90,
            'Bitar: 0 / ' + this.totalPieces, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
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

        // --- Skapa bitarna, utspridda i högerkanten ---
        const trayX1 = 580, trayX2 = 940, trayY1 = 180, trayY2 = 650;
        for (let i = 0; i < this.totalPieces; i++) {
            const px = trayX1 + Math.random() * (trayX2 - trayX1);
            const py = trayY1 + Math.random() * (trayY2 - trayY1);

            const piece = this.add.image(px, py, 'rainbow', 'piece' + i)
                .setDisplaySize(cellW, cellH)
                .setDepth(10)
                .setInteractive({ useHandCursor: true });
            this.input.setDraggable(piece);

            piece.slotIndex = i;   // vilken ruta biten hör till
        }

        // --- Dra-och-släpp (sätts upp en gång) ---
        this.input.on('dragstart', (pointer, obj) => {
            if (this.startTime === null) this.startTime = this.time.now;
            obj.setDepth(100);   // lyft fram den man drar
        });
        this.input.on('drag', (pointer, obj, dragX, dragY) => {
            obj.x = dragX;
            obj.y = dragY;
        });
        this.input.on('dragend', (pointer, obj) => {
            this.trySnap(obj);
        });
    }

    trySnap (piece)
    {
        const slot = this.slots[piece.slotIndex];
        const dist = Math.hypot(piece.x - slot.x, piece.y - slot.y);

        if (dist < 70) {
            // Tillräckligt nära – fäst i rutan och lås
            piece.x = slot.x;
            piece.y = slot.y;
            piece.disableInteractive();   // går inte att dra mer
            piece.setDepth(1);

            this.placedCount++;
            this.progressText.setText('Bitar: ' + this.placedCount + ' / ' + this.totalPieces);

            if (this.placedCount === this.totalPieces) {
                this.finished = true;
                const total = (this.time.now - this.startTime) / 1000;
                this.timerText.setText('Tid: ' + total.toFixed(1) + ' s');
                this.time.delayedCall(500, () => this.showVictory(total));
            }
        } else {
            piece.setDepth(10);   // tillbaka till vanligt lager
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