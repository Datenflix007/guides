const SAMPLE_DECKS = {
    flight: `# ENIAC-Stil: Patch-Deck fuer eine kleine Flugbahn-Tabelle
# A0 = Hoehe, A1 = Geschwindigkeit, G = Gravitation pro Schritt
CONST G = -10
CONST START_V = 60

SET A0 = 0
SET A1 = START_V

REPEAT 5
  ADD A0 A1 -> A0
  ADD A1 G -> A1
  PRINT A0
END`,
    ballisticTable: `# Komplexere Aufgabe: ballistische Tabelle ohne Luftwiderstand
# Pro Zeitschritt werden t, Hoehe und Geschwindigkeit gedruckt.
# A0 = t, A1 = Hoehe, A2 = Geschwindigkeit
CONST G = -10
CONST ONE = 1
CONST START_V = 80

SET A0 = 0
SET A1 = 0
SET A2 = START_V

REPEAT 6
  ADD A0 ONE -> A0
  ADD A1 A2 -> A1
  ADD A2 G -> A2
  PRINT A0
  PRINT A1
  PRINT A2
END`,
    range: `# Komplexere Aufgabe: grobe Wurfweite
# RANGE = V^2 * SIN_2_ALPHA / 100 / G
CONST V = 90
CONST SIN_2_ALPHA = 87
CONST HUNDRED = 100
CONST G = 10

SET A0 = V
MUL A0 A0 -> A1
MUL A1 SIN_2_ALPHA -> A2
DIV A2 HUNDRED -> A3
DIV A3 G -> A4
PRINT A4`,
    drag: `# Komplexere Aufgabe: Abbremsung mit einfachem Widerstand
# A0 = Geschwindigkeit, A1 = zurueckgelegte Strecke, DRAG wird pro Schritt abgezogen.
CONST START_V = 120
CONST DRAG = -7

SET A0 = START_V
SET A1 = 0

REPEAT 5
  ADD A1 A0 -> A1
  ADD A0 DRAG -> A0
  PRINT A1
  PRINT A0
END`
};

const state = {
    compiled: null,
    constants: {},
    initialAcc: Array(20).fill(0),
    acc: Array(20).fill(0),
    pc: 0,
    cycle: 0,
    log: [],
    output: [],
    active: new Set(),
    sourceSnapshot: ""
};

const sourceEditor = document.getElementById("sourceEditor");
const sampleSelect = document.getElementById("sampleSelect");
const sampleBtn = document.getElementById("sampleBtn");
const compileBtn = document.getElementById("compileBtn");
const stepBtn = document.getElementById("stepBtn");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const accumulatorWall = document.getElementById("accumulatorWall");
const compiledDeck = document.getElementById("compiledDeck");
const compileStatus = document.getElementById("compileStatus");
const constantTable = document.getElementById("constantTable");
const pulseLog = document.getElementById("pulseLog");
const cardOutput = document.getElementById("cardOutput");
const cycleStatus = document.getElementById("cycleStatus");
const pcStatus = document.getElementById("pcStatus");

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
    return /^[-+]?\d+(?:\.\d+)?$/.test(String(value).trim());
}

function parseNumber(value, lineNumber) {
    if (!isNumberToken(value)) throw new Error(`Zeile ${lineNumber}: Zahl erwartet, erhalten: ${value}`);
    return normalizeDecimal(Number(value));
}

function normalizeDecimal(value) {
    if (!Number.isFinite(value)) throw new Error("Nicht endlicher Zahlenwert.");
    return Math.trunc(value);
}

function formatValue(value) {
    const number = normalizeDecimal(value || 0);
    const sign = number < 0 ? "-" : "+";
    return sign + String(Math.abs(number) % 10000000000).padStart(10, "0");
}

function setStatus(text, mode = "") {
    compileStatus.textContent = text;
    compileStatus.className = `status-pill ${mode}`.trim();
}

function setMetaStatus() {
    const total = state.compiled ? state.compiled.instructions.length : 0;
    pcStatus.textContent = `PC ${state.pc}/${total}`;
    pcStatus.className = `status-pill ${state.pc >= total && total ? "ok" : ""}`.trim();
    cycleStatus.textContent = `Zyklus ${state.cycle}`;
}

