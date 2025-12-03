// import { ButtonGraphics } from './ButtonGraphics.js'
// import { GameControlPanel } from './GameControlPanel.js'

// import { initEmojiGestures } from './emojiGestures.js';
import { initEmojiWidget } from './emojiWidget.js';
import { StateMonitor } from './StateMonitor.js';

import EmoChat from './EmoChat.js';

// ---------------- Config ----------------
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 1120;

const ARENA_CENTER = { x: CANVAS_WIDTH / 2, y: 640 }; // 740
const ARENA_WIDTH = 420; // общая ширина фигуры (квадрат со срезами) // 400
const ARENA_RATIO = 2.7; // отношение "прямая : скос" = 3 // 1.8 old
const ARENA_ROT_DEG = 0; // поворот арены (градусы)

const TARGET_RADIUS = 30;

const BALL_RADIUS = 22; // радиус шарика
const BALL_COLOR = 0xff0000; // 0xffffff - белый цвет шарика // 0xff0000 - красный
const BALL_MIN_SPEED = 600; // px/s — базовая скорость старта
const BALL_MAX_SPEED = 1000; // верхняя планка скорости

const SAFE_ZONE_R = 80; // радиус безопасной зоны в центре
const SECTOR_ANGLE = 30;
const OUTER_R = 220; // внешний радиус (подгони под свою арену)

// laser
const MIN_FLASH_TIME = 100; // мс, время "вспышки" min
const MAX_FLASH_TIME = 500; // мс, время "вспышки" min

