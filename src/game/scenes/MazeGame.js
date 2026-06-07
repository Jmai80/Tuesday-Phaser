import { BaseGameScene } from './BaseGameScene.js';

export class MazeGame extends BaseGameScene
{
    constructor ()
    {
        super('MazeGame');
    }

    create ()
    {
        this.ensureSparkTexture();

        // ── Spelkonstanter ───────────────────────────────────────────────
        this.COLS      = 19;   // antal kolumner
        this.ROWS      = 12;   // antal rader
        this.CELL      = 46;   // cellstorlek i pixlar
        this.OFFSET_X  = 75;   // vänstermarginal för griddet
        this.OFFSET_Y  = 62;   // toppositionen för griddet (under rubriken)
        this.START_COL = 9;    // spelarens startkolumn (mitten)
        this.START_ROW = 5;    // spelarens startrad   (mitten)
        this.EXIT_COL  = 18;   // = COLS - 1 (höger kant)
        this.EXIT_ROW  = 5;    // = START_ROW (samma rad, höger sida)

        // ── Bakgrund ─────────────────────────────────────────────────────
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x141432, 0x141432, 0x2a1f4a, 0x3a2456, 1);
        bg.fillRect(0, 0, this.scale.width, this.scale.height);

        // ── Generera och rita labyrinten ──────────────────────────────────
        this.grid = this.generateMaze();
        this.grid[this.EXIT_ROW][this.EXIT_COL].E = false;   // öppna utgångsväggen
        this.drawMaze();

        // ── Utgångsmarkering (grön kant + 🏠 utanför griddet) ────────────
        const exitEdgeX = this.OFFSET_X + this.COLS * this.CELL;
        const exitEdgeY = this.OFFSET_Y + this.EXIT_ROW * this.CELL;

        const exitGfx = this.add.graphics();
        exitGfx.lineStyle(5, 0x51cf66, 1);
        exitGfx.beginPath();
        exitGfx.moveTo(exitEdgeX, exitEdgeY + 3);
        exitGfx.lineTo(exitEdgeX, exitEdgeY + this.CELL - 3);
        exitGfx.strokePath();

        this.add.text(exitEdgeX + 12, exitEdgeY + this.CELL / 2, '🏠', {
            fontSize: '38px'
        }).setOrigin(0, 0.5);

        // ── Spelare ───────────────────────────────────────────────────────
        this.player = {
            col:    this.START_COL,
            row:    this.START_ROW,
            moving: false
        };
        this.playerSprite = this.add.text(
            this.cellCenterX(this.START_COL),
            this.cellCenterY(this.START_ROW),
            '🐭', { fontSize: '34px' }
        ).setOrigin(0.5).setDepth(5);

        // ── Spelstatus ────────────────────────────────────────────────────
        this.finished  = false;
        this.startTime = null;

        // ── Rubrik ───────────────────────────────────────────────────────
        this.add.text(this.scale.width / 2, 30, 'Labyrinten  🐭', {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '30px', color: '#ffd23b'
        }).setOrigin(0.5);

