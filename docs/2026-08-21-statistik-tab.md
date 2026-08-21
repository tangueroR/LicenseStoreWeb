# Statistik-Tab mit Balkendiagramm

**Datum:** 21.08.2026
**App-Version danach:** `1.0.0.0`

Neuer fünfter Tab **„Statistik"** im Dashboard: wie viele Anlagen wurden pro Zeitraum je
Produkt angelegt. Ergänzt den bereits vorhandenen Zeitraum-Schnellfilter der Lizenztabelle
(siehe `2026-08-21-zeitraumfilter-und-versionsanzeige.md`).

---

## 1. Was der Tab zeigt

Von oben nach unten:

1. **Zeitraum-Leiste** — Von/Bis als Textfelder, Button „Anzeigen", Preset-Menü „Zeitraum",
   Umschalter für die Gruppierung, Button „Daten neu laden".
2. **Kennzahlen** — eine große Zahl „Anlagen im Zeitraum" und je Produkt eine Karte mit
   Anzahl, prozentualer Veränderung und Lebenszyklus-Hinweis.
3. **Balkendiagramm** — je Zeitabschnitt ein Block mit vier Balken (Sico6000, Sico2020,
   Sico1010, Sico5000).
4. **Datentabelle** — dieselben Zahlen zum Ablesen, plus Summenspalte.
5. **Entwicklung** — Prozentwerte bezogen auf den ersten Zeitraum (= 100 %).
6. **Lizenzen in Euro** — Formular zur manuellen Eingabe je Zeitraum, umschaltbar zwischen
   Monats- und Jahresbetrag, im Prozentvergleich zu den erfassten Anlagen. Nur für den
   Benutzer Radu sichtbar.

Startzustand beim ersten Öffnen: **die letzten 5 Kalenderjahre** (01.01.2022 – heute),
gruppiert nach Kalenderjahr.

## 2. Zeitraum wählen

Die Von/Bis-Felder bleiben frei editierbar; das Preset-Menü füllt sie nur aus. Presets
(Beispielwerte für den 21.08.2026):

| Eintrag | Von | Bis | Gruppierung |
|---------|-----|-----|-------------|
| Letzte 12 Monate | 21.08.2025 | 21.08.2026 | 12-Monats-Fenster |
| Letzte 2 / 3 / 5 Jahre (ab heute) | 21.08.2024 / 2023 / 2021 | 21.08.2026 | 12-Monats-Fenster |
| Seit Jahresbeginn | 01.01.2026 | 21.08.2026 | Kalenderjahr |
| Letzte 5 Kalenderjahre *(Start)* | 01.01.2022 | 21.08.2026 | Kalenderjahr |
| Alles seit 2012 | 01.01.2012 | 21.08.2026 | Kalenderjahr |
| Jahr 2026 … 2022 | 01.01. | 31.12. (laufendes Jahr: heute) | Kalenderjahr |

Ein Preset setzt zusätzlich die passende Gruppierung; über den Umschalter lässt sie sich
danach frei ändern.

### Die beiden Gruppierungen

- **Kalenderjahr** — ein Balkenblock je Kalenderjahr. Ein angebrochenes Jahr wird als
  „Teiljahr" markiert, damit ein niedriger Balken nicht als Einbruch missverstanden wird.
- **12-Monats-Fenster** — Fenster vom Bis-Datum rückwärts, also „jeweils zu diesem Tag ein
  Jahr zurück": 22.08.2025–21.08.2026, 22.08.2024–21.08.2025 usw. Jedes Fenster endet auf
  einem Jahrestag des Bis-Datums, dadurch entsteht keine Drift. Nur das älteste Fenster darf
  kürzer sein, wenn das Von-Datum mitten hineinfällt.

Beide Varianten **kacheln den Zeitraum exakt**: keine Lücken, keine Überlappungen. Damit
ergibt die Summe der Balken immer die Gesamtzahl der Kennzahlkarten. Nachgerechnet mit einem
Skript über den kompletten Zeitraum, Tag für Tag — jeder Tag liegt in genau einem Band,
inklusive Schaltjahr-Enddatum (29.02.2024) und Monatsende-Klemmung (31.03. minus 1 Monat →
28.02.).

