# Security & RBAC Checklist

Run this against every module, not just once for the whole app -- a permission check that's correct on the Fee module tells you nothing about whether the Exam module has one at all.

## RBAC matrix -- the core technique

For every role in the system (Super Admin, Branch Admin, Principal, Teacher, Accountant, Librarian, Transport Coordinator, HR, Student, Parent), write out and test:
- What this role **should** be able to see and do
- What this role should **not** be able to see or do, especially data belonging to a different branch, class, or individual

Then actually test the "should not" list two ways:
1. **Through the UI** -- is the option even visible/reachable?
2. **Directly at the API/URL level** -- log in as the restricted role, then manually change an ID in the request (e.g. `/api/students/1042` -> `/api/students/1043`, or a fee record belonging to a different family) and see whether the server rejects it or happily returns the data. This is the single most common real-world gap: a UI that hides the button but a server that never actually checks who's asking. If the frontend is the only thing enforcing a permission, that's a P0 bug, not a P2.

## Authentication & session handling
- Password policy actually enforced server-side (not just a frontend hint)
- Session expiry works, and expired sessions are actually rejected server-side, not just redirected client-side
- Forgot-password token: expires, can't be reused after it's been used once, isn't guessable/sequential
- OTP (if used for parent/student login): expires, rate-limited against brute force, isn't reusable after success
- Account lockout or rate limiting after repeated failed login attempts
- Logout actually invalidates the session server-side, not just clears local state

## Input validation & injection
- SQL/NoSQL injection on any field that reaches a database query, especially search/filter fields
- Script injection (XSS) on any field that gets rendered back to another user -- e.g. a "reason for leave" field a teacher later views, a student name that gets displayed elsewhere
- File upload validation: file type actually checked server-side (not just by extension), size limits enforced, and uploaded files aren't served in a way that lets an uploaded script execute
- Mass-assignment style bugs: can a request include extra fields (e.g. `"role": "admin"` or `"fee_paid": true`) that the server naively accepts instead of ignoring?

## Data-integrity under concurrency
- Two simultaneous requests that both should succeed independently (two different parents paying two different invoices at once) don't interfere with each other
- Two simultaneous requests that should NOT both succeed (two people paying the exact same invoice, two admissions grabbing the last seat) are correctly serialized -- one should win cleanly, not both partially succeed or corrupt the balance

## Data privacy for minors' data
Most of the personal data in a school/college ERP belongs to minors, and India's Digital Personal Data Protection (DPDP) Act 2023 treats children's data as a distinct, higher-scrutiny category (e.g. around consent and processing). This skill flags that context so you design and test with it in mind -- it is not legal advice, and actual compliance sign-off should come from the school's own legal/compliance review, not from this checklist. Practically, still test for:
- Data minimization: does a role that only needs a student's name and class also get handed their full profile (address, parent phone, medical info) unnecessarily?
- Parental consent/visibility settings, if the product has them, are actually enforced rather than cosmetic
- Exported reports/CSVs don't leak more fields than the exporting role should see

## Audit trail
- Sensitive changes (marks after publish, fee record edits, attendance edits after submission, role/permission changes) are logged with who/when/what-changed, not just overwritten silently
- Audit logs themselves aren't editable by the same roles they're meant to audit

## Rate limiting & abuse
- Bulk-action endpoints (bulk SMS, bulk fee reminder, bulk import) have sane limits so a mistake or a malicious actor can't spam thousands of notifications in one call
- Public-facing endpoints (admission enquiry form, public API if any) are rate-limited against scripted abuse
