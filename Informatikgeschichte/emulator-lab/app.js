const elements = {
    pageTitle: document.getElementById("pageTitle"),
    periodLabel: document.getElementById("periodLabel"),
    introText: document.getElementById("introText"),
    emulatorSelect: document.getElementById("emulatorSelect"),
    sourceEditor: document.getElementById("sourceEditor"),
    sampleBtn: document.getElementById("sampleBtn"),
    compileBtn: document.getElementById("compileBtn"),
    stepBtn: document.getElementById("stepBtn"),
    runBtn: document.getElementById("runBtn"),
    resetBtn: document.getElementById("resetBtn"),
    syntaxNote: document.getElementById("syntaxNote"),
    statusPill: document.getElementById("statusPill"),
    machineState: document.getElementById("machineState"),
    machineOutput: document.getElementById("machineOutput"),
    traceLog: document.getElementById("traceLog"),
    stepCounter: document.getElementById("stepCounter")
};

const configs = {
    hollerith: {
        title: "Hollerith-Tabulator",
        period: "Herman Hollerith, 1890",
        intro: "Lochkarten werden nacheinander gelesen, Zaehler werden mechanisch erhoeht, am Ende entsteht eine Tabulation.",
        syntax: ["CARD NY 34 F", "CARD PA 41 M", "COUNT STATE"],
        sample: `# Lochkarten-Tabulator: Volkszaehlungsprobe
# Format: CARD <STATE> <AGE> <GROUP>
CARD NY 34 F
CARD NY 42 M
CARD PA 19 F
CARD PA 63 M
CARD IL 27 F
CARD NY 21 F
COUNT STATE`,
        create: createHollerith
    },
    turing: {
        title: "Turingmaschinen-Band",
        period: "Alan Turing, 1936",
        intro: "Ein Band, ein Kopf, ein Zustand und Uebergangsregeln reichen aus, um mechanische Berechnung zu modellieren.",
        syntax: ["TAPE 111_", "STATE q0", "RULE q0 1 -> q0 1 R"],
        sample: `# Unary Increment: aus 111 wird 1111
TAPE 111_
STATE q0
BLANK _
HALT halt
RULE q0 1 -> q0 1 R
RULE q0 _ -> halt 1 N`,
        create: createTuring
    },
    relay: {
        title: "Relais-Schaltkreis",
        period: "Claude Shannon, 1937",
        intro: "Boolesche Algebra wird als Schaltfolge sichtbar: Relaisgatter lesen Eingaben und schreiben Zwischensignale.",
        syntax: ["INPUT A 1", "AND A B -> X", "OR X C -> OUT"],
        sample: `# Relaislogik: (A AND NOT B) OR C
INPUT A 1
INPUT B 0
INPUT C 0
NOT B -> NB
AND A NB -> X
OR X C -> OUT`,
        create: createRelay
    },
    fortran: {
        title: "FORTRAN-Formeluebersetzer",
        period: "John Backus, 1957",
        intro: "Eine mathematische Formel wird in Lade-, Rechen- und Speicherbefehle uebersetzt und danach ausgefuehrt.",
        syntax: ["DATA A = 7", "LET Y = (A*B+C)/D", "PRINT Y"],
        sample: `# FORTRAN-Stil: Formeluebersetzung
DATA A = 7
DATA B = 9
DATA C = 12
DATA D = 3
LET Y = (A * B + C) / D
PRINT Y`,
        create: createFortran
    },
    lisp: {
        title: "LISP-Listen-Evaluator",
        period: "LISP, 1958",
        intro: "S-Ausdruecke werden geparst und ausgewertet. Listen und Funktionsaufrufe sind dieselbe sichtbare Form.",
        syntax: ["(+ 1 2)", "(list 1 (+ 2 3))", "(car (list a b c))"],
        sample: `# LISP-Mini-Evaluator
(list (quote alpha) (+ 1 2) (car (list 8 9 10)) (* 3 4))`,
        create: createLisp
    },
    basic: {
        title: "BASIC-Interpreter",
        period: "BASIC, 1964",
        intro: "Zeilennummern, Variablen, FOR/NEXT und PRINT zeigen interaktive Programmierung im Kleinen.",
        syntax: ["10 LET S = 0", "20 FOR I = 1 TO 5", "40 NEXT I"],
        sample: `10 LET S = 0
20 FOR I = 1 TO 5
30 LET S = S + I
40 PRINT I, S
50 NEXT I`,
        create: createBasic
    },
    eliza: {
        title: "ELIZA-Dialogsystem",
        period: "Joseph Weizenbaum, 1966",
        intro: "Einfache Musterregeln reagieren auf Nutzersaetze. Der Effekt wirkt dialogisch, ist aber Pattern Matching.",
        syntax: ["USER ich fuehle mich muede", "USER weil ich lerne", "USER hallo"],
        sample: `# Schreibe USER-Zeilen und fuehre den Dialog schrittweise aus.
USER Hallo
USER Ich fuehle mich unsicher
USER Meine Pruefung macht mir Sorgen
USER Weil ich viel lernen muss`,
        create: createEliza
    },
    cpu4004: {
        title: "4-Bit-CPU",
        period: "Intel 4004, 1971",
        intro: "Register, 4-Bit-Werte, Speicher und OUT-Befehle machen einen kleinen Mikroprozessorablauf sichtbar.",
        syntax: ["LDI A, 3", "ADD A, 5", "OUT A"],
        sample: `# 4-Bit-CPU: Summe modulo 16
LDI A, 3
ADD A, 5
STA A, 1
LDI B, 9
ADD A, B
OUT A`,
        create: createCpu4004
    },
    cstack: {
        title: "Pointer- und Stack-Maschine",
        period: "C, ab 1972",
        intro: "Stack-Frames, Variablenadressen und Pointer-Schreibzugriffe zeigen hardwarenahe Programmierung.",
        syntax: ["FRAME main", "INT x 7", "PTR p x", "WRITE p 12"],
        sample: `# C-Stil: Pointer schreibt in Variable
FRAME main
INT x 7
INT y 3
PTR p x
WRITE p 12
READ x
PTR p y
WRITE p 20
READ y`,
        create: createCStack
    },
    rsa: {
        title: "RSA-Schluesseltausch",
        period: "RSA, 1977",
        intro: "Mit kleinen Zahlen werden n, phi, privater Exponent, Verschluesselung und Entschluesselung sichtbar.",
        syntax: ["P 5", "Q 11", "E 3", "M 9"],
        sample: `# RSA-Lab mit kleinen Zahlen
P 5
Q 11
E 3
M 9`,
        create: createRsa
    },
    dns: {
        title: "Paketweg und DNS-Aufloesung",
        period: "TCP/IP und DNS, 1983",
        intro: "Eine Anfrage wandert vom Client ueber rekursive, Root-, TLD- und autoritative Server zur IP-Adresse.",
        syntax: ["QUERY www.example.test", "ROOT test -> ns.test", "A www.example.test 203.0.113.7"],
        sample: `# DNS-Aufloesung als Paketweg
QUERY www.example.test
ROOT test -> ns.test
TLD example.test -> ns.example.test
A www.example.test 203.0.113.7`,
        create: createDns
    },
    mapreduce: {
        title: "Map-Reduce-Job",
        period: "MapReduce, 2004",
        intro: "Eingabetexte werden gemappt, nach Schluessel gruppiert und reduziert. So wird verteiltes Zaehlen greifbar.",
        syntax: ["TEXT ada ada zuse", "TEXT zuse turing", "COUNT WORDS"],
        sample: `# MapReduce: Wortzaehlung
TEXT ada zuse ada
TEXT turing zuse church
TEXT ada church
COUNT WORDS`,
        create: createMapReduce
    }
};