        // ── Tillbaka-knapp ────────────────────────────────────────────────
        const backBtn = this.add.rectangle(85, 30, 140, 44, 0x444444)
            .setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        this.add.text(85, 30, '← Meny', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5);
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x666666));
        backBtn.on('pointerout',  () => backBtn.setFillStyle(0x444444));
        backBtn.on('pointerdown', () => this.scene.start('MainMenu'));

        // ── Timer ─────────────────────────────────────────────────────────
        this.timerText = this.add.text(this.scale.width - 20, 30, 'Tid: 0.0 s', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'
        }).setOrigin(1, 0.5);

        // ── Tangentbord ───────────────────────────────────────────────────
        this.cursors   = this.input.keyboard.createCursorKeys();
        this.upHeld    = false;
        this.downHeld  = false;
        this.leftHeld  = false;
        this.rightHeld = false;

        // ── D-pad ─────────────────────────────────────────────────────────
        this.makeArrowButtons();

        // Frisättningsgaranti: nollställ alla hålltillstånd vid pekaren-upp
        this.input.on('pointerup', () => {
            this.upHeld = this.downHeld = this.leftHeld = this.rightHeld = false;
        });
    }

    // ── Generera labyrint (rekursiv DFS / backtracker) ─────────────────
    //
    //  Algoritmen bygger ett "spännande träd": varje cell är nåbar från
    //  alla andra, och varje gren utan utväg är en återvändsgränd.
    //  Resultatet är alltid lösbart men med många lockande felvägar.
    // ──────────────────────────────────────────────────────────────────────
    generateMaze ()
    {
        const { COLS, ROWS } = this;
        const opp = { N: 'S', S: 'N', E: 'W', W: 'E' };

        // Fullt stängt rutnät (alla väggar true = på plats)
        const grid = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () =>
                ({ N: true, S: true, E: true, W: true, visited: false })
            )
        );

        const dirs = [
            { dr: -1, dc:  0, dir: 'N' },
            { dr:  1, dc:  0, dir: 'S' },
            { dr:  0, dc:  1, dir: 'E' },
            { dr:  0, dc: -1, dir: 'W' }
        ];

        // Starta DFS från (0, 0)
        const stack = [[0, 0]];
        grid[0][0].visited = true;

        while (stack.length > 0)
        {
            const [r, c] = stack[stack.length - 1];

            // Hitta obesökta grannar
            const free = dirs.filter(({ dr, dc }) => {
                const nr = r + dr, nc = c + dc;
                return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !grid[nr][nc].visited;
            });

            if (free.length > 0)
            {
                // Välj en slumpmässig granne och bryt väggen mellan dem
                const { dr, dc, dir } = free[Math.floor(Math.random() * free.length)];
                const nr = r + dr, nc = c + dc;
                grid[r][c][dir]        = false;   // ta bort vägg mot grannen
                grid[nr][nc][opp[dir]] = false;   // ta bort grannarens motväggar
                grid[nr][nc].visited   = true;
                stack.push([nr, nc]);
            }
            else
            {
                stack.pop();   // återvändsgränd → backa
            }
        }

        return grid;
    }

    // ── Rita labyrinten ────────────────────────────────────────────────────
    drawMaze ()
    {
        const { COLS, ROWS, CELL, OFFSET_X, OFFSET_Y, grid,
                START_COL, START_ROW, EXIT_COL, EXIT_ROW } = this;
        const gfx = this.add.graphics();

        // Cellgolv — svagt varmare ton för att skilja gångbara ytor från bakgrunden
        gfx.fillStyle(0x1e0f42, 1);
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                gfx.fillRect(
                    OFFSET_X + c * CELL + 1,
                    OFFSET_Y + r * CELL + 1,
                    CELL - 2, CELL - 2
                );

        // Startcell — blå ton ("du är här")
        gfx.fillStyle(0x0d2a5a, 1);
        gfx.fillRect(
            OFFSET_X + START_COL * CELL + 1,
            OFFSET_Y + START_ROW * CELL + 1,
            CELL - 2, CELL - 2
        );

        // Utgångscell — varm guldton ("dit ska du")
        gfx.fillStyle(0x3a2200, 1);
        gfx.fillRect(
            OFFSET_X + EXIT_COL * CELL + 1,
            OFFSET_Y + EXIT_ROW * CELL + 1,
            CELL - 2, CELL - 2
        );

        // Väggar — lila, 3 px
        gfx.lineStyle(3, 0x845ef7, 1);
        for (let r = 0; r < ROWS; r++)
        {
            for (let c = 0; c < COLS; c++)
            {
                const cell = grid[r][c];
                const x    = OFFSET_X + c * CELL;
                const y    = OFFSET_Y + r * CELL;

                if (cell.N) {
                    gfx.beginPath();
                    gfx.moveTo(x, y); gfx.lineTo(x + CELL, y);
                    gfx.strokePath();
                }
                if (cell.S) {
                    gfx.beginPath();
                    gfx.moveTo(x, y + CELL); gfx.lineTo(x + CELL, y + CELL);
                    gfx.strokePath();
                }
                if (cell.W) {
                    gfx.beginPath();
                    gfx.moveTo(x, y); gfx.lineTo(x, y + CELL);
                    gfx.strokePath();
                }
                if (cell.E) {
                    gfx.beginPath();
                    gfx.moveTo(x + CELL, y); gfx.lineTo(x + CELL, y + CELL);
                    gfx.strokePath();
                }
            }
        }
    }

    // ── Hjälpare: mittpunkt för en cell i världskoordinater ──────────────
    cellCenterX (col) { return this.OFFSET_X + col * this.CELL + this.CELL / 2; }
    cellCenterY (row) { return this.OFFSET_Y + row * this.CELL + this.CELL / 2; }

    // ── Flytta spelaren i angiven riktning ────────────────────────────────
    movePlayer (dir)
    {
        if (this.player.moving || this.finished) return;

        const { col, row } = this.player;
        const cell = this.grid[row][col];

        // Kontrollera om spelaren kliver ut ur labyrinten via utgången
        if (dir === 'E' && col === this.EXIT_COL && row === this.EXIT_ROW && !cell.E)
        {
            this.player.moving = true;
            this.tweens.add({
                targets:    this.playerSprite,
                x:          this.cellCenterX(col + 1),
                y:          this.cellCenterY(row),
                duration:   200,
                ease:       'Linear',
                onComplete: () => this.onWin()
            });
            return;
        }

        const delta = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] };
        const [dr, dc] = delta[dir];
        const newRow = row + dr;
        const newCol = col + dc;

        // Utanför gridet?
        if (newRow < 0 || newRow >= this.ROWS || newCol < 0 || newCol >= this.COLS) return;

        // Vägg i vägen?
        if (cell[dir]) return;

        // Giltig rörelse — starta tween
        this.player.moving = true;
        this.player.row    = newRow;
        this.player.col    = newCol;

        this.tweens.add({
            targets:    this.playerSprite,
            x:          this.cellCenterX(newCol),
            y:          this.cellCenterY(newRow),
            duration:   120,
            ease:       'Linear',
            onComplete: () => { this.player.moving = false; }
        });
    }

    // ── Spelaren har hittat hem ───────────────────────────────────────────
    onWin ()
    {
        this.finished = true;
        const total = (this.time.now - this.startTime) / 1000;
        this.timerText.setText('Tid: ' + total.toFixed(1) + ' s');

        const colors = [0xff6b6b, 0x5c7cfa, 0xffd23b, 0x51cf66, 0xf06595, 0xcc5de8];
        for (let k = 0; k < 6; k++) {
            this.time.delayedCall(k * 180, () => {
                this.launchFirework(
                    100 + Math.random() * (this.scale.width - 200),
                    100 + Math.random() * 350,
                    colors[k % colors.length]
                );
            });
        }
        this.time.delayedCall(800, () => this.showVictory(total));
    }

    // ── D-pad: fyra pilknappar under labyrinten ───────────────────────────
    makeArrowButtons ()
    {
        const cx   = this.scale.width / 2;
        const upY  = 640;   // upp-knapp
        const midY = 690;   // vänster / höger
        const dnY  = 740;   // ner-knapp
        const sdX  = 56;    // horisontellt avstånd från center

        const btns = [
            { x: cx,       y: upY,  label: '▲', action: 'up'    },
            { x: cx,       y: dnY,  label: '▼', action: 'down'  },
            { x: cx - sdX, y: midY, label: '◀', action: 'left'  },
            { x: cx + sdX, y: midY, label: '▶', action: 'right' }
        ];

        const bW = 48, bH = 48, r = 12;
        const heldKey = { up: 'upHeld', down: 'downHeld', left: 'leftHeld', right: 'rightHeld' };

        for (const btn of btns)
        {
            const vis  = this.add.container(btn.x, btn.y);
            const base = this.add.graphics();
            base.fillStyle(0x3d1a7a, 1);
            base.fillRoundedRect(-bW / 2, -bH / 2 + 4, bW, bH, r);
            const face = this.add.graphics();
            face.fillStyle(0x6633cc, 1);
            face.fillRoundedRect(-bW / 2, -bH / 2, bW, bH, r);
            const lbl = this.add.text(0, 0, btn.label, {
                fontFamily: 'Arial Black', fontSize: '26px', color: '#ffffff'
            }).setOrigin(0.5);
            vis.add([base, face, lbl]);

            const hit = this.add.rectangle(btn.x, btn.y, bW, bH, 0, 0)
                .setInteractive({ useHandCursor: true });

            const key = heldKey[btn.action];
            const setHeld = (val) => { this[key] = val; };

            hit.on('pointerdown', () => {
                this.tweens.add({ targets: vis, scale: 0.88, duration: 60, yoyo: true });
                setHeld(true);
            });
            hit.on('pointerup',  () => setHeld(false));
            hit.on('pointerout', () => {
                setHeld(false);
                face.clear()
                    .fillStyle(0x6633cc, 1)
                    .fillRoundedRect(-bW / 2, -bH / 2, bW, bH, r);
            });
            hit.on('pointerover', () =>
                face.clear()
                    .fillStyle(0x7744dd, 1)
                    .fillRoundedRect(-bW / 2, -bH / 2, bW, bH, r));
        }
    }

    // ── Spelloop ──────────────────────────────────────────────────────────
    update (time, delta)
    {
        if (this.finished) return;

        // Starta timer vid första bildrutan
        if (this.startTime === null) this.startTime = time;

        // Uppdatera timervisning
        this.timerText.setText(
            'Tid: ' + ((time - this.startTime) / 1000).toFixed(1) + ' s'
        );

        // Inmatning (tangentbord och pilknappar)
        if (!this.player.moving)
        {
            if      (this.cursors.up.isDown    || this.upHeld)    this.movePlayer('N');
            else if (this.cursors.down.isDown  || this.downHeld)  this.movePlayer('S');
            else if (this.cursors.left.isDown  || this.leftHeld)  this.movePlayer('W');
            else if (this.cursors.right.isDown || this.rightHeld) this.movePlayer('E');
        }
    }
}