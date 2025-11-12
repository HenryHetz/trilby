// StateMonitor.js

export class StateMonitor {
    constructor(scene) {
        // console.log(scene)
        this.defaultState = {
            freeze: false,
            greedy: false,
            counters: [1, 1, 1],
        };

        this.state = {
            ...this.defaultState,
            counters: [...this.defaultState.counters],
        };

        this.log = [];

        this.stateCounts = new Map();
    }

    static sameCounters(a, b) {
        if (!a || !b || a.length !== b.length) return false;
        const sa = [...a].sort();
        const sb = [...b].sort();
        return sa.every((v, i) => v === sb[i]);
    }

    differsFromDefault() {
        const s = this.state;
        const d = this.defaultState;

        if (s.freeze !== d.freeze) return true;
        if (s.greedy !== d.greedy) return true;
        if (!StateMonitor.sameCounters(s.counters, d.counters)) return true;

        return false;
    }

    // 🔑 делаем ключ состояния для Map
    makeKey() {
        const s = this.state;
        // counters как набор → сортируем
        const countersSorted = [...s.counters].sort((a, b) => a - b);
        // любой формат, лишь бы стабильный:
        // пример: "F0_G1_C[1,1,2]"
        return `FREZZE-${s.freeze ? 1 : 0}_GREEDY-${s.greedy ? 1 : 0}_MULTY[${countersSorted.join(',')}]`;
    }

    update(scene) {
        
        const patch = {
            freeze: scene.gameSuperState.freeze? true : false,
            greedy: scene.gameSuperState.greedy? true : false,
            counters: [scene.targets[0].multyplier, scene.targets[1].multyplier, scene.targets[2].multyplier]
        }
        // console.log("state update", patch);
        // { counters: [this.targets[0].multyplier, this.targets[1].multyplier, this.targets[2].multyplier] }
        Object.assign(this.state, patch);

        if (!this.differsFromDefault()) return;
        // console.log("state diff");
        this.log.push({
            // t: performance.now(),
            freeze: this.state.freeze,
            greedy: this.state.greedy,
            counters: [...this.state.counters],
        });
        // console.table(this.log);

        // 2) счётчик состояний в Map
        const key = this.makeKey();
        const prev = this.stateCounts.get(key) || 0;
        this.stateCounts.set(key, prev + 1);
    }

    getLog() {
        return this.log;
    }

    clearLog() {
        this.log.length = 0;
    }

    // получить Map со счетчиками состояний
    getStateCounts() {
        return this.stateCounts;
    }

    // если хочешь обнулить счетчики
    clearStateCounts() {
        this.stateCounts.clear();
    }
}
