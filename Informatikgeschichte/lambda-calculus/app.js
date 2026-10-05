const EXAMPLES = {
    identity: "(lambda x. x) y",
    constant: "(lambda x. lambda y. x) a b",
    compose: "(lambda f. lambda g. lambda x. f (g x)) (lambda n. n) (lambda z. z)",
    churchTrue: "(lambda t. lambda f. t) yes no",
    churchTwo: "(lambda f. lambda x. f (f x)) succ zero",
    capture: "(lambda x. lambda y. x y) y",
    churchAdd: "(lambda m. lambda n. lambda f. lambda x. m f (n f x)) (lambda f. lambda x. f x) (lambda f. lambda x. f (f x)) s z"
};

const EXERCISES = {
    ex1: {
        term: "(lambda x. x) y",
        solution: "y"
    },
    ex2: {
        term: "(lambda x. lambda y. x) a b",
        solution: "a"
    },
    ex3: {
        term: "(lambda f. lambda x. f x) g z",
        solution: "g z"
    },
    ex4: {
        term: "(lambda f. lambda x. f (f x)) s z",
        solution: "s (s z)"
    },
    ex5: {
        term: "(lambda x. lambda y. x y) y",
        solution: "lambda y_1. y y_1"
    },
    ex6: {
        term: "(lambda b. b yes no) (lambda t. lambda f. f)",
        solution: "no"
    },
    ex7: {
        term: "(lambda f. lambda g. lambda x. f (g x)) h (lambda z. z) a",
        solution: "h a"
    },
    ex8: {
        term: "(lambda m. lambda n. lambda f. lambda x. m f (n f x)) (lambda f. lambda x. f x) (lambda f. lambda x. f (f x)) s z",
        solution: "s (s (s z))"
    }
};

const state = {
    initial: "",
    ast: null,
    history: []
};

const termInput = document.getElementById("termInput");
const exampleSelect = document.getElementById("exampleSelect");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const parseBtn = document.getElementById("parseBtn");
const stepBtn = document.getElementById("stepBtn");
const normalizeBtn = document.getElementById("normalizeBtn");
const resetBtn = document.getElementById("resetBtn");
const statusPill = document.getElementById("statusPill");
const currentTerm = document.getElementById("currentTerm");
const nextRedex = document.getElementById("nextRedex");
const explainBox = document.getElementById("explainBox");
const reductionHistory = document.getElementById("reductionHistory");
const stepCounter = document.getElementById("stepCounter");
const exerciseSelect = document.getElementById("exerciseSelect");
const exerciseTerm = document.getElementById("exerciseTerm");
const answerInput = document.getElementById("answerInput");
const checkAnswerBtn = document.getElementById("checkAnswerBtn");
const loadExerciseBtn = document.getElementById("loadExerciseBtn");
const showSolutionBtn = document.getElementById("showSolutionBtn");
const practiceFeedback = document.getElementById("practiceFeedback");

function setStatus(text, mode = "") {
    statusPill.textContent = text;
    statusPill.className = `status-pill ${mode}`.trim();
}

