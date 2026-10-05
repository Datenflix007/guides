const STORE_SIZE = 20;

const EXAMPLES = {
    squares: `# Differenzenmethode: Quadratzahlen 1, 4, 9, 16 ...
VAR V0 = 1      # aktuelles Quadrat
VAR V1 = 3      # naechste ungerade Differenz
VAR V2 = 6      # Ausgaben

LABEL TABLE
PRINT V0
ADD V0 V1 -> V0
ADD V1 2 -> V1
SUB V2 1 -> V2
IF V2 > 0 GOTO TABLE`,
    fibonacci: `# Kartenfolge fuer Fibonacci-Zahlen
VAR V0 = 0
VAR V1 = 1
VAR V2 = 8

LABEL NEXT
PRINT V0
ADD V0 V1 -> V3
COPY V1 -> V0
COPY V3 -> V1
SUB V2 1 -> V2
IF V2 > 0 GOTO NEXT`,
    formula: `# Formel: ((A * B) + C) / D
VAR V0 = 7
VAR V1 = 9
VAR V2 = 12
VAR V3 = 3

MUL V0 V1 -> V4
ADD V4 V2 -> V5
DIV V5 V3 -> V6
PRINT V6
BELL`,
    cubic: `# Komplexere Aufgabe: Kubiktabelle per endlichen Differenzen
# Gibt 0, 1, 8, 27, 64, 125 aus.
VAR V0 = 0      # aktueller Wert n^3
VAR V1 = 1      # erste Differenz
VAR V2 = 6      # zweite Differenz
VAR V3 = 6      # konstante dritte Differenz
VAR V4 = 6      # Anzahl Ausgaben

LABEL TABLE
PRINT V0
ADD V0 V1 -> V0
ADD V1 V2 -> V1
ADD V2 V3 -> V2
SUB V4 1 -> V4
IF V4 > 0 GOTO TABLE
BELL`,
    weighted: `# Komplexere Aufgabe: gewichteter Index
# INDEX = (A*2 + B*3 + C*5) / 10
VAR V0 = 72
VAR V1 = 88
VAR V2 = 91

MUL V0 2 -> V3
MUL V1 3 -> V4
MUL V2 5 -> V5
ADD V3 V4 -> V6
ADD V6 V5 -> V7
DIV V7 10 -> V8
PRINT V8
BELL`,
    loan: `# Komplexere Aufgabe: kleine Tilgungstabelle
# Restschuld wird dreimal um Zahlung minus Zins gesenkt.
VAR V0 = 1000   # Restschuld
VAR V1 = 60     # Zahlung pro Periode
VAR V2 = 5      # Zins pro Periode, didaktisch konstant
VAR V3 = 3      # Perioden

LABEL PAY
PRINT V0
ADD V0 V2 -> V0
SUB V0 V1 -> V0
SUB V3 1 -> V3
IF V3 > 0 GOTO PAY
PRINT V0
BELL`
};

const state = {
    compiled: null,
    store: {},
    pc: 0,
    cycle: 0,
    output: [],
    log: [],
    readSet: new Set(),
    writeName: "",
    mill: {
        operation: "bereit",
        a: "-",
        b: "-",
        out: "-"
    }
};

const editor = document.getElementById("sourceEditor");
const sampleSelect = document.getElementById("sampleSelect");
const sampleBtn = document.getElementById("sampleBtn");
const compileBtn = document.getElementById("compileBtn");
const stepBtn = document.getElementById("stepBtn");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const storeWall = document.getElementById("storeWall");
const cardDeck = document.getElementById("cardDeck");
const printerOutput = document.getElementById("printerOutput");
const attendantLog = document.getElementById("attendantLog");
const compileStatus = document.getElementById("compileStatus");
const cycleStatus = document.getElementById("cycleStatus");
const pcStatus = document.getElementById("pcStatus");
const millOperation = document.getElementById("millOperation");
const millA = document.getElementById("millA");
const millB = document.getElementById("millB");
const millOut = document.getElementById("millOut");

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeName(value) {
    return String(value || "").trim().toUpperCase();
}

