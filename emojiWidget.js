// emojiWidget.js

const TAP_MAX_DISTANCE = 10;
const TAP_MAX_DURATION = 250;
const SWIPE_MIN_DISTANCE = 50;
const SWIPE_MAX_TIME = 500;

// для drag
const DRAG_HOLD_TIME = 500;   // сколько держать, чтобы начался drag
const DRAG_MIN_DISTANCE = 10;    // минимальное движение для старта drag (после hold)

export function initEmojiWidget(scene) {
    // ===== 1. создаём область 200x200 внизу справа =====
    const areaW = 160;
    const areaH = 160;
    const margin = 20;

    const centerX = scene.scale.width - areaW / 2;
    const centerY = 820;

    const areaRect = new Phaser.Geom.Rectangle(
        centerX - areaW / 2,
        centerY - areaH / 2,
        areaW,
        areaH
    );

    // рамка
    const g = scene.add.graphics();
    g.lineStyle(2, 0x00ff00, 0);
    g.strokeRect(areaRect.x, areaRect.y, areaRect.width, areaRect.height);
    g.setDepth(100);

    // ===== 2. иконка в центре области =====
    const icon = scene.add
        .image(centerX, centerY, 'smileys', 1)
        .setOrigin(0.5)
        .setScale(1.2)
        .setDepth(100)
        .setInteractive();
    icon.defaults = {
        scale: 1.2
    }

    // веер
    let lastLineNumber = 0

    const veer = []
    const startAngle = 60; // deg
    const angleTurn = 30; // deg
    const gap = 100

    for (let index = 0; index < 5; index++) {

        // раскрыть веером по окружности
        const angle = startAngle - angleTurn * index
        const angleToRad = Phaser.Math.DegToRad(angle);
        const x = centerX - gap * Math.cos(angleToRad)
        const y = centerY  - (gap + 40) * Math.sin(angleToRad)
        
        // раскрыть в наклонную линию
        // const x = centerX - 80 * index
        // const y = centerY  - 40 * index
        
        const iconNumber = index * 20

        const startPosition = {
            x: centerX - 60 * Math.cos(angleToRad),
            y: centerY - 60 * Math.sin(angleToRad)
        }

        // радиус
        const finishPosition = {
            x: centerX - gap * Math.cos(angleToRad),
            y: centerY - (gap + 40) * Math.sin(angleToRad)
        }
        
        // наклонная
        // const finishPosition = {
        //     x: centerX + 40 - 40 * (index + 1),
        //     y: centerY - 240  + 60 * (index + 1)        
        // }

        veer[index] = scene.add
            // .image(centerX - 60, centerY + 120 - index * 60, 'smileys', index + 5)
            .image(startPosition.x, startPosition.y, 'smileys', iconNumber)
            .setOrigin(0.5)
            .setDepth(100)
            .setAlpha(0)
            .setInteractive()
            .on("pointerdown", () => {
                console.log("line touch", index);
                changeFrame(icon, iconNumber)
                if (veer[index].container.visible) veer[index].container.visible = 0
                else veer[index].container.visible = 1
                lastLineNumber = index
            }, veer[index]);
        veer[index].startPosition = startPosition
        veer[index].finishPosition = finishPosition
        veer[index].fromCenter = {
            startX: startPosition.x - centerX,
            startY: startPosition.y - centerY,
            finishX: finishPosition.x - centerX,
            finishY: finishPosition.y - centerY,
        }
        veer[index].iconNumber = iconNumber

        veer[index].container = scene.add.container(0,0).setDepth(100).setVisible(0)

        veer[index].line = []
        for (let i = 0; i < 7; i++) {
            const x = veer[index].finishPosition.x - 60* (i + 1)
            const y = veer[index].finishPosition.y
            const iconNumber = Math.round((Math.random() * 100))
            veer[index].line[i] = scene.add
            // .image(centerX - 60, centerY + 120 - index * 60, 'smileys', index + 5)
            .image(x, y, 'smileys', iconNumber)
            .setOrigin(0.5)
            .setDepth(100)
            .setAlpha(0.8)
            .setInteractive()
            .on("pointerdown", () => {
                console.log("veer[index] touch", index, iconNumber);
                // lastLineNumber = index
                // changeFrame(icon, iconNumber)
            });

            veer[index].container.add(veer[index].line[i])
        }
    }
    let veerIsOpen = false


    // ===== 3. жесты =====
    attachEmojiGestures(scene, icon, areaRect, g, {
        onTap(pointer, icon) {
            console.log('TAP: send emoji', icon.frame.name);
            // тут твоя отправка эмодзи
            if (veerIsOpen) {
                openVeer(scene, veer, icon, false)
                veerIsOpen = false
            } else {
                // отправка?
                openVeer(scene, veer, icon, true)
                veerIsOpen = true
            }
        },
        onSwipeUp(pointer, icon) {
            console.log('SWIPE UP: open fan / text');
            // отправка
        },
        onSwipeLeft(pointer, icon) {
            console.log('SWIPE LEFT');
            if (!veerIsOpen) {
                openVeer(scene, veer, icon, true)
                veerIsOpen = true
                // setTimeout(() => {
                //     // если ничего не делаем - как фиксируем?
                //     if (!veerIsOpen) return
                //     openVeer(scene, veer, icon, false)
                //     veerIsOpen = false
                // }, 3000);
            }

        },
        onSwipeRight(pointer, icon) {
            console.log('SWIPE RIGHT: next emoji');
            if (veerIsOpen) {
                openVeer(scene, veer, icon, false)
                veerIsOpen = false
            } else {
                // changeFrame(icon)
                changeFrameByLine(scene, veer , icon, lastLineNumber)
            }
                
            // {
            //     const COLS = 16;
            //     const ROWS = 7;
            //     const idx = (row, col) => row * COLS + col;
            //     const row = Phaser.Math.Between(0, ROWS - 1);
            //     const col = Phaser.Math.Between(0, COLS - 1);
            //     icon.setFrame(idx(row, col));
            // }
        },
        onSwipeDown(pointer, icon) {
            console.log('SWIPE DOWN');
            lastLineNumber += 1
            if (lastLineNumber > veer.length - 1) lastLineNumber = 0
            changeLine(scene, veer , icon, lastLineNumber)
        }
    }, veer);

    return { icon, areaRect };
}

