const ROUTINES = [
    {
        callNo: "01",
        name: "ADD",
        arity: 2,
        description: "Addition zweier Werte",
        template: "CALL 01 A B -> SUM",
        pseudo: ["LOAD arg1", "ADD arg2", "STORE out"],
        run: ([a, b]) => a + b
    },
    {
        callNo: "02",
        name: "SUB",
        arity: 2,
        description: "Subtraktion arg1 - arg2",
        template: "CALL 02 A B -> DIFF",
        pseudo: ["LOAD arg1", "SUB arg2", "STORE out"],
        run: ([a, b]) => a - b
    },
    {
        callNo: "03",
        name: "MUL",
        arity: 2,
        description: "Multiplikation zweier Werte",
        template: "CALL 03 SUM B -> PRODUCT",
        pseudo: ["LOAD arg1", "MUL arg2", "STORE out"],
        run: ([a, b]) => a * b
    },
    {
        callNo: "04",
        name: "DIV",
        arity: 2,
        description: "Division arg1 / arg2",
        template: "CALL 04 PRODUCT B -> QUOT",
        pseudo: ["LOAD arg1", "DIV arg2", "STORE out"],
        run: ([a, b]) => {
            if (b === 0) throw new Error("Division durch 0");
            return a / b;
        }
    },
    {
        callNo: "05",
        name: "SQRT",
        arity: 1,
        description: "Quadratwurzel",
        template: "CALL 05 PRODUCT -> ROOT",
        pseudo: ["LOAD arg1", "SQRT", "STORE out"],
        run: ([a]) => {
            if (a < 0) throw new Error("Quadratwurzel aus negativem Wert");
            return Math.sqrt(a);
        }
    },
    {
        callNo: "06",
        name: "POW",
        arity: 2,
        description: "Potenz arg1 ^ arg2",
        template: "CALL 06 A B -> POWER",
        pseudo: ["LOAD arg1", "POW arg2", "STORE out"],
        run: ([a, b]) => Math.pow(a, b)
    },
    {
        callNo: "07",
        name: "AVG",
        arity: 2,
        description: "Arithmetisches Mittel",
        template: "CALL 07 SUM ROOT -> SCORE",
        pseudo: ["LOAD arg1", "ADD arg2", "DIV 2", "STORE out"],
        run: ([a, b]) => (a + b) / 2
    },
    {
        callNo: "08",
        name: "PRINT",
        arity: 1,
        description: "Wert ausgeben",
        template: "PRINT SCORE",
        pseudo: ["LOAD arg1", "WRITE console"],
        kind: "print",
        run: ([a]) => a
    }
];

const EXAMPLES = {
    score: `# A-0-Stil: Daten plus Routine-Aufrufe
DATA A = 12
DATA B = 7
DATA C = 3

CALL ADD A B -> SUM
CALL MUL SUM C -> PRODUCT
CALL 05 PRODUCT -> ROOT
CALL AVG SUM ROOT -> SCORE
PRINT SCORE`,
    circle: `# Kreisflaeche: PI * R^2
DATA R = 5
DATA PI = 3.14159

CALL MUL R R -> R2
CALL MUL PI R2 -> AREA
PRINT AREA`,
    growth: `# Wachstum: START * FACTOR ^ YEARS
DATA START = 100
DATA FACTOR = 1.08
DATA YEARS = 5

CALL POW FACTOR YEARS -> SCALE
CALL MUL START SCALE -> RESULT
PRINT RESULT`,
    trajectory: `# Komplexere Aufgabe: Wurfweite ohne Luftwiderstand
# Formel: RANGE = V^2 * SIN_2_ALPHA / G
# SIN_2_ALPHA ist hier als Tabellenwert vorbereitet.
DATA V = 120
DATA SIN_2_ALPHA = 0.866
DATA G = 9.81

CALL POW V 2 -> V2
CALL MUL V2 SIN_2_ALPHA -> NUMERATOR
CALL DIV NUMERATOR G -> RANGE
PRINT RANGE`,
    rms: `# Komplexere Aufgabe: Root-Mean-Square aus drei Messwerten
# RMS = sqrt((A^2 + B^2 + C^2) / 3)
DATA A = 12
DATA B = 15
DATA C = 20
DATA N = 3

CALL POW A 2 -> A2
CALL POW B 2 -> B2
CALL POW C 2 -> C2
CALL ADD A2 B2 -> PARTIAL
CALL ADD PARTIAL C2 -> SUMSQ
CALL DIV SUMSQ N -> MEAN
CALL SQRT MEAN -> RMS
PRINT RMS`,
    standardize: `# Komplexere Aufgabe: Messwert normalisieren
# Z = (X - MEAN) / STDDEV
DATA X = 87
DATA MEAN = 73
DATA STDDEV = 8

CALL SUB X MEAN -> DELTA
CALL DIV DELTA STDDEV -> Z
PRINT Z`
};

