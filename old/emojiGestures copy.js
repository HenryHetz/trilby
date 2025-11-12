// emojiGestures.js

const TAP_MAX_DISTANCE   = 10;
const TAP_MAX_DURATION   = 250;
const LONG_PRESS_TIME    = 300;
const SWIPE_MIN_DISTANCE = 50;
const SWIPE_MAX_TIME     = 500;

// для drag
const DRAG_HOLD_TIME     = 1000;  // сколько держать, чтобы начался drag
const DRAG_MIN_DISTANCE  = 10;    // и чуть сдвинуть

export function initEmojiGestures(scene, icon, handlers = {}) {
    let activeIcon = null;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    let longPressTimer = null;
    let longPressFired = false;

    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    icon.setInteractive(); // без draggable

    // ---- pointerdown ТОЛЬКО на иконке ----
    icon.on('pointerdown', (pointer) => {
        activeIcon = icon;

        startX = pointer.x;
        startY = pointer.y;
        startTime = scene.time.now;

        longPressFired = false;
        isDragging = false;

        // long press
        longPressTimer = scene.time.delayedCall(
            LONG_PRESS_TIME,
            () => {
                if (!activeIcon) return;

                const dist = Phaser.Math.Distance.Between(
                    startX, startY, pointer.x, pointer.y
                );

                if (pointer.isDown && dist < TAP_MAX_DISTANCE && !isDragging) {
                    longPressFired = true;
                    handlers.onLongPress && handlers.onLongPress(pointer, activeIcon);
                }
            },
            null,
            scene
        );
    });

    // ---- pointermove ГЛОБАЛЬНО ----
    scene.input.on('pointermove', (pointer) => {
        if (!activeIcon) return;
        if (!pointer.isDown) return;

        const dist = Phaser.Math.Distance.Between(
            startX, startY, pointer.x, pointer.y
        );
        const elapsed = scene.time.now - startTime;

        // стартуем drag только после выдержки и движения
        if (!isDragging &&
            elapsed > DRAG_HOLD_TIME &&
            dist > DRAG_MIN_DISTANCE
        ) {
            isDragging = true;

            // отменяем long press / жесты
            if (longPressTimer) {
                longPressTimer.remove(false);
                longPressTimer = null;
            }
            longPressFired = false;

            dragOffsetX = activeIcon.x - pointer.x;
            dragOffsetY = activeIcon.y - pointer.y;
        }

        // двигаем иконку, если уже drag
        if (isDragging) {
            activeIcon.x = pointer.x + dragOffsetX;
            activeIcon.y = pointer.y + dragOffsetY;

            // не выходить за пределы экрана - подправь под свой канвас
            if (activeIcon.x > 600) activeIcon.x = 600;
            if (activeIcon.x < 40)  activeIcon.x = 40;
            if (activeIcon.y > 1000) activeIcon.y = 1000;
            if (activeIcon.y < 100)  activeIcon.y = 100;
        }
    });

    // ---- pointerup ГЛОБАЛЬНО ----
    scene.input.on('pointerup', (pointer) => {
        if (!activeIcon) return;

        // сохраняем ссылку и сразу "отвязываем" активную
        const iconRef = activeIcon;
        activeIcon = null;

        if (longPressTimer) {
            longPressTimer.remove(false);
            longPressTimer = null;
        }

        // если был drag — заканчиваем, без свайпов/тапа
        if (isDragging) {
            isDragging = false;
            return;
        }

        const endTime = scene.time.now;
        const duration = endTime - startTime;

        const dx = pointer.x - startX;
        const dy = pointer.y - startY;
        const dist = Phaser.Math.Distance.Between(startX, startY, pointer.x, pointer.y);

        if (longPressFired) return;

        // TAP
        if (dist < TAP_MAX_DISTANCE && duration < TAP_MAX_DURATION) {
            handlers.onTap && handlers.onTap(pointer, iconRef);
            return;
        }

        // SWIPE
        if (dist >= SWIPE_MIN_DISTANCE && duration < SWIPE_MAX_TIME) {
            if (Math.abs(dx) > Math.abs(dy)) {
                // горизонтальный свайп
                if (dx > 0) {
                    handlers.onSwipeRight && handlers.onSwipeRight(pointer, iconRef);
                } else {
                    handlers.onSwipeLeft && handlers.onSwipeLeft(pointer, iconRef);
                }
            } else {
                // вертикальный свайп
                if (dy < 0) {
                    handlers.onSwipeUp && handlers.onSwipeUp(pointer, iconRef);
                } else {
                    handlers.onSwipeDown && handlers.onSwipeDown(pointer, iconRef);
                }
            }
        }
    });
}
