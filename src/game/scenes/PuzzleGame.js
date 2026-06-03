import { Scene } from 'phaser';

export class PuzzleGame extends Scene
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
        if (!this.textures.exists('spark')) {
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(5, 5, 5);
            g.generateTexture('spark', 10, 10);
            g.destroy();
        }

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