function tokenize(input) {
    const tokens = [];
    let index = 0;
    while (index < input.length) {
        const char = input[index];
        if (/\s/.test(char)) {
            index += 1;
            continue;
        }
        if (char === "(" || char === ")" || char === "." || char === "\\" || char === "λ") {
            tokens.push(char);
            index += 1;
            continue;
        }
        const word = input.slice(index).match(/^[A-Za-z_][A-Za-z0-9_']*/);
        if (word) {
            tokens.push(word[0]);
            index += word[0].length;
            continue;
        }
        throw new Error(`Ungueltiges Zeichen: ${char}`);
    }
    return tokens;
}

function parse(input) {
    const tokens = tokenize(input.replace(/\blambda\b/g, "\\"));
    let position = 0;

    function peek() {
        return tokens[position];
    }

    function consume(expected) {
        const token = tokens[position];
        if (expected && token !== expected) throw new Error(`Erwartet: ${expected}, gefunden: ${token || "Ende"}`);
        position += 1;
        return token;
    }

    function startsAtom(token) {
        return token && token !== ")" && token !== ".";
    }

    function parseExpression() {
        if (peek() === "\\" || peek() === "λ") return parseLambda();
        return parseApplication();
    }

    function parseLambda() {
        consume(peek());
        const param = consume();
        if (!/^[A-Za-z_][A-Za-z0-9_']*$/.test(param || "")) throw new Error("Nach lambda muss ein Variablenname stehen.");
        consume(".");
        return { type: "lambda", param, body: parseExpression() };
    }

    function parseApplication() {
        let expr = parseAtom();
        while (startsAtom(peek()) && peek() !== "\\" && peek() !== "λ") {
            expr = { type: "app", func: expr, arg: parseAtom() };
        }
        return expr;
    }

    function parseAtom() {
        const token = peek();
        if (!token) throw new Error("Unerwartetes Ende.");
        if (token === "(") {
            consume("(");
            const expr = parseExpression();
            consume(")");
            return expr;
        }
        if (token === "\\" || token === "λ") return parseLambda();
        if (/^[A-Za-z_][A-Za-z0-9_']*$/.test(token)) {
            consume();
            return { type: "var", name: token };
        }
        throw new Error(`Unerwartetes Token: ${token}`);
    }

    const ast = parseExpression();
    if (position !== tokens.length) throw new Error(`Unerwarteter Rest: ${tokens.slice(position).join(" ")}`);
    return ast;
}

function clone(node) {
    return JSON.parse(JSON.stringify(node));
}

function freeVars(node, set = new Set()) {
    if (node.type === "var") set.add(node.name);
    if (node.type === "app") {
        freeVars(node.func, set);
        freeVars(node.arg, set);
    }
    if (node.type === "lambda") {
        const inner = freeVars(node.body, new Set());
        inner.delete(node.param);
        for (const value of inner) set.add(value);
    }
    return set;
}

function allVars(node, set = new Set()) {
    if (node.type === "var") set.add(node.name);
    if (node.type === "app") {
        allVars(node.func, set);
        allVars(node.arg, set);
    }
    if (node.type === "lambda") {
        set.add(node.param);
        allVars(node.body, set);
    }
    return set;
}

function freshName(base, avoid) {
    let index = 1;
    let candidate = `${base}_${index}`;
    while (avoid.has(candidate)) {
        index += 1;
        candidate = `${base}_${index}`;
    }
    return candidate;
}

function renameOccurrences(node, oldName, newName) {
    if (node.type === "var") {
        return { type: "var", name: node.name === oldName ? newName : node.name };
    }
    if (node.type === "app") {
        return { type: "app", func: renameOccurrences(node.func, oldName, newName), arg: renameOccurrences(node.arg, oldName, newName) };
    }
    if (node.param === oldName) {
        return clone(node);
    }
    return { type: "lambda", param: node.param, body: renameOccurrences(node.body, oldName, newName) };
}

function substitute(node, variable, replacement) {
    if (node.type === "var") {
        return node.name === variable ? clone(replacement) : clone(node);
    }
    if (node.type === "app") {
        return {
            type: "app",
            func: substitute(node.func, variable, replacement),
            arg: substitute(node.arg, variable, replacement)
        };
    }
    if (node.param === variable) return clone(node);

    const replacementFree = freeVars(replacement);
    if (replacementFree.has(node.param)) {
        const avoid = new Set([...allVars(node.body), ...allVars(replacement), variable]);
        const fresh = freshName(node.param, avoid);
        const renamed = renameOccurrences(node.body, node.param, fresh);
        return {
            type: "lambda",
            param: fresh,
            body: substitute(renamed, variable, replacement)
        };
    }

    return {
        type: "lambda",
        param: node.param,
        body: substitute(node.body, variable, replacement)
    };
}

function format(node, parent = "") {
    if (!node) return "-";
    if (node.type === "var") return node.name;
    if (node.type === "lambda") {
        const text = `lambda ${node.param}. ${format(node.body)}`;
        return parent === "app" ? `(${text})` : text;
    }
    const left = format(node.func, "app");
    const right = node.arg.type === "var" ? format(node.arg) : `(${format(node.arg)})`;
    const text = `${left} ${right}`;
    return parent === "arg" ? `(${text})` : text;
}

function findRedex(node) {
    if (node.type === "app" && node.func.type === "lambda") return node;
    if (node.type === "app") return findRedex(node.func) || findRedex(node.arg);
    if (node.type === "lambda") return findRedex(node.body);
    return null;
}

function reduceOnce(node) {
    if (node.type === "app" && node.func.type === "lambda") {
        const reduced = substitute(node.func.body, node.func.param, node.arg);
        return {
            changed: true,
            node: reduced,
            explanation: `Beta-Reduktion: ${node.func.param} wird durch ${format(node.arg)} ersetzt.`
        };
    }
    if (node.type === "app") {
        const left = reduceOnce(node.func);
        if (left.changed) return { changed: true, node: { type: "app", func: left.node, arg: node.arg }, explanation: left.explanation };
        const right = reduceOnce(node.arg);
        if (right.changed) return { changed: true, node: { type: "app", func: node.func, arg: right.node }, explanation: right.explanation };
    }
    if (node.type === "lambda") {
        const inner = reduceOnce(node.body);
        if (inner.changed) return { changed: true, node: { type: "lambda", param: node.param, body: inner.node }, explanation: inner.explanation };
    }
    return { changed: false, node };
}

function normalFormFor(input, maxSteps = 160) {
    let ast = parse(input);
    let steps = 0;
    while (steps < maxSteps) {
        const next = reduceOnce(ast);
        if (!next.changed) return ast;
        ast = next.node;
        steps += 1;
    }
    throw new Error("Keine Normalform innerhalb des Schrittlimits gefunden.");
}

function alphaEquivalent(a, b, envA = [], envB = []) {
    if (a.type !== b.type) return false;
    if (a.type === "var") {
        const indexA = envA.lastIndexOf(a.name);
        const indexB = envB.lastIndexOf(b.name);
        if (indexA >= 0 || indexB >= 0) return indexA === indexB;
        return a.name === b.name;
    }
    if (a.type === "app") return alphaEquivalent(a.func, b.func, envA, envB) && alphaEquivalent(a.arg, b.arg, envA, envB);
    return alphaEquivalent(a.body, b.body, [...envA, a.param], [...envB, b.param]);
}

function render() {
    currentTerm.textContent = state.ast ? format(state.ast) : "-";
    const redex = state.ast ? findRedex(state.ast) : null;
    nextRedex.textContent = redex ? format(redex) : "keiner";
    reductionHistory.innerHTML = state.history.length
        ? state.history.map((entry) => `<li>${entry}</li>`).join("")
        : "<li>Noch keine Reduktionsschritte.</li>";
    stepCounter.textContent = `${Math.max(0, state.history.length - 1)} Schritte`;
}

function parseCurrent() {
    try {
        state.initial = termInput.value;
        state.ast = parse(termInput.value);
        state.history = [format(state.ast)];
        const redex = findRedex(state.ast);
        setStatus(redex ? "reduzierbar" : "Normalform", redex ? "" : "ok");
        explainBox.textContent = redex
            ? `Naechster Redex: ${format(redex)}. Ein Beta-Schritt ersetzt den gebundenen Namen im Rumpf.`
            : "Der Term hat bereits Normalform.";
        render();
        return true;
    } catch (error) {
        state.ast = null;
        state.history = [];
        setStatus("Fehler", "bad");
        currentTerm.textContent = "-";
        nextRedex.textContent = "-";
        explainBox.textContent = error.message;
        render();
        return false;
    }
}

function step() {
    if (!state.ast && !parseCurrent()) return false;
    const next = reduceOnce(state.ast);
    if (!next.changed) {
        setStatus("Normalform", "ok");
        explainBox.textContent = "Keine Beta-Reduktion mehr moeglich.";
        render();
        return false;
    }
    state.ast = next.node;
    state.history.push(format(state.ast));
    setStatus(findRedex(state.ast) ? "reduzierbar" : "Normalform", findRedex(state.ast) ? "" : "ok");
    explainBox.textContent = next.explanation;
    render();
    return true;
}

function normalize() {
    if (!state.ast && !parseCurrent()) return;
    let guard = 0;
    while (guard < 160 && step()) {
        guard += 1;
    }
    if (guard >= 160) {
        setStatus("Abbruch", "bad");
        explainBox.textContent = "Abbruch nach 160 Schritten. Der Term hat eventuell keine Normalform.";
    }
}

function loadExample() {
    termInput.value = EXAMPLES[exampleSelect.value] || EXAMPLES.identity;
    parseCurrent();
}

function reset() {
    termInput.value = state.initial || EXAMPLES.identity;
    parseCurrent();
}

function renderExercise() {
    const exercise = EXERCISES[exerciseSelect.value];
    exerciseTerm.textContent = exercise.term;
    answerInput.value = "";
    practiceFeedback.className = "practice-feedback";
    practiceFeedback.textContent = "Tipp: Leerzeichen sind egal, unterschiedliche gebundene Variablennamen werden akzeptiert.";
}

function checkAnswer() {
    const exercise = EXERCISES[exerciseSelect.value];
    try {
        const expected = normalFormFor(exercise.term);
        const actual = normalFormFor(answerInput.value || "");
        if (alphaEquivalent(expected, actual)) {
            practiceFeedback.className = "practice-feedback ok";
            practiceFeedback.textContent = `Richtig. Normalform: ${format(expected)}`;
        } else {
            practiceFeedback.className = "practice-feedback bad";
            practiceFeedback.textContent = `Noch nicht. Deine Normalform ist ${format(actual)}, erwartet wird ${format(expected)}.`;
        }
    } catch (error) {
        practiceFeedback.className = "practice-feedback bad";
        practiceFeedback.textContent = error.message;
    }
}

function loadExercise() {
    termInput.value = EXERCISES[exerciseSelect.value].term;
    parseCurrent();
}

function showSolution() {
    try {
        const expected = normalFormFor(EXERCISES[exerciseSelect.value].term);
        answerInput.value = format(expected);
        practiceFeedback.className = "practice-feedback ok";
        practiceFeedback.textContent = "Loesung eingesetzt. Versuche danach eine andere Aufgabe ohne Hilfe.";
    } catch (error) {
        practiceFeedback.className = "practice-feedback bad";
        practiceFeedback.textContent = error.message;
    }
}

loadExampleBtn.addEventListener("click", loadExample);
parseBtn.addEventListener("click", parseCurrent);
stepBtn.addEventListener("click", step);
normalizeBtn.addEventListener("click", normalize);
resetBtn.addEventListener("click", reset);
exerciseSelect.addEventListener("change", renderExercise);
checkAnswerBtn.addEventListener("click", checkAnswer);
loadExerciseBtn.addEventListener("click", loadExercise);
showSolutionBtn.addEventListener("click", showSolution);

termInput.value = EXAMPLES.identity;
parseCurrent();
renderExercise();
