export default class EmoChat {
    constructor(scene, x, y) {
        // console.log(scene)
        this.scene = scene
        this.config = this.initConstants({ x: 560, y: 930 }, { x: 480, y: 130 });
        // dev
        this.frameAlpha = 0
        this.devVisible = 0


        this.init()
        this.create()
        // this.emoSetCounts = new Map();
        this.attachGestures()

    }
    // static sameCounters(a, b) {
    // }
    initConstants(button, feed) {
        return {
            BUTTON_X: button.x,
            BUTTON_Y: button.y,
            AREA_RADIUS: 75,
            AREA_WIDTH: 150,
            AREA_HEIGHT: 150,
            TAP_MAX_DISTANCE: 3,
            TAP_MAX_DURATION: 250,
            TAP_MIN_DURATION: 5,
            TAP_LONG_DURATION: 200,
            SWIPE_MIN_DISTANCE: 50,
            SWIPE_MAX_TIME: 1000,
            DRAG_HOLD_TIME: 400,
            DRAG_MIN_DISTANCE: 10,
            FEED_X: feed.x,
            FEED_Y: feed.y,
            FEED_WIDTH: 150,
            FEED_HEIGHT: 360,
            MENU_WIDTH: 540,
            MENU_HEIGHT: 300,
            MESSAGE_LENGTH: 3,
            DOUBLE_TAP_DELAY: 250
        };
    }
    init() {
        this.initEmoji()
        this.initArea()
        this.initState()
        this.initCategories()

        // 
        this.lastTapTime = 0;
        this.tapTimeoutId = null;
    }
    initArea() {
        // область жестов
        // this.gestureArea = new Phaser.Geom.Rectangle(
        //     this.config.BUTTON_X - this.config.AREA_WIDTH / 2,
        //     this.config.BUTTON_Y - this.config.AREA_HEIGHT / 2,
        //     this.config.AREA_WIDTH,
        //     this.config.AREA_HEIGHT
        // );
        // var 2
        this.gestureArea = new Phaser.Geom.Circle(
            this.config.BUTTON_X,
            this.config.BUTTON_Y,
            this.config.AREA_RADIUS
        );

    }
    initEmoji() {
        // загружаем и активируем картинки - может lazy?
        // пока временное решение
        this.iconSet = {
            'POSITIVE_0': 1,
            'POSITIVE_1': 6,
            'POSITIVE_2': 14,
            'POSITIVE_3': 15,
            'POSITIVE_4': 26,
            'POSITIVE_5': 27,
            'POSITIVE_6': 11,
            'POSITIVE_7': 3,
            'POSITIVE_8': 23,
        }
    }
    initState() {
        this.state = {
            currentCat: 0, // брать из записи или последнее или по умолчанию?
            currentEmo: undefined,

        }

        this.state.update = object => {
            for (const key in object) {
                if (!Object.hasOwn(object, key)) continue;
                this.state[key] = object[key];
            }

        }
    }
    initCategories() {
        const categoryNames = ['POSITIVE', 'NEGATIVE', 'FUN', 'REACTION', 'WORDS'];
        const iconsPerCategory = 5; // сколько кадров у каждой категории
        this.categories = categoryNames.map(name => ({
            name,
            icons: Array.from({ length: iconsPerCategory }, (_, i) => `${name}_${i}`)
        }));
        // console.log(this.categories)
        // const cat = this.categories.find(c => c.name === 'POSITIVE');
        // console.table(cat.icons);
    }
    update() {
        // console.log('update')
        // this.timer.update() 
    }
    create() {
        this.createMenu()
        this.createButton()
        this.createHelper()
        this.createFeed()
        this.createMessage()
        this.createGestureSchemes()
        this.currentScheme = this.gestureSchemes[1];
        this.updateHelper(this.currentScheme)

        // this.timer = new EmoChat.Timer(
        //     this.scene,
        //     this.feed.messageLineBG.startX + 124, // подгони координаты возле плашки
        //     this.feed.messageLineBG.startY
        // );

    }
    createButton() {
        // контейнер
        this.button = {}
        this.button.container = this.scene.add.container(0, 0) // мы делаем контейнер из нуля, а элементы в абсолютных единицах?
        this.button.container.setDepth(999)
        // рамка
        this.button.frame = this.scene.add.graphics();
        this.button.frame.lineStyle(4, 0xfcd912, this.frameAlpha);
        this.button.frame.strokeRect(this.gestureArea.x, this.gestureArea.y, this.gestureArea.width, this.gestureArea.height);

        // иконка в центре области 
        this.button.icon = this.scene.add
            .image(this.config.BUTTON_X, this.config.BUTTON_Y, 'emo', 1)
            .setOrigin(0.5)
            .setScale(1.1)
            // .setDepth(100)
            .setInteractive();
        this.button.icon.defaults = {
            scale: this.button.icon.scale,
            x: this.config.BUTTON_X,
            y: this.config.BUTTON_Y
        }
        this.state.currentEmo = 1
        this.state.update({ currentEmo: 1 })
        // название
        this.button.label = this.scene.add
            .text(this.config.BUTTON_X, this.config.BUTTON_Y - 50, `EMO_CHAT`, {
                font: '16px Helvetica',
                fill: '#dbdbdbff',
            }).setAlpha(0)
            .setOrigin(0.5)

        this.button.container.add([this.button.frame, this.button.icon, this.button.label])
    }
    createMenu() {
        // контейнер
        this.menu = {}
        this.menu.container = this.scene.add.container(0, 0).setDepth(999).setVisible(this.devVisible)

        // рамка
        this.menu.frame = this.scene.add.graphics()
            .lineStyle(4, 0xfcd912, this.frameAlpha)
            .strokeRect(this.config.BUTTON_X - this.config.MENU_WIDTH, this.config.BUTTON_Y - this.config.MENU_HEIGHT / 2, this.config.MENU_WIDTH, this.config.MENU_HEIGHT);

        // подложка
        this.menu.bg = this.scene.add.graphics();
        this.menu.bg.fillStyle(0x000000, 0.5);
        this.menu.bg.fillRoundedRect(this.config.BUTTON_X - this.config.MENU_WIDTH + 100, this.config.BUTTON_Y - this.config.MENU_HEIGHT / 2, this.config.MENU_WIDTH, this.config.MENU_HEIGHT, 30);
        this.menu.bg.defaults = {
            alpha: 0.8
        }
        // this.menu.bg.setInteractive() // надо перехватить нажатия
        this.menu.container.add([this.menu.bg, this.menu.frame])

        // веер / линии / категории
        this.menu.lines = []
        this.menu.rings = []
        this.menu.container.add(this.menu.lines)

        for (let index = 0; index < this.categories.length; index++) {
            const gapX = 30
            const gapY = 60
            const shift = (index <= 2) ? gapX * index : gapX * (4 - index)
            const x = this.config.BUTTON_X - this.config.MENU_WIDTH - gapX - shift
            const y = this.config.BUTTON_Y + gapY * (index - 2)

            const wrapper = this.scene.add.graphics()
                .fillStyle(0x212838, 1)
                .fillRoundedRect(x + 275, y - 25, 290, 50, 25) // .fillRoundedRect(x + 95, y - 25, 410, 50, 25)
            this.menu.container.add(wrapper)

            const category = this.categories[index];
            // console.log(category)
            this.menu.rings[index] = this.scene.add.graphics()
                .lineStyle(4, 0xE60000, 1)
                .strokeCircle(x + this.config.MENU_WIDTH, y, 26)
                .setVisible(index === this.state.currentCat ? 1 : 0)
            this.menu.container.add(this.menu.rings[index])


            this.menu.lines[index] = this.scene.add.container(x, y)
                .setDepth()
                .setAlpha(index === this.state.currentCat ? 1 : 0.5)
            this.menu.container.add(this.menu.lines[index])



            for (let i = 0; i < category.icons.length; i++) {
                const x = this.config.MENU_WIDTH - 60 * i
                const y = 0
                const iconName = category.icons[i]
                const iconNumber = this.iconSet[iconName] ? this.iconSet[iconName] : Math.round((Math.random() * 100))
                // console.log(iconName, iconNumber)

                const icon = this.scene.add
                    .image(x, y, 'emo', iconNumber)
                    .setOrigin(0.5)
                    .setScale(0.7) // 0.9
                    .setAlpha(1) // .setAlpha(1 - i * 0.15)
                icon.defaults = {
                    alpha: icon.alpha,
                    scale: icon.scale,
                    startX: x + 30,
                    startY: y - (index - 2) * 30
                }
                // if (i === 0)console.log('icon.defaults', icon.defaults)
                this.menu.lines[index].add(icon)
            }
        }

        // закрывашка-открывашка меню
        this.menuCloser = {}
        // this.menuCloser.container = this.scene.add.container(0, 0).setDepth(999)
        this.menuCloser.state = true

        const x = this.config.BUTTON_X + 40
        const y = this.config.BUTTON_Y + 120

        const buttonW = 60;
        const buttonH = 40;
        const buttonRadius = 10

        this.menuCloser.button = this.scene.add.graphics();
        this.menuCloser.button.fillStyle(0x212838, 1);
        this.menuCloser.button.fillRoundedRect(x - buttonW / 2, y - buttonH / 2, buttonW, buttonH, buttonRadius)
        // .setInteractive() // это не объект, он не может быть интерактивным...
        // .on('pointerdown', () => {
        //     if (this.helper.container.visible) {
        //         this.helper.container.visible = 0
        //         this.menuCloser.text.setText('OPEN\nHELP')
        //     }
        //     else {
        //         this.helper.container.visible = 1
        //         this.menuCloser.text.setText('CLOSE\nHELP')
        //     }
        // })

        this.menuCloser.text = this.scene.add.text(x, y, 'CLOSE\nMENU', {
            font: '12px Helvetica',
            fill: '#ffee00ff',
        })
            .setAlpha(1)
            .setOrigin(0.5)
            .setAlign('center')
            .setInteractive()
            .on('pointerdown', () => {
                if (this.menu.container.visible) {
                    this.menu.container.visible = 0
                    this.menuCloser.text.setText('OPEN\nMENU')
                    this.menuCloser.state = false
                }
                else {
                    this.menu.container.visible = 1
                    this.menuCloser.text.setText('CLOSE\nMENU')
                    this.menuCloser.state = true
                }
            })

        this.menu.container.add([this.menuCloser.button, this.menuCloser.text])

    }
    createHelper() {
        // контейнер
        this.helper = {}
        this.helper.container = this.scene.add.container(0, 0).setDepth(999).setVisible(this.devVisible)

        const x = 170 // 170
        const y = 510 // 500
        const width = 300
        const height = 260

        // рамка
        this.helper.frame = this.scene.add.graphics()
            .lineStyle(4, 0xfcd912, this.frameAlpha)
            .strokeRect(x, y, width, height);

        // подложка
        this.helper.bg = this.scene.add.graphics();
        this.helper.bg.fillStyle(0x1c2534, 1); // '#1b1c23ff'
        this.helper.bg.fillRoundedRect(x, y, width, height, 24);

        // нужен анимированный хелпер в стиле телеграм
        // Swipe UP to send\n
        // Swipe -> next emoji\n
        // Swipe <- prev emoji\n
        // Swipe DOWN - change cat

        this.helper.top = this.scene.add.text(x + width / 2, y + 10, `EMO_CHAT HELPER`, {
            font: "20px Helvetica",
            fill: '#f8e700',
        })
            .setAlpha(1)
            .setOrigin(0.5, 0)
            .setAlign('center')

        this.helper.text = this.scene.add.text(x + 20, y + 20,
            '', {
            font: "20px Helvetica",
            fill: '#05edff',
        })
            .setOrigin(0, 0)
            .setAlign('left')

        this.helper.container.add([this.helper.bg, this.helper.frame, this.helper.top, this.helper.text])

        // закрывашка-открывашка хелпера
        this.helperCloser = {}
        this.helperCloser.container = this.scene.add.container(0, 0).setDepth(999)
        this.helperCloser.state = true

        const closerX = this.config.BUTTON_X + 40
        const closerY = this.config.BUTTON_Y - 120

        const buttonW = 60;
        const buttonH = 40;
        const buttonRadius = 10

        this.helperCloser.button = this.scene.add.graphics();
        this.helperCloser.button.fillStyle(0x212838, 1);
        this.helperCloser.button.fillRoundedRect(closerX - buttonW / 2, closerY - buttonH / 2, buttonW, buttonH, buttonRadius)
        // .setInteractive() // это не объект, он не может быть интерактивным...
        // .on('pointerdown', () => {
        //     if (this.helper.container.visible) {
        //         this.helper.container.visible = 0
        //         this.helperCloser.text.setText('OPEN\nHELP')
        //     }
        //     else {
        //         this.helper.container.visible = 1
        //         this.helperCloser.text.setText('CLOSE\nHELP')
        //     }
        // })

        this.helperCloser.text = this.scene.add.text(closerX, closerY, 'CLOSE\nHELP', {
            font: '12px Helvetica',
            fill: '#ffee00ff',
        })
            .setAlpha(1)
            .setOrigin(0.5)
            .setAlign('center')
            .setInteractive()
            .on('pointerdown', () => {
                this.toggleHelp()
                // if (this.helper.container.visible) {
                //     this.helper.container.visible = 0
                //     this.helperCloser.text.setText('OPEN\nHELP')
                //     this.helperCloser.state = false
                // }
                // else {
                //     this.helper.container.visible = 1
                //     this.helperCloser.text.setText('CLOSE\nHELP')
                //     this.helperCloser.state = true
                // }
            })

        this.helperCloser.container.add([this.helperCloser.button, this.helperCloser.text])
        this.menu.container.add(this.helperCloser.container)
    }
    createMessage(reply, occasion, emos) {
        // контейнер
        this.message = {}
        this.message.container = this.scene.add.container(0, 0).setDepth(999)

        // линия эмодзи
        this.message.line = []
        this.message.sprites = []
        this.message.lineContainer = this.scene.add.container(0, 0).setDepth(999)
        // this.message.container.add(this.message.sprites)

        // рамка и подложка
        this.message.bg = this.scene.add.graphics();
        this.message.bg.fillStyle(0x212838, 0)
        this.message.bg.fillRoundedRect(this.config.FEED_X, this.config.FEED_Y + this.config.FEED_HEIGHT + 10, this.config.FEED_WIDTH, 120, 12)

        this.message.frame = this.scene.add.graphics();
        this.message.frame.lineStyle(4, 0xE60000, 0);
        this.message.frame.strokeRoundedRect(this.config.FEED_X, this.config.FEED_Y + this.config.FEED_HEIGHT + 10, this.config.FEED_WIDTH, 120, 12)

        // this.message.plane = this.scene.add
        //     .image(this.config.BUTTON_X, this.config.BUTTON_Y, 'emo_plane')
        //     .setOrigin(0.5)
        //     .setScale(1.1)
        
        const content = {
            reply,
            // nickName: 'HENRY', // а зачем он здесь? игрок и так знает кто он... 
            occasion,
            emos
        }
        // сценарий 1 - сообщение без вин

        // сценарий 2 - сообщение с вин

        // сценарий 3 - реплей

        this.message.container.add([this.message.bg, this.message.frame])
    }
    addEmoToLine(emoFrame) {
        // TODO: позже добавим проверки на длину/ширину и веса слов
        // if (this.message.line.length >= this.config.MESSAGE_LENGTH && emoFrame) {
        //     // shake line
        //     // this.message.sprites.forEach(icon => {
        //     //     this.scene.tweens.add({
        //     //         targets: icon,
        //     //         // x: targetX,
        //     //         y: icon.y - 20,
        //     //         yoyo: true,
        //     //         duration: 20,
        //     //         ease: 'Back.Out'
        //     //     });
        //     // })
        //     // return

        //     // send
        //     this.sendMessage();
        //     return
        // }

        if (emoFrame) this.message.line.push(emoFrame);
        else if (this.message.line.length > 0) this.message.line.pop()

        this.updateMessageLine();


        // чужие модули
        // // меняем иконки на кнопке - вынести
        if (this.message.line.length === this.config.MESSAGE_LENGTH) {
            this.button.icon.setFrame(119) // самолётик
        } else {
            // пока рандом
            const iconNumber = Math.round((Math.random() * 100))
            this.state.currentEmo = iconNumber
            this.button.icon.setFrame(this.state.currentEmo)
        }
        // реакция маленького самолётика - вынести
        if (this.message.line.length > 0) this.feed.messagePlane.alpha = 1
        else this.feed.messagePlane.alpha = 0.5

        if (this.message.line.length === this.config.MESSAGE_LENGTH && emoFrame) this.planeReflex(1000)
    }
    planeReflex(delay, callback) {
        this.scene.tweens.add({
            targets: this.feed.messagePlane,
            // x: targetX,
            y: this.feed.messagePlane.y - 6,
            yoyo: true,
            duration: 50,
            delay: delay,
            ease: 'Back.Out',
            onComplete: () => {
                if (callback) callback()
            }
        });
    }
    commitMessage() {
        // отправляем в чат
    }
    clearMessageLine() {
        this.message.line.length = 0
    }
    updateMessageLine() {
        const line = this.message.line;
        const sprites = this.message.sprites;

        if (!line.length) {
            // если очистишь сообщение — нужно будет ещё и спрайты убить
            sprites.forEach(s => s.destroy());
            this.message.sprites = [];
            return;
        }

        const spacing = 36; // расстояние между иконками
        const targetY = this.feed.messageLineBG.startY;

        // центрируем по BG (можно подправить формулу)
        const baseX = this.feed.messageLineBG.startX + 16;

        for (let index = 0; index < line.length; index++) {
            const frame = line[index];
            const targetX = baseX + index * spacing;

            let icon = sprites[index];

            if (!icon) {
                // это НОВАЯ иконка → создаём у кнопки и анимируем "прилёт"
                icon = this.scene.add
                    .image(targetX, targetY + 50, 'emo', frame)
                    .setOrigin(0.5)
                    .setScale(0.55);

                sprites[index] = icon;
                this.message.lineContainer.add(icon)

                this.scene.tweens.add({
                    targets: icon,
                    // x: targetX,
                    y: targetY,
                    duration: 50,
                    ease: 'Back.Out'
                });
            } else {
                // уже существующая — просто обновляем кадр и позицию без анимации
                icon.setFrame(frame);
                icon.setPosition(targetX, targetY);
            }
        }

        // если спрайтов стало больше, чем иконок в линии (например, после очистки и набора заново)
        for (let i = line.length; i < sprites.length; i++) {
            sprites[i].destroy();
        }
        sprites.length = line.length;
    }