function formatNumber(value) {
    if (value === undefined || value === null || value === "") return "-";
    if (!Number.isFinite(value)) return String(value);
    const fixed = Math.abs(value) >= 1000 ? value.toFixed(2) : value.toFixed(6);
    return fixed.replace(/\.?0+$/, "");
}

function setStatus(element, text, mode = "") {
    element.textContent = text;
    element.className = `status-pill ${mode}`.trim();
}

function loadSample() {
    editor.value = EXAMPLES[sampleSelect.value] || EXAMPLES.squares;
    resetRuntimeOnly();
    compileProgram();
}

function resetRuntimeOnly() {
    state.pc = 0;
    state.cycle = 0;
    state.output = [];
    state.log = [];
    state.readSet = new Set();
    state.writeName = "";
    state.mill = {
        operation: "bereit",
        a: "-",
        b: "-",
        out: "-"
    };
    if (state.compiled) {
        state.store = { ...state.compiled.initialStore };
    } else {
        state.store = {};
    }
    renderAll();
}

function stripComment(line) {
    const index = line.indexOf("#");
    return (index >= 0 ? line.slice(0, index) : line).trim();
}

function parseStoreName(token, lineNumber) {
    const name = normalizeName(token);
    if (!/^V(?:[0-9]|1[0-9])$/.test(name)) {
        throw new Error(`Zeile ${lineNumber}: Store-Spalte ${token} ist ungueltig. Erlaubt sind V0 bis V19.`);
    }
    return name;
}

function parseValueToken(token, lineNumber) {
    const cleaned = normalizeName(token);
    if (/^[-+]?\d+(?:\.\d+)?$/.test(cleaned)) {
        return { kind: "literal", value: Number(cleaned), label: cleaned };
    }
    return { kind: "store", name: parseStoreName(cleaned, lineNumber), label: cleaned };
}

function parseVarLine(line, lineNumber) {
    const match = line.match(/^VAR\s+(V(?:[0-9]|1[0-9]))\s*=\s*([-+]?\d+(?:\.\d+)?)$/i);
    if (!match) throw new Error(`Zeile ${lineNumber}: VAR-Syntax erwartet, z.B. VAR V0 = 12.`);
    return {
        name: parseStoreName(match[1], lineNumber),
        value: Number(match[2])
    };
}