const routineByToken = new Map();
for (const routine of ROUTINES) {
    routineByToken.set(routine.callNo, routine);
    routineByToken.set(routine.name, routine);
}

const state = {
    compiled: null,
    memory: {},
    pc: 0,
    log: [],
    sourceSnapshot: "",
    output: [],
    lastRead: [],
    lastWrite: "",
    lastRoutine: ""
};

const editor = document.getElementById("sourceEditor");
const sampleSelect = document.getElementById("sampleSelect");
const sampleBtn = document.getElementById("sampleBtn");
const compileBtn = document.getElementById("compileBtn");
const stepBtn = document.getElementById("stepBtn");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const routineLibrary = document.getElementById("routineLibrary");
const objectTape = document.getElementById("objectTape");
const compilerSummary = document.getElementById("compilerSummary");
const symbolTable = document.getElementById("symbolTable");
const executionLog = document.getElementById("executionLog");
const compileStatus = document.getElementById("compileStatus");
const pcStatus = document.getElementById("pcStatus");
const nextCall = document.getElementById("nextCall");
const tapeHint = document.getElementById("tapeHint");
const printOutput = document.getElementById("printOutput");
const flowSource = document.getElementById("flowSource");
const flowCompile = document.getElementById("flowCompile");
const flowRun = document.getElementById("flowRun");
const flowHint = document.getElementById("flowHint");

function normalizeName(value) {
    return String(value || "").trim().toUpperCase();
}

function isNumberToken(value) {
    return /^[-+]?\d+(?:\.\d+)?$/.test(String(value).trim());
}

