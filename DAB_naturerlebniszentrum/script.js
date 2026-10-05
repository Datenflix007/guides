const routes = {
  dashboard: { id: "dashboard", title: "Start", graphStep: 0 },
  intro: { id: "intro", title: "Einführung", graphStep: 1 },
  professions: { id: "professions", title: "Berufe entdecken", graphStep: 2, files: ["md/introduction.md"] },
  professionDetail: { id: "professionDetail", title: "Berufsprofil", graphStep: 3 },
  poster: { id: "poster", title: "Plakat erstellen", graphStep: 4, files: ["md/plakat.md"] },
  badWeather: { id: "badWeather", title: "Schlechtwettervariante", graphStep: 6, files: ["md/berufchatverlauf.md"] },
};

const events = {
  general: {
    title: "Historische Waldberufe entdecken",
    description: "Spuren vergangener Arbeit entdecken und die Bedeutung historischer Waldberufe für Mensch und Umwelt verstehen.",
    assignmentFile: "md/aufgabestellung-allgemein.md",
    assignmentLabel: "Arbeitsauftrag",
  },
  jenaWorkshop: {
    title: "Der Jenaer Wald und wir",
    description: "Spuren mittelalterlicher Arbeit entdecken und ihre Bedeutung für den Jenaer Wald verstehen.",
    assignmentFile: "md/aufgabestellung.md",
    assignmentLabel: "Arbeitsauftrag &amp; Zeitplan",
  },
};

const professions = [
  { key: "holzfaeller", label: "Holzfäller", file: "md/holzfaeller.md", category: "Wichtige Forstberufe" },
  { key: "steinhauer", label: "Steinhauer", file: "md/steinhauer.md", category: "Wichtige Forstberufe" },
  { key: "koehler", label: "Köhler", file: "md/koehler.md", category: "Wichtige Forstberufe" },
  { key: "glasblaeser", label: "Glasbläser", file: "md/glasblaeser.md", category: "Wichtige Forstberufe" },
  { key: "jaeger", label: "Jäger", file: "md/jaeger.md", category: "Wichtige Forstberufe" },
  { key: "harzer", label: "Harzer", file: "md/harzer.md", category: "Weitere Nischenberufe" },
  { key: "waldhirten", label: "Waldhirten", file: "md/waldhirten.md", category: "Weitere Nischenberufe" },
  { key: "winzer", label: "Winzer", file: "md/winzer.md", category: "Weitere Nischenberufe" },
  { key: "haendler", label: "Händler", file: "md/haendler.md", category: "Weitere Nischenberufe" },
  { key: "waidsammler", label: "Waidsammler", file: "md/waidsammler.md", category: "Weitere Nischenberufe" },
];

const graphNodes = [
  { title: "Station I", subtitle: "Auftrag & Recherche", route: "intro" },
  { title: "Station IIa", subtitle: "Berufe entdecken", route: "professions" },
  { title: "Station IIb", subtitle: "Berufsprofil lesen", route: null },
  { title: "Station III", subtitle: "Ergebnis gestalten", route: "poster" },
  { title: "Exkursion", subtitle: "Spuren erkunden", route: null },
  { title: "Schlechtwettervariante", subtitle: "Berufschatverlauf", route: "badWeather" },
];

const additionalAssets = [
  { title: "Kreuzworträtsel", description: "Kann später als PDF, Bild oder eigene HTML-Seite im Ordner `assets/` eingebunden werden." },
  { title: "Bildkarten", description: "Historische Abbildungen oder Berufskarten lassen sich unter `img/` ablegen und direkt in Markdown verwenden." },
  { title: "Quiz oder Lückentext", description: "Als weitere Station können interaktive Aufgaben in JavaScript leicht ergänzt werden." },
];

const app = document.getElementById("app");
const notesDrawer = document.getElementById("notesDrawer");
const notesToggle = document.getElementById("notesToggle");
const notesClose = document.getElementById("notesClose");
const notesInput = document.getElementById("notesInput");
const saveNotesButton = document.getElementById("saveNotesButton");
const clearNotesButton = document.getElementById("clearNotesButton");

