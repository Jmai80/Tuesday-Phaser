import { Scene } from 'phaser';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // -----------------------------------------------------------------
        //  SPELLISTAN – menyns innehållsförteckning.
        //  Så här lägger du till ett nytt spel i framtiden:
        //    1. Skapa scenen och registrera den i game/main.js
        //    2. Här nedan: byt scene: null  ->  scene: 'DittSceneNamn'
        //       (och skriv ett lockande namn i title)
        //  Då blir knappen färgad och klickbar automatiskt. Inget mer behövs.
        // -----------------------------------------------------------------
        const games = [
            { title: 'Räknestegen',       scene: 'OrderGame' },
            { title: 'Summaspelet',       scene: 'SumGame' },
            { title: 'Färgfesten',        scene: 'ColorGame' },
            { title: 'Pussel',            scene: 'PuzzleGame' },
            { title: 'Memory',            scene: 'MemoryGame' },
            { title: 'Ljudjakten',        scene: null },
            { title: 'Ordspelet',         scene: 'WordGame' },
            { title: 'Stjärnsamlaren',    scene: 'StarGame' },
            { title: 'Rimraketen',        scene: null },
            { title: 'Mönstermagin',      scene: 'PatternGame' }
        ];

        // --- Rubrik ---
        this.add.text(this.scale.width / 2, 55, 'Välj ett spel', {
            fontFamily: 'Arial', fontSize: '44px', color: '#ffffff'
        }).setOrigin(0.5);

        // --- Layout: 2 kolumner, 5 rader ---
        const cols = 2;
        const btnWidth = 420;
        const btnHeight = 90;
        const gapX = 30;
        const gapY = 18;

        const gridWidth = cols * btnWidth + (cols - 1) * gapX;
        const startX = (this.scale.width - gridWidth) / 2;
        const startY = 120;

        games.forEach((game, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (btnWidth + gapX) + btnWidth / 2;
            const y = startY + row * (btnHeight + gapY) + btnHeight / 2;

            const available = game.scene !== null;

            // Färgad platta om spelet finns, grå om det är en platshållare
            const rect = this.add.rectangle(
                x, y, btnWidth, btnHeight,
                available ? 0x3366cc : 0x3a3a3a
            ).setStrokeStyle(3, available ? 0xffffff : 0x666666);

            this.add.text(x, y, game.title, {
                fontFamily: 'Arial', fontSize: '34px',
                color: available ? '#ffffff' : '#888888'
            }).setOrigin(0.5);

            if (available) {
                rect.setInteractive({ useHandCursor: true });
                rect.on('pointerover', () => rect.setFillStyle(0x4477dd));
                rect.on('pointerout',  () => rect.setFillStyle(0x3366cc));
                rect.on('pointerdown', () => this.scene.start(game.scene));
            } else {
                // liten markering att spelet kommer snart
                this.add.text(x + btnWidth / 2 - 16, y, 'snart', {
                    fontFamily: 'Arial', fontSize: '18px', color: '#777777'
                }).setOrigin(1, 0.5);
            }
        });
    }
}