// -------------- Scene -------------------
class ArenaScene extends Phaser.Scene {
    constructor() {
        super("arena");
    }
    preload() {
        // sprites
        this.load.image("bg", "assets/sprites/bg_68.png");
        this.load.image("button", "assets/sprites/button_red.png");
        // this.load.image("emoji_0", "assets/sprites/emoji_0.png");
        // this.load.image("emoji_1", "assets/sprites/emoji_1.png");
        // this.load.image("emoji_2", "assets/sprites/emoji_2.png");
        this.load.image("icon_settings", "assets/sprites/icon_settings.png");
        this.load.image("emo_plane", "assets/sprites/emo_plane_2.png");
       

        // атласы
        // this.load.atlas(
        //     'smileys',
        //     'assets/sprites/sheets/smileys.png',
        //     'assets/sprites/sheets/smileys.json'
        // )

        this.load.spritesheet('emo', 'assets/sprites/sheets/emo.png', {
            frameWidth: 72,     // ширина одной иконки
            frameHeight: 72,    // высота одной иконки
            margin: 0,          // отступ от краёв спрайта (если есть)
            spacing: 0          // промежуток между иконками (если есть)
        });

        // particles
        this.load.image("yellow", "assets/sprites/yellow.png");
        this.load.image("red", "assets/sprites/red.png");
        // звуки
        // this.load.audio("plink", "assets/sfx/plink.mp3");
        this.load.audio("wall", "assets/sfx/wall.mp3");
        this.load.audio("multy_down", "assets/sfx/multy_up.mp3");
        this.load.audio("multy_up", "assets/sfx/plink_3.mp3"); // plink_3
        this.load.audio("greedy", "assets/sfx/greedy.mp3");
        this.load.audio("laser", "assets/sfx/laser_5.mp3");
        this.load.audio("crowd", "assets/sfx/aaaaa.mp3");
        this.load.audio('cashout', 'assets/sfx/cashout.mp3')
        this.load.audio('ambient', 'assets/sfx/ambient.mp3');
        this.load.audio("wall_touch", "assets/sfx/wall.mp3");
        this.load.audio("crash", "assets/sfx/crash_laser.mp3");
        this.load.audio("plink", "assets/sfx/plink.mp3");

    }
    init() {
        this.rtp = [];
        this.times = [];
        this.wins = [];

        this.paused = true;
        this.wallTouchCount = 0;
        this.targetTouchCount = 0;
        this.wallMult = 1;
        this.targetMult = 1;
        this.lastStep = 0;
        this.minCollisionTime = 10000;
        this.lastTouchTime = undefined;

        this.wallTouchX = 0.01;

        this.elapsedSec = 0;

        this.centerX = 320
        this.gridUnit = 80

        this.PORTAL_R = BALL_RADIUS + 10;
        this.PORTAL_LIFETIME = 1000; // мс, сколько живёт фейковый портал
        this.PORTAL_SAFE_MARGIN = 20; // запас до траектории (безопасный)

        this.trailHistory = [];
        this.trailMax = 20; // сколько точек хранить

        // dev
        this.currentZone = undefined;
        this.zoneTime = 10000;
        this.lastZoneTime = undefined;
        this.zoneCount = 0;
        this.flashCount = 0;
        this.bestFlashCount = 0;
        this.maxCrash = 1;

        this.targetCounterDelay = 3900; // мс, через сколько сбрасывается счётчик касаний цели

        this.lastLog = [
            { exitX: +11.02, crashX: +11.04, mode: 'red' },
            // { exitX: +3.42, crashX: +12.34, mode: 'blue' },
            { crashX: +23.76, mode: 'red' },
            { crashX: +12.34, mode: 'red' },
            { exitX: +1.02, crashX: +2.34, mode: 'yellow' },
            // { crashX: +12.34, mode: 'red' },
            { exitX: +2.11, crashX: +2.34, mode: 'red' },
            { exitX: +2.11, crashX: +2.34, mode: 'red' }
        ]; // [{exitX:number|null, crashX:number, mode:string}]
        this.lastLogGroup = this.add.container(10, 130).setDepth(50);
        this.roundsLog = [];
        this.exitX = null

        // супер состояния
        this.gameSuperState = {
            freeze: false,
            freezeTime: 7500,
            greedy: false,
            greedyTime: 12500,
        };
        // состояния
        
        // this.stateMonitor = new StateMonitor({
        //     freeze: false,
        //     greedy: false,
        //     counters: [1, 1, 1],
        // }); // передали дефолт
        this.stateMonitor = new StateMonitor(this)

        // colors
        this.standartColors = {
            white: 0xFBFAF8, // 0xffffff
            red: 0xE60000, // 0xff0000
            blue: 0x05edff, // 6CFFFF // #3DB6FF
            yellow: 0xfcd912, // orange: 0xFF9B0F yellow: 0xfcd912
            black: 0x000000,
            gray: 0xD9D9D9,
            wrapper: 0x212838,
            dark_red: 0x920000
        };

        // text
        this.textColors = {
            white: '#FBFAF8',
            red: '#c60000', // '#E60000' '#920000ff'
            gray: '#bcbcbcff', // '#cccccc'
            yellow: '#fcd912',
            blue: '#05edff',
            black: '#000000'
        }

        // окно слияния цифр и геометрия
        this.NOTICE_MERGE_MS = 180;      // все касания в это окно — сливаются
        this.NOTICE_MERGE_RADIUS = 60;   // если рядом с прошлым поп-апом
        this.NOTICE_LIFT = 40;           // на сколько улетает вверх
        this.NOTICE_DURATION = 4000;      // общая длительность (мс)

        // состояние текущего агрегированного поп-апа
        this.noticeState = {
            active: null,      // Phaser.Text
            sum: 0,            // накопленная сумма
            lastTime: 0,
        };

        this.notices = [];

        // last touches
        this.lastTouchBallPosition = {
            x: 0,
            y: 0
        }

        // депозит
        this.deposit = 10000;
        // this.currentWin = 0;
        this.bet = 100;
        this.win = 0;
        // dev
        // let minValue = 1;
        // const maxValue = 10000;
        // for (let index = 0; index < 1000000; index++) {
        //     const random = Math.random()
        //     if (random < minValue) minValue = random
        //     this.targetCrash = 1 / random
        //     // if (this.targetCrash > maxValue) this.targetCrash = maxValue
        //     this.wins.push(this.targetCrash)
        // }
        // const avgWin = this.wins.reduce((sum, val) => sum + val, 0) / this.wins.length;
        // console.log(this.wins.length, 'ave: WIN', avgWin.toFixed(2), 'min random', minValue, 1 / minValue);

        // function median(arr) {
        //     if (!arr.length) return 0;
        //     const sorted = [...arr].sort((a, b) => a - b); // копия с сортировкой
        //     const mid = Math.floor(sorted.length / 2);
        //     if (sorted.length % 2 === 0) {
        //         return (sorted[mid - 1] + sorted[mid]) / 2;
        //     } else {
        //         return sorted[mid];
        //     }
        // }

        // пример:
        // const med = median(this.wins);
        // console.log("median win =", med.toFixed(2));

        this.wins = []
        // dev
        /**
         * Генерация краша с управляемой волатильностью
         * @param {number} U - равномерное случайное число 0..1 (provably fair)
         * @param {number} alpha - волатильность (1 = классика, <1 = более волатильно)
         * @param {number} [cap=100000] - верхний лимит, чтобы не улетало в бесконечность
         */
        function crashVolatile(U, alpha = 1.0, minCrash = 1.0, cap = 100000) {
            // защитим от 0
            U = Math.min(Math.max(U, Number.EPSILON), 1 - Number.EPSILON);
            const pow = 1 / Math.pow(U, alpha);
            const line = 1 / U
            console.log("crash pow", pow.toFixed(2), "crash line", line.toFixed(2));
            // волатильная форма
            let crash = minCrash + (1 / Math.pow(U, alpha));
            if (cap) crash = Math.min(crash, cap);
            return crash;
        }

        // for (let index = 0; index < 100000; index++) {
        //     const random = Math.random();
        //     // const targetCrash = crashVolatile(random, 0.5, 0, 10000);
        //     const targetCrash = 1/random;
        //     // console.log("targetCrash", targetCrash.toFixed(2));
        //     this.wins.push(targetCrash);
        // }
        // const avgWin =
        //     this.wins.reduce((sum, val) => sum + val, 0) / this.wins.length;
        // const medWin = median(this.wins);
        // const maxWin = Math.max(...this.wins);
        // // console.table(this.wins)
        // console.log('ave: WIN', avgWin.toFixed(2), 'med', medWin.toFixed(2), 'max', maxWin.toFixed(2));

        // // 🧠 Если хочешь проверить численно (в коде)
        // this.printProb(this.wins)


        // RTP 100%, но 10% с выигрыша мы забираем
        let bets = 0;
        let payouts = 0;
        // for (let index = 0; index < 1000000; index++) {
        //     bets += 1;
        //     if (Math.random() > 0.5) payouts += 2 - 2 * 0.05; // 5% с выигрыша
        // }
        // const RTP = (payouts / bets) * 100;
        // console.log('RTP', RTP.toFixed(2) + '%');

        const rtps = [0.8, 0.9, 0.95, 0.98, 0.99, 0.999];
        const depositStart = 100;  // стартовый депозит игрока
        const betSize = 1;          // ставка
        const rounds = 1000000;

        // for (const RTP of rtps) {
        //     let dep = depositStart;
        //     let spins = 0;

        //     // до тех пор, пока не кончились деньги или не превысили лимит ставок
        //     while (dep > 0 && spins < rounds) {
        //         dep -= betSize; // делаем ставку
        //         // если выиграли — возвращаем выигрыш в соответствии с RTP
        //         if (Math.random() < RTP) dep += betSize;
        //         spins++;
        //     }

        //     const percentLost = ((depositStart - dep) / depositStart * 100).toFixed(1);
        //     console.log(
        //         `RTP ${RTP * 100}% → закончились деньги через ${spins} ставок (потеря ${percentLost}% депа)`
        //     );
        // }

    }
    printProb(winsArray) {
        const sorted = [...winsArray].sort((a, b) => a - b);
        function survivalProb(array, x) {
            // console.table(' survivalProb', array)
            return array.filter(c => c > x).length / array.length;
        }
        console.log("P(X>2) ≈", survivalProb(winsArray, 2)); // должно быть ~0.5
        console.log("P(X>10) ≈", survivalProb(winsArray, 10)); // должно быть ~0.1
        console.log("P(X>100) ≈", survivalProb(winsArray, 100)); // ~0.01
    }
    createCounters() {
        const smallFont = "20px Helvetica" // 22
        const y_1 = 32
        const y_2 = 110
        const gapY = 26

        // MODE
        this.add
            .text(20, y_1, "MODE ->", {
                font: smallFont,
                fill: this.textColors.white, // "#fff"
            }).setAlpha(1)
            .setOrigin(0, 0.5)
            .setDepth(20)

        this.modeText = this.add
            .text(20, y_1 + gapY, 'SURVIVAL', {
                font: "16px CyberFont",
                fill: this.textColors.red,
            }).setAlpha(1)
            .setOrigin(0, 0.5)
            .setDepth(20)

        // DEP
        this.add
            .text(505, y_1, "DEP ->", {
                font: smallFont,
                fill: this.textColors.white,
            }).setAlpha(1)
            .setOrigin(0, 0.5)
            .setDepth(20)

        this.depoCounter = this.add
            .text(505, y_1 + gapY, this.deposit.toFixed(2), {
                font: "16px CyberFont",
                fill: this.textColors.red,
            }).setAlpha(1)
            .setOrigin(0, 0.5)
            .setDepth(20)
        // .setText(this.deposit)

        
        // TIME
        this.add
            .text(220, y_2, 'TIME', {
                font: smallFont,
                fill: this.textColors.white,
            }).setAlpha(0.5)
            .setOrigin(0.5, 0.5)
            .setDepth(20)

        this.timeCounter = this.add
            .text(220, y_2 + gapY, 0, {
                font: "16px CyberFont",
                fill: this.textColors.gray,
            }).setAlpha(0.5)
            .setOrigin(0.5, 0.5)
            .setDepth(20)

        // убрать
        // this.flashCounter = this.add
        //     .text(20, 470, this.flashCount, {
        //         font: "24px Helvetica",
        //         fill: this.textColors.white,
        //     }).setAlpha(0)
        //     .setOrigin(0, 0.5);

        // BASE x: 310
        this.add
            .text(420, y_2, 'BASE', {
                font: smallFont,
                fill: this.textColors.white,
            }).setAlpha(0.5)
            .setOrigin(0.5, 0.5)
            .setDepth(20)

        this.baseCounter = this.add
            .text(420, y_2 + gapY, this.wallTouchX, {
                font: "16px CyberFont",
                fill: this.textColors.gray,
            }).setAlpha(0.5)
            .setOrigin(0.5, 0.5)
            .setDepth(20)

        // STAKE x: 405
        this.add
            .text(320, y_2, 'STAKE', {
                font: smallFont,
                fill: this.textColors.white,
            }).setAlpha(1)
            .setOrigin(0.5, 0.5)
            .setDepth(20)

        this.stakeCounter = this.add
            .text(320, y_2 + gapY, this.bet.toFixed(2), {
                font: "16px CyberFont",
                fill: this.textColors.gray,
            }).setAlpha(1)
            .setOrigin(0.5, 0.5)
            .setDepth(20)

        this.outCounter = this.add
            .text(320, 890, '', {
                font: "16px CyberFont",
                fill: this.textColors.gray,
            }).setAlpha(1)
            .setOrigin(0.5, 0.5)
            .setDepth(15)

        // X counter
        this.xCounter = this.add
            .text(320, 370, '', {
                // font: "44px Helvetica",
                fontFamily: 'CyberFont',
                fontSize: '40px',
                fill: this.textColors.red,
            }).setAlpha(1)
            .setOrigin(0.5)
            .setDepth(20)

        // SAFE ZONE
        this.safeZone = this.add
            .text(320, 640, 'SAFETY\nZONE', {
                // font: "44px Helvetica",
                fontFamily: 'CyberFont',
                fontSize: '12px',
                fill: this.textColors.red,
            }).setAlpha(1)
            .setOrigin(0.5)
            .setAlign('center')
            .setDepth(20)

        // GREEDY & FREEZE
        function createSuperName(scene, x, y, text, angle) {
            const superName = scene.add
                .text(x, y, text, {
                    fontFamily: 'CyberFont',
                    fontSize: '40px',
                    fill: scene.textColors.red,
                })
                .setAlpha(1)
                .setOrigin(0.5)
                .setDepth(20)
                .setAngle(angle)

            return superName
        }

        this.superStateName = {
            freeze: createSuperName(this, 40, 640, 'FREEZE', -90),
            greedy: createSuperName(this, 600, 640, 'GREEDY', 90),
        }

        this.buttonText = this.add
            .text(this.button.x, this.button.y, 'CASH', {
                // font: "44px Helvetica",
                fontFamily: 'CyberFont',
                fontSize: '40px',
                fill: this.textColors.black,
            }).setAlpha(1)
            .setOrigin(0.5)
            .setAlign('center')
            .setDepth(20)

        // last - live
        this.add
            .text(20, 110, 'LAST', {
                font: "14px CyberFont",
                fill: this.textColors.red,
            })
            .setAlpha(1)
            .setOrigin(0, 0.5)
            .setDepth(20)

        this.add
            .text(505, 110, 'LIVE', {
                font: "14px CyberFont",
                fill: this.textColors.red,
            })
            .setAlpha(1)
            .setOrigin(0, 0.5)
            .setDepth(20)
    }
    createIcons() {
        // this.iconEmoji = this.add
        //     .image(590, 820, 'smileys', 1)
        //     .setScale(1)
        //     .setOrigin(0.5)
        //     .setAlpha(1)
        //     .setDepth(100)
        //     .setInteractive()

        // function swapIcons(scene) {
        //     const COLS = 16;
        //     const ROWS = 7;
        //     const idx = (row, col) => row * COLS + col;
        //     const row = Phaser.Math.Between(1, ROWS);
        //     const col = Phaser.Math.Between(1, COLS);
        //     scene.iconEmoji.setFrame(idx(row, col));
        // }

        // initEmojiGestures(this, this.iconEmoji, {
        //     onTap: (pointer, icon) => {
        //         console.log('TAP:', icon.frame.name);
        //         // swapIcons(this)
        //     },
        //     onLongPress: () => {
        //         console.log('LONG PRESS...');
        //     },
        //     onSwipeLeft: () => {
        //         console.log('SWIPE LEFT: open menu');
        //     },
        //     onSwipeRight: () => {
        //         console.log('SWIPE RIGHT: next icon');
        //         swapIcons(this)
        //     },
        //     onSwipeUp: () => {
        //         console.log('SWIPE UP: send text');
        //     }
        //     // onSwipeDown: () => {}
        // });
        // const timer = this.time.addEvent({
        //     delay: 3000,      // задержка между кадрами (мс)
        //     repeat: - 1,
        //     callback: () => {
        // this.tweens.add({
        //     targets: this.iconEmoji,
        //     scale: 1.1,
        //     duration: 100,
        //     delay: 1000,
        //     repeat: 1,
        //     yoyo: true,
        //     // ease: "Back.easeOut", // 'Quad.easeOut'
        //     onComplete: () => {

        //     },
        // });
        // },
        // });

        // ЭмоЧат
        // initEmojiWidget(this);

        this.emoChat = new EmoChat(this, 560, 930)

        this.iconSettings = this.add
            .image(50, 820, "icon_settings")
            .setScale(1)
            .setOrigin(0.5)
            .setAlpha(1)
            .setDepth(20)
            .setInteractive()
            .on("pointerdown", () => {
                // console.log("iconSettings touch");
                this.emoChat.switchGestureScheme()
            });
    }
    create() {
        this.bg = this.add
            .image(0, 0, "bg")
            .setScale(1)
            .setOrigin(0, 0)
            .setAlpha(1)
            .setDepth(10)

        this.createIcons()
        this.gfx = this.add.graphics();
        // this.createBars(this.gfx)

        this.createParticles();


        // button
        // this.buttonAction = new ButtonGraphics(
        //     this.scene,
        //     320,
        //     1000,
        //     0xff0000
        // )
        // .setInteractive()
        // .setAlpha(0.5)
        // this.buttonAction.enableHitbox()
        // this.buttonAction.on('pointerdown', () => {
        //     console.log('button pointerdown')
        // })
        const w = 400;
        const h = 200;

        // this.gfx.fillStyle(0x4444aa, 1);
        // this.gfx.fillRect(-w/2, -h/2, w, h);
        this.reflexText = this.add
            .text(320, 1040, "Reflex: -- ms", {
                font: "24px Helvetica",
                color: "#fff",
            })
            .setOrigin(0.5)
            .setDepth(20)
            .setAlpha(0)

        // const button = this.add.container(320, 940);

        // button.setSize(300, 120); // важно для hitArea
        // button.setInteractive();
        // button.on("pointerdown", () => {
        //     if (!this.paused && !this.isExit) {
        //         this.isExit = true;
        //         this.deposit += this.win * this.bet;
        //         this.depoCounter.setText(this.deposit.toFixed(2));
        //     }
        //     // this.buttonTapTime = new Date().getTime();
        //     // const time = this.buttonTapTime - this.laserStart;
        //     // console.log(
        //     //     this.laser ? "LIGHT" : "CLEAR",
        //     //     `Reflex: ${time} ms`,
        //     //     "Is crash?",
        //     //     this.paused ? "YES" : "NO"
        //     // );
        //     // this.reflexText.setText(`Reflex: ${time} ms`);
        // });

        this.button = this.add
            .image(320, 930, "button")
            .setOrigin(0.5)
            .setAlpha(1)
            .setDepth(20)
            .setInteractive()
            .on("pointerdown", () => {
                // console.log("button touch");
                if (!this.paused && !this.isExit && this.win > 1) {
                    this.isExit = true;
                    const win = this.win * this.bet;
                    this.deposit += win;
                    this.depoCounter.setText(this.deposit.toFixed(2));
                    this.stakeCounter.setColor(this.textColors.red)

                    this.outCounter.setText(win.toFixed(2));
                    this.exitX = this.win
                    this.exitMode = 'red'
                    if (this.gameSuperState.freeze) this.exitMode = 'blue'
                    if (this.gameSuperState.greedy) this.exitMode = 'yellow'

                    this.buttonUpdate(0)
                    this.sfx.cashout.play()
                }
            });


        // this.buttonText = this.add
        //     .text(this.button.x, this.button.y, 'CASH', {
        //         // font: "44px Helvetica",
        //         fontFamily: 'CyberFont',
        //         fontSize: '40px',
        //         fill: this.textColors.black,
        //     }).setAlpha(1)
        //     .setOrigin(0.5)
        //     .setAlign('center')
        //     .setDepth(20)


        // new
        // const buttonY = 12 * this.gridUnit

        // this.buttonAction = new ButtonGraphics(
        //     this.scene,
        //     this.centerX,
        //     buttonY,
        //     0xff0000
        // )
        // // .setInteractive()
        // // .setAlpha(0.5)
        // this.buttonAction.enableHitbox()
        // this.buttonAction.on('pointerdown', () => this.onCash?.())

        // this.buttonActionLabel = this.scene.add
        //     .text(this.buttonAction.x, this.buttonAction.y, 'BET', {
        //         font: '40px walibi',
        //         fill: 'black',
        //     })
        //     .setOrigin(0.5)
        //     .setAlign('center')

        // this.gameControlPanel = new GameControlPanel(this, {
        //     // onCash: () => this.handleButtonClick(),
        //     // onTuner: () => this.riskTuner.show(true),
        //     // onAuto: () => this.autoSetting.show(true, this.currentAutoSetting),
        // })

        // Контур арены: квадрат со срезанными углами (2:1) + поворот
        this.arenaSegments = buildChamferedSquareSegments(
            ARENA_CENTER.x,
            ARENA_CENTER.y,
            ARENA_WIDTH,
            ARENA_RATIO,
            Phaser.Math.DegToRad(ARENA_ROT_DEG)
        );

        // zones
        // drawZones(this, ARENA_CENTER, OUTER_R, SAFE_ZONE_R, SECTOR_ANGLE);
        this.zones = buildZonesOverlays(
            this,
            ARENA_CENTER,
            OUTER_R,
            SAFE_ZONE_R,
            SECTOR_ANGLE
        );

        // for (let index = 1; index < this.zones.length; index++) {
        //     this.time.addEvent({
        //     delay: 100 * index,
        //     callback: () => {
        //         // const zone = Phaser.Math.Between(1, 12)
        //         paintZone(this.zones, index, 0xff4444, 1);
        //         this.time.addEvent({
        //             delay: 200,
        //             callback: () => {
        //                 clearZone(this.zones, index);
        //             }
        //         });
        //     }
        // });
        // }

        function scheduleNextZoneFlash(scene) {
            const delay = Phaser.Math.Between(500, 4500);

            scene.time.addEvent({
                delay,
                callback: () => {
                    if (scene.paused) {
                        // если пауза — просто запланируем ещё раз
                        scheduleNextZoneFlash(scene);
                        return;
                    }

                    const zone = Phaser.Math.Between(1, 12);
                    paintZone(scene.zones, zone, 0xff4444, 1);
                    scene.laserStart = Date.now();

                    // sound
                    scene.sfx.laser.play({
                        // pitch: 1000,
                        detune: 0,
                    });
                    // очищаем через 100–500 мс
                    const flashDuration = Phaser.Math.Between(100, 500);
                    scene.laserFinish = scene.laserStart + flashDuration;
                    // scene.isLaser = true;

                    scene.time.addEvent({
                        delay: flashDuration,
                        callback: () => {
                            clearZone(scene.zones, zone);
                            // scene.isLaser = false;
                            scene.flashCount++;
                            if (scene.flashCount > scene.bestFlashCount) {
                                scene.bestFlashCount = scene.flashCount;
                            }
                            // scene.flashCounter.setText(
                            //     scene.flashCount + " / " + scene.bestFlashCount
                            // );
                        },
                    });

                    // и сразу планируем следующую вспышку
                    scheduleNextZoneFlash(scene);
                },
            });
        }

        // scheduleNextZoneFlash(this);

        function randomLaser(scene) {
            const minTime = 500; // 500 дефолт
            const maxTime = 4000; // 4500 дефолт
            const delay = Phaser.Math.Between(minTime, maxTime);

            scene.time.addEvent({
                delay,
                callback: () => {
                    if (scene.paused) {
                        // если пауза — просто запланируем ещё раз
                        randomLaser(scene);
                        return;
                    }
                    // рисуем лазер
                    let laserType = "red"; // ['red', 'blue', 'yellow']
                    const random = Phaser.Math.Between(0, 100);
                    if (random > 80 && !scene.gameSuperState.greedy) laserType = "yellow"; //
                    if (
                        scene.ball &&
                        scene.ball.velocity.length() &&
                        scene.ball.velocity.length() > 800 &&
                        !scene.gameSuperState.freeze &&
                        random < 20 // 20
                    )
                        laserType = "blue"; // заморозить немного шарик

                    {
                        // console.log('ball rush')
                        // const random = Phaser.Math.Between(0, 100);
                        // if (random < 20) laserType = "blue"; // заморозить немного шарик
                    }
                    // console.log("laserType", laserType);
                    // const startAngle = Phaser.Math.Between(0, 360);
                    // const wideAngle = Phaser.Math.Between(20, 35);

                    const wideAngle = 30;
                    const laserZone = Phaser.Math.Between(0, 11)
                    const startAngle = laserZone * wideAngle;

                    scene.laser = drawLaser(
                        scene,
                        ARENA_CENTER,
                        80 + ARENA_WIDTH / 2,
                        startAngle,
                        wideAngle,
                        laserType
                    );
                    scene.laser.laserZone = laserZone;
                    scene.laser.startAngle = startAngle;
                    scene.laser.wideAngle = wideAngle;
                    scene.laser.type = laserType;
                    scene.laserStart = Date.now();
                    // console.log('scene.laser', scene.laser)

                    // sound
                    scene.sfx.laser.play({
                        // pitch: -1000,
                        // detune: -1000,
                    });
                    // очищаем через 100–500 мс
                    const flashDuration = Phaser.Math.Between(100, 490);
                    scene.laserFinish = scene.laserStart + flashDuration;
                    // scene.isLaser = true;

                    scene.time.addEvent({
                        delay: flashDuration,
                        callback: () => {
                            clearLaser(scene.laser);
                            // console.log('clearLaser', scene.laser)
                            scene.laser = null;
                            // scene.isLaser = false;
                            scene.flashCount++;
                            if (scene.flashCount > scene.bestFlashCount) {
                                scene.bestFlashCount = scene.flashCount;
                            }
                            // scene.flashCounter.setText(
                            //     scene.flashCount + "/" + scene.bestFlashCount
                            // );
                            // лучше здесь включать следующий лазер...
                        },
                    });

                    // и сразу планируем следующую вспышку
                    randomLaser(scene);
                },
            });
        }

        randomLaser(this);

        // контейнер бочек (мировой центр и поворот)
        this.cluster = {
            x: ARENA_CENTER.x,
            y: ARENA_CENTER.y,
            rot: 0, // радианы
            scale: 1,
        };

        // три бочонка вокруг центра (с якорем и пружиной)
        const makeTarget = (x, y) => ({
            x,
            y,
            r: TARGET_RADIUS,
            // color: 0x999999,
            ax: x, // якорь X
            ay: y, // якорь Y
            touchCount: 0,
            multyplier: 1,
            activeSegments: 1,
            graphicsSegments: this.add.graphics().setDepth(50),
            bumpTween: null,
        });

        this.targets = [
            makeTarget(ARENA_CENTER.x, ARENA_CENTER.y - 70),
            makeTarget(ARENA_CENTER.x - 70, ARENA_CENTER.y + 50),
            makeTarget(ARENA_CENTER.x + 70, ARENA_CENTER.y + 50),
        ];

        this.gfxTargets = this.add.graphics().setDepth(50);

        this.targets.forEach((t) => {
            t.counter = this.add
                .text(t.x, t.y, "", {
                    fontFamily: 'CyberFont',
                    fontSize: '16px',
                    fill: this.textColors.gray,
                    stroke: this.textColors.black,
                    strokeThickness: 6
                }).setAlpha(0.8)
                .setOrigin(0.5)
                .setDepth(60);

            // t.segments = drawTargetSegment(this, t);
        });



        // след от шарика
        this.trail = this.add.graphics();

        // Шарик
        const startPos = new Phaser.Math.Vector2(
            ARENA_CENTER.x,
            ARENA_CENTER.y + 200
        );
        const startVel = new Phaser.Math.Vector2().setToPolar(
            Phaser.Math.DegToRad(45),
            BALL_MIN_SPEED
        );

        this.ball = {
            position: startPos,
            velocity: startVel,
            radius: BALL_RADIUS,
        };

        this.sfx = {
            plink: this.sound.add("plink", { volume: 0.1 }),
            wall: this.sound.add("wall", { volume: 0.9 }),
            wall_touch: this.sound.add("wall_touch", { volume: 2, detune: 0 }),
            multy_down: this.sound.add("multy_down", { volume: 0.2 }),
            multy_up: this.sound.add("multy_up", { volume: 0.1 }),
            greedy: this.sound.add("greedy", { volume: 0.2 }),
            crash: this.sound.add("crash", { volume: 1 }),
            laser: this.sound.add("laser", { volume: 0.5, detune: -1600 }),
            crowd: this.sound.add("crowd", { volume: 1 }),
            ambient: this.sound.add("ambient", { volume: 0.05, loop: true }),
            cashout: this.sound.add("cashout", { volume: 0.5 }),
        };

        // хранилище истории и слой для графика
        this.winHistory = [];
        this.roundStartMs = this.time.now;

        this.winChart = this.add
            .graphics()
            .setDepth(50)
            .setScrollFactor(0)
            .setAlpha(0);
        // this.winChartArea = { x: 300, y: 500, w: 170, h: 100 }; // где рисуем мини-чарт

        // this.resetRound();
        // шрифт
        document.fonts.ready.then(() => {
            // Теперь шрифт точно доступен
            // console.log("шрифт точно доступен");
            this.createCounters()

            // start?
            // this.resetRound();
        })

        setTimeout(() => {
            // this.sfx.ambient.play();
            this.resetRound();
            this.showLastLog()
        }, 1000);
    }
    buttonUpdate(state) {
        this.button.alpha = state
        if (state) {
            this.buttonText.setColor(this.textColors.black)
            this.buttonText.setText('CASH')
        } else {
            this.buttonText.setColor(this.textColors.red)
            this.buttonText.setText('OUT')
        }
    }
    createParticles() {
        this.emitter = this.add.particles(
            0,
            0, // стартовая позиция, не важна — мы двигаем emitter потом
            "red",
            {
                speed: 500,
                lifespan: 500,
                scale: { start: 2, end: 0 },
                blendMode: "ADD",
                emitting: false,
            }
        );
    }
    recordWinPoint(win) {
        const t = (this.time.now - this.roundStartMs) / 1000; // секунды
        this.winHistory.push({ t, win });
        // if (this.winHistory.length > 1000) this.winHistory.shift()
    }
    touchNotice(ball, value) {
        // console.log("touchNotice", ball, value)
        let digit = 3
        if (value >= 0.01) digit = 2
        if (value >= 0.1) digit = 1
        if (value >= 1) digit = 0

        let fontSize = 12
        let strokeThickness = 0
        let duration = 2000

        if ((value / this.bet) >= 0.05) {
            fontSize = fontSize + 1
            strokeThickness = 4
            // duration = 3000
        }
        if ((value / this.bet) >= 0.1) {
            fontSize = fontSize + 2
            strokeThickness = 8
            duration = 3000
        }

        if (value > this.bet) duration = 5000

        const x = ball.position.x + Phaser.Math.Between(-20, 20)
        const y = ball.position.y - Phaser.Math.Between(20, 60)

        const notice = this.add.text(x, y, '+' + value.toFixed(digit), {
            fontFamily: 'CyberFont', // Helvetica CyberFont
            fontSize: fontSize + 'px',
            fill: this.textColors.red,
            stroke: this.textColors.white,          // цвет обводки
            strokeThickness: strokeThickness,         // толщина линии

        }).setAlpha(1)
            .setOrigin(0.5)
            .setDepth(70)

        this.tweens.add({
            targets: notice,
            // x: t.ax - ox,
            y: notice.y - 20,
            alpha: 0,
            scale: 1.5,
            duration: duration,
            ease: "Back.easeOut", // 'Quad.easeOut'
            onComplete: () => {
                notice.destroy()
            },
        });
    }
    checkDoubleTouch(ball) {
        const gap = 10
        let doubleTouch = false
        const deltaX = Math.abs(this.lastTouchBallPosition.x - ball.position.x)
        const deltaY = Math.abs(this.lastTouchBallPosition.y - ball.position.y)

        if (deltaX < gap && deltaY < gap) {
            // console.log('double touch', 'x',deltaX, 'y',deltaY)
            doubleTouch = true
        }

        this.lastTouchBallPosition.x = ball.position.x
        this.lastTouchBallPosition.y = ball.position.y

        return doubleTouch
    }
    checkSuperState(stateName) {

    }
    setSuperState(stateName, start, timeNow) {
        if (start) {
            this.gameSuperState[stateName] = timeNow;
            this.superStateName[stateName].setColor(stateName === 'freeze' ? this.textColors.blue : this.textColors.yellow)
            // console.log(stateName + "start");
        } else {
            this.gameSuperState[stateName] = false;
            this.superStateName[stateName].setColor(this.textColors.red)
            // console.log(stateName + "stop");
        }
        // this.stateMonitor.update({ [stateName]: start }); // if (!this.isExit) 
        this.stateMonitor.update(this)
    }
    update(_time, deltaMs) {
        if (this.paused) return;
        const dt = Math.min(deltaMs, 32) / 1000; // кламп дельты
        this.elapsedSec += dt;
        this.timeCounter.setText(this.elapsedSec.toFixed(2));

        const timeNow = new Date().getTime();

        // check super state stop
        if (this.gameSuperState.freeze) {
            if (
                timeNow - this.gameSuperState.freeze >
                this.gameSuperState.freezeTime
            ) {
                this.setSuperState('freeze', false)
                // дать пинка шарику нужно
                this.ball.velocity.scale(1.5)
                    .limit(BALL_MAX_SPEED);
            }
        }
        if (this.gameSuperState.greedy) {
            if (
                timeNow - this.gameSuperState.greedy >
                this.gameSuperState.greedyTime
            ) {

                this.setSuperState('greedy', false)
            }
        }

        // каждые N секунд увеличиваем wallMult
        // if (this.elapsedSec > 5) this.wallMult = 2;
        // if (this.elapsedSec > 10) this.wallMult = 3;
        // if (this.elapsedSec > 15) this.wallMult = 5;
        // if (this.elapsedSec > 20) this.wallMult = 10;
        const N = 10;
        const steps = Math.floor(this.elapsedSec / N);
        if (steps > this.lastStep) {
            this.lastStep = steps;
            this.wallMult *= 2; // в 2 раза
            // this.wallMult++; // +0.01
            // console.log("this.wallMult x" + this.wallMult);
            this.baseCounter.setText(this.wallTouchX * this.wallMult);
        }

        let target = null;
        let targetTouch = 0;
        let wallTouch = 0;
        let multyplier = 1;
        let isSafeZone = false;

        // Интеграция шара
        this.ball.position.add(this.ball.velocity.clone().scale(dt));

        // check bean crash
        if (this.laser && this.checkCrash(this.laser)) {

            // CRASH
            if (this.laser.type === "red") this.finishRound();


            // dev
            if (
                this.laser.type === "blue" &&
                this.ball.velocity.length() > BALL_MIN_SPEED &&
                !this.gameSuperState.freeze
            ) {
                this.setSuperState('freeze', true, timeNow)
                this.ball.velocity.scale(0.5);
            }
            if (this.laser.type === "yellow" && !this.gameSuperState.greedy) {
                this.setSuperState('greedy', true, timeNow)
                this.sfx.greedy.play();
                // а как добавить?
            }
        } else if (this.laser) {
            // лазер, но нет краша
            // нужно расстояние 
            const zone = getZone(this.ball.position, ARENA_CENTER)
            if (this.laser.laserZone == zone - 1 || this.laser.laserZone == zone + 1
                || zone == this.laser.laserZone + 1 || zone == this.laser.laserZone - 1
            ) {
                // console.log('шарик рядом', zone, this.laser.laserZone)
            }

        }

        // zone crash
        // const zone = getZone(this.ball.position, ARENA_CENTER);
        // if (zone === 0) isSafeZone = true;
        // else if (this.zones[zone].gfx.visible) {
        //     const timeToCrash = new Date().getTime() - this.laserStart
        //     console.log('crash time from zone start', timeToCrash)
        //     // this.finishRound();
        //     // return;
        // }

        // if (zone !== this.currentZone) {

        //     this.currentZone = zone;
        //     // drawDangerZones(this, ARENA_CENTER, 220, SAFE_ZONE_R, 30, this.currentZone)

        //     if (this.lastZoneTime) {
        //         const timeNow = new Date().getTime();
        //         const delta = timeNow - this.lastZoneTime;
        //         if (delta < this.zoneTime) this.zoneTime = delta;
        //         this.lastZoneTime = timeNow;
        //         // console.log('this.zones[zone]', this.zones[zone], this.zones[zone].gfx.visible)
        //         // console.log('zone', zone ? zone : 'SAFE', 'delta', delta);
        //     }
        //     else this.lastZoneTime = new Date().getTime();
        //     // console.log('zone', zone? zone : 'SAFE', 'this.zoneTime', this.zoneTime < 10000? this.zoneTime : '');
        // }

        // Столкновения со стенками (2 прохода для надёжности на острых углах) - а зачем?
        for (let pass = 0; pass < 1; pass++) {
            for (const seg of this.arenaSegments) {
                const closest = closestPointOnSegment(this.ball.position, seg.a, seg.b);

                const distance = Phaser.Math.Distance.Between(
                    closest.x,
                    closest.y,
                    this.ball.position.x,
                    this.ball.position.y
                );

                if (distance < this.ball.radius) {
                    const doubleTouch = this.checkDoubleTouch(this.ball)

                    // if (doubleTouch) return

                    if (!doubleTouch) {
                        this.wallTouchCount++;
                        wallTouch = 1;
                        // text prize
                        let value = this.wallTouchX * this.wallMult * this.bet
                        this.touchNotice(this.ball, value)

                        this.sfx.wall_touch.play({
                            // volume: 0.5 + 0.4 * impact, // 0.35–0.8
                            // detune: Phaser.Math.Between(-500, 500), // небольшая вариация тона
                        });
                    }

                    // text prize
                    // let value = this.wallTouchX * this.wallMult * this.bet
                    // this.touchNotice(this.ball, value)

                    // нормаль ВОВНУТРЬ
                    const normal = inwardNormal(seg.a, seg.b, ARENA_CENTER);
                    // console.log('normal', normal)
                    // выталкиваем внутрь на глубину проникновения
                    const penetration = this.ball.radius - distance + 0.1;
                    this.ball.position.add(normal.clone().scale(penetration));
                    // отражаем скорость: v' = v - 2*(v·n)*n
                    this.ball.velocity = reflect(this.ball.velocity, normal).limit(
                        BALL_MAX_SPEED
                    );
                    // добавить небольшой рандомный угол для избегания зацикливания по квадрату!
                    // ±3° в радианах (можно подстроить от 1° до 5°)
                    const jitterRad = Phaser.Math.FloatBetween(-0.5, 0.5);
                    // rotate() мутирует вектор, сохраняя длину
                    this.ball.velocity.rotate(jitterRad);

                    // громкость/высота слегка от силы удара
                    // const impact = Math.min(
                    //     Math.abs(this.ball.velocity.dot(normal)) / 400,
                    //     1
                    // );

                    // sound
                    // this.sfx.wall_touch.play({
                    //     // volume: 0.5 + 0.4 * impact, // 0.35–0.8
                    //     // detune: Phaser.Math.Between(-500, 500), // небольшая вариация тона
                    // });
                }
            }
        }

        // --- столкновения с бамперами
        for (const t of this.targets) {
            // проверка и сброс мульти на бампере - можно сделать на таймере
            if (t.multyplier > 1) this.checkTargetActiveSegments(t, timeNow)


            // touch
            const dx = this.ball.position.x - t.x;
            const dy = this.ball.position.y - t.y;
            const dist = Math.hypot(dx, dy);
            const minDist = this.ball.radius + t.r;

            if (dist <= minDist) {
                const doubleTouch = this.checkDoubleTouch(this.ball)
                // if (doubleTouch) console.log('target double touch')

                target = t;
                targetTouch = 1;
                this.targetTouchCount++;
                t.touchCount++;

                // prize
                multyplier = t.multyplier
                let value = multyplier * this.wallTouchX * this.wallMult * this.bet
                this.touchNotice(this.ball, value)

                // var 2
                // if (!t.lastTouchTime) t.lastTouchTime = timeNow;
                // else {
                // const timeNow = new Date().getTime();
                // const delta = timeNow - t.lastTouchTime;

                // if (delta <= this.targetCounterDelay) {
                //     this.targetSetMultipler(t, timeNow);
                // }
                this.targetSetMultipler(t, timeNow);

                if (t.multyplier != multyplier) {
                    setTimeout(() => {
                        this.sfx.multy_up.play();
                        t.counter.setText("m" + t.multyplier.toFixed(0)); // "M" + 
                    }, 100);
                    this.stateMonitor.update(this); // if (!this.isExit) 
                }

                // console.log('target touch', delta, t.touchCount, t.multyplier)
                t.lastTouchTime = timeNow;
                // }
                // console.log('target touch', t.touchCount)
                // t.counter.setText(t.touchCount.toFixed(0));

                // нормаль от центра круга к шару
                const nx = dx / dist;
                const ny = dy / dist;

                // выталкиваем шар на границу круга
                const penetration = minDist - dist + 0.1;
                this.ball.position.x += nx * penetration;
                this.ball.position.y += ny * penetration;

                // отражаем скорость относительно нормали
                const v = this.ball.velocity;
                const dot = v.x * nx + v.y * ny;
                this.ball.velocity = new Phaser.Math.Vector2(
                    v.x - 2 * dot * nx,
                    v.y - 2 * dot * ny
                )
                    .scale(this.gameSuperState.freeze ? 1 : 1.01) // чутка «поджарим» для драйва - если не синий!
                    .limit(BALL_MAX_SPEED);

                // console.log('this.ball.velocity', this.ball.velocity)
                // "plink" — чуть звонче и ярче
                const impact = Math.min(Math.abs(dot) / 2000, 1);
                // console.log('impact', impact)
                // звук
                const volume = 0.4 * impact;
                // console.log('target touch impact', dot.toFixed(1), impact.toFixed(2), volume.toFixed(2))

                // звук переделать
                this.sfx.plink.play({
                    // volume: volume, // 0.4–0.9
                    // detune: Phaser.Math.Between(20, 180)    // повыше тон
                    detune: t.multyplier * 5,
                    // detune: t.touchCount? t.touchCount * 100: 0, // не идёт, касания растут постоянно, а мульти при переходе
                });

                // пружина бочонка
                const kick = impact * 20; // 20 old
                // console.log('kick', kick)
                const ox = nx * kick;
                const oy = ny * kick;

                // не даём твиниться пачками — перезапускаем
                if (t.bumpTween) t.bumpTween.stop();

                // твин смещения к (якорь + оффсет) с возвратом
                t.bumpTween = this.tweens.add({
                    targets: t,
                    x: t.ax - ox,
                    y: t.ay - oy,
                    // scale: 1.1, // не работает на графике
                    duration: 20,
                    yoyo: true,
                    ease: "Back.easeOut", // 'Quad.easeOut'
                    onUpdate: () => t.counter.setPosition(t.x, t.y),
                    onComplete: () => {
                        // фиксируем обратно на якорь (на случай накопления погрешностей)
                        t.x = t.ax;
                        t.y = t.ay;
                        t.counter.setPosition(t.x, t.y);
                        t.bumpTween = null;
                    },
                });

                // scale
                // t.bumpTween = this.tweens.add({
                //     targets: t,
                //     // x: t.ax - ox,
                //     // y: t.ay - oy,
                //     scale: 1.1, // не работает на графике
                //     duration: 20,
                //     yoyo: true,
                //     ease: "Back.easeOut", // 'Quad.easeOut'
                //     onUpdate: () => t.counter.setPosition(t.x, t.y),
                //     onComplete: () => {
                //         // фиксируем обратно на якорь (на случай накопления погрешностей)
                //         t.x = t.ax;
                //         t.y = t.ay;
                //         t.counter.setPosition(t.x, t.y);
                //         t.bumpTween = null;
                //     },
                // });
            }
        }
        const speed = this.ball.velocity.length();
        // console.log('speed', speed)
        const trialMax = 20 + Math.floor((speed - BALL_MIN_SPEED) / 40);
        // const trialMax = 100; // dev
        // console.log('trialMax', trialMax, 'speed', speed);

        this.trailHistory.push({
            x: this.ball.position.x,
            y: this.ball.position.y,
        });
        if (this.trailHistory.length > trialMax) this.trailHistory.shift();

        // Рендер
        this.draw();

        // считаем очки
        // let targetWin = targetTouch * multyplier * targetTouchX;

        let targetWin = targetTouch * multyplier * this.wallTouchX * this.wallMult;
        let wallWin = wallTouch * this.wallTouchX * this.wallMult;

        if (targetTouch || wallTouch) {
            if (this.lastTouchTime) {
                // const timeNow = new Date().getTime();
                const delta = timeNow - this.lastTouchTime;
                if (delta < this.minCollisionTime) this.minCollisionTime = delta;
                this.lastTouchTime = timeNow;
                // console.log('delta', delta, 'this.minCollisionTime', this.minCollisionTime)
            } else this.lastTouchTime = timeNow;
        }
        // console.log('targetWin', targetWin, 'wallWin', wallWin)
        let predictableWin = this.win + targetWin + wallWin;

        // crash_3
        // if (predictableWin >= this.targetCrash) {
        //     console.log('predictable this.win', predictableWin, 'safe zone?', isSafeZone)
        //     if (isSafeZone) return
        //     console.log('this.minCollisionTime', this.minCollisionTime)
        //     // if (target) {
        //     //     console.log('target', target)
        //     //     target.color = 0x000000; // 0xFFAAAA
        //     // }
        //     this.finishRound();
        //     return;
        // }
        this.win += targetWin + wallWin;
        setTimeout(() => {
            this.xCounter.setText("X" + this.win.toFixed(2));
            // не растёт
            // if (!this.isExit) this.stakeCounter.setText((this.bet * this.win).toFixed(2));
            // растёт красным
            this.stakeCounter.setText((this.bet * this.win).toFixed(2));
        }, 100);
        // this.xCounter.setText("X" + this.win.toFixed(2));
        // this.stakeCounter.setText((this.bet * this.win).toFixed(2));
        this.recordWinPoint(this.win);
        this.drawWinChart(this.win);
        // console.log('target touch', targetTouchCount, 'wall touch', wallTouchCount)
    }

