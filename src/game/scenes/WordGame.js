import { BaseGameScene } from './BaseGameScene.js';

export class WordGame extends BaseGameScene
{
    constructor ()
    {
        super('WordGame');
    }

    create ()
    {
        // --- Ordlista: ord (att läsa) + bild (emoji) ---
        this.ordlista = [
            { ord: 'bil',  bild: '🚗' },
            { ord: 'sol',  bild: '☀️' },
            { ord: 'katt', bild: '🐱' },
            { ord: 'hund', bild: '🐶' },
            { ord: 'fisk', bild: '🐟' },
            { ord: 'båt',  bild: '⛵' },
            { ord: 'tåg',  bild: '🚂' },
            { ord: 'hus',  bild: '🏠' },
            { ord: 'bok',  bild: '📖' },
            { ord: 'ägg',  bild: '🥚' },
            { ord: 'mus',  bild: '🐭' },
            { ord: 'sko',  bild: '👟' },
            { ord: 'måne', bild: '🌙' },
            { ord: 'räv',  bild: '🦊' },
            { ord: 'orm',  bild: '🐍' }
        ];

        // --- Tillstånd ---
        this.totalRounds = 8;
        this.round = 1;
        this.choiceCount = 3;
        this.startTime = null;
        this.finished = false;
        this.locked = false;

        this.ensureSparkTexture();

        // --- Header ---
        this.roundText = this.add.text(this.scale.width / 2, 90,
            'Ord 1 av ' + this.totalRounds, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 150, 'Läs ordet:', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        }).setOrigin(0.5);

        this.wordText = this.add.text(this.scale.width / 2, 230, '', {
            fontFamily: 'Arial', fontSize: '72px', color: '#ffffff'
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

        // --- Första ordet ---
        this.newRound();
    }

    newRound ()
    {
        // Städa bort förra rundans kort
        if (this.cards) {
            this.cards.forEach(c => { c.rect.destroy(); c.label.destroy(); });
        }
        this.cards = [];

        // Välj mål-ord och visa det
        this.target = this.ordlista[Math.floor(Math.random() * this.ordlista.length)];
        this.wordText.setText(this.target.ord);

        // Bygg valen: rätt bild + distraktorer, sen blanda
        const others = this.ordlista.filter(p => p.ord !== this.target.ord);
        this.shuffle(others);
        const choices = [this.target, ...others.slice(0, this.choiceCount - 1)];
        this.shuffle(choices);

        // Placera korten i en rad
        const cardW = 160, cardH = 160, gap = 50, cell = cardW + gap;
        const startX = this.scale.width / 2 - ((choices.length - 1) * cell) / 2;
        const y = 480;

        choices.forEach((pair, i) => {
            const x = startX + i * cell;

            const rect = this.add.rectangle(x, y, cardW, cardH, 0x3366cc)
                .setStrokeStyle(3, 0xffffff)
                .setInteractive({ useHandCursor: true });

            const label = this.add.text(x, y, pair.bild, {
                fontFamily: 'Arial', fontSize: '90px'
            }).setOrigin(0.5);

            const card = { rect, label, pair };
            rect.on('pointerdown', () => this.handleChoice(card));
            this.cards.push(card);
        });

        this.locked = false;
    }

    handleChoice (card)
    {
        if (this.locked) return;
        if (this.startTime === null) this.startTime = this.time.now;

        if (card.pair.ord === this.target.ord) {
            // Rätt!
            this.sound.play('correct');
            this.locked = true;
            this.launchFirework(card.rect.x, card.rect.y, 0xffd23b);
            this.tweens.add({
                targets: [card.rect, card.label],
                scale: 1.3, alpha: 0, duration: 250, ease: 'Quad.Out'
            });
            this.round++;

            if (this.round > this.totalRounds) {
                this.finished = true;
                const total = (this.time.now - this.startTime) / 1000;
                this.timerText.setText('Tid: ' + total.toFixed(1) + ' s');
                this.time.delayedCall(600, () => this.showVictory(total));
            } else {
                this.roundText.setText('Ord ' + this.round + ' av ' + this.totalRounds);
                this.time.delayedCall(600, () => this.newRound());
            }
        } else {
            // Fel – skaka kortet, inget straff
            this.shakeCard(card);
        }
    }

    shakeCard (card)
    {
        const x0 = card.rect.x;
        this.tweens.add({
            targets: [card.rect, card.label],
            x: x0 - 12,
            duration: 60,
            yoyo: true,
            repeat: 3,
            onComplete: () => { card.rect.setX(x0); card.label.setX(x0); }
        });
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