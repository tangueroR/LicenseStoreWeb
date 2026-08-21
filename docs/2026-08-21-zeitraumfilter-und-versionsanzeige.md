# Zeitraumfilter, Versionsanzeige und AI-Instructions

**Datum:** 21.08.2026
**App-Version danach:** `1.0.0.0`

Zusammenfassung der Arbeiten an LicenseStoreWeb: ein `.github`-Ordner mit projektspezifischen
Instructions, ein Zeitraum-Schnellfilter in der Lizenztabelle und eine Versionsanzeige in der
Toolbar.

---

## 1. `.github`-Ordner mit Instructions

Vorher enthielt `.github/copilot-instructions.md` nur das generische Angular-Boilerplate —
identisch zu `AGENTS.md`, `.cursor/rules/cursor.mdc`, `.gemini/GEMINI.md`, `.junie/guidelines.md`
und `.windsurf/rules/guidelines.md`. Nichts davon beschrieb dieses Projekt.

Neue Struktur:

| Datei | Inhalt |
|-------|--------|
| `.github/copilot-instructions.md` | Architektur, Domain-Modell, API, Angular-/A11y-Regeln, Repo-Eigenheiten |
| `.github/instructions/angular-components.instructions.md` | Regeln für `src/app/components/**` |
| `.github/instructions/services.instructions.md` | Regeln für Services, Guards, Interceptors |
| `.github/instructions/models.instructions.md` | Regeln für `src/app/models/**` |
| `.github/instructions/styles.instructions.md` | SCSS-/Theming-Regeln für `**/*.scss` |
| `.github/instructions/build-and-release.instructions.md` | Environments, Versionierung, Build, Deployment |
| `.github/prompts/new-component.prompt.md` | Prompt zum Anlegen einer neuen Komponente |
| `.github/prompts/review-changes.prompt.md` | Prompt für ein Review gegen die Projektregeln |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR-Checkliste (deutsch) |

Die Dateien unter `instructions/` tragen im Front-Matter ein `applyTo`-Glob und greifen damit
automatisch nur für die passenden Pfade.

### Wichtigster dokumentierter Punkt: Feldüberladung

`SicoAnlage` bildet die Legacy-WPF-Tabelle `Anlage` ab. Die Feldnamen sagen nicht, was drinsteht —
das war bisher nirgends festgehalten:

| Feld | Sico1010 / Sico5000 | Sico2020 / Sico6000 |
|------|---------------------|---------------------|
| `password` | Passwort | Passwort |
| `modemPassword` | Modem-Passwort | **Server-IP-Adresse** |
| `password3` | *(ungenutzt)* | **Wireguard-Adresse** |
| `password4` | Premium-Passwort | Premium-Passwort |
| `password5` | **Version** | **Version** |

Dazu die beiden Kodierungen außerhalb des Typsystems:
`LicenseResponse.modemPassword` = `"IP|Wireguard"` und `LicenseRequest.userName` =
`user|wireguard|ip` bei Netzwerkprodukten.

### Weitere dokumentierte Eigenheiten

- Löschen ist ein `POST /api/licenses/{product}/delete`, kein HTTP DELETE.
- Die Liste kommt von `/api/projects/{product}`, Schreiben geht an `/api/licenses/{product}`.
- `src/app/app.html` und `src/app/app.scss` sind ungenutzte CLI-Reste; `App` nutzt ein
  Inline-Template.
- `angular.json` hat **keine `fileReplacements`** — `environment.prod.ts` fließt aktuell nicht in
  den Produktions-Build ein (siehe offene Punkte).

---

## 2. Zeitraum-Schnellfilter

**Problem:** Um einen Zeitraum zu sehen, musste alles von Hand getippt werden — entweder in das
Filterfeld (`01.01.2005 - 30.06.2025`) oder in die Von/Bis-Felder.

**Lösung:** Ein Button **„Zeitraum"** neben dem Bis-Feld füllt die Von/Bis-Felder mit einem
fertigen Bereich und wendet ihn sofort an. Die eingetragenen Daten bleiben normale Textfelder und
können danach von Hand korrigiert werden.

Menüeinträge (Beispielwerte für den 21.08.2026):

| Eintrag | Von | Bis |
|---------|-----|-----|
| Letzte 12 Monate | 21.08.2025 | 21.08.2026 |
| Letzte 2 Jahre | 21.08.2024 | 21.08.2026 |
| Letzte 3 Jahre | 21.08.2023 | 21.08.2026 |
| Letzte 4 Jahre | 21.08.2022 | 21.08.2026 |
| Seit Jahresbeginn | 01.01.2026 | 21.08.2026 |
| Jahr 2026 … 2023 | 01.01. | 31.12. |
| Zeitraum zurücksetzen | *(leer)* | *(leer)* |

Die vier Jahreseinträge rollen automatisch mit: `recentYears` = aktuelles Jahr minus 0–3.

