import { Scene } from 'phaser';

export class MemoryGame extends Scene
{
    constructor ()
    {
        super('MemoryGame');
    }

    create ()
    {
        // --- Tillstånd ---
        this.firstCard = null;     // första uppvända kortet som väntar på match
        this.locked = false;       // spärr medan ett par jämförs
        this.pairsFound = 0;
        this.totalPairs = 15;
        this.startTime = null;
        this.finished = false;

        // --- Gnista-textur (en gång) ---
        if (!this.textures.exists('spark')) {
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(5, 5, 5);
            g.generateTexture('spark', 10, 10);
            g.destroy();
        }

        // --- Header ---
        this.add.text(this.scale.width / 2, 55, 'Hitta paren!', {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffffff'
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

        // --- Bygg kortleken: 15 emojis i par, blandade ---
        const symbols = ['🚗','☀️','🐱','🐶','🍎','⭐','🌸','🐟','🎈','🍌','🐸','🚀','🦋','🍓','🌙'];
        const deck = [...symbols, ...symbols];   // varje symbol två gånger = 30
        this.shuffle(deck);

        // --- Rutnät 6 x 5 ---
        const cols = 6, rows = 5, cardSize = 116, gap = 14, cell = cardSize + gap;
        const gridWidth = cols * cardSize + (cols - 1) * gap;
        const startX = (this.scale.width - gridWidth) / 2;
        const startY = 100;

        let index = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * cell + cardSize / 2;
                const y = startY + r * cell + cardSize / 2;
                const value = deck[index];

                const rect = this.add.rectangle(x, y, cardSize, cardSize, 0x4a69bd)
                    .setStrokeStyle(2, 0xffffff)
                    .setInteractive({ useHandCursor: true });

                const face = this.add.text(x, y, value, {
                    fontFamily: 'Arial', fontSize: '64px'
                }).setOrigin(0.5).setVisible(false);

                const card = { rect, face, value, faceUp: false, solved: false };
                rect.on('pointerdown', () => this.handleCardClick(card));

                index++;
            }
        }
    }

    handleCardClick (card)
    {
        if (this.locked || card.faceUp || card.solved) return;
        if (this.startTime === null) this.startTime = this.time.now;

        this.revealCard(card);

        if (!this.firstCard) {
            // första kortet i paret
            this.firstCard = card;
        } else {
            // andra kortet – jämför
            this.locked = true;

            if (this.firstCard.value === card.value) {
                // Match!
                card.solved = true;
                this.firstCard.solved = true;
                card.rect.setFillStyle(0xa8e6a3);
                this.firstCard.rect.setFillStyle(0xa8e6a3);
                this.firstCard = null;
                this.pairsFound++;
                this.locked = false;

                if (this.pairsFound === this.totalPairs) {
                    this.finished = true;
                    const total = (this.time.now - this.startTime) / 1000;
                    this.timerText.setText('Tid: ' + total.toFixed(1) + ' s');
                    this.time.delayedCall(500, () => this.showVictory(total));
                }
            } else {
                // Ingen match – vänd tillbaka båda efter en kort paus
                const a = this.firstCard, b = card;
                this.firstCard = null;
                this.time.delayedCall(800, () => {
                    this.hideCard(a);
                    this.hideCard(b);
                    this.locked = false;
                });
            }
        }
    }

    revealCard (card)
    {
        card.faceUp = true;
        card.rect.setFillStyle(0xffffff);
        card.face.setVisible(true);
    }

    hideCard (card)
    {
        card.faceUp = false;
        card.rect.setFillStyle(0x4a69bd);
        card.face.setVisible(false);
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