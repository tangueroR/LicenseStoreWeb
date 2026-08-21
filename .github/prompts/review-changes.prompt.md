---
mode: agent
description: Review pending changes against this project's rules.
---

Review the current diff against the rules in `.github/copilot-instructions.md` and
`.github/instructions/*.instructions.md`. Report concrete findings with file and line;
do not restate rules that are already followed.

Check in this order:

1. **Domain correctness** — is any `SicoAnlage` field read with the wrong meaning for the
   product? (`modemPassword` = IP and `password3` = Wireguard for Sico2020/6000,
   `password4` = premium password, `password5` = version.) Is `IP|Wireguard` splitting and
   the `user|wireguard|ip` encoding handled for network products only?
2. **Permissions** — is every create/delete control behind `authService.canManageLicenses()`?
3. **Angular idioms** — `standalone: true` written out, `*ngIf` / `*ngFor`, `ngClass` /
   `ngStyle`, `@HostBinding`, missing `track`, missing `OnPush`, constructor injection in
   new code, `any`.
4. **Templates** — logic or method calls in interpolations that should be `computed()`,
   arrow functions, globals.
5. **Accessibility** — unlabelled icon buttons, contrast lowered via `opacity`, keyboard
   traps, focus lost after dialogs or panels close.
6. **Errors and feedback** — every `subscribe` has an `error` branch, loading flags are
   reset in both branches, German snackbar text.
7. **Secrets** — no token, password or generated license value in `console.log`.
8. **Version** — if this ships a user-visible change, was `environment.version` bumped in
   both environment files?
