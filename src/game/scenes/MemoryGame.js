import { BaseGameScene } from './BaseGameScene.js';

export class MemoryGame extends BaseGameScene
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
        this.ensureSparkTexture();

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

    shuffle (array)
    {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}