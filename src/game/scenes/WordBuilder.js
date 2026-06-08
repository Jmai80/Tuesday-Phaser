import { BaseGameScene } from './BaseGameScene.js';

// ─────────────────────────────────────────────────────────────────────────────
//  Ordbyggaren
//  Ett ord (med emoji-ledtråd) visas. Bokstäver faller uppifrån — klicka/peka
//  på rätt bokstav i rätt ordning för att stava ordet. Fel bokstav = ett hjärta
//  försvinner. Tre hjärtan per ord. Tio ord för seger.
//  Svårighet ökar: fler distraktorbokstäver, snabbare fall.
//  Passar 6–10 år. Inga externa assets används.
// ─────────────────────────────────────────────────────────────────────────────

export class WordBuilder extends BaseGameScene
{
    constructor () { super('WordBuilder'); }

    get W () { return this.scale.width;  }
    get H () { return this.scale.height; }

    // ── Ordlista: ord + emoji-ledtråd ────────────────────────────────────────
    get WORDS ()
    {
        return [
            { word: 'BIL',    hint: '🚗' },
            { word: 'SOL',    hint: '☀️' },
            { word: 'KATT',   hint: '🐱' },
            { word: 'HUND',   hint: '🐶' },
            { word: 'FISK',   hint: '🐟' },
            { word: 'HUS',    hint: '🏠' },
            { word: 'BOK',    hint: '📖' },
            { word: 'MUS',    hint: '🐭' },
            { word: 'SKO',    hint: '👟' },
            { word: 'MÅNE',   hint: '🌙' },
            { word: 'ÄPPLE',  hint: '🍎' },
            { word: 'BOLL',   hint: '⚽' },
            { word: 'TÅRTA',   hint: '🎂' },
            { word: 'SNÖGUBBE', hint: '☃️' },
            { word: 'BLOMMA', hint: '🌸' },
            { word: 'MOLN',   hint: '☁️' },
            { word: 'STJÄRNA', hint: '⭐' },
            { word: 'GLASS',  hint: '🍦' },
            { word: 'PIANO',  hint: '🎹' },
            { word: 'DRAKE',  hint: '🐉' },
        ];
    }

    // ── Bokstavsfärger ───────────────────────────────────────────────────────
    get TILE_COLORS ()
    {
        return [
            0xff6b6b, 0xff922b, 0xffd23b, 0x51cf66,
            0x22b8cf, 0x5c7cfa, 0xf06595, 0xcc5de8,
            0x20c997, 0x74c0fc, 0xa9e34b, 0xff8787
        ];
    }

    // ── create ───────────────────────────────────────────────────────────────
    create ()
    {
        this.createBackButton();

        this.wordsPlayed  = 0;
        this.totalWords   = 10;
        this.score        = 0;
        this.startTime    = this.time.now;

        // Spelbrickor (fallande bokstäver)
        this.tiles        = [];      // { gfx, lbl, x, y, letter, speed, color }
        this.spawnTimer   = 0;

        // Runda-state (sätts i nextWord)
        this.currentWord  = '';
        this.nextIndex    = 0;       // vilken bokstav i ordet vi väntar på härnäst
        this.lives        = 3;
        this.roundOver    = false;
        this.usedWords    = [];

        this.buildBackground();
        this.buildHUD();
        this.buildWordDisplay();
        this.buildProgressSlots();

        this.nextWord();
    }

    // ── Bakgrund ─────────────────────────────────────────────────────────────
    buildBackground ()
    {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x0f3460, 1);
        bg.fillRect(0, 0, this.W, this.H);