### Umsetzung — `license-table.component.ts`

| Methode | Zweck |
|---------|-------|
| `applyLastMonths(months)` | Bereich von heute minus *n* Monaten bis heute |
| `applyLastYears(years)` | delegiert an `applyLastMonths(years * 12)` |
| `applyCalendarYear(year)` | 01.01. – 31.12. eines Kalenderjahres |
| `applyYearToDate()` | 01.01. des laufenden Jahres bis heute |
| `setDateRange(from, to)` | schreibt in `dateFrom`/`dateTo` und ruft `applyDateRange()` |
| `monthsBefore(date, months)` | Datum *n* Monate früher, auf das Monatsende geklemmt |
| `toGermanDate(date)` | formatiert `dd.MM.yyyy` |

`setDateRange()` geht bewusst über das bestehende `applyDateRange()`, damit Presets exakt denselben
Weg nehmen wie eine manuelle Eingabe: Filterausdruck `von - bis`, Auswertung im vorhandenen
`matchesFilter()`, Anzeige in der Filter-Info-Leiste („Zeitraum: … bis …" plus Trefferzahl).

Die Monatsarithmetik klemmt auf das Monatsende, damit der 31.03. minus einen Monat zum 28./29.02.
wird und nicht zum 02./03.03. Nachgerechnet:

```
21.08.2026 minus 12 Monate -> 21.08.2025
21.08.2026 minus 24 Monate -> 21.08.2024
31.03.2026 minus  1 Monat  -> 28.02.2026   (Klemmung)
15.01.2026 minus  3 Monate -> 15.10.2025   (Jahreswechsel)
```

`formatDateGerman(string)` nutzt jetzt intern `toGermanDate(Date)`, statt die Formatierung ein
zweites Mal auszuschreiben.

### Verworfene Zwischenlösung

Zuerst gab es ein Jahres-Dropdown („Alle Jahre" plus alle in den Daten vorhandenen Jahre mit
Trefferzahl). Es wurde verworfen, weil die Auswahl nicht in den Von/Bis-Feldern sichtbar wurde und
damit nicht nachjustierbar war. Der Code (`yearOptions`, `selectedYear`, `syncYearSelection`,
`MatSelectModule`) ist restlos entfernt; die letzten vier Jahre stehen jetzt im Zeitraum-Menü.

---

## 3. Versionsanzeige in der Toolbar

- `environment.version` neu in `environment.ts` **und** `environment.prod.ts`, vierteilig
  (`major.minor.patch.build`), Startwert `1.0.0.0` — dasselbe Schema wie die abgelöste
  WPF-Anwendung.
- Die Dashboard-Toolbar zeigt sie als Badge direkt hinter dem Titel: `SicoLicenseStore  v1.0.0.0`.
- Styling über `currentColor` (voller Kontrast auf der Primary-Toolbar, kein `opacity` auf Text),
  dazu `aria-label="Anwendungsversion 1.0.0.0"`.
- Die Bump-Regeln stehen in `.github/instructions/build-and-release.instructions.md`.

---

## Geänderte Dateien

```
.github/copilot-instructions.md                                  überarbeitet
.github/instructions/*.instructions.md                           neu (5 Dateien)
.github/prompts/*.prompt.md                                      neu (2 Dateien)
.github/PULL_REQUEST_TEMPLATE.md                                 neu
docs/2026-08-21-zeitraumfilter-und-versionsanzeige.md            neu (dieses Dokument)
README.md                                                        Features, Versioning, Doku-Hinweis
src/environments/environment.ts                                  version: '1.0.0.0'
src/environments/environment.prod.ts                             version: '1.0.0.0'
src/app/components/license-dashboard/license-dashboard.component.{ts,html,scss}   Versions-Badge
src/app/components/license-table/license-table.component.{ts,html,scss}           Zeitraum-Presets
```

## Geprüft

- `npm run build` läuft fehlerfrei durch, keine neuen Budget-Warnungen
  (Initial 299,59 kB / 82,69 kB übertragen).
- Die Datumsarithmetik wurde separat gegen die oben genannten Fälle gerechnet.

## Nicht geprüft / offen

- **Kein Browser-Test.** Toolbar und Tabelle liegen hinter dem Login, Backend-Zugangsdaten lagen
  nicht vor. Zu prüfen bleibt: Versions-Badge in der Toolbar, Menü „Zeitraum", Umbruch der Toolbar
  auf schmalen Fenstern.
- **Keine Tests im Repo** (`skipTests: true` in `angular.json`) — es gibt kein Test-Setup, gegen das
  die Filterlogik laufen könnte.
- **`fileReplacements` fehlen** in `angular.json`. Bis das nachgezogen ist, muss jede Änderung an
  `environment.ts` von Hand in `environment.prod.ts` gespiegelt werden, sonst driften die beiden
  auseinander.