## 3. Produkt-Lebenszyklus

Neu in `src/app/models/product-info.model.ts` (`PRODUCT_INFOS`), weil ein fehlender Balken
sonst als Datenlücke gelesen wird:

| Produkt | Lebenszyklus |
|---------|--------------|
| Sico6000 | Löst die Sico5000 ab, seit 2022 im Verkauf |
| Sico2020 | Nachfolger der Sico1010, im Verkauf |
| Sico1010 | Von der Sico2020 abgelöst, wird aber **weiterhin verkauft** |
| Sico5000 | Seit 2022 nicht mehr im Verkauf, ersetzt durch die Sico6000 |

In der Tabelle steht `–` statt `0`, wenn das Produkt in dem Jahr nicht verkauft wurde. Sind
trotzdem Datensätze vorhanden, gewinnt die echte Zahl — die Anzeige beschönigt nichts.

## 4. Diagramm

Kein Chart-Framework: die Balken sind HTML/CSS. Das spart den Bundle-Aufschlag einer
Bibliothek (das Initial-Budget liegt bei 500 kB) und reicht für Balken vollkommen aus.

- `grouped-bar-chart.component.ts` ist rein darstellend — `series` + `groups` rein, Balken
  raus. Es kennt weder `SicoAnlage` noch den `LicenseService`.
- Achsenskala: Ticks auf glatte Zahlen gerundet (1 / 2 / 5 × 10ⁿ), Gitternetz als 1-px-Haarlinie.
- Balken max. 24 px breit, oben 4 px gerundet, unten kantig auf der Grundlinie, 2 px Abstand
  zum Nachbarn.
- Werte stehen **nicht** an jedem Balken (das wäre unlesbar), sondern im Tooltip und in der
  Tabelle.

### Farben

Vier feste Slots (`--viz-series-1…4`), zugeordnet über `ProductInfo.colorSlot` — die Farbe
hängt am Produkt, nicht an der Reihenfolge im Diagramm. Ein geänderter Zeitraum färbt also
nichts um.

| Slot | Produkt | Farbe |
|------|---------|-------|
| 1 | Sico6000 | `#2a78d6` |
| 2 | Sico2020 | `#eb6834` |
| 3 | Sico1010 | `#1baf7a` |
| 4 | Sico5000 | `#eda100` |

Die Palette wurde geprüft (Helligkeitsband, Farbsättigung, Trennschärfe benachbarter Paare
bei normalem Sehen und bei Farbfehlsichtigkeit, Kontrast zur Fläche) — alle Prüfungen
bestanden. Zwei Farben (Aqua, Gelb) liegen unter 3:1 gegenüber der hellen Fläche; das ist
zulässig, weil die Zuordnung zusätzlich über Legende **und** Tabelle läuft. Beides darf
deshalb nicht entfallen.

Die App ist auf `color-scheme: light` festgelegt, deshalb gibt es bewusst nur die hellen
Farbwerte. Für einen Dark Mode müssten eigene Stufen gewählt und erneut geprüft werden —
Umkehren reicht nicht.

## 5. Prozentwerte

### Entwicklung gegenüber dem Basiszeitraum

Der **erste Zeitraum des gewählten Bereichs ist die Basis und zählt als 100 %**; jeder
spätere Zeitraum wird darauf bezogen. Bei „Letzte 5 Kalenderjahre" ist das also 2022 = 100 %.

| Zeitraum | Sico6000 | Sico2020 | Sico1010 | Sico5000 | Gesamt | ggü. Vorzeitraum |
|----------|---------:|---------:|---------:|---------:|-------:|-----------------:|
| 2022 (Basis) | 100 % | 100 % | 100 % | 100 % | 100 % | – |
| 2023 | 177 % | 108 % | 92 % | 0 % | 99 % | −1 % |
| 2024 | 215 % | 102 % | 82 % | 0 % | 102 % | +4 % |

*(Beispielzahlen zur Veranschaulichung des Aufbaus.)*

Die letzte Spalte zeigt zusätzlich die Veränderung gegenüber dem **direkt vorhergehenden**
Zeitraum — damit ist beides ablesbar: der lange Trend seit der Basis und der Schritt von Jahr
zu Jahr. Auf den Kennzahlkarten steht dieselbe Rechnung als Delta „ggü. <Basiszeitraum>".