        // Prickigt mönster för lite textur
        bg.fillStyle(0xffffff, 0.03);
        for (let x = 0; x < this.W; x += 40) {
            for (let y = 0; y < this.H; y += 40) {
                bg.fillCircle(x, y, 1.5);
            }
        }
    }

    // ── HUD ──────────────────────────────────────────────────────────────────
    buildHUD ()
    {
        // Poäng (centrerat uppe)
        this.scoreTxt = this.add.text(this.W / 2, 16, 'Ord: 0/' + this.totalWords, {
            fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffd23b',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5, 0).setDepth(10);

        // Hjärtan (höger) – ritas om vid förlust
        this.heartTxt = this.add.text(this.W - 20, 16, '', {
            fontFamily: 'Arial', fontSize: '26px'
        }).setOrigin(1, 0).setDepth(10);
        this.updateHearts();
    }

    updateHearts ()
    {
        this.heartTxt.setText('❤️'.repeat(this.lives) + '🖤'.repeat(3 - this.lives));
    }

    // ── Orddisplay: emoji + bokstavsrutor ────────────────────────────────────
    buildWordDisplay ()
    {
        // Emoji-ledtråd
        this.hintTxt = this.add.text(this.W / 2, 80, '', {
            fontFamily: 'Arial', fontSize: '52px'
        }).setOrigin(0.5).setDepth(10);

        // Bokstavsrutor (skapas per ord i nextWord)
        this.slotContainer = this.add.container(0, 0).setDepth(10);
    }

    // ── Framstegsplatser (underst: de bokstäver man hittills klickat rätt) ──
    buildProgressSlots ()
    {
        // Byggs om i nextWord
        this.progressContainer = this.add.container(0, 0).setDepth(10);
    }

    // ── Nästa ord ────────────────────────────────────────────────────────────
    nextWord ()
    {
        this.roundOver  = false;
        this.lives      = 3;
        this.nextIndex  = 0;
        this.spawnTimer = 0;
        this.updateHearts();

        // Rensa fallande brickor
        this.tiles.forEach(t => { t.gfx.destroy(); t.lbl.destroy(); });
        this.tiles = [];

        // Rensa gamla slot-grafik
        this.slotContainer.removeAll(true);
        this.progressContainer.removeAll(true);

        // Välj ord (utan upprepning tills listan tar slut)
        const pool = this.WORDS.filter(w => !this.usedWords.includes(w.word));
        const entry = pool[Math.floor(Math.random() * pool.length)];
        this.usedWords.push(entry.word);
        this.currentWord = entry.word;

        this.hintTxt.setText(entry.hint);
        this.scoreTxt.setText('Ord: ' + this.wordsPlayed + '/' + this.totalWords);

        // Visa tomma bokstavsrutor (ledtråd om hur många bokstäver)
        const n    = this.currentWord.length;
        const boxW = 48, boxH = 52, gap = 10;
        const totalW = n * boxW + (n - 1) * gap;
        const startX = this.W / 2 - totalW / 2;
        const boxY   = 152;

        this.slotGraphics = [];   // { gfx, lbl } per plats
        for (let i = 0; i < n; i++) {
            const x = startX + i * (boxW + gap) + boxW / 2;

            const g = this.add.graphics();
            g.fillStyle(0x2c3e6b, 1);
            g.fillRoundedRect(x - boxW / 2, boxY, boxW, boxH, 8);
            g.lineStyle(2, 0x5c7cfa, 1);
            g.strokeRoundedRect(x - boxW / 2, boxY, boxW, boxH, 8);

            const l = this.add.text(x, boxY + boxH / 2, '_', {
                fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#5c7cfa'
            }).setOrigin(0.5);

            this.slotContainer.add([g, l]);
            this.slotGraphics.push({ g, l, x, y: boxY + boxH / 2, boxW, boxH });
        }

        // Svårighetsgrad: fler distraktorer och snabbare vid senare ord
        const lvl = Math.min(3, Math.floor(this.wordsPlayed / 3) + 1);
        this.difficulty = lvl;
    }

    // ── Skapa en fallande bokstavsbricka ──────────────────────────────────────
    spawnTile ()
    {
        const word    = this.currentWord;
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ';

        // Hur många distraktorer per "rätt" bokstav beror på svårighetsgrad
        const distractorCount = [0, 1, 2, 3][this.difficulty] ?? 2;

        // Bygg poolen: alla bokstäver i ordet som ännu inte är klickade, + distraktorer
        const pool = [];

        // Lägg till bokstäverna som återstår i ordet (inte bara nästa — alla)
        for (let i = this.nextIndex; i < word.length; i++) {
            pool.push({ letter: word[i], correct: i === this.nextIndex });
        }

        // Distraktorer — bokstäver som INTE är nästa rätta bokstav
        for (let d = 0; d < distractorCount; d++) {
            let l;
            do { l = letters[Math.floor(Math.random() * letters.length)]; }
            while (l === word[this.nextIndex]);
            pool.push({ letter: l, correct: false });
        }

        // Välj en slumpmässig från poolen
        const pick   = pool[Math.floor(Math.random() * pool.length)];
        const letter = pick.letter;

        // Position — undvik överlapp med befintliga brickor
        let x, attempts = 0;
        do {
            x = 60 + Math.floor(Math.random() * (this.W - 120));
            attempts++;
        } while (
            attempts < 30 &&
            this.tiles.some(t => Math.abs(t.x - x) < 70 && t.y < 80)
        );

        const color = this.TILE_COLORS[Math.floor(Math.random() * this.TILE_COLORS.length)];
        const speed = 90 + this.difficulty * 30 + Math.random() * 30;
        const size  = 48;

        const gfx = this.add.graphics().setDepth(6);
        gfx.y = -size / 2;
        this.drawTile(gfx, x, 0, size, color, false);

        const lbl = this.add.text(x, -size / 2, letter, {
            fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(7);

        const tile = { gfx, lbl, x, y: -size / 2, letter, speed, color, size };

        // Klickzon
        const zone = this.add.zone(x, -size / 2, size + 16, size + 16)
            .setInteractive({ useHandCursor: true }).setDepth(8);
        zone.on('pointerdown', () => this.onTileClick(tile));
        tile.zone = zone;

        this.tiles.push(tile);
    }

    drawTile (g, x, y, size, color, highlighted)
    {
        // Rita alltid relativt y=0 — gfx.y sköter den faktiska vertikala positionen
        g.clear();
        // Skugga
        g.fillStyle(0x000000, 0.3);
        g.fillRoundedRect(x - size / 2 + 3, -size / 2 + 4, size, size, 10);
        // Botten (mörkare)
        const dark = this.darkenColor(color, 0.65);
        g.fillStyle(dark, 1);
        g.fillRoundedRect(x - size / 2, -size / 2 + 5, size, size, 10);
        // Topp (ljusare)
        g.fillStyle(color, 1);
        g.fillRoundedRect(x - size / 2, -size / 2, size, size - 5, 10);
        // Highlight-ring
        if (highlighted) {
            g.lineStyle(4, 0xffd23b, 1);
            g.strokeRoundedRect(x - size / 2 - 2, -size / 2 - 2, size + 4, size + 4, 12);
        }
    }

    darkenColor (hex, factor)
    {
        const r = Math.floor(((hex >> 16) & 0xff) * factor);
        const g = Math.floor(((hex >> 8)  & 0xff) * factor);
        const b = Math.floor((hex          & 0xff) * factor);
        return (r << 16) | (g << 8) | b;
    }

    // ── Spelaren klickar på en bricka ────────────────────────────────────────
    onTileClick (tile)
    {
        if (this.roundOver) return;

        const expected = this.currentWord[this.nextIndex];

        if (tile.letter === expected) {
            // ✓ Rätt bokstav
            this.onCorrectLetter(tile);
        } else {
            // ✗ Fel bokstav
            this.onWrongLetter(tile);
        }
    }

    onCorrectLetter (tile)
    {
        // Fyll i rätt slot
        const slot = this.slotGraphics[this.nextIndex];
        slot.g.clear();
        slot.g.fillStyle(0x2d6a4f, 1);
        slot.g.fillRoundedRect(slot.x - slot.boxW / 2, slot.y - slot.boxH / 2, slot.boxW, slot.boxH, 8);
        slot.l.setText(tile.letter).setColor('#ffffff');

        // Liten fyrverkeri
        this.launchFirework(tile.x, tile.y, tile.color);

        // Ta bort brickan mjukt
        this.removeTile(tile, true);

        this.nextIndex++;

        // Klart med ordet?
        if (this.nextIndex >= this.currentWord.length) {
            this.onWordComplete();
        }
    }

    onWrongLetter (tile)
    {
        // Skaka brickan
        const origX = tile.x;
        this.tweens.add({
            targets: [tile.gfx, tile.lbl, tile.zone],
            x: '+=' + 12,
            duration: 55, yoyo: true, repeat: 3,
            onComplete: () => {
                tile.gfx.x = 0; tile.lbl.x = origX; tile.zone.x = origX;
            }
        });

        // Färga brickan tillfälligt röd
        this.drawTile(tile.gfx, tile.x, 0, tile.size, 0xcc2222, false);
        this.time.delayedCall(380, () => {
            if (tile.gfx && tile.gfx.active) {
                this.drawTile(tile.gfx, tile.x, 0, tile.size, tile.color, false);
            }
        });

        this.lives--;
        this.updateHearts();

        if (this.lives <= 0) {
            this.onWordFailed();
        }
    }

    onWordComplete ()
    {
        this.roundOver = true;
        this.wordsPlayed++;
        this.score++;
        this.scoreTxt.setText('Ord: ' + this.wordsPlayed + '/' + this.totalWords);

        // Rensa alla brickor
        this.tiles.forEach(t => this.removeTile(t, false));
        this.tiles = [];

        if (this.wordsPlayed >= this.totalWords) {
            const secs = (this.time.now - this.startTime) / 1000;
            this.time.delayedCall(600, () => this.showVictory(secs));
        } else {
            // "Bra!" text
            const msg = this.add.text(this.W / 2, this.H / 2, '⭐ Rätt! ⭐', {
                fontFamily: 'Arial Black, Arial', fontSize: '54px', color: '#ffd23b',
                stroke: '#000000', strokeThickness: 6
            }).setOrigin(0.5).setDepth(20).setScale(0);

            this.tweens.add({
                targets: msg, scale: 1, ease: 'Back.Out', duration: 280,
                onComplete: () => {
                    this.time.delayedCall(700, () => {
                        this.tweens.add({
                            targets: msg, alpha: 0, duration: 250,
                            onComplete: () => { msg.destroy(); this.nextWord(); }
                        });
                    });
                }
            });
        }
    }

    onWordFailed ()
    {
        this.roundOver = true;

        // Visa rätt svar
        const msg = this.add.text(this.W / 2, this.H / 2,
            'Det var: ' + this.currentWord, {
            fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#ff6b6b',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20).setScale(0);

        this.tweens.add({
            targets: msg, scale: 1, ease: 'Back.Out', duration: 300,
            onComplete: () => {
                this.time.delayedCall(1100, () => {
                    this.tweens.add({
                        targets: msg, alpha: 0, duration: 300,
                        onComplete: () => {
                            msg.destroy();
                            this.wordsPlayed++;
                            this.scoreTxt.setText('Ord: ' + this.wordsPlayed + '/' + this.totalWords);

                            if (this.wordsPlayed >= this.totalWords) {
                                const secs = (this.time.now - this.startTime) / 1000;
                                this.showVictory(secs);
                            } else {
                                this.nextWord();
                            }
                        }
                    });
                });
            }
        });
    }

    // ── Ta bort en bricka ────────────────────────────────────────────────────
    removeTile (tile, withTween)
    {
        this.tiles = this.tiles.filter(t => t !== tile);
        if (tile.zone) tile.zone.destroy();

        if (withTween) {
            this.tweens.add({
                targets: [tile.gfx, tile.lbl],
                scale: 1.4, alpha: 0, duration: 220, ease: 'Quad.Out',
                onComplete: () => { tile.gfx.destroy(); tile.lbl.destroy(); }
            });
        } else {
            tile.gfx.destroy();
            tile.lbl.destroy();
        }
    }

    // ── update ───────────────────────────────────────────────────────────────
    update (time, delta)
    {
        const dt = delta / 1000;

        if (this.roundOver) return;

        // ── Spawna brickor ────────────────────────────────────────────────
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            // Max antal brickor på skärmen
            const maxOnScreen = 4 + this.difficulty;
            if (this.tiles.length < maxOnScreen) {
                this.spawnTile();
            }
            // Intervall mellan spawns
            this.spawnTimer = 0.55 - this.difficulty * 0.08 + Math.random() * 0.25;
        }

        // ── Flytta brickor nedåt ──────────────────────────────────────────
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            const tile = this.tiles[i];
            tile.y += tile.speed * dt;

            tile.gfx.y  = tile.y;
            tile.lbl.y  = tile.y;
            tile.zone.y = tile.y;

            // Lyft nästa bokstav med highlight-ring
            const isNext = tile.letter === this.currentWord[this.nextIndex];
            this.drawTile(tile.gfx, tile.x, 0, tile.size, tile.color, isNext);

            // Brickan når botten
            if (tile.y > this.H + 40) {
                // Om det var nästa rätta bokstav → livsförlust
                if (tile.letter === this.currentWord[this.nextIndex]) {
                    this.lives--;
                    this.updateHearts();

                    // Blinka hjärtan
                    this.tweens.add({
                        targets: this.heartTxt, alpha: 0.1,
                        duration: 100, yoyo: true, repeat: 3
                    });

                    if (this.lives <= 0) {
                        if (tile.zone) tile.zone.destroy();
                        tile.gfx.destroy();
                        tile.lbl.destroy();
                        this.tiles.splice(i, 1);
                        this.onWordFailed();
                        return;
                    }
                }

                if (tile.zone) tile.zone.destroy();
                tile.gfx.destroy();
                tile.lbl.destroy();
                this.tiles.splice(i, 1);
            }
        }
    }
}