    checkCrash(laser) {
        // если луч включен
        // сначала проверим безопасную зону
        if (!checkSafeZone(this.ball.position, ARENA_CENTER, SAFE_ZONE_R)) {
            // мы не в безопасной зоне, смотрим угол
            const ballAngle = getAngle(this.ball.position, ARENA_CENTER);
            const startAngle = laser.startAngle; // сохранил при создании
            const endAngle = (startAngle + laser.wideAngle) % 360;
            // console.log('angles', ballAngle, startAngle, endAngle)

            // проверяем попадание
            let inBeam = false;
            if (startAngle < endAngle) {
                inBeam = ballAngle >= startAngle && ballAngle <= endAngle;
            } else {
                // луч через 360
                inBeam = ballAngle >= startAngle || ballAngle <= endAngle;
            }

            if (inBeam) {
                const timeNow = new Date().getTime();
                const timeToCrash = timeNow - this.laserStart;
                // if (timeNow - this.buttonTapTime <= 3000) console.log("crash after tap", timeNow - this.buttonTapTime);
                // console.log('laser crash time', timeToCrash)
                // console.log('angles', ballAngle, startAngle, endAngle)
                // this.finishRound();
                return true;
            }
        }
        return false;
    }
    finishRound(target) {
        this.paused = true;
        // if (!target)
        this.emitter.explode(30, this.ball.position.x, this.ball.position.y);
        this.ball.position.set(-100, -100);

        this.sfx.crash.play();

        this.trailHistory.length = 0;
        // this.trailGfx.clear();
        this.draw();

        this.showStat();

        setTimeout(() => {
            this.resetRound(target);
        }, 2000);

        // dev
        if (this.win < 1.2) {
            setTimeout(() => {
                this.sfx.crowd.play();
            }, Phaser.Math.Between(100, 500));
        }

        // text
        // this.superStateName.freeze.setColor(this.textColors.red)
        // this.superStateName.greedy.setColor(this.textColors.red)
    }
    showStat() {
        const rtp = this.win / this.targetCrash;
        this.rtp.push(rtp);
        this.times.push(this.elapsedSec);
        this.wins.push(this.win);
        const avgRTP =
            this.rtp.reduce((sum, val) => sum + val, 0) / this.rtp.length;
        const avgTime =
            this.times.reduce((sum, val) => sum + val, 0) / this.times.length;
        const avgWin =
            this.wins.reduce((sum, val) => sum + val, 0) / this.wins.length;
        const med = median(this.wins);
        // console.log(this.rtp.length, 'ave: WIN', avgWin.toFixed(2), 'RTP', avgRTP.toFixed(8), 'TIME', avgTime.toFixed(2),);

        console.log(
            "crash",
            "this.win",
            this.win.toFixed(2),
            "time",
            this.elapsedSec.toFixed(2)
            // 'RTP',
            // rtp.toFixed(4)
        );

        if (this.wins.length == 100) {
            const avgWin =
                this.wins.reduce((sum, val) => sum + val, 0) / this.wins.length;
            const medWin = median(this.wins);
            const maxWin = Math.max(...this.wins);
            console.table(this.wins)
            console.log('ave: WIN', avgWin.toFixed(2), 'med', medWin.toFixed(2), 'max', maxWin.toFixed(2));
            this.printProb(this.wins)
        }

        const totalTouches = this.wallTouchCount + this.targetTouchCount;
        console.log(
            "touches",
            "wall",
            this.wallTouchCount,
            "target",
            this.targetTouchCount,
            "total",
            totalTouches,
            "tchs/sec",
            (totalTouches / this.elapsedSec).toFixed(2)
        );
        // dev
        if (this.win > this.maxCrash) this.maxCrash = this.win;
        console.log(
            this.wins.length,
            "median crash",
            med.toFixed(2),
            "max",
            this.maxCrash.toFixed(2),
            "avg",
            avgWin.toFixed(2),
            "avg time",
            avgTime.toFixed(2)
        );

        // лог состояний
        // console.log('State log:');
        // const log = this.stateMonitor.getLog()
        // if (log.length) console.table(this.stateMonitor.getLog());
        // this.stateMonitor.clearLog(); // если нужно начать заново
        // const counts = this.stateMonitor.getStateCounts();

        // for (const [key, count] of counts.entries()) {
        //     console.log(key, '→', count);
        // }

        // последние выходы
        // this.addRoundLog(this.exitX, this.win);
        let mode = 'red'
        if (this.exitMode) mode = this.exitMode
        if (this.gameSuperState.greedy) mode = 'yellow'
        if (this.gameSuperState.freeze) mode = 'blue'

        this.addLastRow(this.exitX, this.win, mode);
        setTimeout(() => {
            this.showLastLog()
        }, 1000);
    }
    resetRound(target) {
        // сброс позиции и скорости
        // setTimeout(() => {
        this.ball.position.set(ARENA_CENTER.x, ARENA_CENTER.y + 180);
        this.ball.velocity
            .setToPolar(
                Phaser.Math.DegToRad(Phaser.Math.Between(250, 290)),
                BALL_MIN_SPEED
            )
            .limit(BALL_MAX_SPEED);
        // }, 5000);

        this.exitX = null
        this.win = 1;
        this.elapsedSec = 0;
        this.wallMult = 1;
        this.targetMult = 1;
        this.lastStep = 0;
        this.minCollisionTime = 10000;
        this.lastTouchTime = undefined;
        this.buttonTapTime = null;

        if (target) target.color = 0xffffaa; // 0xffaaaa

        // this.baseCounter.setText(this.wallTouchX * this.wallMult);

        this.wallTouchCount = 0;
        this.targetTouchCount = 0;

        // dev
        this.currentZone = undefined;
        this.zoneTime = 10000;
        this.lastZoneTime = undefined;
        this.zoneCount = 0;

        this.flashCount = 0;
        // this.flashCounter.setText(this.flashCount + "/" + this.bestFlashCount);

        targetCounterReset(this.targets);
        this.baseCounter.setText(this.wallTouchX);

        // dev random
        const random = Math.random();
        this.targetCrash = 1 / random;
        // this.targetCrash = 1000 // dev
        // console.log('resetRound', random, 'this.targetCrash', this.targetCrash)

        // сброс истории для графика
        this.winHistory = [];
        this.roundStartMs = this.time.now;

        // сброс бамперов
        this.targets.forEach((t) => {
            t.multyplier = 1;
            t.activeSegments = 0;
            t.touchCount = 0;
            t.lastTouchTime = undefined
            t.counter.setText("m" + t.multyplier.toFixed(0)); // "M" + 
            drawTargetSegment(this, t)
        });

        // сброс супер состояния
        // this.gameSuperState.freeze = false;
        // this.gameSuperState.greedy = false;

        this.setSuperState('freeze', false)
        this.setSuperState('greedy', false)

        this.exitMode = undefined;

        this.paused = false;
        this.isExit = false;

        this.deposit -= this.bet;
        this.depoCounter.setText(this.deposit.toFixed(2));

        this.stakeCounter.setColor(this.textColors.white)

        this.buttonUpdate(1)
        this.outCounter.setText('');
    }
    checkTargetTouchTimer(t) {
        // проверять и сбрасывать/ставить 3 сегмента таймера
    }
    checkTargetActiveSegments(t, timeNow) {
        // const timeNow = new Date().getTime();
        if (this.gameSuperState.greedy) {
            // t.lastTouchTime = timeNow; // пока так, чтобы не сбрасывать сразу
            return;
        }
        const delta = (timeNow - t.lastTouchTime);

        if (delta > this.targetCounterDelay) {
            // reset
            // console.log('target reset', delta, t.touchCount, 'multy', t.multyplier)
            if (t.multyplier > 1) this.sfx.multy_down.play();
            t.touchCount = 0;
            t.multyplier = 1;
            t.activeSegments = 0;
            drawTargetSegment(this, t)

            t.counter.setText("m" + t.multyplier.toFixed(0)); // "M" + 
        } else {
            const progress = 1 - delta / this.targetCounterDelay;
            let activeSegments = Math.ceil(progress * 3);

            // console.log('check target segmets', delta, progress, activeSegments)

            if (t.activeSegments != activeSegments) {
                // console.log('target change segments', delta, progress, t.activeSegments, activeSegments)
                t.activeSegments = activeSegments
                drawTargetSegment(this, t)
            }
        }


    }
    targetSetMultipler(t, timeNow) {
        // console.log(timeNow - t.lastTouchTime, 'target set multy', t.touchCount, t.multyplier)
        // var1
        const multypliers = []; // или {}? чтобы получать номер ступеньки и делать норм детюн

        let multyplier = 1;
        if (t.touchCount >= 1) multyplier = 2;
        if (t.touchCount >= 4) multyplier = 3;
        if (t.touchCount >= 8) multyplier = 5;
        if (t.touchCount >= 12) multyplier = 10;
        if (t.touchCount >= 18) multyplier = 20;
        if (t.touchCount >= 25) multyplier = 50;
        if (t.touchCount >= 35) multyplier = 100;
        if (t.touchCount >= 50) multyplier = 250;
        if (t.touchCount >= 70) multyplier = 500;
        if (t.touchCount >= 100) multyplier = 1000;

        //олд
        // if (t.touchCount >= 1) multyplier = 2;
        // if (t.touchCount >= 3) multyplier = 3;
        // if (t.touchCount >= 6) multyplier = 5;
        // if (t.touchCount >= 9) multyplier = 10;
        // if (t.touchCount >= 13) multyplier = 20;
        // if (t.touchCount >= 18) multyplier = 50;
        // if (t.touchCount >= 24) multyplier = 100;
        // if (t.touchCount >= 31) multyplier = 250;
        // if (t.touchCount >= 39) multyplier = 500;
        // if (t.touchCount >= 50) multyplier = 1000;

        if (multyplier > t.multyplier) {
            t.multyplier = multyplier;
            // this.sfx.multy_up.play();
        }
        return multyplier;
    }
    drawWinChart(win) {
        const g = this.winChart;
        this.winChartArea = { x: 205, y: 175, w: 230, h: 150 }; // x: 190, y: 100, w: 250, h: 180
        const { x, y, w, h } = this.winChartArea;
        const data = this.winHistory;
        g.clear();

        if (!data.length) return;
        // console.log('winChart win', win)

        // рамка и фон
        // g.fillStyle(0x0b1220, 0.5).fillRoundedRect(x - 8, y - 8, w + 16, h + 16, 8);
        // g.lineStyle(1, 0x2a3a55, 0).strokeRect(x, y, w, h);

        const maxT = data[data.length - 1].t || 1;
        let maxWin = 0;
        for (let i = 0; i < data.length; i++)
            if (data[i].win > maxWin) maxWin = data[i].win;
        if (maxWin <= 0) maxWin = 1;

        const sx = w / maxT;
        const sy = h / maxWin;

        // оси (минимально)
        // g.lineStyle(1, 0x3f5b89, 0.5);
        // g.beginPath();
        // g.moveTo(x, y + h); g.lineTo(x + w, y + h); // X
        // g.moveTo(x, y); g.lineTo(x, y + h); // Y
        // g.strokePath();

        // линия Win(t)
        g.lineStyle(4, 0xff0000, 1);
        g.beginPath();
        let step = 1;
        // if (data.length > 100) step = 10;
        if (data.length > 1000) step = 10;
        if (data.length > 10000) step = 100;

        // if (data.length > 1000) step = Math.floor(data.length/100)

        for (let i = 0; i < data.length; i += step) {
            const px = x + data[i].t * sx;
            const py = y + h - data[i].win * sy;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.strokePath();

        // финальная точка
        const last = data[data.length - 1];
        const lx = x + last.t * sx;
        const ly = y + h - last.win * sy;
        g.fillStyle(0xffffff, 1).fillCircle(lx, ly, 2.5);

        g.alpha = 1;

        // плавно показать и потом скрыть
        //   this.tweens.add({ targets: g, alpha: 1, duration: 120 });
        //   this.time.delayedCall(2500, () => {
        //     this.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.clear() });
        //   });
    }
    draw() {
        this.gfx.clear();
        this.gfx.setDepth(20);
        // Арена
        this.gfx.lineStyle(4, 0xff0000, 0);
        for (const seg of this.arenaSegments) {
            this.gfx.strokeLineShape(
                new Phaser.Geom.Line(seg.a.x, seg.a.y, seg.b.x, seg.b.y)
            );
        }

        // safe zone
        // this.gfx.fillStyle(0x00ff00, 0.05);
        // this.gfx.fillCircle(ARENA_CENTER.x, ARENA_CENTER.y, SAFE_ZONE_R);
        // this.gfx.lineStyle(1, 0x00ff00, 0.1);
        // this.gfx.strokeCircle(ARENA_CENTER.x, ARENA_CENTER.y, SAFE_ZONE_R);

        // цели
        for (const t of this.targets) {
            // shadow
            this.gfx.fillStyle(0x000000, 0.3);
            this.gfx.fillCircle(t.x, t.y + 20, 45);

            this.gfx.fillStyle(0x000000, 1); // t.color
            this.gfx.fillCircle(t.x, t.y, t.r);

            // this.gfx.lineStyle(4, this.standartColors.yellow, 1);
            // this.gfx.strokeCircle(t.x, t.y, t.r);
        }

        // Шар shadow
        this.gfx.fillStyle(this.standartColors.red, 0); // 0.3
        this.gfx.fillCircle(
            this.ball.position.x,
            this.ball.position.y + 10,
            this.ball.radius + 4
        );
        // Шар
        this.gfx.fillStyle(BALL_COLOR, 1); // 0xff0000 - красный
        this.gfx.fillCircle(
            this.ball.position.x,
            this.ball.position.y,
            this.ball.radius
        );
        // обводка
        this.gfx.lineStyle(4, this.standartColors.red, 0.5);
        this.gfx.strokeCircle(
            this.ball.position.x,
            this.ball.position.y,
            this.ball.radius
        );

        // след от шарика
        if (this.trailHistory.length > 0) {
            this.trail.clear();
            const speed = this.ball.velocity.length();
            for (let i = 0; i < this.trailHistory.length; i++) {
                const p = this.trailHistory[i];
                const alpha = i / this.trailHistory.length;
                // const size = i / (this.trailHistory.length); // ближе к хвосту → меньше
                const size = alpha; // ближе к хвосту → больше
                this.trail.fillStyle(BALL_COLOR, alpha * 0.1); // 0xff0000
                this.trail.fillCircle(p.x, p.y, BALL_RADIUS);
                this.trail.setDepth(5);
            }
        }

        // шляпки
        const targetCapRadius = 44
        const strokeThinkness = 16

        for (const t of this.targets) {
            this.gfx.fillStyle(0x000000, 1);
            this.gfx.fillCircle(t.x, t.y, targetCapRadius);

            this.gfx.lineStyle(0, this.standartColors.black, 1);
            this.gfx.strokeCircle(t.x, t.y, targetCapRadius);
        }
        // сегменты или кольцо
        for (const t of this.targets) {
            // this.gfx.fillStyle(t.color, 1);
            // this.gfx.fillCircle(t.x, t.y, targetCapRadius);
            if (this.gameSuperState.greedy) {
                this.gfx.lineStyle(strokeThinkness, this.standartColors.yellow, 1);
                this.gfx.strokeCircle(t.x, t.y, targetCapRadius - 8);
            }
        }
        // const p = this.trailHistory[0];
        // this.trail.fillStyle(0xffffff, 0.2);
        // this.trail.fillCircle(p.x, p.y, 22);
    }

    // hole methods
    predictPath(seconds = 1.2, stepMs = 16) {
        const pts = [];
        // копии состояния
        let x = this.ball.x,
            y = this.ball.y;
        const v = this.ball.velocity.clone();
        const steps = Math.max(1, Math.floor((seconds * 1000) / stepMs));
        const dt = stepMs / 1000;

        for (let s = 0; s < steps; s++) {
            // интеграция
            x += v.x * dt;
            y += v.y * dt;

            // --- стены (как в update)
            for (let pass = 0; pass < 2; pass++) {
                for (const seg of this.arenaSegments) {
                    const closest = closestPointOnSegment({ x, y }, seg.a, seg.b);
                    const dist = Phaser.Math.Distance.Between(closest.x, closest.y, x, y);
                    if (dist < BALL_RADIUS) {
                        const n = inwardNormal(seg.a, seg.b, ARENA_CENTER);
                        const penetration = BALL_RADIUS - dist + 0.1;
                        x += n.x * penetration;
                        y += n.y * penetration;
                        const dot = v.x * n.x + v.y * n.y;
                        v.x -= 2 * dot * n.x;
                        v.y -= 2 * dot * n.y;
                        limitVec(v, BALL_MAX_SPEED);
                    }
                }
            }

            // --- бочонки (как в update, но без твин/звуков)
            for (const t of this.targets) {
                const m = t.getWorldTransformMatrix();
                const tx = m.tx,
                    ty = m.ty;
                const dx = x - tx,
                    dy = y - ty;
                const dist = Math.hypot(dx, dy);
                const minDist = BALL_RADIUS + t.getData("r");
                if (dist < minDist) {
                    const nx = dx / dist,
                        ny = dy / dist;
                    const push = minDist - dist + 0.1;
                    x += nx * push;
                    y += ny * push;
                    const dot = v.x * nx + v.y * ny;
                    v.x -= 2 * dot * nx;
                    v.y -= 2 * dot * ny;
                    limitVec(v.scale(1.01), BALL_MAX_SPEED);
                }
            }

            pts.push({ x, y });
        }
        return pts;
    }
    spawnFakePortal() {
        const path = this.predictPath(1.2, 16);
        // границы поиска внутри арены (можно сузить по вкусу)
        const MINX = ARENA_CENTER.x - ARENA_WIDTH * 0.42;
        const MAXX = ARENA_CENTER.x + ARENA_WIDTH * 0.42;
        const MINY = ARENA_CENTER.y - ARENA_WIDTH * 0.42;
        const MAXY = ARENA_CENTER.y + ARENA_WIDTH * 0.42;

        for (let tries = 0; tries < 40; tries++) {
            const x = Phaser.Math.Between(MINX, MAXX);
            const y = Phaser.Math.Between(MINY, MAXY);

            // далека ли точка от прогнозной траектории?
            let ok = true;
            for (let i = 0; i < path.length; i += 2) {
                // через точку для скорости
                const d = Phaser.Math.Distance.Between(x, y, path[i].x, path[i].y);
                if (d < this.PORTAL_R + this.PORTAL_SAFE_MARGIN) {
                    ok = false;
                    break;
                }
            }
            if (!ok) continue;

            this.portal.setPosition(x, y).setVisible(true);
            // исчезнет сам
            this.time.delayedCall(this.PORTAL_LIFETIME, () =>
                this.portal.setVisible(false)
            );
            return true;
        }
        // не нашли безопасного места — просто не показываем
        return false;
    }
    armCrashPortal(leadMs = 1000) {
        const path = this.predictPath(leadMs / 1000, 16);
        const p = path[path.length - 1];
        if (!p) return false;

        this.portal.setPosition(p.x, p.y).setVisible(true);

        // здесь ты можешь «закрыть раунд» финансово и ждать, когда шар долетит.
        // На всякий: через ещё немного времени скрываем портал и делаем reset.
        this.time.delayedCall(leadMs + 200, () => {
            this.portal.setVisible(false);
            // this.handleCrash(); // или твой resetRound()
        });
        return true;
    }

    // Функция добавления новой записи
    _addRoundLog(exitX, crashX) {
        let percent = '';
        if (exitX) {
            percent = ((exitX / crashX) * 100).toFixed(1) + '%';
        }

        // Формируем объект записи
        const record = {
            crashX: crashX.toFixed(2),
            exitX: exitX ? exitX.toFixed(2) : '',
            percent
        };

        // Добавляем в начало массива
        this.roundsLog.unshift(record);

        // Обрезаем до 12 элементов
        if (this.roundsLog.length > 12) this.roundsLog.pop();

        // Обновляем текст на экране
        this.updateRoundLogText();
    }

    // Вывод текста на экран
    updateRoundLogText() {
        const lines = this.roundsLog.map(r => `CRASH:${r.crashX}\nOUT:${r.exitX}/${r.percent}`);
        const text = lines.join('\n');

        if (!this.roundsText) {
            this.roundsText = this.add.text(20, 125, text, {
                fontFamily: 'monospace',
                fontSize: '16px',
                fill: '#ffffff',
            }).setDepth(20);
        } else {
            this.roundsText.setText(text);
        }
    }

    addRoundLog(exitX, crashX) {
        let percent = '';
        if (exitX) percent = ((exitX / crashX) * 100).toFixed(2) + '%';

        const record = {
            exitX: exitX ? exitX.toFixed(2) : null,
            crashX: crashX.toFixed(2),
            percent
        };

        // добавляем новую запись сверху
        this.roundsLog.unshift(record);
        if (this.roundsLog.length > 12) this.roundsLog.pop();

        if (!this.roundsText) {
            this.roundsText = this.add.text(20, 125, '', {
                fontFamily: 'CyberFont',
                fontSize: '12px',
                fill: this.textColors.red,
                align: 'left',
                lineSpacing: 4    // ← вот этот гап между строками
            }).setDepth(20);
        }

        // плавное обновление блока
        this.tweens.add({
            targets: this.roundsText,
            alpha: 0,
            duration: 120,
            onComplete: () => {
                const lines = this.roundsLog.flatMap(r => {
                    const crashLine = `CRASH: ${r.crashX}`;
                    if (r.exitX)
                        return [crashLine, `OUT: ${r.exitX} / ${r.percent}`, `--- --- ---`];
                    else
                        return [crashLine, `--- --- ---`];
                });
                this.roundsText.setText(lines.join('\n'));

                this.tweens.add({
                    targets: this.roundsText,
                    alpha: 1,
                    duration: 180
                });
            }
        });



    }

    // ===== добавление записи =====
    addLastRow(exitX, crashX, mode) {
        const maxRow = 7
        const rec = { exitX: exitX == null ? null : +exitX, crashX: +crashX, mode };
        this.lastLog.push(rec);
        if (this.lastLog.length > maxRow) this.lastLog.shift();

        // this.showLastLog()
    }

    showLastLog() {
        // перерисовываем (просто и надёжно)
        this.lastLogGroup.removeAll(true);

        let y = 0;
        const rows = [];

        // сверху вниз
        for (let i = this.lastLog.length - 1; i >= 0; i--) {
            const r = this.lastLog[i];
            const row = makeRow(this, r);
            row.y = y;
            this.lastLogGroup.add(row);
            rows.push(row);

            // зазор между текущей и следующей: зависит от того, была ли % у текущей
            let prevExitX = null
            if (i > 0) prevExitX = this.lastLog[i - 1].exitX
            // const gap = (prevExitX != null && r.exitX != null) ? 16 : 8;
            // y += 30 + gap; // 30 + gap
            // const gap = (prevExitX != null) ? 50 : 10;
            const gap = (r.exitX != null) ? 18 : 0;
            y += 36 + gap; // 30 + gap
        }

        // снизу вверх
        // y = 420;
        // for (let i = this.lastLog.length-1; i >=0; i--) {
        //     const r = this.lastLog[i];
        //     const row = makeRow(this, r);
        //     row.y = y;
        //     this.lastLogGroup.add(row);
        //     rows.push(row);

        //     // зазор между текущей и следующей: зависит от того, была ли % у текущей
        //     let prevExitX = null
        //     if (i > 0) prevExitX = this.lastLog[i-1].exitX
        //     const gap = (prevExitX != null && r.exitX != null) ? 16 : 6;
        //     y -= 30 + gap;
        // }

        // console.table(this.lastLog)

        // мягкое появление, слегка "подпрыгивает" снизу
        rows.forEach((row, i) => {
            const startY = row.y + 6;
            row.y = startY;
            this.tweens.add({
                targets: row,
                y: startY - 6,
                alpha: 1,
                duration: 100,
                // delay: 100 + i*10,
                ease: 'Quad.easeOut'
            });
        });
    }

}

// ===== helpers плашек =====
const f2 = v => Number(v).toFixed(2);

function makeRow(scene, rec) {

    // const ROW_H = 40;       // высота плашки
    const PAD_X = 10;       // внутренние отступы плашки
    const PAD_Y = 4; 
    const RADIUS = 8;

    const FONT_MAIN = {
        fontFamily: 'CyberFont',
        fontSize: '14px', // 14
        fill: rec.exitX != null ? scene.textColors.gray : scene.textColors.red
    };
    const FONT_PCT = {
        fontFamily: 'CyberFont',
        fontSize: '18px',
        // color: scene.textColors.white,
        fill: scene.textColors.white,
        stroke: scene.textColors.black,
        strokeThickness: 6,
    };

    const MODE_COLORS = {
        freeze: scene.standartColors.blue,     // синий
        greedy: scene.standartColors.yellow,     // жёлтый
        red: scene.standartColors.red     // красный
    };
    // текст внутри плашки
    const label = rec.exitX != null ? `${f2(rec.exitX)}\n${f2(rec.crashX)}` : `${f2(rec.crashX)}`;

    // const txt = scene.add.text(0, 0, label, { ...FONT_MAIN, color: scene.textColors.black }).setOrigin(0, 0.5);
    const txt = scene.add.text(0, 0, label, { ...FONT_MAIN }).setOrigin(0, 0.5);

    const badgeW = Math.ceil(txt.width + PAD_X * 2);
    const badgeH = Math.ceil(txt.height + PAD_Y * 2); //  ROW_H

    const g = scene.add.graphics();
    // const color = rec.exitX != null ? (MODE_COLORS[rec.mode] ?? MODE_COLORS.red) : MODE_COLORS.red;
    // const color = MODE_COLORS[rec.mode]? MODE_COLORS[rec.mode] : MODE_COLORS.red
    const color = rec.exitX? scene.standartColors.black : scene.standartColors.wrapper // wrapper
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, badgeW, badgeH, RADIUS);