    createFeed() {
        // контейнер
        this.feed = {}
        this.feed.container = this.scene.add.container(0, 0).setDepth(999)

        // рамка
        this.feed.frame = this.scene.add.graphics()
            .lineStyle(4, 0xfcd912, this.frameAlpha)
            .strokeRect(this.config.FEED_X, this.config.FEED_Y, this.config.FEED_WIDTH, this.config.FEED_HEIGHT);

        // подложка
        this.feed.bg = this.scene.add.graphics();
        this.feed.bg.fillStyle(0x000000, 0.5); // 0x212838
        this.feed.bg.fillRoundedRect(this.config.FEED_X, this.config.FEED_Y, this.config.FEED_WIDTH, this.config.FEED_HEIGHT, 8);

        // подложка нашего набора
        this.feed.messageLineBG = this.scene.add.graphics();
        this.feed.messageLineBG.fillStyle(0x212838, 0.9);
        this.feed.messageLineBG.fillRoundedRect(this.config.FEED_X, this.config.FEED_Y + this.config.FEED_HEIGHT - 40, this.config.FEED_WIDTH, 40, 8);
        this.feed.messageLineBG.startX = this.config.FEED_X + 5
        this.feed.messageLineBG.startY = this.config.FEED_Y + this.config.FEED_HEIGHT - 20

        this.feed.messagePlane = this.scene.add
            .image(this.config.FEED_X + this.config.FEED_WIDTH - 20, this.config.FEED_Y + this.config.FEED_HEIGHT - 20, 'emo_plane')
            .setOrigin(0.5)
            .setScale(0.5)
            .setAlpha(0.5)
        
        this.feed.container.add([this.feed.bg, this.feed.frame, this.feed.messageLineBG, this.feed.messagePlane])
    }

