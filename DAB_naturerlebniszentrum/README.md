# Digitale Erkundungstour durch den Jenaer Wald

Dieses Repository enthaelt eine statische, GitHub-Pages-taugliche Webseite fuer ein digitales Arbeitsblatt im Workshop-Kontext.

## Enthaltene Bestandteile

- `index.html`: Einstiegspunkt der Anwendung
- `styles.css`: komplettes Layout und responsives Design
- `script.js`: clientseitiges Routing, Markdown-Laden, Slide-Animation und Notizblatt
- `md/`: Dummy-Inhalte fuer Aufgabenstellung, Recherche, Berufe und Ergebnisphasen
- `img/`: Beispielabbildungen fuer das Dashboard

## Umgesetzte Anforderungen

- Start-Dashboard mit durchlaufenden historischen Abbildungen und Start-Button
- Veranstaltungsauswahl mit allgemeiner Verwendung als Standard und optionalem Jenaer-Wald-Workshop
- Einfuehrungsseite mit Aufgabenstellung aus `md/aufgabestellung.md` und Rechercheguide aus `md/rechercheguide.md`
- Berufsuebersicht mit Auswahl mehrerer Berufe
- Berufsdetailseite, die jeweils aus einer eigenen Markdown-Datei geladen wird
- Ergebnisbereich mit Plakat-Guide und Schlechtwettervariante
- Linker Graph mit vier Stationen als Orientierung
- Aufklappbares Notizblatt am rechten Fensterrand
- Platz fuer weitere Assets wie Kreuzwortraetsel, Bildkarten oder Quizformate

## GitHub Pages

Die Seite kann direkt ueber GitHub Pages als statische Seite bereitgestellt werden.

1. Repository auf GitHub pushen.
2. Unter `Settings -> Pages` als Quelle den Branch `main` und den Ordner `/ (root)` waehlen.
3. Nach der Bereitstellung wird `index.html` automatisch ausgeliefert.

## Welche Dateien muessen auf GitHub Pages?

Fuer die funktionierende Webseite muessen diese Dateien und Ordner im GitHub-Repository liegen:

```text
index.html
styles.css
script.js
img/
md/
.nojekyll
```

Wichtig:

- `index.html` muss im Root-Verzeichnis liegen, also direkt oben im Repository.
- `styles.css` und `script.js` muessen neben der `index.html` liegen, weil sie dort relativ eingebunden werden.
- Der Ordner `img/` wird fuer die Startseiten- und Berufsbilder gebraucht.
- Der Ordner `md/` wird fuer die Texte der Stationen und Berufsprofile gebraucht. Ohne diesen Ordner bleiben Inhalte leer oder werden als fehlend angezeigt.
- `.nojekyll` sollte mit hochgeladen werden. Dadurch behandelt GitHub Pages Ordner und Dateien als normale statische Dateien.

Optional, aber sinnvoll:

- `README.md` ist nur Dokumentation und wird fuer die Webseite selbst nicht geladen.
- `prompt.md` ist nur Arbeits-/Projektkontext und wird fuer die Webseite selbst nicht geladen.
- Weitere Ordner wie `assets/` koennen ergaenzt werden, wenn spaeter PDFs, Quizdateien oder Bildkarten eingebunden werden.

Wenn du nur die Webseite veroeffentlichen willst, reicht also:

```text
index.html
styles.css
script.js
img/abbildung-1.svg
img/abbildung-2.svg
img/abbildung-3.svg
md/aufgabestellung.md
md/rechercheguide.md
md/introduction.md
md/holzfaeller.md
md/steinhauer.md
md/koehler.md
md/glasblaeser.md
md/winzer.md
md/haendler.md
md/waidsammler.md
md/plakat.md
md/berufchatverlauf.md
.nojekyll
```

## Inhalte anpassen

- Ersetze die Dummy-Texte im Ordner `md/` durch deine finalen Inhalte.
- Lege eigene Bilder unter `img/` ab und binde sie in Dashboard oder Markdown-Dateien ein.
- Weitere Materialien koennen als eigene Dateien oder Ordner ergaenzt werden, zum Beispiel `assets/`.

## Lokal testen

Die Seite funktioniert ohne Build-Schritt. Fuer lokales Testen reicht ein einfacher statischer Server, zum Beispiel:

```powershell
python -m http.server 8000
```

Danach die Seite im Browser unter `http://localhost:8000` aufrufen.