    const badge = scene.add.container(0, 0, [g, txt]);
    txt.setPosition(PAD_X, badgeH / 2);

    // процент (если был выход) — справа-снизу от плашки
    let pct = null;
    if (rec.exitX != null) {
        const percent = (rec.exitX / rec.crashX) * 100
        const p = ((rec.exitX / rec.crashX) * 100).toFixed(1) + '%';
        if (percent > 90) {
            FONT_PCT.strokeThickness = 6
            FONT_PCT.stroke = scene.textColors.red
        }
        if (percent > 95) {
            FONT_PCT.fill = scene.textColors.black,
                FONT_PCT.strokeThickness = 8
            FONT_PCT.stroke = scene.textColors.red
        }
        // pct = scene.add.text(badgeW - 40, badgeH - 24, p, FONT_PCT).setOrigin(0, 1);
        pct = scene.add.text(badgeW - 6, badgeH - 20, p, FONT_PCT).setOrigin(0, 1);

        if (percent > 90) {
            scene.tweens.add({
                targets: pct,
                // y: pct.y - 6,
                scale: 1.2,
                duration: 100,
                // repeate: 6, 
                yoyo: true,
                // delay: 100 + i*10,
                ease: 'Quad.easeOut'
            });
        }

    }

    const row = scene.add.container(0, 0);
    row.add(badge);
    if (pct) row.add(pct);

