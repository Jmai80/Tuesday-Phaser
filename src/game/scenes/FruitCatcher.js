import { BaseGameScene } from './BaseGameScene.js';

export class FruitCatcher extends BaseGameScene {
    constructor() {
        super('FruitCatcher');
    }

    create() {
        this.goal = 15;
        this.caught = 0;
        this.finished = false;

        this.fruits = ['🍎', '🍐', '🍊', '🍋', '🍉', '🍇', '🍓', '🫐', '🍒', '🥝', '🍍', '🥭'];

        this.startTime = null;
        this.spawnDelay = 1100;
        this.fallSpeed = 180;

        this.add.text(this.scale.width / 2, 50, 'Fruktfångaren', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.progressText = this.add.text(
            this.scale.width / 2,
            90,
            `Frukter: 0 / ${this.goal}`,
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#ffd23b'
            }
        ).setOrigin(0.5);

        this.timerText = this.add.text(
            this.scale.width - 20,
            20,
            'Tid: 0.0 s',
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#ffffff'
            }
        ).setOrigin(1, 0);

        this.createBackButton();
        this.createBasket();
        this.createControls();

        this.cursors = this.input.keyboard.createCursorKeys();

        this.fruitGroup = this.add.group();

        this.spawnTimer = this.time.addEvent({
            delay: this.spawnDelay,
            callback: this.spawnFruit,
            callbackScope: this,
            loop: true
        });
    }

    createBasket() {
        const basket = this.add.container(
            this.scale.width / 2,
            this.scale.height - 90
        );

        const body = this.add.rectangle(0, 12, 110, 42, 0xc48a42);
        body.setStrokeStyle(4, 0x7a4b20);

        const rim = this.add.rectangle(0, -8, 120, 12, 0xe1b06a);
        rim.setStrokeStyle(3, 0x7a4b20);

        const handle = this.add.arc(0, -12, 42, 180, 360, false, 0x000000, 0);
        handle.setStrokeStyle(6, 0x7a4b20);

        const weave1 = this.add.line(0, 0, -55, 10, 55, 10, 0x8a5728).setLineWidth(2);
        const weave2 = this.add.line(0, 0, -55, 22, 55, 22, 0x8a5728).setLineWidth(2);

        basket.add([body, rim, handle, weave1, weave2]);
        basket.setSize(120, 70);

        this.basket = basket;
        this.basketWidth = 120;
    }

    createControls() {
        const btnStyle = {
            position: 'fixed',
            width: '70px',
            height: '70px',
            fontSize: '34px',
            borderRadius: '18px',
            border: '3px solid #ffffff',
            background: '#2f5ea8',
            color: '#ffffff',
            zIndex: '100',
            touchAction: 'none',
            userSelect: 'none'
        };

        const leftBtn = document.createElement('button');
        const rightBtn = document.createElement('button');

        leftBtn.textContent = '◀';
        rightBtn.textContent = '▶';

        Object.assign(leftBtn.style, btnStyle);
        Object.assign(rightBtn.style, btnStyle);

        document.body.appendChild(leftBtn);
        document.body.appendChild(rightBtn);

        const reposition = () => {
            const r = this.sys.game.canvas.getBoundingClientRect();

            leftBtn.style.left = `${r.left + 20}px`;
            leftBtn.style.top = `${r.bottom + 12}px`;

            rightBtn.style.left = `${r.left + 110}px`;
            rightBtn.style.top = `${r.bottom + 12}px`;
        };

        reposition();
        this.scale.on('resize', reposition);

        this.moveLeft = false;
        this.moveRight = false;

        const pressLeft = () => this.moveLeft = true;
        const releaseLeft = () => this.moveLeft = false;

        const pressRight = () => this.moveRight = true;
        const releaseRight = () => this.moveRight = false;

        leftBtn.addEventListener('pointerdown', pressLeft);
        leftBtn.addEventListener('pointerup', releaseLeft);
        leftBtn.addEventListener('pointerleave', releaseLeft);

        rightBtn.addEventListener('pointerdown', pressRight);
        rightBtn.addEventListener('pointerup', releaseRight);
        rightBtn.addEventListener('pointerleave', releaseRight);

        const cleanup = () => {
            leftBtn.remove();
            rightBtn.remove();
            this.scale.off('resize', reposition);
        };

        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
    }

    spawnFruit() {
        if (this.finished) return;

        const emoji = this.fruits[Math.floor(Math.random() * this.fruits.length)];

        const fruit = this.add.text(
            Math.floor(Math.random() * (this.scale.width - 80)) + 40,
            -40,
            emoji,
            {
                fontSize: '42px'
            }
        ).setOrigin(0.5);

        fruit.speed = this.fallSpeed;
        this.fruitGroup.add(fruit);

        this.fallSpeed += 5;
        this.spawnDelay = Math.max(450, this.spawnDelay - 15);
        this.spawnTimer.delay = this.spawnDelay;
    }

    catchFruit(fruit) {
        if (this.finished) return;

        if (this.startTime === null) {
            this.startTime = this.time.now;
        }

        this.sound.play('correct');
        this.caught++;

        this.progressText.setText(`Frukter: ${this.caught} / ${this.goal}`);

        this.launchFirework(fruit.x, fruit.y, 0x44ff66);
        fruit.destroy();

        if (this.caught >= this.goal) {
            this.finished = true;
            const total = (this.time.now - this.startTime) / 1000;
            this.showVictory(total);
        }
    }

    update(_, delta) {
        if (this.finished) return;

        const moveSpeed = 450 * (delta / 1000);

        if (this.cursors.left.isDown || this.moveLeft) {
            this.basket.x -= moveSpeed;
        }

        if (this.cursors.right.isDown || this.moveRight) {
            this.basket.x += moveSpeed;
        }

        this.basket.x = Math.max(60, Math.min(this.scale.width - 60, this.basket.x));

        this.fruitGroup.getChildren().forEach((fruit) => {
            fruit.y += fruit.speed * (delta / 1000);

            const basketTop = this.basket.y - 25;

            if (fruit.y > basketTop && Math.abs(fruit.x - this.basket.x) < 55) {
                this.catchFruit(fruit);
                return;
            }

            if (fruit.y > this.scale.height + 50) {
                fruit.destroy();
            }
        });

        if (this.startTime !== null) {
            const elapsed = (this.time.now - this.startTime) / 1000;
            this.timerText.setText(`Tid: ${elapsed.toFixed(1)} s`);
        }
    }
}