function parseAccumulator(token, lineNumber) {
    const match = normalizeName(token).match(/^A([0-9]|1[0-9])$/);
    if (!match) throw new Error(`Zeile ${lineNumber}: Akkumulator A0 bis A19 erwartet, erhalten: ${token}`);
    return Number(match[1]);
}

function valueOf(token, constants, acc, lineNumber) {
    const normalized = normalizeName(token);
    if (isNumberToken(normalized)) return parseNumber(normalized, lineNumber);
    if (/^A([0-9]|1[0-9])$/.test(normalized)) return acc[parseAccumulator(normalized, lineNumber)] || 0;
    if (Object.prototype.hasOwnProperty.call(constants, normalized)) return constants[normalized];
    throw new Error(`Zeile ${lineNumber}: Unbekannte Quelle ${token}.`);
}

function parseSet(line, lineNumber) {
    const match = line.match(/^SET\s+(A(?:[0-9]|1[0-9]))\s*=\s*([A-Za-z0-9_+.-]+)$/i);
    if (!match) throw new Error(`Zeile ${lineNumber}: SET-Syntax erwartet, z.B. SET A0 = 120.`);
    return {
        op: "SET",
        dest: parseAccumulator(match[1], lineNumber),
        args: [normalizeName(match[2])],
        lineNumber,
        label: `SET ${normalizeName(match[1])} = ${normalizeName(match[2])}`
    };
}

function parseClear(line, lineNumber) {
    const match = line.match(/^CLEAR\s+(A(?:[0-9]|1[0-9]))$/i);
    if (!match) throw new Error(`Zeile ${lineNumber}: CLEAR-Syntax erwartet, z.B. CLEAR A4.`);
    return {
        op: "CLEAR",
        dest: parseAccumulator(match[1], lineNumber),
        args: [],
        lineNumber,
        label: `CLEAR ${normalizeName(match[1])}`
    };
}

function parseTransfer(line, lineNumber) {
    const match = line.match(/^TRANSFER\s+(A(?:[0-9]|1[0-9]))\s*->\s*(A(?:[0-9]|1[0-9]))$/i);
    if (!match) throw new Error(`Zeile ${lineNumber}: TRANSFER-Syntax erwartet, z.B. TRANSFER A1 -> A2.`);
    return {
        op: "TRANSFER",
        src: parseAccumulator(match[1], lineNumber),
        dest: parseAccumulator(match[2], lineNumber),
        args: [],
        lineNumber,
        label: `TRANSFER ${normalizeName(match[1])} -> ${normalizeName(match[2])}`
    };
}

function parseMath(line, lineNumber) {
    const match = line.match(/^(ADD|SUB|MUL|DIV)\s+([A-Za-z0-9_+.-]+)\s+([A-Za-z0-9_+.-]+)\s*->\s*(A(?:[0-9]|1[0-9]))$/i);
    if (!match) throw new Error(`Zeile ${lineNumber}: Rechensyntax erwartet, z.B. ADD A0 A1 -> A2.`);
    return {
        op: normalizeName(match[1]),
        args: [normalizeName(match[2]), normalizeName(match[3])],
        dest: parseAccumulator(match[4], lineNumber),
        lineNumber,
        label: `${normalizeName(match[1])} ${normalizeName(match[2])} ${normalizeName(match[3])} -> ${normalizeName(match[4])}`
    };
}

function parseSqrt(line, lineNumber) {
    const match = line.match(/^SQRT\s+([A-Za-z0-9_+.-]+)\s*->\s*(A(?:[0-9]|1[0-9]))$/i);
    if (!match) throw new Error(`Zeile ${lineNumber}: SQRT-Syntax erwartet, z.B. SQRT A2 -> A3.`);
    return {
        op: "SQRT",
        args: [normalizeName(match[1])],
        dest: parseAccumulator(match[2], lineNumber),
        lineNumber,
        label: `SQRT ${normalizeName(match[1])} -> ${normalizeName(match[2])}`
    };
}