// ===== ВНУТРЕННЯЯ ЛОГИКА ЖЕСТОВ =====

function attachEmojiGestures(scene, icon, areaRect, graphics, handlers = {}, veer) {
    let activeIcon = null;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    let isDragging = false;

    // для drag всего виджета (рамка + иконка)
    let dragCenterOffsetX = 0; // смещение от pointer до центра области
    let dragCenterOffsetY = 0;

    let startedOnIcon = false;

    icon.setInteractive();

    // ---- pointerdown ГЛОБАЛЬНО ----
    scene.input.on('pointerdown', (pointer) => {
        // работаем только если начало жеста внутри прямоугольной зоны
        // заменить на тач на квадрат
        if (!Phaser.Geom.Rectangle.Contains(areaRect, pointer.x, pointer.y)) {
            return;
        }

        activeIcon = icon;

        startX = pointer.x;
        startY = pointer.y;
        startTime = scene.time.now;

        isDragging = false;

        // был ли тап прямо по иконке
        const dx = pointer.x - icon.x;
        const dy = pointer.y - icon.y;
        const distToIcon = Math.sqrt(dx * dx + dy * dy);
        const iconTapRadius = (icon.displayWidth || 100) / 2;
        startedOnIcon = distToIcon <= iconTapRadius;

        // заранее считаем смещение pointer → центр области для drag
        const areaCenterX = areaRect.centerX;
        const areaCenterY = areaRect.centerY;
        dragCenterOffsetX = areaCenterX - pointer.x;
        dragCenterOffsetY = areaCenterY - pointer.y;
    });

    // ---- pointermove ГЛОБАЛЬНО ----
    scene.input.on('pointermove', (pointer) => {
        if (!activeIcon) return;
        if (!pointer.isDown) return;

        const dist = Phaser.Math.Distance.Between(
            startX, startY, pointer.x, pointer.y
        );
        const elapsed = scene.time.now - startTime;

        // стартуем drag (двигаем ВЕСЬ виджет):
        // 1) достаточно подержали
        // 2) движение пока не похоже на полноценный свайп (dist <= SWIPE_MIN_DISTANCE)
        // 3) хоть немного двинулись (DRAG_MIN_DISTANCE)
        if (!isDragging &&
            elapsed >= DRAG_HOLD_TIME &&
            dist >= DRAG_MIN_DISTANCE &&
            dist <= SWIPE_MIN_DISTANCE
        ) {
            isDragging = true;
        }

        if (isDragging) {
            // новый центр области
            let newCenterX = pointer.x + dragCenterOffsetX;
            let newCenterY = pointer.y + dragCenterOffsetY;

            // клампим по границам экрана, чтобы весь блок был виден
            const halfW = areaRect.width / 2;
            const halfH = areaRect.height / 2;

            newCenterX = Phaser.Math.Clamp(newCenterX, halfW, scene.scale.width - halfW);
            newCenterY = Phaser.Math.Clamp(newCenterY, halfH, scene.scale.height - halfH);

            // обновляем rect
            areaRect.x = newCenterX - halfW;
            areaRect.y = newCenterY - halfH;

            // иконка всегда по центру области
            activeIcon.x = newCenterX;
            activeIcon.y = newCenterY;

            // перерисовываем рамку
            // graphics.clear();
            // graphics.lineStyle(2, 0x00ff00, 0.6);
            // graphics.strokeRect(areaRect.x, areaRect.y, areaRect.width, areaRect.height);
            // graphics.setDepth(100);
            // activeIcon.setDepth(100);

            // перемещаем веер

            moveVeer(veer, activeIcon)

        }
    });

    // ---- pointerup ГЛОБАЛЬНО ----
    scene.input.on('pointerup', (pointer) => {
        if (!activeIcon) return;

        const iconRef = activeIcon;
        activeIcon = null;

        if (isDragging) {
            isDragging = false;
            return;
        }

        const endTime = scene.time.now;
        const duration = endTime - startTime;

        const dx = pointer.x - startX;
        const dy = pointer.y - startY;
        const dist = Phaser.Math.Distance.Between(startX, startY, pointer.x, pointer.y);
        // console.log('dist: ', dist, 'dx: ',dx, 'dy: ',dy);

        // TAP — только если начали на самой иконке
        if (startedOnIcon &&
            dist < TAP_MAX_DISTANCE &&
            duration < TAP_MAX_DURATION
        ) {
            handlers.onTap && handlers.onTap(pointer, iconRef);
            return;
        }

        // SWIPE — внутри зоны, с достаточной длиной
        if (dist >= SWIPE_MIN_DISTANCE && duration < SWIPE_MAX_TIME) {
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) {
                    handlers.onSwipeRight && handlers.onSwipeRight(pointer, iconRef);
                } else {
                    handlers.onSwipeLeft && handlers.onSwipeLeft(pointer, iconRef);
                }
                // iconReflex(iconRef, dx, 0)
            } else {
                if (dy < 0) {
                    handlers.onSwipeUp && handlers.onSwipeUp(pointer, iconRef);
                } else {
                    handlers.onSwipeDown && handlers.onSwipeDown(pointer, iconRef);
                }
                // iconReflex(iconRef, 0, dy)
            }
            iconReflex(scene, iconRef, dx, dy)
        }
    });
}

