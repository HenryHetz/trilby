// emojiGestures.js

const TAP_MAX_DISTANCE   = 10;
const TAP_MAX_DURATION   = 250;
const LONG_PRESS_TIME    = 300;
const SWIPE_MIN_DISTANCE = 50;
const SWIPE_MAX_TIME     = 500;

// для drag
const DRAG_HOLD_TIME     = 1000;  // сколько держать, чтобы начался drag
const DRAG_MIN_DISTANCE  = 10;    // и чуть сдвинуть

// зона, где разрешаем ЖЕСТЫ относительно центра иконки
const GESTURE_RADIUS     = 200;   // твои ±100px

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

    let startedOnIcon = false; // для различения TAP vs просто жест в зоне

    icon.setInteractive(); // оставим, вдруг где-то ещё нужно

    // ---- pointerdown ГЛОБАЛЬНО ----
    scene.input.on('pointerdown', (pointer) => {
        // расстояние от пальца до центра иконки
        const dx = pointer.x - icon.x;
        const dy = pointer.y - icon.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // если нажали далеко от иконки — нас это не интересует
        if (dist > GESTURE_RADIUS) {
            return;
        }

        activeIcon = icon;

        startX = pointer.x;
        startY = pointer.y;
        startTime = scene.time.now;

        longPressFired = false;
        isDragging = false;

        // был ли палец прямо НА иконке (для tap)
        const iconTapRadius = (icon.displayWidth || 100) / 2; // подправь при желании
        startedOnIcon = dist <= iconTapRadius;

        // long press
        longPressTimer = scene.time.delayedCall(
            LONG_PRESS_TIME,
            () => {
                if (!activeIcon) return;

                const distMove = Phaser.Math.Distance.Between(
                    startX, startY, pointer.x, pointer.y
                );

                if (pointer.isDown && distMove < TAP_MAX_DISTANCE && !isDragging) {
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

        const iconRef = activeIcon;
        activeIcon = null;

        if (longPressTimer) {
            longPressTimer.remove(false);
            longPressTimer = null;
        }

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

        // TAP — только если:
        // 1) почти не сдвинулись
        // 2) быстро
        // 3) НАЧАЛИ ЖЕСТ ПРЯМО НА ИКОНКЕ
        if (startedOnIcon &&
            dist < TAP_MAX_DISTANCE &&
            duration < TAP_MAX_DURATION
        ) {
            handlers.onTap && handlers.onTap(pointer, iconRef);
            return;
        }

        // SWIPE — можно начинать в радиусе GESTURE_RADIUS
        if (dist >= SWIPE_MIN_DISTANCE && duration < SWIPE_MAX_TIME) {
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) {
                    handlers.onSwipeRight && handlers.onSwipeRight(pointer, iconRef);
                } else {
                    handlers.onSwipeLeft && handlers.onSwipeLeft(pointer, iconRef);
                }
            } else {
                if (dy < 0) {
                    handlers.onSwipeUp && handlers.onSwipeUp(pointer, iconRef);
                } else {
                    handlers.onSwipeDown && handlers.onSwipeDown(pointer, iconRef);
                }
            }
        }
    });
}