function formatNumber(value) {
    if (value === null || value === undefined) return "noch offen";
    if (!Number.isFinite(value)) return String(value);
    const fixed = Math.abs(value) >= 1000 ? value.toFixed(2) : value.toFixed(5);
    return fixed.replace(/\.?0+$/, "");
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function padAddress(value) {
    return String(value).padStart(4, "0");
}

function setStatus(text, mode = "") {
    compileStatus.textContent = text;
    compileStatus.className = `status-pill ${mode}`.trim();
}

function setPcStatus() {
    const total = state.compiled ? state.compiled.calls.length : 0;
    pcStatus.textContent = `PC ${state.pc}/${total}`;
    pcStatus.className = `status-pill ${state.pc >= total && total ? "ok" : ""}`.trim();
}

function renderRoutineLibrary() {
    routineLibrary.innerHTML = ROUTINES.map((routine) => `
        <article class="routine-card ${state.lastRoutine === routine.name ? "active" : ""}">
            <strong>${routine.callNo} ${routine.name}</strong>
            <span>${routine.description}</span>
            <button type="button" data-template="${encodeURIComponent(routine.template)}">${routine.template}</button>
        </article>
    `).join("");

    routineLibrary.querySelectorAll("button[data-template]").forEach((button) => {
        button.addEventListener("click", () => {
            insertAtCursor(`${decodeURIComponent(button.dataset.template)}\n`);
        });
    });
}

function insertAtCursor(text) {
    const start = editor.selectionStart ?? editor.value.length;
    const end = editor.selectionEnd ?? editor.value.length;
    editor.value = `${editor.value.slice(0, start)}${text}${editor.value.slice(end)}`;
    editor.focus();
    const next = start + text.length;
    editor.setSelectionRange(next, next);
}

function renderTape() {
    if (!state.compiled) {
        objectTape.textContent = "Noch kein Objektband kompiliert.\n\nKompilieren erzeugt hier DATA- und LINK-Zeilen.";
        tapeHint.textContent = "DATA-Zeilen legen Werte an. LINK-Zeilen zeigen, welche Routine aus dem Routinenband eingebunden wird.";
        renderCompilerSummary();
        return;
    }
    objectTape.textContent = state.compiled.tape.map((item) => item.text).join("\n");
    const current = state.compiled.calls[state.pc];
    tapeHint.textContent = current
        ? `Naechster LINK: ${current.routine.callNo} ${current.routine.name} mit ${current.args.join(", ")}${current.dest ? ` -> ${current.dest}` : ""}.`
        : "Alle verlinkten Routinen wurden abgearbeitet.";
    renderCompilerSummary();
}

function renderCompilerSummary() {
    if (!compilerSummary) return;
    if (!state.compiled) {
        const errorText = state.log.find((entry) => entry.type === "error")?.html.replace(/<[^>]+>/g, "") || "Kompiliere das Beispiel, um Routine-Links zu sehen.";
        compilerSummary.innerHTML = `
            <div class="summary-message">
                <strong>Noch kein Objektband</strong>
                <span>${escapeHtml(errorText)}</span>
            </div>
        `;
        return;
    }

    const calls = state.compiled.calls;
    const current = calls[state.pc];
    const routineNames = [...new Set(calls.map((call) => call.routine.name))].join(", ");
    const latestChange = state.lastWrite
        ? `${state.lastWrite} = ${formatNumber(state.memory[state.lastWrite])}`
        : "noch keine Routine ausgefuehrt";
    const output = state.output.at(-1) || "noch keine Ausgabe";
    const next = current
        ? `${current.routine.callNo} ${current.routine.name}: ${current.args.join(", ")}${current.dest ? ` -> ${current.dest}` : ""}`
        : "Programm beendet";

    compilerSummary.innerHTML = `
        <div class="summary-progress" aria-label="Compiler-Fortschritt">
            <span class="done">Quelle gelesen</span>
            <span class="done">Objektband gebaut</span>
            <span class="${state.pc >= calls.length ? "done" : "active"}">${state.pc}/${calls.length} Links ausgefuehrt</span>
        </div>
        <div class="summary-grid">
            <article>
                <span>Bibliothek</span>
                <strong>${calls.length} Aufrufe</strong>
                <small>${escapeHtml(routineNames)}</small>
            </article>
            <article>
                <span>Naechster Link</span>
                <strong>${escapeHtml(next)}</strong>
                <small>Ein Klick auf Schritt fuehrt genau diese Routine aus.</small>
            </article>
            <article>
                <span>Letzte Aenderung</span>
                <strong>${escapeHtml(latestChange)}</strong>
                <small>${escapeHtml(output)}</small>
            </article>
        </div>
    `;
}

function renderSymbols() {
    const entries = Object.entries(state.memory);
    if (!entries.length) {
        symbolTable.innerHTML = `<div class="symbol-row"><span>leer</span><span>-</span></div>`;
        return;
    }
    symbolTable.innerHTML = entries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => {
            const classes = ["symbol-row"];
            if (state.lastRead.includes(name)) classes.push("read");
            if (state.lastWrite === name) classes.push("write");
            return `<div class="${classes.join(" ")}"><span>${name}</span><span>${formatNumber(value)}</span></div>`;
        })
        .join("");
}

function renderLog() {
    if (!state.log.length) {
        executionLog.innerHTML = `<li>Warte auf Ausführung.</li>`;
        setPcStatus();
        renderPrinter();
        renderNextCall();
        renderFlow();
        renderRoutineLibrary();
        return;
    }
    executionLog.innerHTML = state.log.map((entry) => {
        const cls = entry.type === "error" ? " class=\"error\"" : "";
        return `<li${cls}>${entry.html}</li>`;
    }).join("");
    executionLog.scrollTop = executionLog.scrollHeight;
    setPcStatus();
    renderPrinter();
    renderNextCall();
    renderFlow();
    renderRoutineLibrary();
}

function renderPrinter() {
    printOutput.textContent = state.output.length ? state.output.join("\n") : "Noch keine Ausgabe.";
}

function renderNextCall() {
    if (!state.compiled) {
        nextCall.textContent = "Naechster Aufruf: nach dem Kompilieren sichtbar";
        return;
    }
    const call = state.compiled.calls[state.pc];
    if (!call) {
        nextCall.textContent = "Naechster Aufruf: Programm beendet";
        return;
    }
    nextCall.textContent = `Naechster Aufruf: ${call.routine.callNo} ${call.routine.name} (${call.args.join(", ")}${call.dest ? ` -> ${call.dest}` : ""})`;
}

function renderFlow() {
    flowSource.className = "flow-step done";
    flowCompile.className = "flow-step";
    flowRun.className = "flow-step";

    if (!state.compiled) {
        flowSource.className = "flow-step active";
        flowHint.textContent = "Quelle bearbeiten oder Beispiel laden. Danach erzeugt Kompilieren das Objektband.";
        return;
    }

    flowCompile.className = "flow-step done";
    if (state.pc === 0 && !state.output.length && state.log.length <= 1) {
        flowCompile.className = "flow-step active";
        flowHint.textContent = "Das Objektband ist bereit. Schritt fuehrt genau einen Routine-Link aus.";
        return;
    }

    flowRun.className = state.pc >= state.compiled.calls.length ? "flow-step done active" : "flow-step active";
    flowHint.textContent = state.pc >= state.compiled.calls.length
        ? "Die Ausfuehrung ist abgeschlossen. Ausgabe und Symboltabelle zeigen das Ergebnis."
        : "Die Ausfuehrung laeuft. Markierte Symbole wurden gelesen oder neu geschrieben.";
}