function parsePrint(line, lineNumber) {
    const match = line.match(/^PRINT\s+(A(?:[0-9]|1[0-9]))$/i);
    if (!match) throw new Error(`Zeile ${lineNumber}: PRINT-Syntax erwartet, z.B. PRINT A0.`);
    return {
        op: "PRINT",
        src: parseAccumulator(match[1], lineNumber),
        args: [],
        lineNumber,
        label: `PRINT ${normalizeName(match[1])}`
    };
}

function parseInstruction(line, lineNumber) {
    if (/^SET\b/i.test(line)) return parseSet(line, lineNumber);
    if (/^CLEAR\b/i.test(line)) return parseClear(line, lineNumber);
    if (/^TRANSFER\b/i.test(line)) return parseTransfer(line, lineNumber);
    if (/^(ADD|SUB|MUL|DIV)\b/i.test(line)) return parseMath(line, lineNumber);
    if (/^SQRT\b/i.test(line)) return parseSqrt(line, lineNumber);
    if (/^PRINT\b/i.test(line)) return parsePrint(line, lineNumber);
    throw new Error(`Zeile ${lineNumber}: Unbekannte ENIAC-Anweisung.`);
}

function cleanLines(source) {
    return source.split(/\r?\n/)
        .map((raw, index) => ({ text: raw.replace(/#.*/, "").trim(), lineNumber: index + 1 }))
        .filter((line) => line.text);
}

function unrollBlock(lines, startIndex = 0, stopAtEnd = false) {
    const output = [];
    let index = startIndex;
    while (index < lines.length) {
        const current = lines[index];
        if (/^END$/i.test(current.text)) {
            if (!stopAtEnd) throw new Error(`Zeile ${current.lineNumber}: END ohne REPEAT.`);
            return { output, nextIndex: index + 1 };
        }

        const repeat = current.text.match(/^REPEAT\s+([A-Za-z0-9_+.-]+)$/i);
        if (repeat) {
            const count = parseNumber(repeat[1], current.lineNumber);
            if (count < 0 || count > 200) throw new Error(`Zeile ${current.lineNumber}: REPEAT muss zwischen 0 und 200 liegen.`);
            const nested = unrollBlock(lines, index + 1, true);
            for (let i = 0; i < count; i += 1) {
                output.push(...nested.output.map((line) => ({ ...line, repeatIndex: i + 1, repeatCount: count })));
            }
            index = nested.nextIndex;
            continue;
        }

        output.push(current);
        index += 1;
    }
    if (stopAtEnd) throw new Error("REPEAT-Block ohne END.");
    return { output, nextIndex: index };
}

function compileDeck() {
    const errors = [];
    const constants = {};
    const initialAcc = Array(20).fill(0);
    let expanded = [];

    try {
        expanded = unrollBlock(cleanLines(sourceEditor.value)).output;
    } catch (error) {
        errors.push(error.message);
    }

    const instructions = [];
    if (!errors.length) {
        for (const line of expanded) {
            try {
                const constMatch = line.text.match(/^CONST\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([-+]?\d+(?:\.\d+)?)$/i);
                if (constMatch) {
                    constants[normalizeName(constMatch[1])] = parseNumber(constMatch[2], line.lineNumber);
                    continue;
                }

                const instruction = parseInstruction(line.text, line.lineNumber);
                if (line.repeatCount) {
                    instruction.label += `   [Wdh. ${line.repeatIndex}/${line.repeatCount}]`;
                }
                instructions.push(instruction);
            } catch (error) {
                errors.push(error.message);
            }
        }
    }

    if (!instructions.length && !errors.length) errors.push("Keine ausführbaren ENIAC-Schritte gefunden.");

    if (!errors.length) {
        try {
            const scratchAcc = [...initialAcc];
            for (const instruction of instructions) {
                if (instruction.op === "SET") {
                    scratchAcc[instruction.dest] = valueOf(instruction.args[0], constants, scratchAcc, instruction.lineNumber);
                    initialAcc[instruction.dest] = scratchAcc[instruction.dest];
                }
            }
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (errors.length) {
        state.compiled = null;
        state.constants = {};
        state.initialAcc = Array(20).fill(0);
        state.acc = Array(20).fill(0);
        state.pc = 0;
        state.cycle = 0;
        state.active = new Set();
        state.log = errors.map((message) => ({ type: "error", html: `<span class="error">${escapeHtml(message)}</span>` }));
        state.output = [];
        renderAll();
        setStatus("Fehler", "bad");
        return false;
    }

    state.compiled = { instructions };
    state.constants = constants;
    state.initialAcc = [...initialAcc];
    state.acc = [...initialAcc];
    state.pc = 0;
    state.cycle = 0;
    state.active = new Set();
    state.output = [];
    state.log = [{ html: `<strong>Patch gesteckt:</strong> ${instructions.length} Impulsschritt(e), ${Object.keys(constants).length} Konstanten.` }];
    state.sourceSnapshot = sourceEditor.value;
    renderAll();
    setStatus("gesteckt", "ok");
    return true;
}

function ensureCompiled() {
    if (!state.compiled || state.sourceSnapshot !== sourceEditor.value) return compileDeck();
    return true;
}

function executeInstruction(instruction) {
    const touched = new Set();
    let result = null;
    let signal = "";

    const read = (token) => {
        const normalized = normalizeName(token);
        if (/^A([0-9]|1[0-9])$/.test(normalized)) touched.add(parseAccumulator(normalized, instruction.lineNumber));
        return valueOf(normalized, state.constants, state.acc, instruction.lineNumber);
    };

    if (instruction.op === "SET") {
        result = read(instruction.args[0]);
        state.acc[instruction.dest] = result;
        touched.add(instruction.dest);
        signal = `Konstantensender -> A${instruction.dest}`;
    } else if (instruction.op === "CLEAR") {
        state.acc[instruction.dest] = 0;
        touched.add(instruction.dest);
        signal = `Löschimpuls -> A${instruction.dest}`;
    } else if (instruction.op === "TRANSFER") {
        result = state.acc[instruction.src];
        state.acc[instruction.dest] = result;
        touched.add(instruction.src);
        touched.add(instruction.dest);
        signal = `A${instruction.src} -> A${instruction.dest}`;
    } else if (["ADD", "SUB", "MUL", "DIV"].includes(instruction.op)) {
        const a = read(instruction.args[0]);
        const b = read(instruction.args[1]);
        if (instruction.op === "ADD") result = a + b;
        if (instruction.op === "SUB") result = a - b;
        if (instruction.op === "MUL") result = a * b;
        if (instruction.op === "DIV") {
            if (b === 0) throw new Error("Division durch 0.");
            result = Math.trunc(a / b);
        }
        state.acc[instruction.dest] = normalizeDecimal(result);
        touched.add(instruction.dest);
        signal = `${instruction.op}: ${instruction.args.join(" / ")} -> A${instruction.dest}`;
    } else if (instruction.op === "SQRT") {
        const a = read(instruction.args[0]);
        if (a < 0) throw new Error("Quadratwurzel aus negativem Wert.");
        result = Math.trunc(Math.sqrt(a));
        state.acc[instruction.dest] = result;
        touched.add(instruction.dest);
        signal = `Divider/Square-Rooter -> A${instruction.dest}`;
    } else if (instruction.op === "PRINT") {
        result = state.acc[instruction.src];
        touched.add(instruction.src);
        state.output.push(`CARD ${String(state.output.length + 1).padStart(2, "0")}  A${instruction.src} ${formatValue(result)}`);
        signal = `A${instruction.src} -> Printer/Card Punch`;
    }

    state.active = touched;
    state.cycle += 1;
    state.log.push({
        html: `<strong>${escapeHtml(instruction.op)}</strong> ${escapeHtml(signal)} · ${instruction.op === "PRINT" ? "Ausgabe" : "Wert"} ${formatValue(result)}`
    });
}

function stepDeck() {
    if (!ensureCompiled()) return false;
    const instructions = state.compiled.instructions;
    if (state.pc >= instructions.length) {
        state.log.push({ html: "<strong>Programm beendet.</strong>" });
        renderAll();
        setStatus("fertig", "ok");
        return false;
    }

    try {
        executeInstruction(instructions[state.pc]);
        state.pc += 1;
        renderAll();
        if (state.pc >= instructions.length) setStatus("fertig", "ok");
        else setStatus("läuft", "");
        return true;
    } catch (error) {
        state.log.push({
            type: "error",
            html: `<span class="error">Zeile ${instructions[state.pc].lineNumber}: ${escapeHtml(error.message)}</span>`
        });
        state.pc = instructions.length;
        renderAll();
        setStatus("Laufzeitfehler", "bad");
        return false;
    }
}

function runDeck() {
    if (!ensureCompiled()) return;
    let guard = 0;
    while (guard < 1000 && stepDeck()) guard += 1;
}

function resetDeck() {
    state.acc = state.compiled ? [...state.initialAcc] : Array(20).fill(0);
    state.pc = 0;
    state.cycle = 0;
    state.active = new Set();
    state.output = [];
    state.log = state.compiled ? [{ html: "<strong>Zurückgesetzt:</strong> Patch bleibt gesteckt, Akkumulatoren stehen auf Startwerten." }] : [];
    renderAll();
    setStatus(state.compiled ? "zurückgesetzt" : "bereit", state.compiled ? "ok" : "");
}

function referencedAccumulatorIndexes() {
    const indexes = new Set();
    if (state.compiled) {
        state.compiled.instructions.forEach((instruction) => {
            if (Number.isInteger(instruction.dest)) indexes.add(instruction.dest);
            if (Number.isInteger(instruction.src)) indexes.add(instruction.src);
            (instruction.args || []).forEach((token) => {
                const match = normalizeName(token).match(/^A([0-9]|1[0-9])$/);
                if (match) indexes.add(Number(match[1]));
            });
        });
    }
    state.acc.forEach((value, index) => {
        if (value !== 0 || state.active.has(index)) indexes.add(index);
    });
    if (!indexes.size) {
        indexes.add(0);
        indexes.add(1);
    }
    return indexes;
}

function renderAccumulators() {
    const relevant = referencedAccumulatorIndexes();
    accumulatorWall.innerHTML = state.acc.map((value, index) => {
        const display = formatValue(value);
        const classes = ["accumulator"];
        if (state.active.has(index)) classes.push("active");
        if (relevant.has(index)) classes.push("relevant");
        return `
            <article class="${classes.join(" ")}" data-accumulator="A${index}">
                <strong><span>A${index}</span><span>${state.active.has(index) ? "Impuls" : "bereit"}</span></strong>
                <div class="digits">${display.split("").map((char) => `<span>${escapeHtml(char)}</span>`).join("")}</div>
            </article>
        `;
    }).join("");
}

function renderDeck() {
    if (!state.compiled) {
        compiledDeck.innerHTML = `<li>Noch kein Patch gesteckt.</li>`;
        return;
    }
    compiledDeck.innerHTML = state.compiled.instructions.map((instruction, index) => `
        <li class="${index === state.pc ? "active" : ""}">
            <strong>${String(index + 1).padStart(2, "0")}</strong> ${escapeHtml(instruction.label)}
        </li>
    `).join("");
}

function renderConstants() {
    const entries = Object.entries(state.constants);
    constantTable.innerHTML = entries.length
        ? entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `
            <div class="constant-row"><span>${escapeHtml(key)}</span><span>${formatValue(value)}</span></div>
        `).join("")
        : `<div class="constant-row"><span>leer</span><span>-</span></div>`;

    cardOutput.textContent = state.output.length ? state.output.join("\n") : "Noch keine Karten ausgegeben.";
}

function renderLog() {
    pulseLog.innerHTML = state.log.length
        ? state.log.map((entry) => `<li${entry.type === "error" ? " class=\"error\"" : ""}>${entry.html}</li>`).join("")
        : `<li>Warte auf Impulse.</li>`;
    pulseLog.scrollTop = pulseLog.scrollHeight;
}

function renderAll() {
    renderAccumulators();
    renderDeck();
    renderConstants();
    renderLog();
    setMetaStatus();
}

sampleBtn.addEventListener("click", () => {
    sourceEditor.value = SAMPLE_DECKS[sampleSelect.value] || SAMPLE_DECKS.flight;
    state.compiled = null;
    compileDeck();
});

compileBtn.addEventListener("click", compileDeck);
stepBtn.addEventListener("click", stepDeck);
runBtn.addEventListener("click", runDeck);
resetBtn.addEventListener("click", resetDeck);

sourceEditor.value = SAMPLE_DECKS.flight;
compileDeck();
