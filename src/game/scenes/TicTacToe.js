import { BaseGameScene } from './BaseGameScene.js';

export class TicTacToe extends BaseGameScene
{
    constructor ()
    {
        super('TicTacToe');
    }

    // =====================================================================
    //  🔊  LJUD  — så här lägger du till ljud senare:
    //
    //  1) Lägg dina ljudfiler (mp3 eller ogg) i din assets-mapp.
    //  2) Avkommentera raderna nedan. OBS: metoden heter this.load.audio
    //     (INTE this.load.sound). Första argumentet är en nyckel du
    //     hittar på, andra är sökvägen till filen.
    //  3) Uppspelningen är redan inkopplad (this.playSound('...') längre
    //     ner i handleClick och showResult). Den gör ingenting förrän
    //     filen faktiskt är laddad, så inget kraschar om du väntar.
    // =====================================================================
    preload ()
    {
        // ⬇⬇⬇  LÄGG DINA this.load.audio(...)-RADER HÄR  ⬇⬇⬇

        // this.load.audio('place', 'assets/place.mp3');  // när en ruta fylls
        // this.load.audio('win',   'assets/win.mp3');    // vid vinst
        // this.load.audio('draw',  'assets/draw.mp3');   // vid oavgjort

        // ⬆⬆⬆  ----------------------------------------  ⬆⬆⬆
    }

    create ()
    {
        this.ensureSparkTexture();

        // --- Bakgrund (samma känsla som menyn) ---
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x141432, 0x141432, 0x2a1f4a, 0x3a2456, 1);
        bg.fillRect(0, 0, this.scale.width, this.scale.height);

        // --- Spelardata sätts efter namninmatningen ---
        //  index 1 = spelare 1 (kryss), index 2 = spelare 2 (ring)
        this.playerMeta = null;