Regeln, damit die Prozentwerte nicht lügen:

- **Basis 0 ⇒ kein Prozentwert.** Es steht `–`, nicht `0 %` oder `∞`. Betrifft z. B. die
  Sico6000, wenn der Bereich vor 2022 beginnt.
- **Rückgang auf 0** ergibt korrekt `0 %` bzw. `−100 %`.
- **Angebrochene Zeiträume** sind als „Teiljahr" markiert. Das laufende Jahr gegen ein volles
  Basisjahr zu vergleichen sieht sonst nach Einbruch aus; der Tooltip auf dem Karten-Delta
  weist ausdrücklich darauf hin.

### Lizenzen in Euro (manuelle Eingabe)

Formular „Lizenzen in Euro": pro Zeitraum ein Eingabefeld für einen Betrag (z. B. 5.500 €,
5.800 €).

**Die Beträge stehen bewusst nicht im Balkendiagramm.** Ein Balken mit 5.500 neben einem
Balken mit 96 Anlagen drückt die Anlagen auf eine unsichtbare Linie und vergleicht zwei
Größen, die keine gemeinsame Skala haben. Zwei Achsen in einem Diagramm sind keine Lösung,
sondern der klassische Weg, eine Korrelation zu erfinden, die es nicht gibt.

Stattdessen werden **beide Reihen auf ihren jeweils eigenen Basiszeitraum indexiert** (erster
Wert = 100 %) und nur die Prozentwerte verglichen:

| Spalte | Bedeutung |
|--------|-----------|
| Betrag (€) | Eingabefeld |
| Betrag | derselbe Wert als Währung formatiert |
| Betrag in % | Betrag bezogen auf den Betrag des Basiszeitraums |
| ggü. Vorzeitraum | Veränderung des Betrags gegenüber dem vorherigen Zeitraum |
| Anlagen | Anzahl aus der Datenbank |
| Anlagen in % | Anzahl bezogen auf den Basiszeitraum |
| € je Anlage | Betrag geteilt durch die Anzahl — die Zahl hinter dem Prozentabstand |
| Betrag ggü. Anlagen | Abstand beider Prozentwerte in **Prozentpunkten** |

Euro und Stückzahl werden nie voneinander abgezogen, nur ihre Entwicklungen.

### Warum die letzte Spalte negativ sein kann, obwohl alles steigt

Der häufigste Lesefehler, mit echten Zahlen:

| Zeitraum | Betrag | Betrag in % | Anlagen | Anlagen in % | € je Anlage | Betrag ggü. Anlagen |
|----------|-------:|------------:|--------:|-------------:|------------:|--------------------:|
| 08.2021 (Basis) | 4.800,00 € | 100 % | 78 | 100 % | 61,54 € | ±0 %-Pkt. |
| 08.2022–08.2023 | 5.190,00 € | 108 % | 101 | 129 % | 51,39 € | −21 %-Pkt. |
| 08.2023–08.2024 | 5.500,00 € | 115 % | 109 | 140 % | 50,46 € | −25 %-Pkt. |
| 08.2024–08.2025 | 5.800,00 € | 121 % | 134 | 172 % | 43,28 € | −51 %-Pkt. |
| 08.2025–08.2026 | 6.100,00 € | 127 % | 155 | 199 % | 39,35 € | −72 %-Pkt. |

Beide Reihen **steigen** — der Betrag um 27 %, die Anlagen um 99 %. Die letzte Spalte ist
`127 − 199 = −72` Prozentpunkte und sagt nur: die Anlagenzahl wächst schneller als der Betrag.
Pro Anlage bleibt entsprechend weniger übrig (61,54 € → 39,35 €).

Damit das nicht als Rückgang gelesen wird:

- Die Spalte heißt **„Betrag ggü. Anlagen"**, nicht „Differenz".
- Sie ist **neutral eingefärbt** — kein Rot. Rot/Grün ist den Spalten vorbehalten, bei denen
  eine Richtung wirklich gut oder schlecht ist.
