const MEMORY_SIZE = 16;

const EXAMPLES = {
    pythagoras: `# Z3-Labor: Pythagoras mit Speicher und Rechenwerk
# Die echte Z3 hatte 64 Speicherworte; hier nutzen wir M0 bis M15.
MEM M0 = 3
MEM M1 = 4

LOAD M0
LOAD M0
MUL
STORE M2

LOAD M1
LOAD M1
MUL
LOAD M2
ADD
SQRT
STORE M3
OUTPUT M3`,
    fahrenheit: `# Formel: Celsius * 1.8 + 32
MEM M0 = 21
MEM M1 = 1.8
MEM M2 = 32

LOAD M0
LOAD M1
MUL
LOAD M2
ADD
STORE M3
OUTPUT M3`,
    fluglast: `# Stark vereinfachtes Technikbeispiel: Last = Faktor * Geschwindigkeit^2
MEM M0 = 1.35
MEM M1 = 42

LOAD M1
LOAD M1
MUL
LOAD M0
MUL
STORE M2
OUTPUT M2`,
    ballistic: `# Komplexere Aufgabe: ballistische Tabelle ohne Luftwiderstand
# h(t) = v0*t - 4.9*t*t fuer t = 1, 2, 3, 4
# Die Z3 liest linear vom Streifen; deshalb ist die Tabelle entrollt.
MEM M0 = 120
MEM M1 = 4.9
MEM M2 = 1
MEM M3 = 2
MEM M4 = 3
MEM M5 = 4

# t = 1 -> M6
LOAD M0
LOAD M2
MUL
STORE M12
LOAD M2
LOAD M2
MUL
LOAD M1
MUL
STORE M13
LOAD M12
LOAD M13
SUB
STORE M6
OUTPUT M6

# t = 2 -> M7
LOAD M0
LOAD M3
MUL
STORE M12
LOAD M3
LOAD M3
MUL
LOAD M1
MUL
STORE M13
LOAD M12
LOAD M13
SUB
STORE M7
OUTPUT M7

# t = 3 -> M8
LOAD M0
LOAD M4
MUL
STORE M12
LOAD M4
LOAD M4
MUL
LOAD M1
MUL
STORE M13
LOAD M12
LOAD M13
SUB
STORE M8
OUTPUT M8

# t = 4 -> M9
LOAD M0
LOAD M5
MUL
STORE M12
LOAD M5
LOAD M5
MUL
LOAD M1
MUL
STORE M13
LOAD M12
LOAD M13
SUB
STORE M9
OUTPUT M9`,
    energy: `# Komplexere Aufgabe: kinetische Energie vergleichen
# E = 0.5 * M * V^2
MEM M0 = 0.5
MEM M1 = 12
MEM M2 = 18
MEM M3 = 24

LOAD M2
LOAD M2
MUL
LOAD M1
MUL
LOAD M0
MUL
STORE M4
OUTPUT M4

LOAD M3
LOAD M3
MUL
LOAD M1
MUL
LOAD M0
MUL
STORE M5
OUTPUT M5`,
    weighted: `# Komplexere Aufgabe: gewichteter Mittelwert
# SCORE = (A*2 + B*3 + C*5) / 10
MEM M0 = 72
MEM M1 = 88
MEM M2 = 91
MEM M3 = 2
MEM M4 = 3
MEM M5 = 5
MEM M6 = 10

LOAD M0
LOAD M3
MUL
STORE M7
LOAD M1
LOAD M4
MUL
LOAD M7
ADD
STORE M8
LOAD M2
LOAD M5
MUL
LOAD M8
ADD
LOAD M6
DIV
STORE M9
OUTPUT M9`
};

const state = {
    compiled: null,
    initialMemory: Array(MEMORY_SIZE).fill(0),
    memory: Array(MEMORY_SIZE).fill(0),
    pc: 0,
    cycle: 0,
    r1: null,
    r2: null,
    output: [],
    log: [],
    readSet: new Set(),
    writeIndex: null,
    activeRegister: "",
    sourceSnapshot: "",
    operation: {
        label: "bereit",
        hint: "Streifen lesen, dann einen Takt ausfuehren."
    }
};

