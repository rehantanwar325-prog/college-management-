---
name: erp-enterprise-hardening
description: Use this skill whenever the user is building, extending, reviewing, or asking about their school/college management ERP (admissions, attendance, fees, exams/grades, timetable, library, transport, hostel, HR/payroll, communication, reports, multi-role access) and wants an AI-built feature actually tested, bugs found and fixed, or the product pushed toward enterprise-grade quality. Always invoke this skill after implementing or modifying any ERP feature, module, page, or endpoint -- even if the user only says something short like "test this", "isko check karo", "bug dhundo", "improve karo", "is feature ko dekho" -- rather than doing a quick one-off glance. This skill exists specifically to keep fast/short-context models (e.g. Gemini Flash) engaged through a long, multi-cycle test-fix-verify loop instead of stopping after a single pass, by anchoring all progress in persistent files on disk rather than in conversation memory.
---

# ERP Enterprise Hardening

## Why this skill exists

A fast, cheap model asked to "test this feature" will typically write the feature, click through the one happy path, say "looks good!", and stop. That's not what a school or college ERP needs. It has half a dozen very different user types (admin, teacher, accountant, parent, student, transport staff...) hitting it under messy real conditions -- slow mobile networks, bulk operations on hundreds of students, two people editing the same fee record at once, a parent with three kids in three different classes. A feature that "works" on the happy path can still be nowhere near ready for that.

This skill turns a one-line request into a standing test-fix-verify loop that keeps going, cycle after cycle, until the feature actually holds up -- and it does this in a way that works even for models that don't naturally sustain long tasks, by never asking the model to hold the whole plan in its head.

## Core principle: the plan lives on disk, not in your head

Any single response has limited room to "think ahead." Instead of relying on yourself to remember a 40-item test plan across many turns, externalize everything into two files that live in the project:

- `erp-qa/progress-tracker.md` -- the master checklist of what's been tested and what hasn't, plus a running scorecard.
- `erp-qa/bug-log.md` -- every bug found, its severity, and its fix status.

Because the state lives on disk, a model that "forgets" the big picture between turns can still pick up exactly where it left off -- it just re-reads the files. This is the whole trick for keeping short-context models on task: never depend on memory, always depend on the filesystem.

At the start of **any** work under this skill:

1. Check whether `erp-qa/progress-tracker.md` exists in the project root. If not, create it by seeding from `references/erp-modules-checklist.md` (use `assets/progress-tracker-template.md` as the file structure) -- but first trim it to only the modules that actually exist or are in scope in this codebase; note modules that don't exist yet as "not built" rather than deleting them, so future work knows they were considered.
2. Check whether `erp-qa/bug-log.md` exists. If not, create it using the row format in `assets/bug-report-template.md`.
3. Read both files in full before doing anything else. This is your entire situational awareness -- trust it over any assumption about what "should" already be tested.

## Do one focused unit of work per cycle

Don't try to test the whole ERP in one giant sweep. Pick the single next thing that matters most (see workflow below), do it thoroughly, log the result, and update the tracker -- before you do anything else. A cycle is: read state -> do one real thing -> write state back. Small, disk-anchored cycles are what let a weak model make real progress over a long task instead of losing the thread halfway through a huge to-do list.

## The continue-or-stop check

Run this check at the end of every cycle, out loud in your own reasoning:

- Are there unchecked items left in `progress-tracker.md`?
- Are there any open P0 or P1 bugs in `bug-log.md` (including ones you just fixed but haven't re-verified)?

If the answer to either is yes, **do not stop and hand back to the user**. Continue straight into the next cycle within the same turn if you have room to, or make it explicit that you're continuing and proceed. Only stop and return control to the person when:

- Every in-scope module in the tracker is fully tested, every P0/P1 bug is fixed and re-verified, and the scorecard in `references/scorecard-rubric.md` clears the enterprise-readiness bar, **or**
- You hit a genuine blocker that needs a human decision -- missing credentials, an ambiguous business rule ("should sibling discount stack with scholarship discount?"), or a destructive action that needs sign-off before you touch it. Write the blocker explicitly into the tracker under a "Needs human input" section and explain it plainly in your reply.

Never say "testing complete" or "this is enterprise-ready" just because you got through the obvious cases once. The scorecard is the actual finish line -- quote your current score against it before calling anything done, and if you haven't finished scoring every category, say so instead of rounding up.

## Access modes -- use whichever combination is actually available

This project gives you code, a live app, and API access. Use all three together rather than picking one:

- **Source code review** -- read the actual implementation to find logic bugs, missing validation, and RBAC checks that exist only on the frontend (a very common real bug: an API endpoint with no server-side permission check because someone assumed the UI would prevent misuse).
- **Live app testing** -- actually log in as each persona and click through the real scenario in `references/personas-and-scenarios.md`. This is the only mode that catches real UX and integration failures (broken loading states, silent failures, race conditions you can only see by actually triggering them).
- **API testing** -- hit endpoints directly (bypassing the UI) to check what the server actually enforces, not just what the frontend hides. This is often where you'll find the RBAC and validation gaps that live testing alone would miss, because the UI quietly prevents you from constructing the "bad" request that a real attacker or a buggy mobile client wouldn't be shy about sending.

**Safety guardrails, non-negotiable:**
- Confirm you're pointed at a staging/test/local environment, not production, before doing anything. If it's ambiguous, ask.
- Use synthetic test data you clearly label as fake (e.g. "Test Student — QA1", "test.parent+qa1@example.com") -- never real student or parent data.
- Any destructive action (bulk delete, schema change, irreversible data mutation) needs an explicit human go-ahead first, even in a test environment, unless the user has already told you it's disposable.
- Never write secrets, tokens, or real personal data into `bug-log.md` or your replies.

## Workflow, per cycle

1. **Environment discovery (first cycle only).** Identify the stack, how to run the app locally if needed, what test/seed data or personas already exist, and which of the three access modes are actually usable right now. Note this at the top of the progress tracker so you don't re-derive it every cycle.
2. **Build or refresh the master test plan.** Cross-reference `references/erp-modules-checklist.md` against what actually exists in this codebase. Write the result into `progress-tracker.md` as a checklist grouped by module. Skip modules that genuinely don't apply to this school/college's setup, but note them as out-of-scope rather than silently omitting them.
3. **Pick the next item.** Re-verifying an open P0/P1 bug you already fixed takes priority over starting new coverage. Otherwise take the next unchecked tracker item.
4. **Test it like a real user, not like a unit test.** Pull the matching persona and scenario detail from `references/personas-and-scenarios.md` -- not "create an attendance record" but "a class teacher marks 45 students present in bulk on a slow connection, then has to correct one entry after submitting." Realistic messiness is where the actual bugs live.
5. **Probe adjacent failure modes while you're there.** For whatever you just tested, also check: an edge case (empty state, max values, duplicate submission), an RBAC/security angle from `references/security-checklist.md` (can a different role or a different user's ID reach this data?), and a data-integrity angle (what happens if this happens twice at once, or a network drop happens mid-submission?).
6. **Log every bug immediately** in `bug-log.md` using `assets/bug-report-template.md`'s format, with a severity, the moment you find it -- don't hold bugs in memory to write up "at the end," you will lose them across cycles.
7. **Fix what you can.** This is a fix loop, not just a report. After a fix, re-run the exact scenario that originally exposed the bug before marking it resolved -- a fix you haven't re-verified is still an open bug.
8. **Update the tracker and scorecard**, run the continue-or-stop check, and move to the next item.

## What "enterprise-grade" actually means here

Don't let this become a vague vibe. `references/scorecard-rubric.md` breaks it into scored categories: functional coverage, security & RBAC, data integrity under concurrency, error handling & resilience, performance under realistic load, auditability, accessibility, data-privacy handling for minors' data, and backup/restore readiness. Report your running score against this rubric, not a subjective impression.

## Reference files

- `references/erp-modules-checklist.md` -- the full module-by-module test checklist; use it to seed and refresh the tracker.
- `references/personas-and-scenarios.md` -- who actually uses this software and the realistic messy situations each one runs into; use it to make every test scenario-based instead of a bare CRUD check.
- `references/security-checklist.md` -- the RBAC matrix and auth/injection/data-handling checks to run against every module.
- `references/scorecard-rubric.md` -- the actual enterprise-readiness scoring rubric; this is your definition of done.
- `assets/progress-tracker-template.md` -- structure to seed `erp-qa/progress-tracker.md`.
- `assets/bug-report-template.md` -- row format for every `bug-log.md` entry.

## Talking to the user

Keep replies short and specific -- the tracker and bug log are the source of truth, not the chat. Every reply should state: what you just tested/fixed, what you found (with exact repro steps for any new bug, not a vague "there's an issue somewhere"), the current scorecard total, and what the next cycle will cover. If you're about to stop, say explicitly whether it's because everything's actually done (quote the scorecard) or because you hit a blocker (name it precisely) -- don't let a stop look the same as a finish.