    row.setSize(pct ? (pct.x + pct.width) : badgeW, badgeH);
    row.setAlpha(0);
    return row;
}

// ----------- Geometry / Math helpers -----------

// Квадрат со срезами: прямая : скос = ratio : 1
function buildChamferedSquareSegments(
    cx,
    cy,
    widthPx,
    ratioStraightToChamfer = 2,
    rotationRad = 0
) {
    const chamfer = widthPx / (ratioStraightToChamfer + 2); // при 2:1 = width/4
    const half = widthPx / 2;

    // точки контура до поворота (по часовой, начиная сверху-слева)
    const local = [
        new Phaser.Math.Vector2(-half + chamfer, -half), // верхняя прямая (левый конец)
        new Phaser.Math.Vector2(-half, -half + chamfer), // срез 1
        new Phaser.Math.Vector2(-half, half - chamfer), // левая прямая
        new Phaser.Math.Vector2(-half + chamfer, half), // срез 2
        new Phaser.Math.Vector2(half - chamfer, half), // нижняя прямая
        new Phaser.Math.Vector2(half, half - chamfer), // срез 3
        new Phaser.Math.Vector2(half, -half + chamfer), // правая прямая
        new Phaser.Math.Vector2(half - chamfer, -half), // срез 4
    ];

    // поворот и перенос в мир
    const pts = local.map((p) => {
        const rp = p.clone().rotate(rotationRad);
        rp.x += cx;
        rp.y += cy;
        return rp;
    });

    // сегменты по контуру
    const segs = [];
    for (let i = 0; i < pts.length; i++) {
        segs.push({ a: pts[i], b: pts[(i + 1) % pts.length] });
    }
    return segs;
}

