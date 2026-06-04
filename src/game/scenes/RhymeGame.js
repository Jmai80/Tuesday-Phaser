import { BaseGameScene } from './BaseGameScene.js';

export class RhymeGame extends BaseGameScene
{
    constructor ()
    {
        super('RhymeGame');
    }

    create ()
    {
        // --- Rim-familjer: orden i samma grupp rimmar med varandra ---
        this.rhymeGroups = [
            ['katt', 'hatt', 'ratt', 'natt'],
            ['bil', 'pil', 'fil', 'sil'],
            ['mus', 'hus', 'ljus'],
            ['ko', 'sko', 'bro', 'tro'],
            ['tå', 'så', 'grå', 'blå'],
            ['ben', 'sten', 'ren', 'gren'],
            ['hand', 'band', 'land', 'sand'],
            ['båt', 'gråt', 'låt']
        ];

        // --- Tillstånd ---
        this.totalRounds = 5;
        this.round = 1;
        this.choiceCount = 3;
        this.startTime = null;
        this.finished = false;
        this.locked = false;

        this.ensureSparkTexture();

        // --- Header ---
        this.roundText = this.add.text(this.scale.width / 2, 90,
            'Rim 1 av ' + this.totalRounds, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 160, 'Vilket ord rimmar?', {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
        }).setOrigin(0.5);

        this.wordText = this.add.text(this.scale.width / 2, 250, '', {
            fontFamily: 'Arial', fontSize: '72px', color: '#ffd23b'
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

        // --- Första rimmet ---
        this.newRound();
    }

    newRound ()
    {
        // Städa förra rundans kort
        if (this.cards) {
            this.cards.forEach(c => { c.rect.destroy(); c.label.destroy(); });
        }
        this.cards = [];

        // Välj rim-familj, prompt-ord och ett rimmande svar
        this.targetGroup = this.rhymeGroups[Math.floor(Math.random() * this.rhymeGroups.length)];
        const groupCopy = this.targetGroup.slice();
        this.shuffle(groupCopy);
        const prompt = groupCopy[0];
        const answer = groupCopy[1];   // rimmar med prompt
        this.wordText.setText(prompt);

        // Distraktorer: ord från ANDRA familjer (rimmar alltså inte)
        const otherWords = [];
        this.rhymeGroups.forEach(g => {
            if (g !== this.targetGroup) otherWords.push(...g);
        });
        this.shuffle(otherWords);
        const distractors = otherWords.slice(0, this.choiceCount - 1);

        const choices = [answer, ...distractors];
        this.shuffle(choices);

        // Placera korten
        const cardW = 200, cardH = 100, gap = 40, cell = cardW + gap;
        const startX = this.scale.width / 2 - ((choices.length - 1) * cell) / 2;
        const y = 470;

        choices.forEach((word, i) => {
            const x = startX + i * cell;

            const rect = this.add.rectangle(x, y, cardW, cardH, 0x3366cc)
                .setStrokeStyle(3, 0xffffff)
                .setInteractive({ useHandCursor: true });

            const label = this.add.text(x, y, word, {
                fontFamily: 'Arial', fontSize: '40px', color: '#ffffff'
            }).setOrigin(0.5);

            const card = { rect, label, word };
            rect.on('pointerdown', () => this.handleChoice(card));
            this.cards.push(card);
        });

        this.locked = false;
    }

    handleChoice (card)
    {
        if (this.locked) return;
        if (this.startTime === null) this.startTime = this.time.now;

        if (this.targetGroup.includes(card.word)) {
            // Rätt – det rimmar!
            this.sound.play('yay');
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
                this.roundText.setText('Rim ' + this.round + ' av ' + this.totalRounds);
                this.time.delayedCall(600, () => this.newRound());
            }
        } else {
            // Fel – skaka, inget straff
            const x0 = card.rect.x;
            this.tweens.add({
                targets: [card.rect, card.label],
                x: x0 - 12, duration: 60, yoyo: true, repeat: 3,
                onComplete: () => { card.rect.setX(x0); card.label.setX(x0); }
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