const markdownCache = new Map();
const state = {
  route: "dashboard",
  eventKey: "general",
  selectedProfession: professions[0],
  slideIndex: 0,
  slideTimer: null,
};

init();

async function init() {
  bindGlobalEvents();
  restoreNotes();
  initDefaultChecks();

  const hashRoute = location.hash.replace("#", "");
  if (routes[hashRoute]) {
    state.route = hashRoute;
  }

  window.addEventListener("resize", positionNotesDrawer);
  await render();
  positionNotesDrawer();
}

function bindGlobalEvents() {
  window.addEventListener("hashchange", async () => {
    const hashRoute = location.hash.replace("#", "");
    if (routes[hashRoute]) {
      state.route = hashRoute;
      await render();
      positionNotesDrawer();
    }
  });

  app.addEventListener("click", (event) => {
    const routeButton = event.target.closest("[data-route]");
    if (routeButton && app.contains(routeButton)) {
      event.preventDefault();
      navigate(routeButton.dataset.route);
      return;
    }

    const professionButton = event.target.closest("[data-profession]");
    if (professionButton && app.contains(professionButton)) {
      event.preventDefault();
      const profession = professions.find((entry) => entry.key === professionButton.dataset.profession);
      if (profession) {
        state.selectedProfession = profession;
        navigate("professionDetail");
      }
    }
  });

  app.addEventListener("change", (event) => {
    if (event.target.matches("#eventSelect")) {
      state.eventKey = events[event.target.value] ? event.target.value : "general";
      updateDashboardEvent();
      return;
    }

    if (event.target.matches(".task-list input[type='checkbox']")) {
      saveCheckbox(event.target.id, event.target.checked);
    }
  });

  notesToggle.addEventListener("click", () => {
    const isOpen = notesDrawer.classList.toggle("is-open");
    notesToggle.setAttribute("aria-expanded", String(isOpen));
  });

  notesClose.addEventListener("click", closeNotesDrawer);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && notesDrawer.classList.contains("is-open")) {
      closeNotesDrawer();
      notesToggle.focus();
    }
  });

  saveNotesButton.addEventListener("click", () => {
    localStorage.setItem("jenaer-wald-notes", notesInput.value);
    showStatus("Notizen wurden lokal gespeichert.");
  });

  clearNotesButton.addEventListener("click", () => {
    notesInput.value = "";
    localStorage.removeItem("jenaer-wald-notes");
    showStatus("Notizen wurden entfernt.");
  });
}

function closeNotesDrawer() {
  notesDrawer.classList.remove("is-open");
  notesToggle.setAttribute("aria-expanded", "false");
}

async function render() {
  clearSlideTimer();
  setRouteClass(state.route);

  if (state.route === "dashboard") {
    renderDashboard();
    startSlides();
    return;
  }

  const route = routes[state.route];
  const files = state.route === "intro"
    ? [events[state.eventKey].assignmentFile]
    : route.files ?? [];
  const content = await Promise.all(files.map(loadMarkdown));

  if (state.route === "intro") {
    renderIntro(content);
    return;
  }

  if (state.route === "professions") {
    renderProfessions(content[0]);
    return;
  }

  if (state.route === "professionDetail") {
    const professionContent = await loadMarkdown(state.selectedProfession.file);
    renderProfessionDetail(professionContent);
    return;
  }

  if (state.route === "poster") {
    renderOutput(content[0], "poster");
    return;
  }

  if (state.route === "badWeather") {
    renderOutput(content[0], "badWeather");
    restoreCheckboxes();
  }
}

function renderDashboard() {
  const template = document.getElementById("dashboardTemplate");
  app.innerHTML = "";
  app.appendChild(template.content.cloneNode(true));

  const eventSelect = document.getElementById("eventSelect");
  eventSelect.value = state.eventKey;
  updateDashboardEvent();
  setupIndicators();
}

function updateDashboardEvent() {
  const selectedEvent = events[state.eventKey];
  const title = document.getElementById("dashboardTitle");
  const description = document.getElementById("dashboardDescription");

  if (title && description) {
    title.textContent = selectedEvent.title;
    description.textContent = selectedEvent.description;
  }
}

