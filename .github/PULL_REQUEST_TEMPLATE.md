# Änderung

<!-- Was ändert dieser PR und warum? -->

## Art der Änderung

- [ ] Bugfix
- [ ] Neues Feature
- [ ] Refactoring / Aufräumen
- [ ] Dokumentation / Instructions

## Betroffene Produkte

- [ ] Sico1010
- [ ] Sico5000
- [ ] Sico2020
- [ ] Sico6000
- [ ] produktunabhängig

## Checkliste

- [ ] `npm run build` läuft ohne Fehler und ohne neue Budget-Warnungen
- [ ] Im Browser geprüft (Login, betroffener Tab, Filter, Passwort generieren)
- [ ] Angular-Regeln eingehalten (Signals, `@if`/`@for`, OnPush, `inject()`, kein `any`)
- [ ] Feldbedeutungen pro Produkt korrekt (`modemPassword`/`password3` bei Sico2020/6000)
- [ ] Schreibende Aktionen hinter `authService.canManageLicenses()`
- [ ] Barrierefreiheit: Labels, Fokus, Kontrast (WCAG AA)
- [ ] `environment.version` in **beiden** Environment-Dateien angepasst