// Ближайшая точка от точки P к отрезку AB
function closestPointOnSegment(point, a, b) {
    const ap = point.clone().subtract(a);
    const ab = b.clone().subtract(a);
    const t = Phaser.Math.Clamp(ap.dot(ab) / ab.lengthSq(), 0, 1);
    return a.clone().add(ab.scale(t));
}

// Нормаль сегмента AB, направленная ВОВНУТРЬ фигуры (к центру)
function inwardNormal(a, b, center) {
    const tangent = new Phaser.Math.Vector2(b.x - a.x, b.y - a.y);
    let normal = new Phaser.Math.Vector2(-tangent.y, tangent.x).normalize(); // 90° влево
    const mid = new Phaser.Math.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2);
    const toCenter = new Phaser.Math.Vector2(
        center.x - mid.x,
        center.y - mid.y
    ).normalize();
    if (normal.dot(toCenter) < 0) normal.negate(); // если смотрит наружу — развернуть
    return normal;
}

// Отражение вектора скорости относительно нормали
function reflect(velocity, normal) {
    return velocity
        .clone()
        .subtract(normal.clone().scale(2 * velocity.dot(normal)));
}

function targetCounterReset(targets) {
    targets.forEach((t) => {
        t.touchCount = 0;
        t.multyplier = 1;
        t.counter.setText("m1");
    });
}