function renderIntro(markdownParts) {
  const [assignmentMarkdown] = markdownParts;
  const selectedEvent = events[state.eventKey];

  app.innerHTML = `
    <section class="workspace">
      ${renderGraph(routes.intro.graphStep)}
      <div class="content-grid">
        <article class="intro-hero">
          <div class="intro-hero__copy">
            <p class="eyebrow">Station I</p>
            <h1>Spuren im Wald lesen</h1>
            <p>
              Auch heute noch kann man ganz oft Hinweise auf Berufe vergangener Zeiten finden –
              ob bei <strong>Straßennamen</strong> wie „Köhlerweg" oder „Steinbruchstraße",
              bei <strong>Familiennamen</strong> wie „Holzmann" oder „Kohlrausch",
              oder an <strong>ehemaligen Gebäuden</strong> und Mauern, von denen niemand mehr weiß,
              was dort einmal war.
            </p>
            <p>
              Diese Spuren sind kein Zufall. Sie erzählen von Menschen, die hier jahrhundertelang
              gearbeitet haben – lange bevor es Maschinen oder Supermärkte gab.
              Werdet heute zu Detektiven der Geschichte und entdeckt, was von diesen Berufen geblieben ist.
            </p>
          </div>
          <div class="intro-hero__image" aria-hidden="true">
            <img src="img/holzfäller2.jpg" alt="Holzfäller mit gefällten Baumstämmen im Wald">
          </div>
        </article>

        <article class="content-card">
          <p class="eyebrow">${selectedEvent.assignmentLabel}</p>
          <h2>Eure Aufgaben</h2>
          ${renderChecklist(assignmentMarkdown)}
        </article>

        <article class="intro-next-card">
          <div>
            <p class="eyebrow">Nächster Schritt</p>
            <h2>Berufe im und am Wald erkunden</h2>
            <p>Wählt einen Beruf aus, der euch interessiert, und lest das dazugehörige Berufsprofil.</p>
          </div>
          <div class="card-actions">
            <button class="button-primary" data-route="professions">Weiter zu den Berufen</button>
          </div>
        </article>
      </div>
    </section>
  `;

  restoreCheckboxes();
}

function renderProfessions(introductionMarkdown) {
  const grouped = professions.reduce((map, profession) => {
    if (!map[profession.category]) {
      map[profession.category] = [];
    }
    map[profession.category].push(profession);
    return map;
  }, {});

  app.innerHTML = `
    <section class="workspace">
      ${renderGraph(routes.professions.graphStep)}
      <div class="content-grid">
        <article class="content-card">
          <p class="eyebrow">Station IIa</p>
          <h1>Berufe im und am Wald</h1>
          ${parseMarkdown(introductionMarkdown)}
          ${Object.entries(grouped).map(([category, items]) => `
            <section>
              <h2>${category}</h2>
              <div class="profession-grid">
                ${items.map((profession) => `
                  <button class="chip-button" type="button" data-profession="${profession.key}">
                    ${profession.label}
                  </button>
                `).join("")}
              </div>
            </section>
          `).join("")}
          <div class="card-actions">
            <button class="button-secondary" data-route="intro">Zurück</button>
            <button class="button-primary" data-route="poster">Zu Station III</button>
          </div>
        </article>
        <aside class="side-card">
          <p class="eyebrow">Rechercheimpuls</p>
          <h3>Leitfragen für eure Recherche</h3>
          <ul>
            <li>Welche Rohstoffe brauchte euer Beruf – und woher kamen sie?</li>
            <li>Wer hat diesen Beruf ausgeübt: Männer, Frauen, Kinder?</li>
            <li>Wie hat dieser Beruf den Jenaer Wald verändert?</li>
            <li>Welche Spuren sind heute noch sichtbar – in Namen, Orten oder Landschaften?</li>
          </ul>
          <p>Klickt auf einen Beruf, um das vollständige Berufsprofil zu öffnen.</p>
        </aside>
      </div>
    </section>
  `;
}

