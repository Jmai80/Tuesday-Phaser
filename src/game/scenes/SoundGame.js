import { BaseGameScene } from './BaseGameScene.js';

export class SoundGame extends BaseGameScene
{
    constructor ()
    {
        super('SoundGame');
    }

    create ()
    {
        // --- Lista: ord (som läses upp) + bild (emoji) ---
        this.items = [
            { ord: 'bil',  bild: '🚗' },
            { ord: 'sol',  bild: '☀️' },
            { ord: 'katt', bild: '🐱' },
            { ord: 'hund', bild: '🐶' },
            { ord: 'fisk', bild: '🐟' },
            { ord: 'båt',  bild: '⛵' },
            { ord: 'tåg',  bild: '🚂' },
            { ord: 'hus',  bild: '🏠' },
            { ord: 'mus',  bild: '🐭' },
            { ord: 'sko',  bild: '👟' },
            { ord: 'måne', bild: '🌙' },
            { ord: 'räv',  bild: '🦊' }
        ];

        // --- Tillstånd ---
        this.totalRounds = 6;
        this.round = 1;
        this.choiceCount = 3;
        this.startTime = null;
        this.finished = false;
        this.locked = false;

        this.ensureSparkTexture();

        // --- Header ---
        this.roundText = this.add.text(this.scale.width / 2, 90,
            'Ljud 1 av ' + this.totalRounds, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 150, 'Lyssna och tryck på rätt bild', {
            fontFamily: 'Arial', fontSize: '26px', color: '#ffffff'
        }).setOrigin(0.5);

        this.timerText = this.add.text(this.scale.width - 20, 30, 'Tid: 0.0 s', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(1, 0);

        // --- Spela-knapp (högtalare) – säger ordet igen vid tryck ---
        const playBtn = this.add.circle(this.scale.width / 2, 280, 65, 0x3366cc)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true });
        this.add.text(this.scale.width / 2, 280, '🔊', {
            fontFamily: 'Arial', fontSize: '60px'
        }).setOrigin(0.5);
        playBtn.on('pointerover', () => playBtn.setFillStyle(0x4477dd));
        playBtn.on('pointerout',  () => playBtn.setFillStyle(0x3366cc));
        playBtn.on('pointerdown', () => this.speakWord(this.target.ord));

        this.add.text(this.scale.width / 2, 360, '(tryck för att höra igen)', {
            fontFamily: 'Arial', fontSize: '18px', color: '#cccccc'
        }).setOrigin(0.5);

        this.createBackButton();

        // --- Första ljudet ---
        this.newRound();
    }
    createBackButton ()
{
    const btn = super.createBackButton();   // responsiv grund från basen

    // Din styling för Ljudjakten
    Object.assign(btn.style, {
        background:   '#1a1a4a',            // mörkblå som matchar spelplanens färg
        border:       '2px solid #3366cc',
        borderRadius: '12px',
        color:        '#ffffff'
    });

    // Valfritt: hover-effekt via CSS-transition (lägg transition i basen om du inte redan har det)
    btn.addEventListener('mouseenter', () => btn.style.background = '#2a2a6a');
    btn.addEventListener('mouseleave', () => btn.style.background = '#1a1a4a');

    return btn;
}

    newRound ()
    {
        // Städa förra rundans kort
        if (this.cards) {
            this.cards.forEach(c => { c.rect.destroy(); c.label.destroy(); });
        }
        this.cards = [];

        // Välj mål och läs upp det
        this.target = this.items[Math.floor(Math.random() * this.items.length)];
        //this.speakWord(this.target.ord);

        // Bygg valen: rätt bild + distraktorer
        const others = this.items.filter(it => it.ord !== this.target.ord);
        this.shuffle(others);
        const choices = [this.target, ...others.slice(0, this.choiceCount - 1)];
        this.shuffle(choices);

        // Placera korten
        const cardW = 160, cardH = 160, gap = 50, cell = cardW + gap;
        const startX = this.scale.width / 2 - ((choices.length - 1) * cell) / 2;
        const y = 480;

        choices.forEach((item, i) => {
            const x = startX + i * cell;

            const rect = this.add.rectangle(x, y, cardW, cardH, 0x3366cc)
                .setStrokeStyle(3, 0xffffff)
                .setInteractive({ useHandCursor: true });

            const label = this.add.text(x, y, item.bild, {
                fontFamily: 'Arial', fontSize: '90px'
            }).setOrigin(0.5);

            const card = { rect, label, item };
            rect.on('pointerdown', () => this.handleChoice(card));
            this.cards.push(card);
        });

        this.locked = false;
    }

    speakWord (word)
    {
        if (!window.speechSynthesis) return;   // stöds ej i denna webbläsare
        window.speechSynthesis.cancel();       // avbryt ev. pågående
        const utter = new SpeechSynthesisUtterance(word);
        utter.lang = 'sv-SE';
        utter.rate = 0.9;
        window.speechSynthesis.speak(utter);
    }

    handleChoice (card)
    {
        if (this.locked) return;
        if (this.startTime === null) this.startTime = this.time.now;

        if (card.item.ord === this.target.ord) {
            // Rätt!
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
                this.roundText.setText('Ljud ' + this.round + ' av ' + this.totalRounds);
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