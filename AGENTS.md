# Repository agent guidance

## vBook extension work

For any task that creates, fixes, tests, audits, refactors, builds, or installs a vBook extension, use the `vbook-extensions` skill at `.agents/skills/vbook-extensions/SKILL.md`.

1. Read `SKILL.md` completely before changing an extension.
2. Read only the matching mode file under `.agents/skills/vbook-extensions/modes/` (`create`, `fix`, `test`, `audit`, or `refactor`).
3. Treat `extension-api.md` and `.agents/skills/vbook-extensions/reference/extension-api.md` as the current API contract. Keep the two files identical; when the contract changes, update both, then the skill guidance and templates.
4. Test, build, and install only through `.agents/skills/vbook-extensions/scripts/vbook.js`; follow its connection and verification rules from the skill.
5. `.agents/skills/vbook-extensions` is the only canonical skill source. `.claude/skills/vbook-extensions/SKILL.md` is only a compatibility pointer that tells Claude Code to read the canonical skill; do not copy references, modes, templates, or scripts into `.claude`.

Do not infer permission to build, install, commit, or push from a request that only asks for review, documentation, or source edits.

## Repository state

Source-first layout: every extension keeps plaintext `src/` plus `plugin.json`, `icon.png` and the built `plugin.zip`. `vbook.js test|build|install` works for all of them.

- Read `HANDOFF.md` first: current state, device connection steps, open items, pitfalls.
- Read `README.md` for the layout and `docs/WORKFLOW.md` for the create/test/release workflow.
- Read `docs/SYSTEM-OVERVIEW.md` for the runtime architecture, API contract layers, CLI path and common pitfalls (see its banner for which parts apply here).
- Run `python scripts/check_repo.py` before committing; exit 0 is required.
- Never commit API keys or personal host addresses into `src/` or `plugin.json`.

## Agent execution gates (for pi)

1. **Diagnose & SPEC first:** When a failure has an unclear root cause, run read-only or temporary diagnostic probes only (remove temporary probes afterward). Write `<ext>/SPEC.md` summarizing verified facts and options, then **stop and ask the user to choose an option** before applying code fixes.
2. **Hard stop after 3 failed attempts:** In FIX mode, if `vbook.js test` still fails after at most 3 fix/retest cycles, **stop immediately** — do not keep looping on speculative edits.
3. **Explicit PASS / FAIL report:** Start every test or fix report with a clear **PASS** or **FAIL** status, followed by a per-script status table (`PASS` / `FAIL` / `UNTESTED`) and exact `vbook.js` output/evidence.
4. **Handoff on stop:** When stopping on FAIL or handing off work, write or update `<ext>/HANDOFF.md` with verified findings, device/network setup, and concrete next steps.

## Agent skills

### Issue tracker

Issue và spec là file markdown trong `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Dùng bộ nhãn mặc định (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), ghi ở dòng `Status:` của file issue. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: một `GLOSSARY.md` và `docs/adr/` ở thư mục gốc. See `docs/agents/domain.md`.