function resolveRoutine(token, lineNumber) {
    const routine = routineByToken.get(normalizeName(token));
    if (!routine) throw new Error(`Zeile ${lineNumber}: Unbekannte Routine "${token}".`);
    return routine;
}

function parseDataLine(line, lineNumber) {
    const match = line.match(/^(?:DATA|LET)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([-+]?\d+(?:\.\d+)?)$/i);
    if (!match) throw new Error(`Zeile ${lineNumber}: DATA-Syntax erwartet, z.B. DATA A = 12.`);
    return {
        name: normalizeName(match[1]),
        value: Number(match[2])
    };
}

function parseCallLine(line, lineNumber) {
    let normalizedLine = line.trim();
    if (/^PRINT\b/i.test(normalizedLine)) {
        normalizedLine = `CALL PRINT ${normalizedLine.replace(/^PRINT\s*/i, "")}`;
    }
    if (!/^CALL\b/i.test(normalizedLine)) {
        throw new Error(`Zeile ${lineNumber}: CALL-Syntax erwartet, z.B. CALL ADD A B -> SUM.`);
    }

    const body = normalizedLine.replace(/^CALL\s+/i, "");
    const parts = body.split(/\s*->\s*/);
    if (parts.length > 2) {
        throw new Error(`Zeile ${lineNumber}: Nur ein -> Ziel ist erlaubt.`);
    }

    const tokens = parts[0].trim().split(/[\s,]+/).filter(Boolean);
    if (!tokens.length) throw new Error(`Zeile ${lineNumber}: Routine fehlt.`);

    const routine = resolveRoutine(tokens.shift(), lineNumber);
    const args = tokens.map(normalizeName);
    const dest = parts[1] ? normalizeName(parts[1]) : null;

    if (args.length !== routine.arity) {
        throw new Error(`Zeile ${lineNumber}: ${routine.name} erwartet ${routine.arity} Argument(e), erhalten: ${args.length}.`);
    }
    if (routine.kind !== "print" && !dest) {
        throw new Error(`Zeile ${lineNumber}: ${routine.name} braucht ein Ziel mit -> NAME.`);
    }
    if (routine.kind === "print" && dest) {
        throw new Error(`Zeile ${lineNumber}: PRINT schreibt direkt ins Log und nutzt kein -> Ziel.`);
    }

    return {
        lineNumber,
        routine,
        args,
        dest
    };
}