    // ещё не задействовал
    updateFeed(line) {
        if (!this.feedRows) {
            this.feedRows = [];
            for (let i = 0; i < 4; i++) {
                this.feedRows.push(
                    this.scene.add.text(20, 80 + i * 20, '', { fontSize: 16, color: '#fff' })
                );
            }
        }
        for (let i = this.feedRows.length - 1; i > 0; i--) {
            this.feedRows[i].setText(this.feedRows[i - 1].text);
        }
        this.feedRows[0].setText(line);
    }
    addFeedRow(text) {
        const maxRows = 5;
        const scene = this.scene;

        // создаём плашку
        const row = this.makeFeedRow(scene, text);
        row.y = this.feedContainer.height;  // появляется снизу
        this.feedContainer.add(row);

        // плавное появление
        scene.tweens.add({
            targets: row,
            y: row.y - 8,
            alpha: 1,
            duration: 150,
            ease: 'Quad.easeOut'
        });

        // если строк больше лимита — удаляем старую
        if (this.feedContainer.length > maxRows) {
            const old = this.feedContainer.getAt(0);
            old.destroy();
        }
    }
    makeFeedRow(scene, label) {
        const PAD_X = 10, PAD_Y = 4, RADIUS = 8;

        const txt = scene.add.text(0, 0, label, {
            fontFamily: 'Helvetica',
            fontSize: '14px',
            fill: '#fff'
        }).setOrigin(0, 0.5);

        const bg = scene.add.graphics();
        const badgeW = txt.width + PAD_X * 2;
        const badgeH = txt.height + PAD_Y * 2;
        bg.fillStyle(0x000000, 0.35);
        bg.fillRoundedRect(0, 0, badgeW, badgeH, RADIUS);

        const row = scene.add.container(0, 0, [bg, txt]);
        txt.x = PAD_X;
        txt.y = badgeH / 2;
        row.setAlpha(0);
        return row;
    }