function drawTargetSegment(scene, t) {
    const gfx = t.graphicsSegments
    gfx.clear();

    const sectors = 3;
    const gapDeg = 10;    // визуальный разрыв между секторами
    const gap = Phaser.Math.DegToRad(gapDeg);

    //   this.targets.forEach(t => {
    const rOuter = t.r + 10;     // внешний радиус кольца  const rOuter = t.r + 10; 
    const rInner = t.r + 2;    // внутренний (толщина ~18) const rInner = t.r - 4;

    for (let i = 0; i < sectors; i++) {
        const color = i < t.activeSegments
            ? scene.standartColors.yellow  // белый
            : scene.standartColors.red; // красный

        const a0 = (i * (Math.PI * 2) / sectors) + gap / 2 + Phaser.Math.DegToRad(-90);
        const a1 = ((i + 1) * (Math.PI * 2) / sectors) - gap / 2 + Phaser.Math.DegToRad(-90);
        ringSector(gfx, t.x, t.y, rInner, rOuter, a0, a1, color);
    }
    //   });
}

// рисует донат-сектор (кольцевой сегмент) с зазором между секторами
function ringSector(g, x, y, rInner, rOuter, angStart, angEnd, color) {
    g.fillStyle(color, 1);
    g.beginPath();

    // внешний дугой по часовой
    g.arc(x, y, rOuter, angStart, angEnd, false);

    // соединяем к внутренней дуге
    const x2 = x + Math.cos(angEnd) * rInner;
    const y2 = y + Math.sin(angEnd) * rInner;
    g.lineTo(x2, y2);

    // внутренняя дуга против часовой
    g.arc(x, y, rInner, angEnd, angStart, true);

    g.closePath();
    g.fillPath();  // важно: fillPath(), не stroke
}