function parseOperation(line, lineNumber) {
    const labelMatch = line.match(/^LABEL\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (labelMatch) {
        return { type: "label", label: normalizeName(labelMatch[1]), lineNumber };
    }

    const printMatch = line.match(/^PRINT\s+(.+)$/i);
    if (printMatch) {
        const arg = parseValueToken(printMatch[1].trim(), lineNumber);
        return {
            type: "instruction",
            op: "PRINT",
            args: [arg],
            dest: null,
            lineNumber,
            text: line
        };
    }

    if (/^BELL$/i.test(line)) {
        return {
            type: "instruction",
            op: "BELL",
            args: [],
            dest: null,
            lineNumber,
            text: line
        };
    }

    const jumpMatch = line.match(/^(?:GOTO|JUMP)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (jumpMatch) {
        return {
            type: "instruction",
            op: "GOTO",
            label: normalizeName(jumpMatch[1]),
            args: [],
            dest: null,
            lineNumber,
            text: line
        };
    }

    const ifMatch = line.match(/^IF\s+(.+?)\s*(>=|<=|!=|=|>|<)\s*(.+?)\s+GOTO\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (ifMatch) {
        return {
            type: "instruction",
            op: "IF",
            args: [
                parseValueToken(ifMatch[1].trim(), lineNumber),
                parseValueToken(ifMatch[3].trim(), lineNumber)
            ],
            comparator: ifMatch[2],
            label: normalizeName(ifMatch[4]),
            dest: null,
            lineNumber,
            text: line
        };
    }

    const copyMatch = line.match(/^COPY\s+(.+?)\s*->\s*(V(?:[0-9]|1[0-9]))$/i);
    if (copyMatch) {
        return {
            type: "instruction",
            op: "COPY",
            args: [parseValueToken(copyMatch[1].trim(), lineNumber)],
            dest: parseStoreName(copyMatch[2], lineNumber),
            lineNumber,
            text: line
        };
    }

    const opMatch = line.match(/^(ADD|SUB|MUL|DIV)\s+(.+?)\s+(.+?)\s*->\s*(V(?:[0-9]|1[0-9]))$/i);
    if (opMatch) {
        return {
            type: "instruction",
            op: normalizeName(opMatch[1]),
            args: [
                parseValueToken(opMatch[2].trim(), lineNumber),
                parseValueToken(opMatch[3].trim(), lineNumber)
            ],
            dest: parseStoreName(opMatch[4], lineNumber),
            lineNumber,
            text: line
        };
    }

    throw new Error(`Zeile ${lineNumber}: Unbekannte Karte "${line}".`);
}

function compileProgram() {
    try {
        const initialStore = {};
        const labels = new Map();
        const instructions = [];
        const lines = editor.value.split(/\r?\n/);

        lines.forEach((rawLine, index) => {
            const lineNumber = index + 1;
            const line = stripComment(rawLine);
            if (!line) return;

            if (/^VAR\b/i.test(line)) {
                const variable = parseVarLine(line, lineNumber);
                initialStore[variable.name] = variable.value;
                return;
            }

            const parsed = parseOperation(line, lineNumber);
            if (parsed.type === "label") {
                labels.set(parsed.label, instructions.length);
                return;
            }
            parsed.address = instructions.length;
            parsed.operationCard = buildOperationCard(parsed);
            parsed.variableCard = buildVariableCard(parsed);
            instructions.push(parsed);
        });

        for (const instruction of instructions) {
            if ((instruction.op === "GOTO" || instruction.op === "IF") && !labels.has(instruction.label)) {
                throw new Error(`Zeile ${instruction.lineNumber}: Marke ${instruction.label} wurde nicht definiert.`);
            }
        }

        state.compiled = {
            initialStore,
            labels,
            instructions
        };
        state.store = { ...initialStore };
        state.pc = 0;
        state.cycle = 0;
        state.output = [];
        state.log = [{ type: "info", html: `${instructions.length} Karten gelesen. Store und Mill sind bereit.` }];
        state.readSet = new Set();
        state.writeName = "";
        state.mill = {
            operation: "bereit",
            a: "-",
            b: "-",
            out: "-"
        };
        setStatus(compileStatus, "gelesen", "ok");
        renderAll();
    } catch (error) {
        state.compiled = null;
        state.log = [{ type: "error", html: escapeHtml(error.message) }];
        setStatus(compileStatus, "Fehler", "error");
        renderAll();
    }
}

function buildOperationCard(instruction) {
    if (instruction.op === "IF") return `COND ${instruction.comparator}`;
    return instruction.op;
}

function buildVariableCard(instruction) {
    if (instruction.op === "BELL") return "ATTENDANT";
    if (instruction.op === "GOTO") return `NEXT ${instruction.label}`;
    if (instruction.op === "IF") {
        return `${instruction.args[0].label} ${instruction.comparator} ${instruction.args[1].label} -> ${instruction.label}`;
    }
    const args = instruction.args.map((arg) => arg.label).join(", ");
    return instruction.dest ? `${args} -> ${instruction.dest}` : args;
}

function resolveOperand(operand) {
    if (operand.kind === "literal") return operand.value;
    state.readSet.add(operand.name);
    return Number(state.store[operand.name] || 0);
}

function evaluateComparator(left, comparator, right) {
    if (comparator === ">") return left > right;
    if (comparator === "<") return left < right;
    if (comparator === ">=") return left >= right;
    if (comparator === "<=") return left <= right;
    if (comparator === "=") return left === right;
    if (comparator === "!=") return left !== right;
    return false;
}

function stepProgram() {
    if (!state.compiled) {
        compileProgram();
        if (!state.compiled) return;
    }

    const instructions = state.compiled.instructions;
    if (state.pc >= instructions.length) {
        state.log.push({ type: "info", html: "Kartenkette beendet." });
        renderAll();
        return;
    }

    try {
        state.readSet = new Set();
        state.writeName = "";
        const instruction = instructions[state.pc];
        state.cycle += 1;
        executeInstruction(instruction);
        renderAll();
    } catch (error) {
        state.log.push({ type: "error", html: escapeHtml(error.message) });
        setStatus(compileStatus, "Laufzeitfehler", "error");
        renderAll();
    }
}

function executeInstruction(instruction) {
    let nextPc = state.pc + 1;
    const address = String(instruction.address).padStart(3, "0");

    if (instruction.op === "PRINT") {
        const value = resolveOperand(instruction.args[0]);
        state.output.push(`${instruction.args[0].label} = ${formatNumber(value)}`);
        state.mill = {
            operation: "PRINT",
            a: `${instruction.args[0].label} = ${formatNumber(value)}`,
            b: "-",
            out: "Drucker"
        };
        state.log.push({ type: "info", html: `${address}: Drucker schreibt ${escapeHtml(instruction.args[0].label)} = ${formatNumber(value)}.` });
        state.pc = nextPc;
        return;
    }

    if (instruction.op === "BELL") {
        state.output.push("[BELL]");
        state.mill = {
            operation: "BELL",
            a: "-",
            b: "-",
            out: "Attendant"
        };
        state.log.push({ type: "info", html: `${address}: Glocke signalisiert Ende oder Aufmerksamkeit.` });
        state.pc = nextPc;
        return;
    }

    if (instruction.op === "GOTO") {
        nextPc = state.compiled.labels.get(instruction.label);
        state.mill = {
            operation: "GOTO",
            a: instruction.label,
            b: "-",
            out: `Karte ${nextPc}`
        };
        state.log.push({ type: "info", html: `${address}: Kartenkette springt zu ${escapeHtml(instruction.label)}.` });
        state.pc = nextPc;
        return;
    }

    if (instruction.op === "IF") {
        const left = resolveOperand(instruction.args[0]);
        const right = resolveOperand(instruction.args[1]);
        const pass = evaluateComparator(left, instruction.comparator, right);
        nextPc = pass ? state.compiled.labels.get(instruction.label) : nextPc;
        state.mill = {
            operation: `IF ${instruction.comparator}`,
            a: formatNumber(left),
            b: formatNumber(right),
            out: pass ? `GOTO ${instruction.label}` : "naechste Karte"
        };
        state.log.push({
            type: "info",
            html: `${address}: Bedingung ${escapeHtml(instruction.args[0].label)} ${escapeHtml(instruction.comparator)} ${escapeHtml(instruction.args[1].label)} ist ${pass ? "wahr" : "falsch"}.`
        });
        state.pc = nextPc;
        return;
    }

    if (instruction.op === "COPY") {
        const value = resolveOperand(instruction.args[0]);
        state.store[instruction.dest] = value;
        state.writeName = instruction.dest;
        state.mill = {
            operation: "COPY",
            a: `${instruction.args[0].label} = ${formatNumber(value)}`,
            b: "-",
            out: `${instruction.dest} = ${formatNumber(value)}`
        };
        state.log.push({ type: "info", html: `${address}: ${escapeHtml(instruction.dest)} erhaelt ${formatNumber(value)}.` });
        state.pc = nextPc;
        return;
    }

    const left = resolveOperand(instruction.args[0]);
    const right = resolveOperand(instruction.args[1]);
    let result;
    if (instruction.op === "ADD") result = left + right;
    if (instruction.op === "SUB") result = left - right;
    if (instruction.op === "MUL") result = left * right;
    if (instruction.op === "DIV") {
        if (right === 0) throw new Error(`Zeile ${instruction.lineNumber}: Division durch 0.`);
        result = left / right;
    }

    state.store[instruction.dest] = result;
    state.writeName = instruction.dest;
    state.mill = {
        operation: instruction.op,
        a: `${instruction.args[0].label} = ${formatNumber(left)}`,
        b: `${instruction.args[1].label} = ${formatNumber(right)}`,
        out: `${instruction.dest} = ${formatNumber(result)}`
    };
    state.log.push({
        type: "info",
        html: `${address}: ${escapeHtml(instruction.op)} mit ${escapeHtml(instruction.variableCard)} ergibt ${escapeHtml(instruction.dest)} = ${formatNumber(result)}.`
    });
    state.pc = nextPc;
}

function runProgram() {
    if (!state.compiled) {
        compileProgram();
        if (!state.compiled) return;
    }

    let guard = 0;
    while (state.pc < state.compiled.instructions.length && guard < 300) {
        stepProgram();
        guard += 1;
        if (state.log.at(-1)?.type === "error") break;
    }
    if (guard >= 300) {
        state.log.push({ type: "error", html: "Abbruch: Kartenkette lief ueber 300 Takte. Pruefe die Schleifenbedingung." });
        setStatus(compileStatus, "Schleife?", "error");
        renderAll();
    }
}

function referencedStoreNames() {
    const names = new Set(Object.keys(state.store));
    if (state.compiled) {
        state.compiled.instructions.forEach((instruction) => {
            if (instruction.dest) names.add(instruction.dest);
            (instruction.args || []).forEach((arg) => {
                if (arg.kind === "store") names.add(arg.name);
            });
        });
    }
    state.readSet.forEach((name) => names.add(name));
    if (state.writeName) names.add(state.writeName);
    if (!names.size) {
        names.add("V0");
        names.add("V1");
        names.add("V2");
    }
    return names;
}

function renderStore() {
    const cells = [];
    const relevant = referencedStoreNames();
    for (let index = 0; index < STORE_SIZE; index += 1) {
        const name = `V${index}`;
        const classes = ["store-cell"];
        if (state.readSet.has(name)) classes.push("read");
        if (state.writeName === name) classes.push("write");
        if (relevant.has(name)) classes.push("relevant");
        cells.push(`
            <div class="${classes.join(" ")}" data-store="${name}">
                <span>${name}</span>
                <strong>${formatNumber(state.store[name])}</strong>
            </div>
        `);
    }
    storeWall.innerHTML = cells.join("");
}

function renderDeck() {
    if (!state.compiled) {
        cardDeck.innerHTML = "<li>Noch keine Karten gelesen.</li>";
        return;
    }
    if (!state.compiled.instructions.length) {
        cardDeck.innerHTML = "<li>Keine ausfuehrbaren Karten vorhanden.</li>";
        return;
    }
    cardDeck.innerHTML = state.compiled.instructions.map((instruction, index) => {
        const classes = [];
        if (index === state.pc) classes.push("active");
        if (index < state.pc) classes.push("visited");
        return `
            <li class="${classes.join(" ")}">
                <strong>${String(index).padStart(3, "0")} - ${escapeHtml(instruction.operationCard)}</strong>
                <span>Variable Card: ${escapeHtml(instruction.variableCard)}</span>
                <span>Quelle: ${escapeHtml(instruction.text)}</span>
            </li>
        `;
    }).join("");
}

function renderPrinter() {
    printerOutput.textContent = state.output.length ? state.output.join("\n") : "Noch keine Druckausgabe.";
}

function renderLog() {
    if (!state.log.length) {
        attendantLog.innerHTML = "<li>Warte auf Karten.</li>";
        return;
    }
    attendantLog.innerHTML = state.log.map((entry) => {
        const cls = entry.type === "error" ? " class=\"error\"" : "";
        return `<li${cls}>${entry.html}</li>`;
    }).join("");
    attendantLog.scrollTop = attendantLog.scrollHeight;
}

function renderMill() {
    millOperation.textContent = state.mill.operation;
    millA.textContent = state.mill.a;
    millB.textContent = state.mill.b;
    millOut.textContent = state.mill.out;
}

function renderStatuses() {
    const total = state.compiled ? state.compiled.instructions.length : 0;
    setStatus(cycleStatus, `Takt ${state.cycle}`, state.cycle ? "ok" : "");
    setStatus(pcStatus, `Karte ${state.pc}/${total}`, total && state.pc >= total ? "ok" : "");
}

function renderAll() {
    renderStore();
    renderDeck();
    renderPrinter();
    renderLog();
    renderMill();
    renderStatuses();
}

sampleBtn.addEventListener("click", loadSample);
compileBtn.addEventListener("click", compileProgram);
stepBtn.addEventListener("click", stepProgram);
runBtn.addEventListener("click", runProgram);
resetBtn.addEventListener("click", resetRuntimeOnly);

editor.value = EXAMPLES.squares;
compileProgram();