- Der Tooltip schreibt es aus: „Gegenüber 08.2021: Betrag +27 %, Anlagen +99 %. Der Betrag
  entwickelt sich schwächer als die Anlagenzahl — beide können trotzdem steigen."
- **„€ je Anlage"** liefert die Zahl dahinter im Klartext.

### Monats- oder Jahresbetrag

Ein Umschalter über der Tabelle legt fest, was ein eingetragener Betrag bedeutet
(`amountUnit`, ebenfalls im `localStorage`).

**Auf keinen einzigen Prozentwert hat das Einfluss** — ein Index ist skaleninvariant: alle
Zeilen mit 12 zu multiplizieren lässt 100 / 108 / 115 / 121 / 127 % unverändert. Betroffen ist
allein **„€ je Anlage (Jahr)"**, denn dort wird ein Betrag durch die Anlagen eines
Zwölf-Monats-Zeitraums geteilt. Steht der Schalter auf „Monatsbetrag", wird vorher mit 12
hochgerechnet:

| Zeitraum | Monatsbetrag | Jahresbetrag | Anlagen | € je Anlage (Jahr) |
|----------|-------------:|-------------:|--------:|-------------------:|
| 08.2021 | 4.800 € | 57.600 € | 78 | 738,46 € |
| 08.2025–08.2026 | 6.100 € | 73.200 € | 155 | 472,26 € |

Ohne Umrechnung stünde dort 61,54 € bzw. 39,35 € — ein Monatsbetrag geteilt durch eine
Jahresmenge, also weder das eine noch das andere.

### Offene fachliche Frage: Zugang oder Bestand

„Anlagen" ist der **Zugang** eines Zeitraums (neu angelegte Lizenzen). Ist der eingetragene
Betrag ein wiederkehrender Beitrag über den gesamten Bestand, gehört als Nenner der
**kumulierte Bestand** dazu und nicht der Zugang — die Zahlen unterscheiden sich deutlich:

| Zeitraum | Zugang | € je neue Anlage | Bestand kumuliert | € je Anlage im Bestand |
|----------|-------:|-----------------:|------------------:|-----------------------:|
| 08.2021 | 78 | 738,46 € | 78 | 738,46 € |
| 08.2025–08.2026 | 155 | 472,26 € | 577 | 126,86 € |

Aktuell rechnet die Anzeige mit dem **Zugang**. Ob das richtig ist, hängt am Geschäftsmodell
und ist bewusst nicht geraten worden.

### Sichtbarkeit

Die Euro-Beträge sieht **nur der Benutzer Radu**; für alle anderen ist die Karte gar nicht im
DOM. Geprüft wird `authService.userName()` (Kleinschreibung, enthält `radu`) über die
Konstante `MANUAL_FIGURES_USER`.

Das ist eine **Anzeigeregel, keine Zugriffskontrolle** — und sie reicht hier auch aus, weil die
Beträge den Browser nie verlassen: sie liegen im `localStorage` (Schlüssel
`stats_manual_counts`) und werden nirgends hochgeladen. Wer denselben Browser benutzt und sich
als Radu anmeldet, sieht sie; ein anderer Rechner sieht sie nie. Sollen die Beträge einmal
serverseitig gespeichert werden, muss die Berechtigung ins Backend — eine Prüfung im Frontend
schützt dann nichts mehr.

Die Eingaben hängen am Beschriftungstext des Zeitraums, dadurch bleiben Kalenderjahre (`2024`)
und 12-Monats-Fenster (`08.2024`) automatisch getrennt. Ein Wechsel des Browsers oder ein
geleerter Speicher bedeutet: Eingaben weg.

## 6. Daten

Die API kennt keinen serverseitigen Datumsfilter. Der Tab lädt daher alle vier Produkte
einmal per `forkJoin` über das vorhandene `LicenseService.getProjects()` und filtert im
Client. Ein Zeitraumwechsel löst **keinen** neuen Request aus, nur eine Neuberechnung;
„Daten neu laden" holt die Daten frisch.

Datensätze ohne auswertbares `releaseDate` fallen aus der Zählung heraus. Ihre Anzahl steht
als Hinweis in der Zeitraum-Leiste, statt sie stillschweigend zu verschlucken.

## 7. Geänderte und neue Dateien