function compileSource() {
    const lines = editor.value.split(/\r?\n/);
    const memory = {};
    const calls = [];
    const tape = [];
    const errors = [];
    let address = 1000;

    lines.forEach((rawLine, index) => {
        const lineNumber = index + 1;
        const line = rawLine.replace(/#.*/, "").trim();
        if (!line) return;

        try {
            if (/^(DATA|LET)\b/i.test(line)) {
                const data = parseDataLine(line, lineNumber);
                if (Object.prototype.hasOwnProperty.call(memory, data.name)) {
                    throw new Error(`Zeile ${lineNumber}: Symbol ${data.name} ist bereits belegt.`);
                }
                memory[data.name] = data.value;
                tape.push({ text: `${padAddress(address++)} DATA ${data.name.padEnd(8)} ${formatNumber(data.value)}` });
                return;
            }

            const call = parseCallLine(line, lineNumber);
            for (const arg of call.args) {
                if (!isNumberToken(arg) && !Object.prototype.hasOwnProperty.call(memory, arg)) {
                    throw new Error(`Zeile ${lineNumber}: Symbol ${arg} ist vor dem Aufruf nicht definiert.`);
                }
            }

            const callAddress = address++;
            tape.push({ text: `${padAddress(callAddress)} LINK ${call.routine.callNo} ${call.routine.name.padEnd(5)} ${call.args.join(", ")}${call.dest ? ` -> ${call.dest}` : ""}` });
            call.routine.pseudo.forEach((pseudo) => {
                tape.push({ text: `${padAddress(address++)}      ${pseudo}` });
            });

            calls.push(call);
            if (call.dest) memory[call.dest] = null;
        } catch (error) {
            errors.push(error.message);
        }
    });

    if (!calls.length && !errors.length) {
        errors.push("Keine ausführbaren CALL- oder PRINT-Anweisungen gefunden.");
    }

    if (errors.length) {
        state.compiled = null;
        state.memory = {};
        state.pc = 0;
        state.output = [];
        state.lastRead = [];
        state.lastWrite = "";
        state.lastRoutine = "";
        state.log = errors.map((message) => ({ type: "error", html: `<span class="error">${message}</span>` }));
        objectTape.textContent = errors.join("\n");
        renderCompilerSummary();
        renderSymbols();
        renderLog();
        setStatus("Fehler", "bad");
        return false;
    }

    state.compiled = {
        calls,
        tape,
        initialMemory: { ...memory }
    };
    state.memory = { ...memory };
    state.pc = 0;
    state.output = [];
    state.lastRead = [];
    state.lastWrite = "";
    state.lastRoutine = "";
    state.log = [{ html: `<strong>Kompiliert:</strong> ${calls.length} Routine-Aufruf(e), ${tape.length} Objektband-Zeilen.` }];
    state.sourceSnapshot = editor.value;
    renderTape();
    renderSymbols();
    renderLog();
    setStatus("kompiliert", "ok");
    return true;
}

function ensureCompiled() {
    if (!state.compiled || state.sourceSnapshot !== editor.value) {
        return compileSource();
    }
    return true;
}

function valueOfArg(arg) {
    if (isNumberToken(arg)) return Number(arg);
    const value = state.memory[arg];
    if (value === null || value === undefined) {
        throw new Error(`Symbol ${arg} hat noch keinen Wert.`);
    }
    return value;
}

function stepProgram() {
    if (!ensureCompiled()) return false;
    const calls = state.compiled.calls;
    if (state.pc >= calls.length) {
        state.log.push({ html: "<strong>Programm beendet.</strong>" });
        renderLog();
        setStatus("fertig", "ok");
        return false;
    }

    const call = calls[state.pc];
    try {
        const values = call.args.map(valueOfArg);
        const result = call.routine.run(values);
        const argsLabel = call.args.map((arg, index) => `${arg}=${formatNumber(values[index])}`).join(", ");
        state.lastRead = call.args.filter((arg) => !isNumberToken(arg));
        state.lastWrite = call.dest || "";
        state.lastRoutine = call.routine.name;

        if (call.routine.kind === "print") {
            state.output.push(`${call.args[0]} = ${formatNumber(result)}`);
            state.log.push({
                html: `<strong>${call.routine.name}</strong> ${argsLabel} -> Ausgabe ${formatNumber(result)}`
            });
        } else {
            state.memory[call.dest] = result;
            state.log.push({
                html: `<strong>${call.routine.name}</strong> ${argsLabel} -> ${call.dest}=${formatNumber(result)}`
            });
        }

        state.pc += 1;
        renderSymbols();
        renderTape();
        renderLog();
        if (state.pc >= calls.length) setStatus("fertig", "ok");
        else setStatus("läuft", "");
        return true;
    } catch (error) {
        state.log.push({
            type: "error",
            html: `<span class="error">Zeile ${call.lineNumber}: ${error.message}</span>`
        });
        state.pc = calls.length;
        renderSymbols();
        renderLog();
        setStatus("Laufzeitfehler", "bad");
        return false;
    }
}

function runProgram() {
    if (!ensureCompiled()) return;
    let guard = 0;
    while (guard < 1000 && stepProgram()) {
        guard += 1;
    }
}

function resetProgram() {
    if (state.compiled) {
        state.memory = { ...state.compiled.initialMemory };
    } else {
        state.memory = {};
    }
    state.pc = 0;
    state.output = [];
    state.lastRead = [];
    state.lastWrite = "";
    state.lastRoutine = "";
    state.log = [];
    renderTape();
    renderSymbols();
    renderLog();
    setStatus(state.compiled ? "zurückgesetzt" : "bereit", state.compiled ? "ok" : "");
}

sampleBtn.addEventListener("click", () => {
    editor.value = EXAMPLES[sampleSelect.value] || EXAMPLES.score;
    state.compiled = null;
    compileSource();
});

compileBtn.addEventListener("click", compileSource);
stepBtn.addEventListener("click", stepProgram);
runBtn.addEventListener("click", runProgram);
resetBtn.addEventListener("click", resetProgram);

editor.value = EXAMPLES.score;
renderRoutineLibrary();
compileSource();