        // --- Tillbaka-knapp (alltid synlig) ---
        const backBtn = this.add.rectangle(90, 30, 140, 44, 0x444444)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true });
        this.add.text(90, 30, '← Meny', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5);
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x666666));
        backBtn.on('pointerout',  () => backBtn.setFillStyle(0x444444));
        backBtn.on('pointerdown', () => this.scene.start('MainMenu'));

        // --- Starta med namninmatningen ---
        this.showNameEntry();
    }

    // Liten hjälpare: slumpat heltal mellan min och max (utan Phaser-beroende)
    randomInt (min, max)
    {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Spelar ett ljud OM det är laddat – annars händer inget (säkert tomt)
    playSound (key)
    {
        if (this.cache.audio.exists(key)) this.sound.play(key);
    }

    // ---------------------------------------------------------------
    //  STEG 1: skriv in namnen
    // ---------------------------------------------------------------
    showNameEntry ()
    {
        // Allt som hör till namnskärmen läggs här så det kan städas bort sen
        this.nameLayer = this.add.container(0, 0);

        const heading = this.add.text(this.scale.width / 2, 130, 'Tre i rad', {
            fontFamily: 'Arial', fontSize: '56px', color: '#ffd23b'
        }).setOrigin(0.5);

        const sub = this.add.text(this.scale.width / 2, 195, 'Skriv era namn', {
            fontFamily: 'Arial', fontSize: '30px', color: '#ffffff'
        }).setOrigin(0.5);

        this.nameLayer.add([heading, sub]);

        const inputStyle =
            'width:320px;padding:14px;font-size:24px;border-radius:12px;' +
            'border:3px solid #845ef7;text-align:center;font-family:Arial;';
        const btnStyle =
            'width:340px;padding:16px;font-size:26px;border:none;border-radius:14px;' +
            'background:#33aa33;color:#fff;font-family:Arial;cursor:pointer;margin-top:6px;';

        const html =
            '<div style="display:flex;flex-direction:column;gap:16px;align-items:center;">' +
            '  <input id="p1" type="text" maxlength="12" placeholder="Spelare 1 (kryss)" style="' + inputStyle + '" />' +
            '  <input id="p2" type="text" maxlength="12" placeholder="Spelare 2 (ring)"  style="' + inputStyle + '" />' +
            '  <button id="startBtn" style="' + btnStyle + '">Starta spelet</button>' +
            '</div>';

        this.nameDom = this.add.dom(this.scale.width / 2, this.scale.height / 2 + 40)
            .createFromHTML(html);

        this.nameDom.addListener('click');
        this.nameDom.on('click', (event) => {
            if (event.target.id === 'startBtn') {
                const n1 = this.nameDom.getChildByID('p1').value.trim() || 'Spelare 1';
                const n2 = this.nameDom.getChildByID('p2').value.trim() || 'Spelare 2';

                this.playerMeta = [
                    null,
                    { name: n1, symbol: '✕', color: '#ff6b6b', tint: 0xff6b6b },
                    { name: n2, symbol: '◯', color: '#5c7cfa', tint: 0x5c7cfa }
                ];

                // Städa bort namnskärmen så inget ligger kvar bakom brädet
                this.nameLayer.destroy();
                this.nameDom.destroy();

                this.startGame();
            }
        });
    }

    // ---------------------------------------------------------------
    //  STEG 2: spela
    // ---------------------------------------------------------------
    startGame ()
    {
        this.board = [0, 0, 0, 0, 0, 0, 0, 0, 0];   // 0 = tom, 1 / 2 = spelare
        this.current = 1;
        this.finished = false;
        this.cells = [];

        this.boardLayer = this.add.container(0, 0);

        this.turnText = this.add.text(this.scale.width / 2, 70, '', {
            fontFamily: 'Arial', fontSize: '34px', color: '#ffffff'
        }).setOrigin(0.5);
        this.boardLayer.add(this.turnText);
        this.updateTurnText();

        // --- Rita rutnätet ---
        const size = 150, gap = 14, cols = 3;
        const grid = cols * size + (cols - 1) * gap;
        const startX = (this.scale.width - grid) / 2 + size / 2;
        const startY = (this.scale.height - grid) / 2 + size / 2 + 40;

        for (let i = 0; i < 9; i++) {
            const cx = startX + (i % 3) * (size + gap);
            const cy = startY + Math.floor(i / 3) * (size + gap);

            const rect = this.add.rectangle(cx, cy, size, size, 0x2a2350)
                .setStrokeStyle(4, 0x845ef7)
                .setInteractive({ useHandCursor: true });

            rect.on('pointerover', () => { if (this.board[i] === 0 && !this.finished) rect.setFillStyle(0x3a3070); });
            rect.on('pointerout',  () => { if (this.board[i] === 0 && !this.finished) rect.setFillStyle(0x2a2350); });
            rect.on('pointerdown', () => this.handleClick(i));

            this.boardLayer.add(rect);
            this.cells.push({ rect, x: cx, y: cy, label: null });
        }
    }

    updateTurnText ()
    {
        const p = this.playerMeta[this.current];
        this.turnText.setText(p.name + 's tur  ' + p.symbol);
        this.turnText.setColor(p.color);
    }

    handleClick (i)
    {
        if (this.finished || this.board[i] !== 0) return;

        const p = this.playerMeta[this.current];
        this.board[i] = this.current;

        // 🔊 Ljud när en ruta fylls (tyst tills 'place' laddats i preload)
        this.playSound('place');

        const cell = this.cells[i];
        cell.rect.setFillStyle(0x2a2350);
        cell.label = this.add.text(cell.x, cell.y, p.symbol, {
            fontFamily: 'Arial', fontSize: '110px', color: p.color
        }).setOrigin(0.5).setScale(0);
        this.boardLayer.add(cell.label);
        this.tweens.add({ targets: cell.label, scale: 1, ease: 'Back.Out', duration: 250 });

        const winLine = this.getWinningLine(this.current);
        if (winLine) {
            this.finished = true;
            winLine.forEach(idx => this.cells[idx].rect.setFillStyle(0x2f7d32));
            this.time.delayedCall(600, () => this.showResult(this.current));
            return;
        }

        if (this.board.every(v => v !== 0)) {
            this.finished = true;
            this.time.delayedCall(400, () => this.showResult(null)); // oavgjort
            return;
        }

        this.current = this.current === 1 ? 2 : 1;
        this.updateTurnText();
    }

    getWinningLine (player)
    {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (const line of lines) {
            if (line.every(idx => this.board[idx] === player)) return line;
        }
        return null;
    }

    // ---------------------------------------------------------------
    //  Segerpanel (samma stil som övriga spel, visar vinnaren)
    // ---------------------------------------------------------------
    showResult (winner)   // winner = 1, 2 eller null (oavgjort)
    {
        // 🔊 Ljud vid resultat (tyst tills 'win'/'draw' laddats i preload)
        this.playSound(winner ? 'win' : 'draw');

        if (winner) {
            const colors = [0xff6b6b, 0x5c7cfa, 0xffd23b, 0x51cf66];
            for (let k = 0; k < 5; k++) {
                this.time.delayedCall(k * 220, () => {
                    const x = this.randomInt(150, this.scale.width - 150);
                    const y = this.randomInt(120, this.scale.height - 200);
                    this.launchFirework(x, y, colors[k % colors.length]);
                });
            }
        }

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        // Allt i popupen läggs i en container så den är lätt att ta bort
        this.victoryLayer = this.add.container(0, 0);

        const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.55)
            .setInteractive();   // blockar klick på brädet bakom

        const panel = this.add.container(cx, cy);

        const panelBg = this.add.rectangle(0, 0, 520, 380, 0x1d1838)
            .setStrokeStyle(4, 0x845ef7);

        const title = this.add.text(0, -120, winner ? 'Vi har en vinnare!' : 'Oavgjort!', {
            fontFamily: 'Arial', fontSize: '52px', color: '#ffd23b'
        }).setOrigin(0.5);

        const sub = this.add.text(0, -55,
            winner ? this.playerMeta[winner].name + ' vann! 🎉' : 'Ingen vann den här gången', {
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

        panel.add([panelBg, title, sub, againBtn, againLbl, menuBtn, menuLbl]);
        this.victoryLayer.add([overlay, panel]);

        againBtn.on('pointerover', () => againBtn.setFillStyle(0x44bb44));
        againBtn.on('pointerout',  () => againBtn.setFillStyle(0x33aa33));
        menuBtn.on('pointerover',  () => menuBtn.setFillStyle(0x4477dd));
        menuBtn.on('pointerout',   () => menuBtn.setFillStyle(0x3366cc));

        // "Spela igen" behåller samma två spelare och nollställer brädet
        againBtn.on('pointerdown', () => {
            this.victoryLayer.destroy();
            this.boardLayer.destroy();
            this.startGame();
        });
        menuBtn.on('pointerdown', () => this.scene.start('MainMenu'));

        panel.setScale(0);
        this.tweens.add({ targets: panel, scale: 1, ease: 'Back.Out', duration: 400 });
    }
}