```
src/app/components/statistics/grouped-bar-chart.component.ts        neu (inline Template + Styles)
src/app/components/statistics/license-statistics.component.ts       neu
src/app/components/statistics/license-statistics.component.html     neu
src/app/components/statistics/license-statistics.component.scss     neu
src/app/models/product-info.model.ts                                neu (Lebenszyklus + Farbslot)
src/app/shared/german-date.ts                                       neu (gemeinsame Datums-Helfer)
src/app/components/license-dashboard/license-dashboard.component.*  fünfter Tab „Statistik"
src/app/components/license-table/license-table.component.ts         nutzt jetzt german-date.ts
.github/instructions/charts.instructions.md                         neu (Chart-Regeln)
.github/copilot-instructions.md                                     Architektur, Lebenszyklus, Pfadtabelle
docs/2026-08-21-statistik-tab.md                                    neu (dieses Dokument)
README.md                                                           Feature- und Architekturhinweis
```

`parseGermanDate`, `formatGermanDate` und `monthsBefore` lagen bisher privat in
`license-table.component.ts`. Sie sind nach `src/app/shared/german-date.ts` gewandert, damit
Tabelle und Statistik eine getippte Eingabe garantiert gleich interpretieren; die Tabelle
verhält sich unverändert.

## 8. Geprüft

- `npm run build` fehlerfrei, keine neuen Budget-Warnungen. Initial 299,81 kB / 82,67 kB
  übertragen; der Dashboard-Chunk wächst von 362,42 kB auf 415,35 kB (Statistik-Tab plus
  `MatButtonToggleModule`).
- Bandlogik numerisch nachgerechnet: Kalenderjahre, 12-Monats-Fenster, Jahresbeginn, seit
  2012, Schaltjahr, Monatsende-Klemmung, lückenlose Abdeckung.
- Prozentrechnung nachgerechnet, inklusive der Randfälle Basis 0 (`–`), Rückgang auf 0
  (`0 %` / `−100 %`), unverändert (`±0 %`) und Verdopplung (`200 %` / `+100 %`).
- Farbpalette gegen die genannten Kriterien geprüft, hell und dunkel.
- Kontrast der Delta-Farben gegen die helle Fläche: Grün `#006300` 7,19:1, Rot `#b3261e`
  6,24:1 — beide über dem WCAG-AA-Minimum von 4,5:1. Das Vorzeichen trägt die Richtung
  ohnehin schon, die Farbe kommt nur dazu.

## 9. Nicht geprüft / offen

- **Kein Browser-Test.** Das Dashboard liegt hinter dem Login, Backend-Zugangsdaten lagen
  nicht vor. Zu prüfen bleiben: Balkenhöhen mit echten Zahlen, Umbruch der Zeitraum-Leiste
  auf schmalen Fenstern, Lesbarkeit der Bandbeschriftungen bei „Alles seit 2012" (15 Blöcke).
- **Keine Tests im Repo** (`skipTests: true`), daher ist die Bandlogik nur per Skript
  nachgerechnet und nicht dauerhaft abgesichert. Wenn die Statistik wichtig wird, wäre das
  der erste Kandidat für ein Test-Setup.
- **Die Euro-Beträge sind lokal.** Sie liegen im `localStorage` dieses Browsers, sind also
  weder geräteübergreifend noch für Kollegen sichtbar und werden nicht gesichert. Für
  verbindliche Zahlen braucht es eine Tabelle im Backend — dann gehört auch die
  Berechtigungsprüfung dorthin.
- **Der Benutzername wird per `includes('radu')` geprüft.** Lautet das Login anders, muss
  `MANUAL_FIGURES_USER` angepasst werden, sonst bleibt die Karte unsichtbar.
- **Die Beträge sind Gesamtwerte je Zeitraum**, nicht pro Produkt, und ohne feste Einheit
  (Monats- oder Jahresbetrag). Beides wäre eine Erweiterung des Formulars.
- **Ladezeit** bei sehr vielen Anlagen: es werden immer alle Datensätze aller vier Produkte
  geladen. Wird das spürbar, braucht die API einen Zeitraum-Parameter oder einen
  Aggregat-Endpunkt.
