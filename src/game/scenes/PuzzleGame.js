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
        // --- Animerad titel ---
        this.createAnimatedTitle();

        this.progressText = this.add.text(this.scale.width / 2, 90,
            'Bitar: 0 / ' + this.totalPieces, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        this.timerText = this.add.text(this.scale.width - 20, 30, 'Tid: 0.0 s', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(1, 0);

        // --- Stylad Meny-knapp ---
        this.createBackButton();

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

    // =====================================================================
    //   ANIMERAD TITEL — samma motor som i MemoryGame. Rattarna ligger i CFG.
    // =====================================================================
    createAnimatedTitle ()
    {
        const CFG = {
            text:        'Lägg pusslet!',                   // ← texten
            x:           this.scale.width / 2,
            y:           55,                                // ← höjd (vilolinje)
            fontFamily:  'Arial Black, Arial, sans-serif',  // ← typsnitt
            fontSize:    48,                                // ← storlek
            faceColor:   '#ffd23b',                         // ← ovansidans färg
            depthColor:  '#8a6a00',                         // ← 3D-djupets färg
            depthLayers: 4,                                 // ← 3D-tjocklek
            letterGap:   4,

            dropHeight:  300,            // hur långt ovanifrån bokstäverna faller
            dropEase:    'Bounce.Out',   // ← prova 'Back.Out' / 'Elastic.Out'
            dropTime:    800,
            dropStagger: 60,

            idleEnabled: true,           // ← false stänger av guppet
            bobAmount:   8,              // ← gupphöjd (px)
            bobTime:     900
        };

        const style = { fontFamily: CFG.fontFamily, fontSize: CFG.fontSize + 'px' };
        const chars = CFG.text.split('');

        // Mät bredder för att centrera ordet
        const widths = chars.map(ch => {
            const t = this.add.text(0, 0, ch === ' ' ? '\u00A0' : ch, style).setVisible(false);
            const w = t.width;
            t.destroy();
            return w;
        });
        const totalWidth = widths.reduce((a, b) => a + b, 0) + CFG.letterGap * (chars.length - 1);

        let cx = CFG.x - totalWidth / 2;
        chars.forEach((ch, i) => {
            const w = widths[i];
            const lx = cx + w / 2;

            if (ch !== ' ') {
                const letter = this.add.container(lx, CFG.y);

                // 3D-djup
                for (let d = CFG.depthLayers; d >= 1; d--) {
                    const shadow = this.add.text(d * 1.5, d * 1.5, ch, {
                        ...style, color: CFG.depthColor
                    }).setOrigin(0.5);
                    letter.add(shadow);
                }
                // Ovansidan
                letter.add(this.add.text(0, 0, ch, { ...style, color: CFG.faceColor }).setOrigin(0.5));

                // ENTRÉ: faller in och studsar
                letter.y = CFG.y - CFG.dropHeight;
                this.tweens.add({
                    targets: letter,
                    y: CFG.y,
                    ease: CFG.dropEase,
                    duration: CFG.dropTime,
                    delay: i * CFG.dropStagger,
                    onComplete: () => {
                        // IDLE: evig liten våg (byt 'y' mot 'angle: 6' eller 'scale: 1.12' för annan effekt)
                        if (CFG.idleEnabled) {
                            this.tweens.add({
                                targets: letter,
                                y: CFG.y - CFG.bobAmount,
                                ease: 'Sine.InOut',
                                duration: CFG.bobTime,
                                yoyo: true,
                                repeat: -1
                            });
                        }
                    }
                });
            }

            cx += w + CFG.letterGap;
        });
    }

    // =====================================================================
    //   STYLAD "MENY"-KNAPP — rundad och i guld så den matchar titeln.
    //   Använder samma stabila input-trick som menyn: osynlig, icke-skalad
    //   träffyta + en synlig container som animeras.
    // =====================================================================
    createBackButton ()
    {
        const x = 100, y = 40, w = 160, h = 54, radius = 18;
        const faceColor = 0xffd23b;   // ← guld, matchar titeln (byt fritt)
        const baseColor = 0x3a2c00;   // ← svart, matchar bakgrunden

        const visual = this.add.container(x, y);

        const base = this.add.graphics();
        base.fillStyle(baseColor, 1);
        base.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, radius);

        const face = this.add.graphics();
        face.fillStyle(faceColor, 1);
        face.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

        const label = this.add.text(0, 0, '← Meny', {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '24px', color: '#5a4300'
        }).setOrigin(0.5);
        label.setStroke('#3a2c00', 1);

        visual.add([base, face, label]);

        // Osynlig, aldrig skalad träffyta = stabil input + rätt pekare
        const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        hit.on('pointerover', () =>
            this.tweens.add({ targets: visual, scale: 1.06, duration: 120, ease: 'Quad.Out' }));
        hit.on('pointerout', () =>
            this.tweens.add({ targets: visual, scale: 1, duration: 120, ease: 'Quad.Out' }));
        hit.on('pointerdown', () =>
            this.tweens.add({
                targets: visual, scale: 0.93, duration: 80, yoyo: true,
                onComplete: () => this.scene.start('MainMenu')
            }));
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