let activeKey = "hollerith";
let engine = null;

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function number(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`Ungueltige Zahl: ${value}`);
    return parsed;
}

function stripComments(source) {
    return source.split(/\r?\n/)
        .map((raw, index) => ({ text: raw.replace(/#.*/, "").trim(), lineNumber: index + 1 }))
        .filter((line) => line.text);
}

function setStatus(text, mode = "") {
    elements.statusPill.textContent = text;
    elements.statusPill.className = `status-pill ${mode}`.trim();
}

function rows(items) {
    return items.map(([label, value]) => `
        <div class="state-row">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </div>
    `).join("");
}

function setOutput(text) {
    elements.machineOutput.textContent = text || "Noch keine Ausgabe.";
}

function render() {
    if (!engine) return;
    elements.machineState.innerHTML = engine.stateHtml();
    setOutput(engine.outputText());
    elements.traceLog.innerHTML = engine.trace.length
        ? engine.trace.map((entry) => `<li${entry.type === "error" ? " class=\"error\"" : ""}>${entry.html}</li>`).join("")
        : "<li>Noch kein Schritt ausgefuehrt.</li>";
    elements.stepCounter.textContent = `${engine.steps || 0} Schritte`;
}

function prepare() {
    try {
        engine = configs[activeKey].create(elements.sourceEditor.value);
        engine.prepare();
        setStatus("bereit", "ok");
        render();
        return true;
    } catch (error) {
        engine = errorEngine(error);
        setStatus("Fehler", "error");
        render();
        return false;
    }
}

function step() {
    if (!engine && !prepare()) return false;
    try {
        const running = engine.step();
        setStatus(running ? "laeuft" : "fertig", running ? "" : "ok");
        render();
        return running;
    } catch (error) {
        engine.trace.push({ type: "error", html: escapeHtml(error.message) });
        setStatus("Fehler", "error");
        render();
        return false;
    }
}

function run() {
    if (!engine && !prepare()) return;
    let guard = 0;
    while (guard < 500 && step()) guard += 1;
    if (guard >= 500) {
        engine.trace.push({ type: "error", html: "Abbruch: Schrittlimit erreicht." });
        setStatus("Abbruch", "error");
        render();
    }
}

function loadSample() {
    const config = configs[activeKey];
    elements.sourceEditor.value = config.sample;
    prepare();
}

function selectEmulator(key, replaceHash = true) {
    activeKey = configs[key] ? key : "hollerith";
    const config = configs[activeKey];
    elements.emulatorSelect.value = activeKey;
    elements.pageTitle.textContent = config.title;
    elements.periodLabel.textContent = config.period;
    elements.introText.textContent = config.intro;
    elements.syntaxNote.innerHTML = config.syntax.map((item) => `<code>${escapeHtml(item)}</code>`).join("");
    elements.sourceEditor.value = config.sample;
    engine = null;
    if (replaceHash) history.replaceState(null, "", `#${activeKey}`);
    prepare();
}

function errorEngine(error) {
    return {
        trace: [{ type: "error", html: escapeHtml(error.message) }],
        steps: 0,
        prepare() {},
        step() { return false; },
        stateHtml: () => rows([["Fehler", error.message]]),
        outputText: () => "Keine Ausgabe."
    };
}

function makeEngine(source, prepareFn, stepFn, stateFn, outputFn) {
    return {
        source,
        trace: [],
        steps: 0,
        done: false,
        prepare: prepareFn,
        step() {
            if (this.done) return false;
            const running = stepFn.call(this);
            this.steps += 1;
            if (!running) this.done = true;
            return running;
        },
        stateHtml: stateFn,
        outputText: outputFn
    };
}

function createHollerith(source) {
    const cards = [];
    const counts = {};
    let index = 0;
    return makeEngine(
        source,
        function prepareHollerith() {
            for (const line of stripComments(source)) {
                const parts = line.text.split(/\s+/);
                if (parts[0].toUpperCase() === "CARD") cards.push({ state: parts[1], age: number(parts[2]), group: parts[3] || "-" });
            }
            if (!cards.length) throw new Error("Keine CARD-Zeilen gefunden.");
            this.trace.push({ html: `${cards.length} Lochkarten eingelegt.` });
        },
        function stepHollerith() {
            if (index >= cards.length) {
                this.trace.push({ html: "Tabulation abgeschlossen." });
                return false;
            }
            const card = cards[index++];
            counts[card.state] = (counts[card.state] || 0) + 1;
            this.trace.push({ html: `Karte ${index}: ${escapeHtml(card.state)} wird gezaehlt.` });
            return index < cards.length;
        },
        () => rows([["Kartenposition", `${index}/${cards.length}`], ["Zaehler", Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(", ") || "-"]]),
        () => Object.entries(counts).map(([k, v]) => `${k.padEnd(5)} ${v}`).join("\n")
    );
}

function createTuring(source) {
    let tape = [];
    let head = 0;
    let state = "q0";
    let blank = "_";
    let halt = "halt";
    const rules = new Map();
    return makeEngine(
        source,
        function prepareTuring() {
            for (const line of stripComments(source)) {
                const text = line.text;
                if (/^TAPE\b/i.test(text)) tape = text.replace(/^TAPE\s+/i, "").split("");
                else if (/^STATE\b/i.test(text)) state = text.replace(/^STATE\s+/i, "");
                else if (/^BLANK\b/i.test(text)) blank = text.replace(/^BLANK\s+/i, "");
                else if (/^HALT\b/i.test(text)) halt = text.replace(/^HALT\s+/i, "");
                else {
                    const m = text.match(/^RULE\s+(\S+)\s+(\S)\s*->\s*(\S+)\s+(\S)\s+([LRN])$/i);
                    if (!m) throw new Error(`Ungueltige Turing-Regel: ${text}`);
                    rules.set(`${m[1]}|${m[2]}`, { next: m[3], write: m[4], move: m[5].toUpperCase() });
                }
            }
            if (!tape.length) tape = [blank];
            this.trace.push({ html: `Startzustand ${escapeHtml(state)}, Band ${escapeHtml(tape.join(""))}.` });
        },
        function stepTuring() {
            if (state === halt) return false;
            const symbol = tape[head] || blank;
            const rule = rules.get(`${state}|${symbol}`);
            if (!rule) throw new Error(`Keine Regel fuer ${state} und ${symbol}.`);
            tape[head] = rule.write;
            this.trace.push({ html: `${escapeHtml(state)} liest ${escapeHtml(symbol)} -> schreibt ${escapeHtml(rule.write)}, bewegt ${rule.move}.` });
            state = rule.next;
            if (rule.move === "R") head += 1;
            if (rule.move === "L") head = Math.max(0, head - 1);
            if (head >= tape.length) tape.push(blank);
            return state !== halt;
        },
        () => rows([["Zustand", state], ["Kopf", String(head)], ["Band", tape.map((c, i) => i === head ? `[${c}]` : c).join("")]]),
        () => tape.join("")
    );
}

function createRelay(source) {
    const signals = {};
    const gates = [];
    let pc = 0;
    return makeEngine(
        source,
        function prepareRelay() {
            for (const line of stripComments(source)) {
                const parts = line.text.split(/\s+/);
                const op = parts[0].toUpperCase();
                if (op === "INPUT") signals[parts[1]] = parts[2] === "1" ? 1 : 0;
                else gates.push(line.text);
            }
            this.trace.push({ html: "Eingaben gesetzt, Relaisfolge bereit." });
        },
        function stepRelay() {
            if (pc >= gates.length) return false;
            const text = gates[pc++];
            const parts = text.split(/\s+/);
            const op = parts[0].toUpperCase();
            let out = parts.at(-1);
            if (op === "NOT") signals[out] = signals[parts[1]] ? 0 : 1;
            if (op === "AND") signals[out] = signals[parts[1]] && signals[parts[2]] ? 1 : 0;
            if (op === "OR") signals[out] = signals[parts[1]] || signals[parts[2]] ? 1 : 0;
            this.trace.push({ html: `${escapeHtml(text)} ergibt ${out}=${signals[out]}.` });
            return pc < gates.length;
        },
        () => rows([["Gate", `${pc}/${gates.length}`], ["Signale", Object.entries(signals).map(([k, v]) => `${k}=${v}`).join(", ")]]),
        () => Object.entries(signals).map(([k, v]) => `${k} = ${v}`).join("\n")
    );
}

function createFortran(source) {
    const vars = {};
    let formula = "";
    let target = "";
    let pc = 0;
    const steps = [];
    return makeEngine(
        source,
        function prepareFortran() {
            for (const line of stripComments(source)) {
                let m = line.text.match(/^DATA\s+([A-Za-z_]\w*)\s*=\s*([-+]?\d+(?:\.\d+)?)$/i);
                if (m) { vars[m[1]] = number(m[2]); continue; }
                m = line.text.match(/^LET\s+([A-Za-z_]\w*)\s*=\s*(.+)$/i);
                if (m) { target = m[1]; formula = m[2]; continue; }
            }
            if (!formula) throw new Error("Keine LET-Formel gefunden.");
            steps.push("LOAD operands", "TRANSLATE expression", `STORE ${target}`, `PRINT ${target}`);
            this.trace.push({ html: `Formel ${escapeHtml(formula)} erkannt.` });
        },
        function stepFortran() {
            if (pc >= steps.length) return false;
            const label = steps[pc++];
            if (label.startsWith("STORE")) vars[target] = safeEval(formula, vars);
            this.trace.push({ html: escapeHtml(label) });
            return pc < steps.length;
        },
        () => rows([["Pseudo-PC", `${pc}/${steps.length}`], ["Variablen", Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(", ")]]),
        () => target && vars[target] !== undefined ? `${target} = ${vars[target]}` : "Noch keine Ausgabe."
    );
}

function safeEval(expression, vars) {
    const replaced = expression.replace(/[A-Za-z_]\w*/g, (name) => {
        if (!Object.prototype.hasOwnProperty.call(vars, name)) throw new Error(`Unbekannte Variable ${name}.`);
        return `(${vars[name]})`;
    });
    if (!/^[0-9+\-*/().\s]+$/.test(replaced)) throw new Error("Formel enthaelt nicht erlaubte Zeichen.");
    return Function(`"use strict"; return (${replaced});`)();
}

function createLisp(source) {
    let ast = null;
    let result = null;
    return makeEngine(
        source,
        function prepareLisp() {
            const text = stripComments(source).map((line) => line.text).join(" ");
            ast = parseSExpression(text);
            this.trace.push({ html: "S-Ausdruck geparst." });
        },
        function stepLisp() {
            result = evalLisp(ast);
            this.trace.push({ html: `Auswertung ergibt ${escapeHtml(formatLisp(result))}.` });
            return false;
        },
        () => rows([["Ausdruck", formatLisp(ast)], ["Ergebnis", result === null ? "-" : formatLisp(result)]]),
        () => result === null ? "Noch keine Ausgabe." : formatLisp(result)
    );
}

function parseSExpression(input) {
    const tokens = input.replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/).filter(Boolean);
    let i = 0;
    function parseOne() {
        const token = tokens[i++];
        if (token === "(") {
            const list = [];
            while (tokens[i] !== ")") list.push(parseOne());
            i += 1;
            return list;
        }
        if (token === ")") throw new Error("Unerwartete Klammer.");
        return /^[-+]?\d+(?:\.\d+)?$/.test(token) ? Number(token) : token;
    }
    return parseOne();
}

function evalLisp(node) {
    if (!Array.isArray(node)) return node;
    const [op, ...args] = node;
    if (op === "quote") return args[0];
    const values = args.map(evalLisp);
    if (op === "list") return values;
    if (op === "car") return values[0][0];
    if (op === "cdr") return values[0].slice(1);
    if (op === "+") return values.reduce((a, b) => a + b, 0);
    if (op === "*") return values.reduce((a, b) => a * b, 1);
    if (op === "-") return values.slice(1).reduce((a, b) => a - b, values[0]);
    throw new Error(`Unbekannte LISP-Funktion ${op}.`);
}

function formatLisp(value) {
    return Array.isArray(value) ? `(${value.map(formatLisp).join(" ")})` : String(value);
}

function createBasic(source) {
    const vars = {};
    const lines = [];
    const loopStack = [];
    const output = [];
    let pc = 0;
    return makeEngine(
        source,
        function prepareBasic() {
            for (const line of stripComments(source)) {
                const m = line.text.match(/^(\d+)\s+(.+)$/);
                if (!m) throw new Error(`BASIC-Zeile ohne Nummer: ${line.text}`);
                lines.push({ no: Number(m[1]), code: m[2] });
            }
            lines.sort((a, b) => a.no - b.no);
            this.trace.push({ html: `${lines.length} BASIC-Zeilen geladen.` });
        },
        function stepBasic() {
            if (pc >= lines.length) return false;
            const current = lines[pc];
            executeBasicLine(current.code, vars, output, loopStack, () => pc);
            this.trace.push({ html: `${current.no} ${escapeHtml(current.code)}` });
            if (/^NEXT\b/i.test(current.code)) {
                const loop = loopStack.at(-1);
                if (!loop) throw new Error("NEXT ohne FOR.");
                vars[loop.varName] = (vars[loop.varName] || 0) + 1;
                if (vars[loop.varName] <= loop.end) pc = loop.startPc + 1;
                else {
                    loopStack.pop();
                    pc += 1;
                }
            } else {
                pc += 1;
            }
            return pc < lines.length;
        },
        () => rows([["Zeile", pc < lines.length ? String(lines[pc].no) : "Ende"], ["Variablen", Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(", ") || "-"]]),
        () => output.join("\n")
    );
}

function executeBasicLine(code, vars, output, loops, getPc) {
    let m = code.match(/^LET\s+([A-Za-z])\s*=\s*(.+)$/i);
    if (m) { vars[m[1]] = safeEval(m[2], vars); return; }
    m = code.match(/^FOR\s+([A-Za-z])\s*=\s*(.+)\s+TO\s+(.+)$/i);
    if (m) { vars[m[1]] = safeEval(m[2], vars); loops.push({ varName: m[1], end: safeEval(m[3], vars), startPc: getPc() }); return; }
    m = code.match(/^PRINT\s+(.+)$/i);
    if (m) { output.push(m[1].split(",").map((part) => safeEval(part.trim(), vars)).join(" ")); return; }
    if (/^NEXT\b/i.test(code)) return;
    throw new Error(`Unbekannte BASIC-Anweisung: ${code}`);
}

function createEliza(source) {
    const inputs = [];
    const output = [];
    let index = 0;
    return makeEngine(
        source,
        function prepareEliza() {
            for (const line of stripComments(source)) {
                const m = line.text.match(/^USER\s+(.+)$/i);
                if (m) inputs.push(m[1]);
            }
            if (!inputs.length) throw new Error("Keine USER-Zeilen gefunden.");
            this.trace.push({ html: `${inputs.length} Nutzerzeilen geladen.` });
        },
        function stepEliza() {
            if (index >= inputs.length) return false;
            const input = inputs[index++];
            const reply = elizaReply(input);
            output.push(`USER: ${input}\nELIZA: ${reply}`);
            this.trace.push({ html: `Musterantwort fuer: ${escapeHtml(input)}` });
            return index < inputs.length;
        },
        () => rows([["Dialogzeile", `${index}/${inputs.length}`], ["Regel", index ? "Pattern Matching" : "bereit"]]),
        () => output.join("\n\n")
    );
}

function elizaReply(input) {
    const lower = input.toLowerCase();
    const reflect = (text) => text.replace(/\bich\b/g, "du").replace(/\bmein(e|er|en)?\b/g, "dein$1");
    let m = lower.match(/ich fuehle mich (.+)/);
    if (m) return `Warum fuehlst du dich ${m[1]}?`;
    m = lower.match(/meine? (.+) macht mir sorgen/);
    if (m) return `Erzaehle mir mehr ueber deine ${m[1]}.`;
    m = lower.match(/weil (.+)/);
    if (m) return `Ist ${reflect(m[1])} der eigentliche Grund?`;
    if (lower.includes("hallo")) return "Bitte erzaehle weiter.";
    return "Warum sagst du das?";
}

function createCpu4004(source) {
    const regs = { A: 0, B: 0 };
    const mem = Array(16).fill(0);
    const output = [];
    const instructions = [];
    let pc = 0;
    return makeEngine(
        source,
        function prepareCpu() {
            instructions.push(...stripComments(source).map((line) => line.text));
            this.trace.push({ html: `${instructions.length} 4-Bit-Befehle geladen.` });
        },
        function stepCpu() {
            if (pc >= instructions.length) return false;
            const text = instructions[pc++];
            const parts = text.replace(/,/g, "").split(/\s+/);
            const op = parts[0].toUpperCase();
            if (op === "LDI") regs[parts[1]] = number(parts[2]) & 15;
            else if (op === "ADD") regs[parts[1]] = (regs[parts[1]] + valueCpu(parts[2], regs)) & 15;
            else if (op === "STA") mem[number(parts[2]) & 15] = regs[parts[1]];
            else if (op === "OUT") output.push(`${parts[1]}=${regs[parts[1]]}`);
            else throw new Error(`Unbekannter CPU-Befehl: ${text}`);
            this.trace.push({ html: escapeHtml(text) });
            return pc < instructions.length;
        },
        () => rows([["PC", `${pc}/${instructions.length}`], ["Register", `A=${regs.A}, B=${regs.B}`], ["Speicher", mem.map((v, i) => v ? `${i}:${v}` : "").filter(Boolean).join(", ") || "-"]]),
        () => output.join("\n")
    );
}

function valueCpu(token, regs) {
    return Object.prototype.hasOwnProperty.call(regs, token) ? regs[token] : number(token);
}

function createCStack(source) {
    const commands = [];
    const frames = [];
    const pointers = {};
    const output = [];
    let address = 100;
    let pc = 0;
    return makeEngine(
        source,
        function prepareCStack() {
            commands.push(...stripComments(source).map((line) => line.text));
            this.trace.push({ html: `${commands.length} Stack-Befehle geladen.` });
        },
        function stepCStack() {
            if (pc >= commands.length) return false;
            const text = commands[pc++];
            const parts = text.split(/\s+/);
            const op = parts[0].toUpperCase();
            const frame = frames.at(-1);
            if (op === "FRAME") frames.push({ name: parts[1], vars: {} });
            else if (op === "INT") frame.vars[parts[1]] = { address: address++, value: number(parts[2]) };
            else if (op === "PTR") pointers[parts[1]] = frame.vars[parts[2]].address;
            else if (op === "WRITE") writeAddress(frames, pointers[parts[1]], number(parts[2]));
            else if (op === "READ") output.push(`${parts[1]}=${frame.vars[parts[1]].value}`);
            else throw new Error(`Unbekannter Stack-Befehl: ${text}`);
            this.trace.push({ html: escapeHtml(text) });
            return pc < commands.length;
        },
        () => rows([["PC", `${pc}/${commands.length}`], ["Frames", frames.map((f) => f.name).join(" > ") || "-"], ["Pointer", Object.entries(pointers).map(([k, v]) => `${k}->${v}`).join(", ") || "-"]]),
        () => output.join("\n")
    );
}

function writeAddress(frames, addr, value) {
    for (const frame of frames) {
        for (const variable of Object.values(frame.vars)) {
            if (variable.address === addr) {
                variable.value = value;
                return;
            }
        }
    }
    throw new Error(`Adresse ${addr} nicht gefunden.`);
}

function createRsa(source) {
    const params = {};
    const output = [];
    const steps = ["n berechnen", "phi berechnen", "d finden", "verschluesseln", "entschluesseln"];
    let pc = 0;
    return makeEngine(
        source,
        function prepareRsa() {
            for (const line of stripComments(source)) {
                const [key, value] = line.text.split(/\s+/);
                params[key.toUpperCase()] = BigInt(value);
            }
            this.trace.push({ html: "RSA-Parameter geladen." });
        },
        function stepRsa() {
            if (pc >= steps.length) return false;
            const p = params.P, q = params.Q, e = params.E, m = params.M;
            if (pc === 0) params.N = p * q;
            if (pc === 1) params.PHI = (p - 1n) * (q - 1n);
            if (pc === 2) params.D = modInv(e, params.PHI);
            if (pc === 3) params.C = modPow(m, e, params.N);
            if (pc === 4) params.PLAIN = modPow(params.C, params.D, params.N);
            this.trace.push({ html: steps[pc] });
            output.push(`${steps[pc]}: ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(", ")}`);
            pc += 1;
            return pc < steps.length;
        },
        () => rows([["Schritt", `${pc}/${steps.length}`], ["n", String(params.N || "-")], ["d", String(params.D || "-")]]),
        () => output.join("\n")
    );
}

function modPow(base, exp, mod) {
    let result = 1n;
    let b = base % mod;
    let e = exp;
    while (e > 0n) {
        if (e & 1n) result = (result * b) % mod;
        b = (b * b) % mod;
        e >>= 1n;
    }
    return result;
}

function modInv(a, m) {
    for (let x = 1n; x < m; x += 1n) if ((a * x) % m === 1n) return x;
    throw new Error("Kein modularer Inverser gefunden.");
}

function createDns(source) {
    const records = {};
    let query = "";
    const steps = [];
    let pc = 0;
    return makeEngine(
        source,
        function prepareDns() {
            for (const line of stripComments(source)) {
                const text = line.text;
                if (/^QUERY\b/i.test(text)) query = text.replace(/^QUERY\s+/i, "");
                else steps.push(text);
            }
            if (!query) throw new Error("Keine QUERY-Zeile gefunden.");
            this.trace.push({ html: `Client fragt ${escapeHtml(query)}.` });
        },
        function stepDns() {
            if (pc >= steps.length) return false;
            const text = steps[pc++];
            const m = text.match(/^(ROOT|TLD|A)\s+(.+?)(?:\s*->\s*|\s+)(.+)$/i);
            if (!m) throw new Error(`Ungueltiger DNS-Schritt: ${text}`);
            records[m[1].toUpperCase()] = `${m[2]} -> ${m[3]}`;
            this.trace.push({ html: escapeHtml(text) });
            return pc < steps.length;
        },
        () => rows([["Query", query], ["Station", `${pc}/${steps.length}`], ["Antwort", records.A || "-"]]),
        () => records.A ? `${query} = ${records.A.split("->").at(-1).trim()}` : "Noch keine finale IP."
    );
}

function createMapReduce(source) {
    const texts = [];
    const mapped = [];
    const grouped = {};
    const reduced = {};
    const phases = ["map", "shuffle", "reduce"];
    let phase = 0;
    return makeEngine(
        source,
        function prepareMapReduce() {
            for (const line of stripComments(source)) {
                if (/^TEXT\b/i.test(line.text)) texts.push(line.text.replace(/^TEXT\s+/i, ""));
            }
            if (!texts.length) throw new Error("Keine TEXT-Zeilen gefunden.");
            this.trace.push({ html: `${texts.length} Eingabe-Splits geladen.` });
        },
        function stepMapReduce() {
            const current = phases[phase++];
            if (current === "map") {
                texts.join(" ").toLowerCase().split(/\s+/).filter(Boolean).forEach((word) => mapped.push([word, 1]));
            } else if (current === "shuffle") {
                mapped.forEach(([word, value]) => { (grouped[word] ||= []).push(value); });
            } else if (current === "reduce") {
                Object.entries(grouped).forEach(([word, values]) => { reduced[word] = values.reduce((a, b) => a + b, 0); });
            } else {
                return false;
            }
            this.trace.push({ html: `Phase ${current} ausgefuehrt.` });
            return phase < phases.length;
        },
        () => rows([["Phase", phases[phase] || "fertig"], ["Map-Paare", String(mapped.length)], ["Gruppen", String(Object.keys(grouped).length)]]),
        () => Object.entries(reduced).map(([word, count]) => `${word}: ${count}`).join("\n") || "Noch keine Reduce-Ausgabe."
    );
}

elements.emulatorSelect.addEventListener("change", () => selectEmulator(elements.emulatorSelect.value));
elements.sampleBtn.addEventListener("click", loadSample);
elements.compileBtn.addEventListener("click", prepare);
elements.stepBtn.addEventListener("click", step);
elements.runBtn.addEventListener("click", run);
elements.resetBtn.addEventListener("click", () => selectEmulator(activeKey, false));
window.addEventListener("hashchange", () => selectEmulator(location.hash.replace("#", ""), false));

selectEmulator(location.hash.replace("#", "") || "hollerith", false);
