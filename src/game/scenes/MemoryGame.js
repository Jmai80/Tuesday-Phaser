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
        this.firstCard = null;
        this.locked = false;
        this.pairsFound = 0;
        this.totalPairs = 15;
        this.startTime = null;
        this.finished = false;

        this.ensureSparkTexture();

        // --- Animerad titel (alla inställningar finns i metoden längst ner) ---
        this.createAnimatedTitle();

        // --- Timer ---
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

        // --- Kortlek: 15 emojis i par, blandade ---
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

    // =====================================================================
    //   ANIMERAD TITEL  —  experimentera fritt!
    //   Nästan allt du vill ändra finns i CFG-blocket direkt nedanför:
    //   text, typsnitt, färger, 3D-tjocklek och hur den rör sig.
    // =====================================================================
    createAnimatedTitle ()
    {
        const CFG = {
            // ---- INNEHÅLL & UTSEENDE ----
            text:        'Hitta paren!',                    // ← byt texten
            x:           this.scale.width / 2,              //   mitten i sidled
            y:           55,                                // ← vilolinje (höjd)
            fontFamily:  'Arial Black, Arial, sans-serif',  // ← byt typsnitt
            fontSize:    48,                                // ← textstorlek
            faceColor:   '#ffd23b',                         // ← ovansidans färg
            depthColor:  '#8a6a00',                         // ← 3D-djupets färg (mörkare)
            depthLayers: 4,                                 // ← hur "tjock" 3D-känslan är
            letterGap:   4,                                 //   avstånd mellan bokstäver

            // ---- ENTRÉ-ANIMATION (bokstäverna faller in) ----
            dropHeight:  300,            //   hur långt ovanifrån de startar
            dropEase:    'Bounce.Out',   // ← prova 'Back.Out' eller 'Elastic.Out'
            dropTime:    800,            //   ms per bokstav
            dropStagger: 60,             //   ms mellan att varje bokstav släpps

            // ---- IDLE-ANIMATION (kul gupp som fortsätter) ----
            idleEnabled: true,           // ← sätt false för att stänga av guppet
            bobAmount:   8,              // ← hur högt de guppar (pixlar)
            bobTime:     900             // ← ms för ett upp-och-ner
        };

        const style = { fontFamily: CFG.fontFamily, fontSize: CFG.fontSize + 'px' };
        const chars = CFG.text.split('');

        // 1) Mät varje bokstavs bredd så att hela ordet kan centreras
        const widths = chars.map(ch => {
            const t = this.add.text(0, 0, ch === ' ' ? '\u00A0' : ch, style).setVisible(false);
            const w = t.width;
            t.destroy();
            return w;
        });
        const totalWidth = widths.reduce((a, b) => a + b, 0) + CFG.letterGap * (chars.length - 1);

        // 2) Bygg varje bokstav som en egen container (så den kan animeras för sig)
        let cx = CFG.x - totalWidth / 2;
        chars.forEach((ch, i) => {
            const w = widths[i];
            const lx = cx + w / 2;

            if (ch !== ' ') {
                const letter = this.add.container(lx, CFG.y);

                // 3D-djup: samma bokstav i mörk färg, staplad snett bakåt-nedåt
                for (let d = CFG.depthLayers; d >= 1; d--) {
                    const shadow = this.add.text(d * 1.5, d * 1.5, ch, {
                        ...style, color: CFG.depthColor
                    }).setOrigin(0.5);
                    letter.add(shadow);
                }
                // Ovansidan (ljus bokstav överst)
                const faceLetter = this.add.text(0, 0, ch, {
                    ...style, color: CFG.faceColor
                }).setOrigin(0.5);
                letter.add(faceLetter);

                // 3) ENTRÉ: starta ovanför och tweena ner till vilolinjen
                letter.y = CFG.y - CFG.dropHeight;
                this.tweens.add({
                    targets: letter,
                    y: CFG.y,
                    ease: CFG.dropEase,
                    duration: CFG.dropTime,
                    delay: i * CFG.dropStagger,          // en bokstav i taget
                    onComplete: () => {
                        // 4) IDLE: när bokstaven landat, starta det eviga guppet
                        if (CFG.idleEnabled) {
                            this.tweens.add({
                                targets: letter,
                                y: CFG.y - CFG.bobAmount,  // gupp upp...
                                ease: 'Sine.InOut',
                                duration: CFG.bobTime,
                                yoyo: true,                // ...och ner igen
                                repeat: -1                 // för alltid
                                // PROVA andra kul rörelser: byt raden "y:" ovan mot
                                //   angle: 6      → en liten vridning fram och tillbaka
                                //   scale: 1.12   → en pulserande storlek
                            });
                        }
                    }
                });

                // VILL DU HELLRE SWISHA IN FRÅN SIDAN än att falla uppifrån?
                //   Byt rad "letter.y = ..." mot:  letter.x = lx - 700;
                //   och i tween:n ovan: byt "y: CFG.y" mot "x: lx" och ease till 'Back.Out'.
            }

            cx += w + CFG.letterGap;
        });
    }

    handleCardClick (card)
    {
        if (this.locked || card.faceUp || card.solved) return;
        if (this.startTime === null) this.startTime = this.time.now;

        this.revealCard(card);

        if (!this.firstCard) {
            this.firstCard = card;
        } else {
            this.locked = true;

            if (this.firstCard.value === card.value) {
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