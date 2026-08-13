# Enterprise-Readiness Scorecard

This is the actual definition of "done" for this skill -- not a feeling, a score. Recalculate it every cycle and quote it in your replies to the user. Adjust the specific numeric targets (page-load time, concurrent user count, data volume) to this school/college's real scale -- a 300-student school and a 15,000-student university system don't need identical targets, but every category still needs an honest score, not a skip.

Score each category 0 / 1 / 2:
- **0 -- Fail:** not addressed, or known to be broken
- **1 -- Partial:** works for the common case but has known gaps
- **2 -- Pass:** works correctly including realistic edge cases, verified by an actual test, not assumed

| # | Category | What "2 -- Pass" looks like |
|---|----------|------------------------------|
| 1 | Functional coverage | Every in-scope module in `progress-tracker.md` is fully checked off, tested via realistic persona scenarios, not just happy-path CRUD |
| 2 | Security & RBAC | Every role's "should not access" list from `security-checklist.md` is tested at both UI and API level, with zero gaps found or all found gaps fixed and re-verified |
| 3 | Data integrity under concurrency | Concurrent-write scenarios (double payment, simultaneous seat allocation, simultaneous edits) tested and correctly handled, not just "seems fine when tried once" |
| 4 | Error handling & resilience | Network drops, gateway timeouts, and partial failures (e.g. bulk import row 500 failing) are handled gracefully with a clear state the user can recover from, not a silent inconsistency |
| 5 | Performance under realistic load | Core flows (attendance marking, fee collection, report generation, bulk import) tested at a data volume close to this institution's real scale, not the handful of seed records in dev |
| 6 | Auditability | Sensitive changes are logged with who/when/what, and the audit trail itself is tamper-resistant to the roles it audits |
| 7 | Accessibility | Core parent/student/teacher flows are usable via keyboard and screen reader, with sensible contrast and labeling -- especially relevant since parents and students span a wide range of devices and abilities |
| 8 | Data privacy for minors | Data minimization and consent/visibility settings from `security-checklist.md` are enforced, not cosmetic (flagged as a compliance-context item, not a legal sign-off) |
| 9 | Backup / restore readiness | There's an actual, tested path to restore data after a mistake or failure -- "we have backups" that have never been restored from don't count as a pass |
| 10 | Documentation | Enough written down (in the repo or the tracker) that a new developer or support staffer could understand what a module does and how it's meant to behave, without re-deriving it from the code |

**Total: sum of all 10 categories, max 20.**

Suggested bar for calling something genuinely enterprise-grade: **≥ 18/20, with zero open P0 bugs and zero open P1 bugs**, and every category individually at least a 1 (no outright 0s hiding behind a high total). Below that, keep cycling -- and always report which specific categories are holding the score back, not just the total number, so the next cycle knows exactly what to work on.