function iconReflex(scene, icon, dx, dy) {
    // console.log('iconReflex: ', icon, dx, dy);
    const offsetX = dx * 0.1; // величина отклонения (чуть больше для отзывчивости)
    const offsetY = dy * 0.1;

    scene.tweens.add({
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

function openVeer(scene, veer, icon, state) {
    const duration = 100
    if (state) {
        veer.forEach(icon => {
            // icon.alpha = 1
            scene.tweens.add({
                targets: icon,
                x: icon.finishPosition.x,
                y: icon.finishPosition.y,
                alpha: 1,
                scale: 1.1,
                duration: duration,
                ease: "Back.easeOut", // 'Quad.easeOut' 
                onComplete: () => {
                    // notice.destroy()
                },
            });

            // icon.container.visible = 1
        })

        scene.tweens.add({
            targets: icon,
            // x: icon.finishPosition.x,
            // y: icon.finishPosition.y,
            alpha: 0.5,
            // scale: 1.1,
            duration: duration,
            ease: "Back.easeOut", // 'Quad.easeOut'
            onComplete: () => {
                // notice.destroy()
            },
        });
    } else {
        veer.forEach(icon => {
            scene.tweens.add({
                targets: icon,
                x: icon.startPosition.x,
                y: icon.startPosition.y,
                alpha: 0,
                scale: 1,
                duration: duration,
                ease: "Back.easeOut", // 'Quad.easeOut'
                onComplete: () => {
                    // notice.destroy()
                },
            });
            icon.container.visible = 0
        })

        scene.tweens.add({
            targets: icon,
            // x: icon.finishPosition.x,
            // y: icon.finishPosition.y,
            alpha: 1,
            scale: icon.defaults.scale * 1.2,
            duration: duration,
            ease: "Back.easeOut", // 'Quad.easeOut'
            onComplete: () => {
                icon.scale = icon.defaults.scale
            },
        });
    }
}

function moveVeer(veer, center) {
    // console.log('veer', veer)
    // нажо двигать контейнер
    veer.forEach(icon => {
        icon.startPosition.x = center.x + icon.fromCenter.startX
        icon.startPosition.y = center.y + icon.fromCenter.startY
        icon.finishPosition.x = center.x + icon.fromCenter.finishX
        icon.finishPosition.y = center.y + icon.fromCenter.finishY

        // в зависимости от состояния
        if (icon.alpha < 1) {
            icon.x = icon.startPosition.x
            icon.y = icon.startPosition.y
        } else {
            icon.x = icon.finishPosition.x
            icon.y = icon.finishPosition.y
        }
    })
}

function changeFrame (icon, number) {
    if (number) icon.setFrame(number)
    else {
    const COLS = 16;
    const ROWS = 7;
    const idx = (row, col) => row * COLS + col;
    const row = Phaser.Math.Between(0, ROWS - 1);
    const col = Phaser.Math.Between(0, COLS - 1);
    icon.setFrame(idx(row, col));
    }
}
function changeFrameByLine (scene, veer, icon, number) {
    console.log('changeFrameByLine: ', number, veer[number].line.length);
    const i = Phaser.Math.Between(0, veer[number].line.length -1);
    const image = veer[number].line[i]
    const name = image.frame.name
    // const COLS = 16;
    // const ROWS = 7;
    // const idx = (row, col) => row * COLS + col;
    // const row = Phaser.Math.Between(0, ROWS - 1);
    // const col = Phaser.Math.Between(0, COLS - 1);
    console.log('changeFrameByLine: ', i, name);
    icon.setFrame(name);
}
function changeLine (scene, veer , icon, number) {
    console.log('changeLine line number: ', number);
    // const i = Phaser.Math.Between(0, veer[number].line.length -1);
    const image = veer[number] // надо veer[number].line[0]
    const name = image.frame.name
    icon.setFrame(name);
}