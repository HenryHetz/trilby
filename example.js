// это кусок из сцены
// ===== добавление записи СНИЗУ =====
    addLastRow(exitX, crashX, mode) {
        const maxRow = 8
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
            const gap = (prevExitX != null && r.exitX != null) ? 16 : 8;
            y += 30 + gap;
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



// ===== helpers плашек =====
const f2 = v => Number(v).toFixed(2);

function makeRow(scene, rec) {

    const ROW_H = 30;       // высота плашки
    const PAD_X = 10;       // внутренние отступы плашки
    const RADIUS = 8;

    const FONT_MAIN = {
        fontFamily: 'CyberFont',
        fontSize: '14px',
        fill: rec.exitX != null ? scene.textColors.gray : scene.textColors.red
    };
    const FONT_PCT = {
        fontFamily: 'CyberFont',
        fontSize: '12px',
        // color: scene.textColors.white,
        fill: scene.textColors.gray,
        stroke: scene.textColors.black,
        strokeThickness: 6,
    };

    const MODE_COLORS = {
        freeze: scene.standartColors.blue,     // синий
        greedy: scene.standartColors.yellow,     // жёлтый
        red: scene.standartColors.red     // красный
    };
    // текст внутри плашки
    const label = rec.exitX != null ? `${f2(rec.exitX)} / ${f2(rec.crashX)}` : `${f2(rec.crashX)}`;

    // const txt = scene.add.text(0, 0, label, { ...FONT_MAIN, color: scene.textColors.black }).setOrigin(0, 0.5);
    const txt = scene.add.text(0, 0, label, { ...FONT_MAIN }).setOrigin(0, 0.5);

    const badgeW = Math.ceil(txt.width + PAD_X * 2);
    const badgeH = ROW_H;

    const g = scene.add.graphics();
    // const color = rec.exitX != null ? (MODE_COLORS[rec.mode] ?? MODE_COLORS.red) : MODE_COLORS.red;
    // const color = MODE_COLORS[rec.mode]? MODE_COLORS[rec.mode] : MODE_COLORS.red
    const color = scene.standartColors.gray
    g.fillStyle(color, 0.1);
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
        pct = scene.add.text(badgeW - 40, badgeH - 24, p, FONT_PCT).setOrigin(0, 1);

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