    // жесты
    attachGestures() {
        const { scene } = this;
        const area = this.gestureArea;
        const cfg = this.config;

        let startX = 0, startY = 0, startTime = 0;

        scene.input.on("pointerdown", (p) => {
            // console.log('pointerdown')
            // console.log('area', area.x, area.y, area.radius);
            // console.log('pointer', p.x, p.y);
            if (!Phaser.Geom.Circle.Contains(area, p.x, p.y)) return;
            startX = p.x;
            startY = p.y;
            startTime = scene.time.now;
            console.log('pointerdown', startTime)
        });

        scene.input.on("pointerup", (p) => {
            if (!startTime) return;

            const dx = p.x - startX;
            const dy = p.y - startY;
            const dist = Phaser.Math.Distance.Between(startX, startY, p.x, p.y);
            const dur = scene.time.now - startTime;
            startTime = 0;
            console.log('dur', dur, 'dist', dist)

            // 👇 короткий тап 
            if (dist < cfg.TAP_MAX_DISTANCE && dur < cfg.TAP_LONG_DURATION && dur > cfg.TAP_MIN_DURATION) {
                // this.toggleMenu();
                this.performGesture("tap");
                return;
            }

            // 👇 длинный тап 
            if (dist < cfg.TAP_MAX_DISTANCE && dur > cfg.TAP_LONG_DURATION) {
                // this.toggleMenu();
                this.performGesture("long");
                return;
            }

            // 👇 короткий тап: одиночный или двойной
            // if (dist < cfg.TAP_MAX_DISTANCE && dur < cfg.TAP_MAX_DURATION) {
            //     const now = scene.time.now;

            //     // если уже был тап недавно → считаем дабл-тап
            //     if (now - this.lastTapTime <= cfg.DOUBLE_TAP_DELAY) {
            //         // сброс ожидания одиночного тапа
            //         if (this.tapTimeoutId) {
            //             clearTimeout(this.tapTimeoutId);
            //             this.tapTimeoutId = null;
            //         }
            //         this.lastTapTime = 0;

            //         // здесь обрабатываем DOUBLE TAP
            //         // либо прямым вызовом:
            //         // this.onDoubleTap();
            //         // либо через схемы:
            //         this.performGesture('double');

            //     } else {
            //         // первый тап → ждём, не прилетит ли второй
            //         this.lastTapTime = now;

            //         this.tapTimeoutId = setTimeout(() => {
            //             // если второй тап не пришёл — считаем одиночным
            //             this.tapTimeoutId = null;
            //             this.lastTapTime = 0;

            //             // одиночный тап:
            //             // раньше тут было this.toggleMenu()
            //             // теперь лучше через схему:
            //             this.performGesture('tap');
            //         }, cfg.DOUBLE_TAP_DELAY);
            //     }

            //     return;
            // }

            // 👇 быстрый свайп
            if (dist >= cfg.SWIPE_MIN_DISTANCE && dur < cfg.SWIPE_MAX_TIME) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    // горизонталь
                    if (dx > 0) this.performGesture('right'); // this.nextIcon();      // вправо
                    else this.performGesture('left'); // this.prevIcon();             // влево

                    this.buttonIconlineMove(this.button.icon, dx, 0)
                } else {
                    // вертикаль
                    if (dy < 0) this.performGesture('up'); // this.sendEmoji();     // вверх — отправка эмоции
                    else this.performGesture('down'); // this.undoEmoji() // this.nextCategory();         // вниз — смена категории

                    this.buttonIconlineMove(this.button.icon, 0, dy)
                }
            }
        });

        // (опционально) — если хочешь long-hold для drag или таймеров:
        // scene.input.on('pointermove', ...)  → можно добавить потом.
    }
    // методы для жестов
    nextIcon() {
        console.log('next icon', this.state.currentEmo);
        // if (this.menu.container.visible) this.toggleMenu()
        // else console.log('next icon');
    }
    prevIcon() {
        console.log('prev icon');
    }
    nextCategory() {
        const prevCat = this.state.currentCat
        this.state.currentCat++
        if (this.state.currentCat > this.categories.length - 1) this.state.currentCat = 0
        // this.state.currentEmo = ??
        console.log('next category', this.state.currentCat);
        // console.log('this.menu.rings', this.menu.rings);
        // this.menu.rings.forEach((ring, index) => {
        //     console.log('this.menu.rings', ring, index);
        //     if (index === this.state.currentCat) ring.alpha = 1
        //     else ring.alpha = 0
        // })
        this.menu.rings.forEach((ring, index) => {
            ring.visible = (index === this.state.currentCat);

        })
        this.menu.lines.forEach((line, index) => {
            const isActive = index === this.state.currentCat;
            line.setAlpha(isActive ? 1 : 0.5);

        })
        this.setButtonIcon()

    }
    upSelector() {
        if (this.message.line.length === this.config.MESSAGE_LENGTH) {
            this.sendMessage();
        } else {
            this.sendEmoji()
        }

             // меняем иконки на кнопке
        // if (this.message.line.length === this.config.MESSAGE_LENGTH) {
        //     this.button.icon.setFrame(119) // самолётик
        // } else {
        //     // пока рандом
        //     const iconNumber = Math.round((Math.random() * 100))
        //     this.state.currentEmo = iconNumber
        //     this.button.icon.setFrame(this.state.currentEmo)
        // }
    }
    downSelector() {
         if (this.message.line.length === 0) {
            this.nextCategory();
        } else {
            this.undoEmoji()
        }
    }
    undoEmoji() {
        console.log('undoEmoji')
        this.addEmoToLine(false)
    }
    sendEmoji() {
        console.log('send emoji', this.state.currentEmo)
        this.addEmoToLine(this.state.currentEmo)
    }
    toggleMenu() {
        // console.log('toggle menu')
        this.menu.container.visible = !this.menu.container.visible
        if (this.helperCloser.state && this.menu.container.visible) this.helper.container.visible = this.menu.container.visible
        else this.helper.container.visible = 0

        this.openVeer(this.menu.container.visible)
    }
    toggleHelp() {
        console.log('toggle help')
        // this.help.container.visible = !this.help.container.visible

        if (this.helper.container.visible) {
            this.helper.container.visible = 0
            this.helperCloser.text.setText('OPEN\nHELP')
            this.helperCloser.state = false
        }
        else {
            this.helper.container.visible = 1
            this.helperCloser.text.setText('CLOSE\nHELP')
            this.helperCloser.state = true
        }

        // if (this.help.container.visible) {
        //     this.help.container.visible = 0
        //     // this.helper.container.visible = 0
        // } else {
        //     this.menu.container.visible = 1
        //     // if (this.helperCloser.state) this.helper.container.visible = 1
        // }
    }
    sendMessage() {
        console.log('send message', this.message.line);
        this.commitMessage(this.message.line);
        setTimeout(() => {
            // this.commitMessage();
            this.clearMessageLine();
            this.updateMessageLine();
            // this.timer.stop()
        }, 100);

        // чужие модули
        this.button.icon.setFrame(this.state.currentEmo)
        // this.button.icon.setFrame(1) // нужно ставить последнюю иконку, или предикцию...
        this.planeReflex(0, () => this.feed.messagePlane.alpha = 0.5)
        
    }
    // вспомогательные методы
    setButtonIcon() {
        const cat = this.state.currentCat
        const icon = this.menu.lines[cat].list[0].frame.name
        this.button.icon.setFrame(icon)
    }
    buttonIconlineMove(icon, dx, dy) {
        // console.log('buttonIconlineMove: ', icon, dx, dy);
        const offsetX = dx * 0.1; // величина отклонения (чуть больше для отзывчивости)
        const offsetY = dy * 0.1;

        this.scene.tweens.add({
            targets: icon,
            x: icon.x + offsetX,
            y: icon.y + offsetY,
            // alpha: 0.5,
            // scale: 1.1,
            duration: 30,
            ease: "Sine.easeOut", // 'Back.easeOut' Sine.easeOut
            yoyo: true,
            onComplete: () => {
                icon.setPosition(icon.x, icon.y);
            },
        });
    }
    openVeer(state) {
        // console.log('open veer', this.menu.lines[0].list)
        const duration = 100
        this.menu.lines.forEach(cont => {
            // console.log('cont', cont.list)
            if (state) {
                const firstIcon = cont.list[0]
                const firstIconX = firstIcon.x
                const firstIconY = firstIcon.y
                firstIcon.x = firstIcon.defaults.startX
                // firstIcon.y = firstIcon.defaults.startY
                firstIcon.alpha = 0
                // console.log('openVeer', firstIconX, firstIconY, )
                this.scene.tweens.add({
                    targets: firstIcon,
                    x: firstIconX,
                    // y: firstIconY,
                    alpha: 1,
                    // scale: 1.1,
                    duration: duration,
                    ease: "Back.easeOut", // 'Quad.easeOut' 
                    onComplete: () => {
                        // notice.destroy()
                    },
                });

                for (let index = 1; index < cont.list.length; index++) {
                    const icon = cont.list[index]
                    icon.alpha = 0
                    this.scene.tweens.add({
                        targets: icon,
                        // x: firstIconX,
                        // y: firstIconY,
                        alpha: icon.defaults.alpha,
                        // scale: 1.1,
                        delay: index * 10,
                        duration: duration + 40,
                        ease: "Back.easeOut", // 'Quad.easeOut' 
                        onComplete: () => {
                            // notice.destroy()
                        },
                    });
                }
            } else {
                const icon = this.button.icon
                this.scene.tweens.add({
                    targets: icon,
                    scale: icon.defaults.scale * 1.2,
                    duration: 50,
                    // yoyo: true,
                    ease: "Back.easeOut", // 'Quad.easeOut' 
                    onComplete: () => {
                        icon.scale = icon.defaults.scale
                    },
                });
            }

        })
    }

    // схемы
    createGestureSchemes() {
        this.gestureSchemes = [
            // {
            //     name: "1",
            //     handlers: {
            //         tap: "toggleMenu",
            //         double: "sendMessage",
            //         up: "sendEmoji",
            //         down: "undoEmoji",
            //         right: "nextIcon",
            //         left: "prevIcon"
            //     }
            // },
            // {
            //     name: "2",
            //     handlers: {
            //         tap: "sendEmoji", // toggleMenu
            //         double: "toggleMenu", // sendMessage
            //         up: "sendMessage", // sendEmoji
            //         down: "undoEmoji", // undoEmoji
            //         right: "nextIcon", // nextIcon
            //         left: "prevIcon" // prevIcon
            //     }
            // },
            // {
            //     name: "3",
            //     handlers: {
            //         tap: "sendEmoji", // toggleMenu
            //         double: "sendMessage", // sendMessage
            //         up: "sendEmoji", // sendEmoji
            //         down: "undoEmoji", // undoEmoji
            //         right: "nextIcon", // nextIcon
            //         left: "toggleMenu" // prevIcon
            //     }
            // },
            // {
            //     name: "4",
            //     handlers: {
            //         tap: "sendEmoji", // toggleMenu
            //         // double: "sendMessage", // sendMessage
            //         up: "sendMessage", // sendEmoji
            //         down: "undoEmoji", // undoEmoji
            //         right: "nextIcon", // nextIcon
            //         left: "toggleMenu" // prevIcon
            //     }
            // },
            {
                name: "5",
                handlers: {
                    tap: "toggleMenu", // toggleMenu
                    long: "sendMessage", // sendMessage
                    up: "sendEmoji", // sendEmoji
                    down: "undoEmoji", // undoEmoji
                    right: "nextIcon", // nextIcon
                    left: "nextCategory" // prevIcon
                }
            },
            {
                name: "6",
                handlers: {
                    tap: "toggleMenu", // toggleMenu
                    long: "sendMessage", // sendMessage
                    up: "upSelector", // sendEmoji
                    down: "downSelector", // undoEmoji
                    right: "nextIcon", // nextIcon
                    left: "prevIcon" // prevIcon
                }
            }
        ];

    }
    tapContext() {
        if (this.message.line.length > 0) this.sendMessage()
        else this.toggleMenu()
    }
    switchGestureScheme() {
        const i = this.gestureSchemes.indexOf(this.currentScheme);
        this.currentScheme = this.gestureSchemes[(i + 1) % this.gestureSchemes.length];
        // console.log("Gesture scheme switch:", this.currentScheme);
        this.updateHelper(this.currentScheme)
    }
    performGesture(gestureName) {
        const action = this.currentScheme.handlers[gestureName];
        if (!action) return;
        this[action]();
    }
    updateHelper(scheme) {
        // var 1
        // const text = []
        // for (const key in scheme.handlers) {
        //     const line = `${key} : ${scheme.handlers[key]}\n`
        //     text.push(line)
        // }
        // var 2
        if (!scheme || !scheme.handlers) return
        const text = Object.entries(scheme.handlers)
            .map(([k, v]) => `${k} : ${v}`)
            .join('\n');

        this.helper.text.setText(`\n${text}\n \nname : ${scheme.name}`)
    }

}
// таймер-часики
EmoChat.Timer = class {
    constructor(scene, x, y, radius = 15, color = 0xff4444) {
        this.scene = scene;
        this.radius = radius;
        this.duration = 5000;   // по умолчанию 5 сек
        this.startTime = 0;
        this.active = false;
        this.onComplete = null;

        this.container = scene.add.container(x, y).setDepth(999);

        // кольцо
        const ring = scene.add.graphics();
        ring.lineStyle(2, color, 1);
        ring.strokeCircle(0, 0, radius - 2);

        // стрелка (от центра вверх)
        const hand = scene.add.graphics();
        hand.lineStyle(2, color, 1);
        hand.lineBetween(0, 0, 0, -(radius - 5));

        this.container.add([ring, hand]);
        this.hand = hand;
        this.container.setVisible(true);
        this.container.setDepth(999)
    }

    start(duration, onComplete) {
        this.container.setVisible(true);
        this.container.rotation = 0;

        this.scene.tweens.add({
            targets: this.container,
            rotation: Math.PI * 2,
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                this.container.setVisible(false);
                if (onComplete) onComplete();
            }
        });
    }

    stop() {
        this.active = false;
        this.container.setVisible(false);
    }
}