function renderProfessionDetail(markdown) {
  app.innerHTML = `
    <section class="workspace">
      ${renderGraph(routes.professionDetail.graphStep)}
      <div class="content-grid">
        <article class="content-card">
          <p class="eyebrow">Station IIb</p>
          ${parseMarkdown(markdown)}
          <div class="card-actions">
            <button class="button-secondary" data-route="professions">Weitere Berufe</button>
            <button class="button-primary" data-route="poster">Weiter zu Station III</button>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderOutput(markdown, mode) {
  const isPoster = mode === "poster";

  app.innerHTML = `
    <section class="workspace">
      ${renderGraph(routes[mode].graphStep)}
      <div class="content-grid">
        <div class="mode-selector">
          <button class="mode-card ${isPoster ? "is-active" : ""}" type="button" data-route="poster">
            <strong>Plakat gestalten</strong>
            <span>Bereitet euren Beruf als Plakat auf und stellt ihn vor</span>
          </button>
          <button class="mode-card ${!isPoster ? "is-active" : ""}" type="button" data-route="badWeather">
            <strong>Schlechtwettervariante</strong>
            <span>Erstellt einen historischen Berufschatverlauf</span>
          </button>
        </div>

        <article class="content-card">
          <p class="eyebrow">Station III</p>
          <h1>${isPoster ? "Plakat erstellen" : "Berufschatverlauf erstellen"}</h1>
          ${isPoster ? parseMarkdown(stripLeadingHeading(markdown)) : renderChecklist(markdown)}
          <div class="card-actions">
            <button class="button-secondary" data-route="professions">Zurück zu den Berufen</button>
          </div>
        </article>

        
       
      </div>
    </section>
  `;
}

function renderGraph(activeStep) {
  return `
    <aside class="graph-card">
      <p class="eyebrow">Orientierung</p>
      <h2>Workshop-Ablauf</h2>
      <div class="graph">
        ${graphNodes.map((node, index) => `
          <div class="graph-node ${activeStep === index + 1 ? "is-active" : ""} ${node.route ? "is-clickable" : ""}"
               ${node.route ? `data-route="${node.route}"` : ""}>
            <div class="graph-node__dot">${index + 1}</div>
            <div class="graph-node__label">
              <strong>${node.title}</strong>
              <span>${node.subtitle}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </aside>
  `;
}

function renderChecklist(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const html = [];
  let inList = false;
  let checkIndex = 0;

  for (const line of lines) {
    if (line.startsWith("# ")) continue;

    if (line.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3 class="checklist-group">${escapeHtml(line.slice(3))}</h3>`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) { html.push('<ul class="task-list">'); inList = true; }
      const id = `task-${checkIndex++}`;
      html.push(`
        <li class="task-item">
          <label for="${id}">
            <input type="checkbox" id="${id}">
            <span>${formatInlineMarkdown(line.slice(2))}</span>
          </label>
        </li>
      `);
      continue;
    }

    if (line.trim() === "") {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    }

    if (inList) { html.push("</ul>"); inList = false; }
    html.push(`<p>${formatInlineMarkdown(line)}</p>`);
  }

  if (inList) html.push("</ul>");
  return html.join("");
}

function saveCheckbox(id, checked) {
  const saved = JSON.parse(localStorage.getItem("jenaer-wald-tasks") || "{}");
  saved[id] = checked;
  localStorage.setItem("jenaer-wald-tasks", JSON.stringify(saved));
}

function restoreCheckboxes() {
  const saved = JSON.parse(localStorage.getItem("jenaer-wald-tasks") || "{}");
  Object.entries(saved).forEach(([id, checked]) => {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  });
}

function setRouteClass(route) {
  document.body.classList.forEach((className) => {
    if (className.startsWith("route-")) {
      document.body.classList.remove(className);
    }
  });

  document.body.classList.add(`route-${route}`);
}

async function navigate(route) {
  if (!routes[route]) {
    return;
  }

  state.route = route;
  if (location.hash.replace("#", "") === route) {
    await render();
    positionNotesDrawer();
    return;
  }

  location.hash = route;
}

async function loadMarkdown(path) {
  if (markdownCache.has(path)) {
    return markdownCache.get(path);
  }

  const response = await fetch(path);
  if (!response.ok) {
    return `# Inhalt fehlt\n\nDie Datei \`${path}\` konnte nicht geladen werden.`;
  }

  const text = await response.text();
  markdownCache.set(path, text);
  return text;
}

function parseMarkdown(markdown) {
  const rawLines = markdown.replace(/\r/g, "").split("\n");

  // Pass 1: extract footnote definitions
  const footnotes = new Map();
  const fnKeys = [];
  const contentLines = [];
  let fnKey = null;

  for (const line of rawLines) {
    const fnMatch = line.match(/^\[\^(\w+)\]:\s*(.*)$/);
    if (fnMatch) {
      fnKey = fnMatch[1];
      footnotes.set(fnKey, fnMatch[2]);
      fnKeys.push(fnKey);
      continue;
    }
    if (fnKey && (line.startsWith("    ") || line.startsWith("\t"))) {
      const trimmed = line.trim();
      if (trimmed) {
        footnotes.set(fnKey, footnotes.get(fnKey) + " " + trimmed);
      }
      continue;
    }
    fnKey = null;
    contentLines.push(line);
  }
  // Normalize inline image markdown to figure-syntax so all images are treated the same.
  // Keep the original URL as the source (do not convert to relative paths).
  for (let i = 0; i < contentLines.length; i++) {
    contentLines[i] = contentLines[i].replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => {
      const cleanUrl = url.trim();
      let title = (alt || "").trim();
      if (!title || title.toLowerCase() === "img") {
        try {
          const fn = cleanUrl.split("/").pop().split("?")[0];
          title = fn.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        } catch (e) {
          title = "Abbildung";
        }
      }
      return `!![${title}||${cleanUrl}](${cleanUrl})`;
    });
  }

  // Pass 2: render content
  const html = [];
  const figures = [];
  let inList = false;

  function closeListIfNeeded() {
    if (inList) { html.push("</ul>"); inList = false; }
  }

  for (const line of contentLines) {
    const figureMatch = line.match(/^!!\[([^\]]*)\]\(([^)]*)\)$/);
    if (figureMatch) {
      closeListIfNeeded();
      const parts = figureMatch[1].split("|").map((p) => p.trim());
      const title = parts[0] || "";
      const desc = parts[1] || "";
      let source = parts[2] || "";
      const src = figureMatch[2].trim();
      if (!source) {
        source = src;
      }
      // collect for Abbildungsverzeichnis
      figures.push({ title, src, source });
      html.push(`<figure class="article-figure">
        <img src="${src}" alt="${escapeHtml(title)}">
        <figcaption class="figure-caption">
          ${title ? `<strong class="figure-title">${escapeHtml(title)}</strong>` : ""}
          ${title ? `<div class="figure-legend">Abbildung: ${escapeHtml(title)}</div>` : ""}
          ${desc ? `<span class="figure-desc">${escapeHtml(desc)}</span>` : ""}
          <span class="figure-source">Quelle: ${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source)}</a>` : "<em>[wird ergänzt]</em>"}</span>
        </figcaption>
      </figure>`);
      continue;
    }

    if (line.trim() === "---") {
      closeListIfNeeded();
      html.push('<hr class="section-divider">');
      continue;
    }
    if (line.startsWith("### ")) {
      closeListIfNeeded();
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeListIfNeeded();
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      closeListIfNeeded();
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }
    const listMatch = line.match(/^[-*] (.*)$/);
    if (listMatch) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${formatInlineMarkdown(listMatch[1])}</li>`);
      continue;
    }
    if (line.trim() === "") {
      closeListIfNeeded();
      continue;
    }
    closeListIfNeeded();
    html.push(`<p>${formatInlineMarkdown(line)}</p>`);
  }

  closeListIfNeeded();

  // Render footnotes list (heading comes from ## Literatur in markdown)
  if (fnKeys.length > 0) {
    html.push('<div class="footnotes"><ol class="footnotes__list">');
    for (const key of fnKeys) {
      html.push(`<li id="fn-${key}" class="footnote-item"><span>${formatInlineMarkdown(footnotes.get(key) || "")}</span> <a href="#fnref-${key}" class="footnote-back" aria-label="Zurück zum Text">↩</a></li>`);
    }
    html.push("</ol></div>");
  }

  // Abbildungsverzeichnis direkt unter den Fußnoten
  if (figures.length > 0) {
    html.push('<div class="figure-index"><h3>Abbildungsverzeichnis</h3><ol>');
    figures.forEach((f, i) => {
      const title = f.title || `Abbildung ${i + 1}`;
      const src = f.src || "";
      const source = f.source || "";
      html.push(`<li class="figure-index__item">${escapeHtml(title)} ${src ? `— <a href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer">Bild</a>` : ""} ${source ? `(${escapeHtml(source)})` : ""}</li>`);
    });
    html.push('</ol></div>');
  }

  return html.join("");
}

