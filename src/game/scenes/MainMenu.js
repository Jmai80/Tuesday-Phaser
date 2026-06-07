import { Scene, Geom } from 'phaser';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // -----------------------------------------------------------------
        //  SPELLISTAN – byt scene: null -> 'DittSceneNamn' för att aktivera.
        //  Lägg bara till en rad här för ett nytt spel; rutnätet och
        //  scrollen anpassar sig automatiskt.
        // -----------------------------------------------------------------
        const games = [
            { title: 'Räknestegen',    scene: 'OrderGame' },
            { title: 'Summaspelet',    scene: 'SumGame' },
            { title: 'Färgfesten',     scene: 'ColorGame' },
            { title: 'Pussel',         scene: 'PuzzleGame' },
            { title: 'Memory',         scene: 'MemoryGame' },
            { title: 'Ljudjakten',     scene: 'SoundGame' },
            { title: 'Ordspelet',      scene: 'WordGame' },
            { title: 'Stjärnsamlaren', scene: 'StarGame' },
            { title: 'Rimraketen',     scene: 'RhymeGame' },
            { title: 'Mönstermagin',   scene: 'PatternGame' },
            { title: 'Tre i rad',      scene: 'TicTacToe' },
            { title: 'Fruktfångaren',  scene: 'FruitCatcher' }
        ];

        // --- Bakgrund: mjuk gradient (ligger UTANFÖR scroll-ytan) ---
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x141432, 0x141432, 0x2a1f4a, 0x3a2456, 1);
        bg.fillRect(0, 0, this.scale.width, this.scale.height);

        const palette = [
            0xff6b6b, 0xf06595, 0xcc5de8, 0x845ef7, 0x5c7cfa,
            0x339af0, 0x22b8cf, 0x20c997, 0x51cf66, 0xff922b
        ];

        // --- Rutnät: 3 kolumner ---
        const cols = 3;
        const btnW = 300, btnH = 80, gapX = 30, gapY = 18;
        const rows = Math.ceil(games.length / cols);

        const gridWidth = cols * btnW + (cols - 1) * gapX;
        const startX = (this.scale.width - gridWidth) / 2;

        // --- Scroll-förberedelse -----------------------------------------
        //  Alla knappar läggs i denna container. Scrollning = flytta dess y.
        this.menuLayer = this.add.container(0, 0);

        //  Synligt fönster för spelen (under titeln). Allt utanför klipps.
        const viewTop = 150;
        const viewBottom = this.scale.height - 20;
        const viewportH = viewBottom - viewTop;

        const contentH = rows * btnH + (rows - 1) * gapY;
        const overflow = Math.max(0, contentH - viewportH);

        //  Får allt plats? Centrera. Annars: lägg överst och tillåt scroll.
        const gridTop = overflow > 0
            ? viewTop + 10
            : viewTop + (viewportH - contentH) / 2;
        // -----------------------------------------------------------------

        games.forEach((game, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (btnW + gapX) + btnW / 2;
            const y = gridTop + row * (btnH + gapY) + btnH / 2;
            this.makeButton(x, y, btnW, btnH, game, palette[i % palette.length]);
        });

        //  Klipp scroll-ytan till fönstret (ofarligt även när inget scrollas)
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(0, viewTop, this.scale.width, viewportH);
        this.menuLayer.setMask(maskShape.createGeometryMask());

        //  Slå på scroll bara om spelen faktiskt inte ryms
        if (overflow > 0) {
            this.enableScroll(-overflow, 0);
        }

        // --- Animerad 3D-titel (ligger UTANFÖR scroll-ytan) ---
        this.createTitle(this.scale.width / 2, 90, 'Välj spel');
    }

    makeButton (x, y, w, h, game, color)
    {
        const available = game.scene !== null;
        const radius = 20;
        const faceColor = available ? color : 0x4a4a5a;
        const baseColor = this.darken(faceColor, 0.7);

        // Synlig del (animeras, INTE interaktiv)
        const visual = this.add.container(x, y);

        const base = this.add.graphics();
        base.fillStyle(baseColor, 1);
        base.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, radius);

        const face = this.add.graphics();
        face.fillStyle(faceColor, 1);
        face.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

        const label = this.add.text(0, 0, game.title, {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '26px',
            color: available ? '#ffffff' : '#9a9aa5'
        }).setOrigin(0.5);
        label.setStroke('#2a2a4a', 4);

        visual.add([base, face, label]);
        this.menuLayer.add(visual);          // <- ligger nu i scroll-ytan

        if (!available) {
            const snart = this.add.text(w / 2 - 16, 0, 'snart', {
                fontFamily: 'Arial', fontSize: '16px', color: '#777788'
            }).setOrigin(1, 0.5);
            visual.add(snart);
            return;
        }

        // Osynlig, native, ALDRIG skalad rektangel = stabil träffyta + pekare
        const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });
        this.menuLayer.add(hit);             // <- samma scroll-yta som knappen

        // En knapp räknas som klickad bara om BÅDE down och up skett på den
        // här knappen. Det stoppar ett "släpp" som råkar bäras över från en
        // annan scen (t.ex. ett spels popup-knapp) från att starta fel spel.
        let armed = false;

        hit.on('pointerover', () =>
            this.tweens.add({ targets: visual, scale: 1.04, duration: 120, ease: 'Quad.Out' }));

        hit.on('pointerout', () => {
            armed = false;
            this.tweens.add({ targets: visual, scale: 1, duration: 120, ease: 'Quad.Out' });
        });

        hit.on('pointerdown', () => {
            armed = true;
            this.tweens.add({ targets: visual, scale: 0.95, duration: 80, yoyo: true });
        });

        // Navigera på SLÄPP, och bara om knappen är "armerad" (fått sitt eget
        // pointerdown) och man inte dragit. Det stoppar ett överburet släpp
        // från en annan scens popup-knapp att starta fel spel.
        hit.on('pointerup', () => {
            if (armed && !this.didScrollDrag) this.scene.start(game.scene);
            armed = false;
        });
    }

    // =====================================================================
    //  SCROLL — vilande tills spelen blir fler än som ryms i fönstret.
    //  Mushjul (desktop) + dra med fingret (touch). minY är mest nedscrollat
    //  (negativt), maxY är toppläget (0).
    // =====================================================================
    enableScroll (minY, maxY)
    {
        this.scrollMin = minY;
        this.scrollMax = maxY;
        this.didScrollDrag = false;

        // Mushjul
        this.input.on('wheel', (pointer, over, dx, dy) => {
            this.menuLayer.y = Phaser.Math.Clamp(
                this.menuLayer.y - dy, this.scrollMin, this.scrollMax);
        });

        // Dra (touch + mus)
        this.input.on('pointerdown', (p) => {
            this._dragFromY = p.y;
            this._layerFromY = this.menuLayer.y;
            this.didScrollDrag = false;
        });
        this.input.on('pointermove', (p) => {
            if (!p.isDown) return;
            const delta = p.y - this._dragFromY;
            if (Math.abs(delta) > 8) this.didScrollDrag = true; // skiljer dra från tryck
            this.menuLayer.y = Phaser.Math.Clamp(
                this._layerFromY + delta, this.scrollMin, this.scrollMax);
        });
    }

    createTitle (centerX, targetY, text)
    {
        const style = { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '76px' };
        const faceColor = '#ffd23b';
        const depthColor = '#8a6a00';   // mörkare guld = djup
        const depth = 5;
        const spacing = 4;
        const chars = text.split('');

        // Mät varje bokstavs bredd för att kunna centrera ordet
        const widths = chars.map(ch => {
            const t = this.add.text(0, 0, ch === ' ' ? '\u00A0' : ch, style).setVisible(false);
            const w = t.width;
            t.destroy();
            return w;
        });
        const totalWidth = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);

        let cx = centerX - totalWidth / 2;
        chars.forEach((ch, i) => {
            const w = widths[i];
            const lx = cx + w / 2;

            if (ch !== ' ') {
                const container = this.add.container(lx, targetY);

                // Staplade kopior nedåt-höger = 3D-extrudering
                for (let d = depth; d >= 1; d--) {
                    const sh = this.add.text(d * 1.5, d * 1.5, ch, { ...style, color: depthColor }).setOrigin(0.5);
                    container.add(sh);
                }
                const faceLetter = this.add.text(0, 0, ch, { ...style, color: faceColor }).setOrigin(0.5);
                faceLetter.setStroke('#5a4300', 3);
                container.add(faceLetter);

                // Faller in ovanifrån och studsar på plats, förskjutet per bokstav
                container.y = targetY - 420;
                this.tweens.add({
                    targets: container, y: targetY, ease: 'Bounce.Out', duration: 900, delay: i * 70
                });
            }

            cx += w + spacing;
        });
    }

    darken (hex, f)
    {
        const r = Math.floor(((hex >> 16) & 0xff) * f);
        const g = Math.floor(((hex >> 8) & 0xff) * f);
        const b = Math.floor((hex & 0xff) * f);
        return (r << 16) | (g << 8) | b;
    }
}