const sourceEditor = document.getElementById("sourceEditor");
const sampleSelect = document.getElementById("sampleSelect");
const sampleBtn = document.getElementById("sampleBtn");
const compileBtn = document.getElementById("compileBtn");
const stepBtn = document.getElementById("stepBtn");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const memoryWall = document.getElementById("memoryWall");
const instructionTape = document.getElementById("instructionTape");
const executionLog = document.getElementById("executionLog");
const machineOutput = document.getElementById("machineOutput");
const compileStatus = document.getElementById("compileStatus");
const cycleStatus = document.getElementById("cycleStatus");
const pcStatus = document.getElementById("pcStatus");
const registerR1 = document.getElementById("registerR1");
const registerR2 = document.getElementById("registerR2");
const r1Card = document.getElementById("r1Card");
const r2Card = document.getElementById("r2Card");
const operationLabel = document.getElementById("operationLabel");
const operationHint = document.getElementById("operationHint");

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function normalizeName(value) {
    return String(value || "").trim().toUpperCase();
}

function isNumberToken(value) {
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(String(value).trim());
}

function parseNumber(value, lineNumber) {
    if (!isNumberToken(value)) {
        throw new Error(`Zeile ${lineNumber}: Zahl erwartet, erhalten: ${value}`);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Zeile ${lineNumber}: Zahl ist nicht endlich.`);
    }
    return parsed;
}

function parseMemoryName(token, lineNumber) {
    const name = normalizeName(token);
    const match = name.match(/^M([0-9]|1[0-5])$/);
    if (!match) {
        throw new Error(`Zeile ${lineNumber}: Speicherwort M0 bis M15 erwartet, erhalten: ${token}`);
    }
    return Number(match[1]);
}

function parseOperand(token, lineNumber) {
    const cleaned = normalizeName(token);
    if (isNumberToken(cleaned)) {
        return { kind: "literal", value: parseNumber(cleaned, lineNumber), label: cleaned };
    }
    const index = parseMemoryName(cleaned, lineNumber);
    return { kind: "memory", index, label: `M${index}` };
}

function formatNumber(value) {
    if (value === null || value === undefined) return "leer";
    if (!Number.isFinite(value)) return String(value);
    if (Math.abs(value) < 1e-10) return "0";
    const rounded = Math.abs(value) >= 100000 ? value.toExponential(4) : value.toFixed(6);
    return rounded.replace(/\.?0+(e|$)/, "$1");
}

function setCompileStatus(text, mode = "") {
    compileStatus.textContent = text;
    compileStatus.className = `status-pill ${mode}`.trim();
}

function stripComment(line) {
    return line.replace(/#.*/, "").trim();
}

function cleanLines(source) {
    return source.split(/\r?\n/)
        .map((raw, index) => ({ text: stripComment(raw), lineNumber: index + 1 }))
        .filter((line) => line.text);
}

function parseInstruction(line, lineNumber) {
    const memoryMatch = line.match(/^(?:MEM|SET)\s+(M(?:[0-9]|1[0-5]))\s*=\s*(.+)$/i);
    if (memoryMatch) {
        return {
            type: "memory",
            index: parseMemoryName(memoryMatch[1], lineNumber),
            value: parseNumber(memoryMatch[2].trim(), lineNumber),
            lineNumber,
            text: line
        };
    }

    if (/^(IF|GOTO|JUMP|LOOP)\b/i.test(line)) {
        throw new Error(`Zeile ${lineNumber}: Dieses Labor zeigt die Z3 bewusst ohne moderne Sprunglogik. Nutze einen linearen Programmstreifen.`);
    }

    const loadMatch = line.match(/^(LOAD|READ)\s+(.+)$/i);
    if (loadMatch) {
        return {
            type: "instruction",
            op: normalizeName(loadMatch[1]),
            args: [parseOperand(loadMatch[2].trim(), lineNumber)],
            lineNumber,
            text: line
        };
    }

    const storeMatch = line.match(/^STORE\s+(M(?:[0-9]|1[0-5]))$/i);
    if (storeMatch) {
        return {
            type: "instruction",
            op: "STORE",
            dest: parseMemoryName(storeMatch[1], lineNumber),
            args: [],
            lineNumber,
            text: line
        };
    }

    const arithmeticMatch = line.match(/^(ADD|SUB|MUL|DIV)(?:\s+(.+))?$/i);
    if (arithmeticMatch) {
        return {
            type: "instruction",
            op: normalizeName(arithmeticMatch[1]),
            args: arithmeticMatch[2] ? [parseOperand(arithmeticMatch[2].trim(), lineNumber)] : [],
            lineNumber,
            text: line
        };
    }

    if (/^SQRT$/i.test(line)) {
        return {
            type: "instruction",
            op: "SQRT",
            args: [],
            lineNumber,
            text: line
        };
    }

    const outputMatch = line.match(/^OUTPUT(?:\s+(.+))?$/i);
    if (outputMatch) {
        return {
            type: "instruction",
            op: "OUTPUT",
            args: outputMatch[1] ? [parseOperand(outputMatch[1].trim(), lineNumber)] : [],
            lineNumber,
            text: line
        };
    }

    if (/^CLEAR$/i.test(line)) {
        return {
            type: "instruction",
            op: "CLEAR",
            args: [],
            lineNumber,
            text: line
        };
    }

    throw new Error(`Zeile ${lineNumber}: Unbekannter Streifenbefehl "${line}".`);
}

function compileTape() {
    const errors = [];
    const initialMemory = Array(MEMORY_SIZE).fill(0);
    const instructions = [];

    for (const line of cleanLines(sourceEditor.value)) {
        try {
            const parsed = parseInstruction(line.text, line.lineNumber);
            if (parsed.type === "memory") {
                initialMemory[parsed.index] = parsed.value;
            } else {
                parsed.address = instructions.length;
                instructions.push(parsed);
            }
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (!instructions.length && !errors.length) {
        errors.push("Kein ausfuehrbarer Streifenbefehl gefunden.");
    }

    if (errors.length) {
        state.compiled = null;
        state.initialMemory = Array(MEMORY_SIZE).fill(0);
        state.memory = Array(MEMORY_SIZE).fill(0);
        state.pc = 0;
        state.cycle = 0;
        state.r1 = null;
        state.r2 = null;
        state.output = [];
        state.log = errors.map((message) => ({ type: "error", html: escapeHtml(message) }));
        state.operation = { label: "Fehler", hint: "Korrigiere den Programmstreifen und lies ihn erneut." };
        setCompileStatus("Fehler", "error");
        renderAll();
        return false;
    }

    state.compiled = { instructions };
    state.initialMemory = initialMemory;
    state.sourceSnapshot = sourceEditor.value;
    resetRuntimeOnly();
    state.log = [{ html: `<strong>Streifen gelesen:</strong> ${instructions.length} Taktbefehl(e), Speicher vorbereitet.` }];
    setCompileStatus("gelesen", "ok");
    renderAll();
    return true;
}

function resetRuntimeOnly() {
    state.memory = [...state.initialMemory];
    state.pc = 0;
    state.cycle = 0;
    state.r1 = null;
    state.r2 = null;
    state.output = [];
    state.log = [];
    state.readSet = new Set();
    state.writeIndex = null;
    state.activeRegister = "";
    state.operation = {
        label: "bereit",
        hint: state.compiled ? "Streifen liegt bereit. Fuehre den ersten Takt aus." : "Streifen lesen, dann einen Takt ausfuehren."
    };
    renderAll();
}

function ensureCompiled() {
    if (!state.compiled || state.sourceSnapshot !== sourceEditor.value) {
        return compileTape();
    }
    return true;
}

function resolveOperand(operand) {
    if (operand.kind === "literal") {
        return { value: operand.value, label: operand.label };
    }
    state.readSet.add(operand.index);
    return { value: state.memory[operand.index] || 0, label: operand.label };
}

function placeInRegister(value, label) {
    const payload = { value, label };
    if (!state.r1) {
        state.r1 = payload;
        state.activeRegister = "R1";
        return "R1";
    }
    state.r2 = payload;
    state.activeRegister = "R2";
    return "R2";
}

function requireR1(lineNumber) {
    if (!state.r1) throw new Error(`Zeile ${lineNumber}: Register R1 ist leer. Lade zuerst einen Wert.`);
    return state.r1;
}

function requireR2(lineNumber) {
    if (!state.r2) throw new Error(`Zeile ${lineNumber}: Register R2 ist leer. Lade einen zweiten Wert oder nutze z.B. ADD M2.`);
    return state.r2;
}

function executeInstruction(instruction) {
    state.readSet = new Set();
    state.writeIndex = null;
    state.activeRegister = "";

    if (instruction.op === "LOAD" || instruction.op === "READ") {
        const operand = resolveOperand(instruction.args[0]);
        const register = placeInRegister(operand.value, operand.label);
        state.operation = {
            label: `${instruction.op} -> ${register}`,
            hint: `${operand.label} wurde in ${register} geladen. Der naechste LOAD fuellt R2, danach kann gerechnet werden.`
        };
        state.log.push({ html: `<strong>${escapeHtml(instruction.op)}</strong> ${escapeHtml(operand.label)} -> ${register}` });
        return;
    }

    if (instruction.op === "STORE") {
        const current = requireR1(instruction.lineNumber);
        state.memory[instruction.dest] = current.value;
        state.writeIndex = instruction.dest;
        state.r1 = null;
        state.r2 = null;
        state.activeRegister = "";
        state.operation = {
            label: `STORE M${instruction.dest}`,
            hint: `R1 wurde nach M${instruction.dest} geschrieben. Danach ist das Rechenwerk wieder frei.`
        };
        state.log.push({ html: `<strong>STORE</strong> R1 -> M${instruction.dest} = ${formatNumber(current.value)}` });
        return;
    }

    if (["ADD", "SUB", "MUL", "DIV"].includes(instruction.op)) {
        const left = requireR1(instruction.lineNumber);
        let right = state.r2;
        if (instruction.args.length) {
            const operand = resolveOperand(instruction.args[0]);
            right = { value: operand.value, label: operand.label };
            state.r2 = right;
            state.activeRegister = "R2";
        } else {
            right = requireR2(instruction.lineNumber);
        }

        let result = 0;
        if (instruction.op === "ADD") result = left.value + right.value;
        if (instruction.op === "SUB") result = left.value - right.value;
        if (instruction.op === "MUL") result = left.value * right.value;
        if (instruction.op === "DIV") {
            if (right.value === 0) throw new Error(`Zeile ${instruction.lineNumber}: Division durch 0.`);
            result = left.value / right.value;
        }

        state.r1 = {
            value: result,
            label: `(${left.label} ${instruction.op} ${right.label})`
        };
        state.r2 = null;
        state.activeRegister = "R1";
        state.operation = {
            label: instruction.op,
            hint: `R1 und R2 wurden verrechnet. Das Ergebnis bleibt in R1; R2 ist frei.`
        };
        state.log.push({ html: `<strong>${escapeHtml(instruction.op)}</strong> ${escapeHtml(left.label)} und ${escapeHtml(right.label)} -> R1 = ${formatNumber(result)}` });
        return;
    }

    if (instruction.op === "SQRT") {
        const current = requireR1(instruction.lineNumber);
        if (current.value < 0) throw new Error(`Zeile ${instruction.lineNumber}: Quadratwurzel aus negativem Wert.`);
        const result = Math.sqrt(current.value);
        state.r1 = {
            value: result,
            label: `SQRT ${current.label}`
        };
        state.r2 = null;
        state.activeRegister = "R1";
        state.operation = {
            label: "SQRT",
            hint: "Die Quadratwurzel wurde im Rechenwerk gebildet und liegt in R1."
        };
        state.log.push({ html: `<strong>SQRT</strong> ${escapeHtml(current.label)} -> R1 = ${formatNumber(result)}` });
        return;
    }

    if (instruction.op === "OUTPUT") {
        let value;
        let label;
        if (instruction.args.length) {
            const operand = resolveOperand(instruction.args[0]);
            value = operand.value;
            label = operand.label;
        } else {
            const current = requireR1(instruction.lineNumber);
            value = current.value;
            label = current.label;
        }
        state.output.push(`${label} = ${formatNumber(value)}`);
        state.operation = {
            label: "OUTPUT",
            hint: `${label} wurde auf der didaktischen Ausgabeseite sichtbar gemacht.`
        };
        state.log.push({ html: `<strong>OUTPUT</strong> ${escapeHtml(label)} = ${formatNumber(value)}` });
        return;
    }

    if (instruction.op === "CLEAR") {
        state.r1 = null;
        state.r2 = null;
        state.operation = {
            label: "CLEAR",
            hint: "Beide Arbeitsregister wurden geleert."
        };
        state.log.push({ html: "<strong>CLEAR</strong> R1 und R2 geleert." });
    }
}

function stepTape() {
    if (!ensureCompiled()) return false;

    const instructions = state.compiled.instructions;
    if (state.pc >= instructions.length) {
        state.log.push({ html: "<strong>Programm beendet.</strong>" });
        setCompileStatus("fertig", "ok");
        renderAll();
        return false;
    }

    try {
        const instruction = instructions[state.pc];
        executeInstruction(instruction);
        state.pc += 1;
        state.cycle += 1;
        if (state.pc >= instructions.length) {
            setCompileStatus("fertig", "ok");
        } else {
            setCompileStatus("laeuft");
        }
        renderAll();
        return true;
    } catch (error) {
        state.log.push({ type: "error", html: escapeHtml(error.message) });
        state.pc = instructions.length;
        state.operation = {
            label: "Laufzeitfehler",
            hint: "Der aktuelle Takt konnte nicht ausgefuehrt werden."
        };
        setCompileStatus("Laufzeitfehler", "error");
        renderAll();
        return false;
    }
}

function runTape() {
    if (!ensureCompiled()) return;
    let guard = 0;
    while (guard < 250 && stepTape()) {
        guard += 1;
    }
    if (guard >= 250) {
        state.log.push({ type: "error", html: "Abbruch: Mehr als 250 Takte. Der Streifen ist fuer dieses Labor zu lang." });
        setCompileStatus("Abbruch", "error");
        renderAll();
    }
}

function referencedMemoryIndexes() {
    const indexes = new Set();
    state.initialMemory.forEach((value, index) => {
        if (value !== 0) indexes.add(index);
    });
    if (state.compiled) {
        state.compiled.instructions.forEach((instruction) => {
            if (Number.isInteger(instruction.dest)) indexes.add(instruction.dest);
            (instruction.args || []).forEach((operand) => {
                if (operand.kind === "memory") indexes.add(operand.index);
            });
        });
    }
    state.memory.forEach((value, index) => {
        if (value !== 0) indexes.add(index);
    });
    state.readSet.forEach((index) => indexes.add(index));
    if (Number.isInteger(state.writeIndex)) indexes.add(state.writeIndex);
    if (!indexes.size) {
        indexes.add(0);
        indexes.add(1);
        indexes.add(2);
    }
    return indexes;
}

function renderMemory() {
    const relevant = referencedMemoryIndexes();
    memoryWall.innerHTML = state.memory.map((value, index) => {
        const classes = ["memory-cell"];
        if (state.readSet.has(index)) classes.push("read");
        if (state.writeIndex === index) classes.push("write");
        if (relevant.has(index)) classes.push("relevant");
        return `
            <article class="${classes.join(" ")}" data-memory="M${index}">
                <span>M${index}</span>
                <strong>${formatNumber(value)}</strong>
            </article>
        `;
    }).join("");
}

function renderTape() {
    if (!state.compiled) {
        instructionTape.innerHTML = "<li>Noch kein Streifen gelesen.</li>";
        return;
    }

    instructionTape.innerHTML = state.compiled.instructions.map((instruction, index) => {
        const classes = [];
        if (index === state.pc) classes.push("active");
        if (index < state.pc) classes.push("visited");
        return `
            <li class="${classes.join(" ")}">
                <strong>${String(index).padStart(3, "0")} - ${escapeHtml(instruction.op)}</strong>
                <span>${escapeHtml(instruction.text)}</span>
            </li>
        `;
    }).join("");
}

function renderRegisters() {
    registerR1.textContent = state.r1 ? `${formatNumber(state.r1.value)}  [${state.r1.label}]` : "leer";
    registerR2.textContent = state.r2 ? `${formatNumber(state.r2.value)}  [${state.r2.label}]` : "leer";
    r1Card.classList.toggle("active", state.activeRegister === "R1");
    r2Card.classList.toggle("active", state.activeRegister === "R2");
    operationLabel.textContent = state.operation.label;
    operationHint.textContent = state.operation.hint;
}

function renderOutput() {
    machineOutput.textContent = state.output.length ? state.output.join("\n") : "Noch keine Ausgabe.";
}

function renderLog() {
    executionLog.innerHTML = state.log.length
        ? state.log.map((entry) => `<li${entry.type === "error" ? " class=\"error\"" : ""}>${entry.html}</li>`).join("")
        : "<li>Warte auf den ersten Takt.</li>";
    executionLog.scrollTop = executionLog.scrollHeight;
}

function renderStatuses() {
    const total = state.compiled ? state.compiled.instructions.length : 0;
    cycleStatus.textContent = `Takt ${state.cycle}`;
    cycleStatus.className = `status-pill ${state.cycle ? "ok" : ""}`.trim();
    pcStatus.textContent = `PC ${state.pc}/${total}`;
    pcStatus.className = `status-pill ${total && state.pc >= total ? "ok" : ""}`.trim();
}

function renderAll() {
    renderMemory();
    renderTape();
    renderRegisters();
    renderOutput();
    renderLog();
    renderStatuses();
}

function loadSample() {
    sourceEditor.value = EXAMPLES[sampleSelect.value] || EXAMPLES.pythagoras;
    compileTape();
}

sampleBtn.addEventListener("click", loadSample);
compileBtn.addEventListener("click", compileTape);
stepBtn.addEventListener("click", stepTape);
runBtn.addEventListener("click", runTape);
resetBtn.addEventListener("click", () => {
    resetRuntimeOnly();
    setCompileStatus(state.compiled ? "zurueckgesetzt" : "bereit", state.compiled ? "ok" : "");
});

sourceEditor.value = EXAMPLES.pythagoras;
compileTape();