// зоны кругами и секторами
// 0 — центральный круг
// 1..12 — сектора по 30° (0..30, 30..60, ..., 330..360)
function _getZone(ball, center, safeRadius = SAFE_ZONE_R, sectorAngle = 30) {
    const dx = ball.x - center.x;
    const dy = ball.y - center.y;
    const dist = Math.hypot(dx, dy);

    // 0 — центральный круг
    if (dist <= safeRadius) return 0;

    // угол в [0..360)
    let angleDeg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    if (angleDeg < 0) angleDeg += 360;

    // делим на угол сектора
    const sector = Math.floor(angleDeg / sectorAngle);
    return 1 + sector; // зоны 1..12
}

function getZone(ballPos, center, safeRadius = SAFE_ZONE_R, sectorAngle = 30) {
    const dx = ballPos.x - center.x;
    const dy = ballPos.y - center.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= safeRadius) return 0;
    let deg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    if (deg < 0) deg += 360;
    return Math.floor(deg / sectorAngle); // 0..11
}
function getAngle(ballPos, center) {
    const dx = ballPos.x - center.x;
    const dy = ballPos.y - center.y;
    let deg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    if (deg < 0) deg += 360;
    return deg;
}
function checkSafeZone(ballPos, center, radius) {
    const dx = ballPos.x - center.x;
    const dy = ballPos.y - center.y;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) return false;
    else return true;
}

function drawZones(
    scene,
    center,
    radius,
    safeRadius = SAFE_ZONE_R,
    sectorAngle,
    dangerZones
) {
    const g = scene.add.graphics();
    g.clear();

    g.lineStyle(2, 0x444444, 0.2);

    // секторы
    for (let i = 0; i < 360 / sectorAngle; i++) {
        const startAngle = Phaser.Math.DegToRad(i * sectorAngle);
        const endAngle = Phaser.Math.DegToRad((i + 1) * sectorAngle);

        // радиальные линии
        const x1 = center.x + Math.cos(startAngle) * safeRadius;
        const y1 = center.y + Math.sin(startAngle) * safeRadius;
        const x2 = center.x + Math.cos(startAngle) * radius;
        const y2 = center.y + Math.sin(startAngle) * radius;

        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.strokePath();
        g.setDepth(0);
    }
}
function drawLaser(scene, center, radius, startAngle, wideAngle, type) {
    // создаём graphics и очищаем на всякий случай
    const laser = scene.add.graphics().setDepth(0).setVisible(true);
    laser.clear();

    const start = Phaser.Math.DegToRad(startAngle);
    const end = Phaser.Math.DegToRad(startAngle + wideAngle);

    // стиль: полупрозрачный красный сектор
    let color = scene.standartColors.red;
    if (type === "blue") color = scene.standartColors.blue;
    if (type === "yellow") color = scene.standartColors.yellow;

    laser.fillStyle(color, 1);
    laser.beginPath();
    laser.moveTo(center.x, center.y);
    laser.arc(center.x, center.y, radius, start, end, false);
    laser.closePath();
    laser.fillPath();

    // вернём объект для управления (например, чтобы удалить потом)
    return laser;
}

function clearLaser(laser) {
    if (laser) {
        laser.clear();
        laser.destroy();
    }
}

// new zones overlay system
function buildZonesOverlays(scene, center, outerR, safeR, sectorAngle) {
    const overlays = [];

    // 0 — центральная зона (круг)

    const gfx = scene.add.graphics().setDepth(1).setVisible(true);
    overlays[0] = { id: 0, type: "center", gfx };
    // Запасаем геометрию как функцию
    // overlays[0].draw = (color, alpha) => {
    gfx.clear();
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(center.x, center.y, safeR);
    gfx.lineStyle(4, scene.standartColors.red, 1);
    gfx.strokeCircle(center.x, center.y, safeR);
    // gfx.setDepth(0);
    // this.gfx.fillStyle(0x00ff00, 0.05);
    // this.gfx.fillCircle(ARENA_CENTER.x, ARENA_CENTER.y, SAFE_ZONE_R);
    // this.gfx.lineStyle(1, 0x00ff00, 0.1);
    // this.gfx.strokeCircle(ARENA_CENTER.x, ARENA_CENTER.y, SAFE_ZONE_R);
    // };
    // overlays[0].draw(0x00ff00, 0.05);

    // 1..12 — сектора кольца
    for (let i = 0; i < 360 / sectorAngle; i++) {
        const id = 1 + i;
        const start = Phaser.Math.DegToRad(i * sectorAngle);
        const end = Phaser.Math.DegToRad((i + 1) * sectorAngle);
        const gfx = scene.add.graphics().setDepth(0).setVisible(false);

        overlays[id] = { id, type: "sector", start, end, gfx };
        overlays[id].draw = (color, alpha) => {
            gfx.clear();
            gfx.fillStyle(color, alpha);
            // рисуем «пончиковый» сектор (между safeR и outerR)
            gfx.beginPath();
            // внешний дугой по часовой
            gfx.arc(center.x, center.y, outerR, start, end, false);
            // внутренняя дуга обратно (чтобы замкнуть форму)
            gfx.arc(center.x, center.y, safeR, end, start, true);
            gfx.closePath();
            gfx.fillPath();
            // gfx.setDepth(0);
        };
    }

    return overlays;
}

function paintZone(zones, id, color = 0xff4444, alpha = 0.5) {
    const z = zones[id];
    if (!z) return;
    z.gfx.setVisible(true);
    z.draw(color, alpha);
}

function clearZone(zones, id) {
    const z = zones[id];
    if (!z) return;
    z.gfx.clear();
    z.gfx.setVisible(false);
}

function clearAllZones(zones) {
    zones.forEach((z) => {
        if (z) {
            z.gfx.clear();
            z.gfx.setVisible(false);
        }
    });
}

// красивая «вспышка» зоны на duration мс
function flashZone(scene, zones, id, color = 0xffcc00, duration = 100) {
    const z = zones[id];
    if (!z) return;
    paintZone(zones, id, color, 0.35);
    scene.tweens.add({
        targets: z.gfx,
        alpha: { from: 1, to: 0 },
        duration,
        onComplete: () => clearZone(zones, id),
    });
}

function formatDigits(v) {
    // if (v >= 1) return v.toFixed(0);
    // if (v >= 0.1) return v.toFixed(1);
    if (v >= 0.01) return v.toFixed(2);
    return v.toFixed(3);
}

function median(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b); // копия с сортировкой
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        return sorted[mid];
    }
}

// --------------- Boot -------------------
new Phaser.Game({
    type: Phaser.AUTO, // Можно AUTO, CANVAS, WEBGL
    width: 640,
    height: 1120,
    scale: {
        mode: Phaser.Scale.FIT,
        // autoCenter: Phaser.Scale.NO_CENTER,
    },
    // scale: {
    //     mode: Phaser.Scale.FIT,
    //     autoCenter: Phaser.Scale.CENTER_BOTH,
    // },
    backgroundColor: "#060B14",
    parent: "game",
    scene: [ArenaScene],
});
