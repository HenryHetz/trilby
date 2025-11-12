// StateMonitor.js

export class StateMonitor {
    constructor(defaultState) {
        this.defaultState = {
            ...defaultState,
            counters: [...defaultState.counters],
        };

        this.state = {
            ...this.defaultState,
            counters: [...this.defaultState.counters],
        };

        this.log = [];
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

    update(patch) {
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
    }

    getLog() {
        return this.log;
    }

    clearLog() {
        this.log.length = 0;
    }
}
