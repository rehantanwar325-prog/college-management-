# Personas & Real-World Scenarios

The single biggest difference between a toy test ("create a student record, verify it saved") and a test that actually finds enterprise-breaking bugs is testing *as a specific person, in a specific messy situation*. Pull from here whenever step 4 of the workflow asks for a persona and scenario.

## Super Admin / Head Office
Manages multiple branches, sees org-wide config and reports.
- Changes a fee structure for next academic year while the current year is still mid-cycle -- does it accidentally affect current dues?
- Deactivates a branch admin's account while that admin has in-progress unsaved bulk operations
- Pulls a cross-branch report and needs the numbers to actually reconcile against each branch's own dashboard

## School/College Admin
Runs day-to-day operations for one branch.
- Onboards 200 new students at the start of the year via bulk import, with a handful of rows that have typos or missing fields
- Needs to correct a wrongly-entered date of birth after the student has already been issued a report card referencing age-based eligibility
- Handles a parent complaint about being charged twice -- needs to trace exactly what happened in the payment log

## Principal / Director
Oversight role, usually read-heavy with some approval actions.
- Approves a fee waiver request that needs to override the standard fee calculation for one specific student
- Reviews attendance/performance dashboards during a parent meeting and needs the numbers to be trustworthy on the spot, not "usually right"

## Teacher / Class Teacher
Highest-frequency daily user, often on a phone or a shared classroom computer.
- Marks attendance for 45 students in one sitting on a spotty school wifi connection, and the submission needs to not silently fail or double-submit if she taps twice
- Realizes she marked the wrong student absent five minutes after submitting, and needs to correct it -- does the system allow it, and does it leave an audit trail?
- Enters exam marks for her subject across three sections back-to-back, and a typo (95 entered as 950) needs to be caught, not silently accepted
- Gets temporarily assigned as a substitute for another class and needs exactly the right (and no more) temporary access

## Accountant / Fee Clerk
Handles money, so mistakes here are the most consequential.
- Collects a partial cash payment at the counter while a parent is also trying to pay online for the same invoice at the same time
- Issues a refund and needs the original receipt and the refund to both be traceable, not just a balance that quietly changed
- Runs the month-end fee collection report and needs it to match actual bank/gateway settlement, not just what the app recorded

## Student
Often the least trusted client (may share a login, may be on an old phone).
- Checks their own report card and fee status from a personal phone, and must never be able to see or infer another student's data by fiddling with a URL or app request
- Tries to access a feature that's been restricted (e.g. viewing marks before official publish) by directly navigating to a URL

## Parent / Guardian
Frequently has more than one child, sometimes across different classes or even different branches.
- Has three children in three different classes and needs to switch between their dashboards without ever seeing a sibling's data bleed into the wrong one
- Pays a fee installment from a mobile browser where the payment gateway redirect fails to return properly -- does the app know the payment actually succeeded?
- Is a divorced/separated parent where only one guardian should have portal access, or both should but with different permissions

## Librarian
- Processes a book return for a book that was already marked lost/replaced
- Handles a reservation queue when the currently-issued copy is returned late

## Transport Coordinator
- Reassigns a student to a new bus route mid-year and needs the fee and the driver's manifest both to update consistently
- Handles a bus that's over capacity for its assigned route after a batch of new admissions

## HR Manager
- Processes payroll for a staff member who took mid-month leave, and the deduction needs to calculate correctly
- Changes a teacher's role and needs their system permissions to update immediately, not after their next login

## IT/System Integrator (for API and integration-level scenarios)
- Registers a webhook for payment confirmation and needs it to be idempotent if the gateway retries delivery
- Needs API rate limits to be sane for a legitimate bulk operation (e.g. syncing 500 students overnight) without needing to work around them

---

When in doubt, make the scenario *specific*: name a realistic quantity (45 students, not "some students"), a realistic failure condition (slow connection, double-tap, two people acting at once), and a realistic follow-on action (correcting a mistake after submission, not just submitting once and stopping).