function stripLeadingHeading(markdown) {
  return markdown.replace(/\r/g, "").replace(/^# .+(\n+|$)/, "");
}

function formatInlineMarkdown(text) {
  const placeholders = [];

  const processed = text
    .replace(/\[\^(\w+)\]/g, (_, key) => {
      const i = placeholders.length;
      placeholders.push(`<sup><a href="#fn-${key}" id="fnref-${key}" class="footnote-ref">[${key}]</a></sup>`);
      return `\uE000${i}\uE001`;
    })
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (_, alt, url) => {
      const i = placeholders.length;
      placeholders.push(`<img src="${url}" alt="${alt}" class="md-img">`);
      return `\uE000${i}\uE001`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const i = placeholders.length;
      placeholders.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
      return `\uE000${i}\uE001`;
    });

  const escaped = escapeHtml(processed)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

  return escaped.replace(/\uE000(\d+)\uE001/g, (_, i) => placeholders[parseInt(i)]);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function restoreNotes() {
  notesInput.value = localStorage.getItem("jenaer-wald-notes") ?? "";
}

function showStatus(message) {
  const existing = notesDrawer.querySelector(".status-banner");
  if (existing) {
    existing.remove();
  }

  const status = document.createElement("p");
  status.className = "status-banner";
  status.textContent = message;
  notesDrawer.querySelector(".notes-panel").appendChild(status);

  window.setTimeout(() => {
    status.remove();
  }, 2400);
}

function setupIndicators() {
  const indicators = document.getElementById("slideIndicators");
  const slides = Array.from(document.querySelectorAll(".slide"));

  indicators.innerHTML = slides.map((_, index) => `
    <button type="button" data-slide="${index}" aria-label="Slide ${index + 1}"></button>
  `).join("");

  indicators.querySelectorAll("[data-slide]").forEach((button) => {
    button.addEventListener("click", () => {
      state.slideIndex = Number(button.dataset.slide);
      updateSlides();
    });
  });

  updateSlides();
}

function startSlides() {
  state.slideTimer = window.setInterval(() => {
    const slides = document.querySelectorAll(".slide");
    state.slideIndex = (state.slideIndex + 1) % slides.length;
    updateSlides();
  }, 3500);
}

function updateSlides() {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const indicators = Array.from(document.querySelectorAll("#slideIndicators button"));

  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === state.slideIndex);
  });

  indicators.forEach((indicator, index) => {
    indicator.classList.toggle("is-active", index === state.slideIndex);
  });
}

function clearSlideTimer() {
  if (state.slideTimer) {
    window.clearInterval(state.slideTimer);
    state.slideTimer = null;
  }
}

function initDefaultChecks() {
  if (!localStorage.getItem("jenaer-wald-tasks")) {
    const defaults = {};
    for (let i = 0; i < 4; i++) { defaults[`task-${i}`] = true; }
    localStorage.setItem("jenaer-wald-tasks", JSON.stringify(defaults));
  }
}

function positionNotesDrawer() {
  const rect = app.getBoundingClientRect();
  const toggleW = notesToggle.getBoundingClientRect().width || 52;
  const rightGap = window.innerWidth - rect.right;
  notesDrawer.style.right = Math.max(0, rightGap - toggleW) + "px";
}
