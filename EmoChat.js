export default class EmoChat {
    constructor(scene, x, y) {
        // console.log(scene)
        this.scene = scene
        this.config = this.initConstants({ x: 560, y: 930 }, { x: 480, y: 130 });
        // dev
        this.frameAlpha = 0


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
            TAP_MAX_DISTANCE: 10,
            TAP_MAX_DURATION: 250,
            SWIPE_MIN_DISTANCE: 50,
            SWIPE_MAX_TIME: 500,
            DRAG_HOLD_TIME: 400,
            DRAG_MIN_DISTANCE: 10,
            FEED_X: feed.x,
            FEED_Y: feed.y,
            FEED_WIDTH: 150,
            FEED_HEIGHT: 360,
            MENU_WIDTH: 540,
            MENU_HEIGHT: 300,
            MESSAGE_LENGTH: 4
        };
    }
    init() {
        this.initEmoji()
        this.initArea()
        this.initState()
        this.initCategories()

        // 

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
            currentEmo: undefined
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
        const iconsPerCategory = 8; // сколько кадров у каждой категории
        this.categories = categoryNames.map(name => ({
            name,
            icons: Array.from({ length: iconsPerCategory }, (_, i) => `${name}_${i}`)
        }));
        // console.log(this.categories)
        // const cat = this.categories.find(c => c.name === 'POSITIVE');
        // console.table(cat.icons);
    }
    create() {
        this.createMenu()
        this.createButton()
        this.createHelper()
        this.createFeed()
        this.createMessage()

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
            .image(this.config.BUTTON_X, this.config.BUTTON_Y, 'smileys', 1)
            .setOrigin(0.5)
            .setScale(1.2)
            // .setDepth(100)
            .setInteractive();
        this.button.icon.defaults = {
            scale: 1.2
        }
        this.state.currentEmo = 1
        this.state.update({ currentEmo: 1 })
        // название
        this.button.label = this.scene.add
            .text(this.config.BUTTON_X, this.config.BUTTON_Y - 50, `EMO_CHAT`, {
                font: '16px Helvetica',
                fill: '#dbdbdbff',
            }).setAlpha(1)
            .setOrigin(0.5)

        this.button.container.add([this.button.frame, this.button.icon, this.button.label])
    }
    createMenu() {
        // контейнер
        this.menu = {}
        this.menu.container = this.scene.add.container(0, 0).setDepth(999)

        // рамка
        this.menu.frame = this.scene.add.graphics()
            .lineStyle(4, 0xfcd912, this.frameAlpha)
            .strokeRect(this.config.BUTTON_X - this.config.MENU_WIDTH, this.config.BUTTON_Y - this.config.MENU_HEIGHT / 2, this.config.MENU_WIDTH, this.config.MENU_HEIGHT);

        // подложка
        this.menu.bg = this.scene.add.graphics();
        this.menu.bg.fillStyle(0x000000, 0.5);
        this.menu.bg.fillRoundedRect(this.config.BUTTON_X - this.config.MENU_WIDTH, this.config.BUTTON_Y - this.config.MENU_HEIGHT / 2, this.config.MENU_WIDTH, this.config.MENU_HEIGHT, 30);
        this.menu.bg.defaults = {
            alpha: 0.8
        }
        // this.menu.bg.setInteractive() // надо перехватить нажатия
        this.menu.container.add([this.menu.bg, this.menu.frame])

        // веер / линии / категории
        this.menu.lines = []
        this.menu.container.add(this.menu.lines)

        for (let index = 0; index < this.categories.length; index++) {
            const gapX = 30
            const gapY = 60
            const shift = (index <= 2) ? gapX * index : gapX * (4 - index)
            const x = this.config.BUTTON_X - this.config.MENU_WIDTH - gapX - shift
            const y = this.config.BUTTON_Y + gapY * (index - 2)

            const wrapper = this.scene.add.graphics()
                .fillStyle(0x212838, 1)
                .fillRoundedRect(x + 95, y - 25, 410, 50, 25)
            this.menu.container.add(wrapper)

            const category = this.categories[index];
            // console.log(category)


            this.menu.lines[index] = this.scene.add.container(x, y).setDepth()
            this.menu.container.add(this.menu.lines[index])



            for (let i = 0; i < category.icons.length; i++) {
                const x = this.config.MENU_WIDTH - 60 * i
                const y = 0
                const iconName = category.icons[i]
                const iconNumber = this.iconSet[iconName] ? this.iconSet[iconName] : Math.round((Math.random() * 100))
                // console.log(iconName, iconNumber)

                const icon = this.scene.add
                    .image(x, y, 'smileys', iconNumber)
                    .setOrigin(0.5)
                    .setScale(0.9)
                    .setAlpha(i ? 0.5 : 1)

                this.menu.lines[index].add(icon)
            }
        }

        // закрывашка-открывашка хелпера
        this.helperCloser = {}
        this.helperCloser.state = true

        const x = this.config.BUTTON_X + 40
        const y = this.config.BUTTON_Y - 120

        const buttonW = 60;
        const buttonH = 40;
        const buttonRadius = 10

        this.helperCloser.button = this.scene.add.graphics();
        this.helperCloser.button.fillStyle(0x212838, 1);
        this.helperCloser.button.fillRoundedRect(x - buttonW / 2, y - buttonH / 2, buttonW, buttonH, buttonRadius)
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

        this.helperCloser.text = this.scene.add.text(x, y, 'CLOSE\nHELP', {
            font: '12px Helvetica',
            fill: '#ffee00ff',
        })
            .setAlpha(1)
            .setOrigin(0.5)
            .setAlign('center')
            .setInteractive()
            .on('pointerdown', () => {
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
            })

        this.menu.container.add([this.helperCloser.button, this.helperCloser.text])

    }
    createHelper() {
        // контейнер
        this.helper = {}
        this.helper.container = this.scene.add.container(0, 0).setDepth(999)

        const x = 170
        const y = 400
        const width = 300
        const height = 360

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

        this.helper.text = this.scene.add.text(x + width / 2, y + 10, `EMO_CHAT HELPER`, {
            font: "20px Helvetica",
            fill: '#f8e700ff',
        })
            .setAlpha(1)
            .setOrigin(0.5, 0)
            .setAlign('center')

        this.helper.container.add([this.helper.bg, this.helper.frame, this.helper.text])
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
        this.message.line.push(emoFrame);

        // если длина достигла лимита — потом сюда воткнём отправку в фид
        if (this.message.line.length >= this.config.MESSAGE_LENGTH) {
            this.commitMessage();
            this.clearMessageLine();
        }

        this.updateMessageLine();
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
                    .image(targetX, targetY + 50, 'smileys', frame)
                    .setOrigin(0.5)
                    .setScale(0.7);

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
        this.feed.bg.fillRoundedRect(this.config.FEED_X, this.config.FEED_Y, this.config.FEED_WIDTH, this.config.FEED_HEIGHT, 12);

        this.feed.messageLineBG = this.scene.add.graphics();
        this.feed.messageLineBG.fillStyle(0x212838, 1);
        this.feed.messageLineBG.fillRoundedRect(this.config.FEED_X + 5, this.config.FEED_Y + this.config.FEED_HEIGHT - 35, this.config.FEED_WIDTH - 10, 30, 15);
        this.feed.messageLineBG.startX = this.config.FEED_X + 5
        this.feed.messageLineBG.startY = this.config.FEED_Y + this.config.FEED_HEIGHT - 20
        
        this.feed.container.add([this.feed.bg, this.feed.frame, this.feed.messageLineBG])
    }
    createFeedInsert() {
        // ИМЯ
        // РЕЗУЛЬТАТ ИГРЫ (ЕСЛИ ЕСТЬ)
        // ЭМОЦИЯ
    }
    _updateFeed(insert) {

    }
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
            // console.log('pointerdown', startX, startY, startTime)
        });

        scene.input.on("pointerup", (p) => {
            if (!startTime) return;

            const dx = p.x - startX;
            const dy = p.y - startY;
            const dist = Phaser.Math.Distance.Between(startX, startY, p.x, p.y);
            const dur = scene.time.now - startTime;
            startTime = 0;

            // 👇 короткий тап = открыть/закрыть меню
            if (dist < cfg.TAP_MAX_DISTANCE && dur < cfg.TAP_MAX_DURATION) {
                this.toggleMenu();
                return;
            }

            // 👇 быстрый свайп
            if (dist >= cfg.SWIPE_MIN_DISTANCE && dur < cfg.SWIPE_MAX_TIME) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    // горизонталь
                    if (dx > 0) this.nextIcon();      // вправо
                    else this.prevIcon();             // влево

                    this.buttonIconlineMove(this.button.icon, dx, 0)
                } else {
                    // вертикаль
                    if (dy < 0) this.sendEmoji();     // вверх — отправка эмоции
                    else this.nextCategory();         // вниз — смена категории

                    this.buttonIconlineMove(this.button.icon, 0, dy)
                }
            }
        });

        // (опционально) — если хочешь long-hold для drag или таймеров:
        // scene.input.on('pointermove', ...)  → можно добавить потом.
    }

    nextIcon() { console.log('next icon'); }
    prevIcon() { console.log('prev icon'); }
    nextCategory() { console.log('next category'); }
    sendEmoji() {
        console.log('send emoji', this.state.currentEmo)
        // const emote = this.categories[this.currentCategory].icons[this.currentIcon];
        // this.updateFeed(`${NickManager.getNick()}: ${emote}`);
        // const line = `${NickManager.getNick()}: ${this.sentence.join(' ')}`;
        // this.addFeedRow(line);
        this.addEmoToLine(this.state.currentEmo)
    }

    // вспомогательные методы
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
    toggleMenu() {
        console.log('toggle menu')
        if (this.menu.container.visible) {
            this.menu.container.visible = 0
            this.helper.container.visible = 0
        } else {
            this.menu.container.visible = 1
            if (this.helperCloser.state) this.helper.container.visible = 1
        }
    }

}
