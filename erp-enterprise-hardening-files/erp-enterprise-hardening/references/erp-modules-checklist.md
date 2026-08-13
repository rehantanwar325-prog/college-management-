# ERP Modules Checklist

Use this to seed and refresh `progress-tracker.md`. For each module in scope, copy the relevant bullets into the tracker as checkboxes. Skip modules that don't exist in this codebase, but note them as "not built" rather than deleting the section -- that way future cycles know it was considered, not missed.

Every bullet here is a starting point, not the ceiling -- once you're actually in a module, real bugs usually turn up in the gaps *between* these items, not the items themselves.

## Table of contents
1. Admissions & Enrollment
2. Student Information System (SIS)
3. Attendance
4. Fee Management
5. Examinations & Report Cards
6. Timetable & Substitution
7. Library
8. Transport
9. Hostel
10. HR & Payroll (staff)
11. Communication & Notifications
12. Document Management
13. Multi-branch / Multi-campus
14. Role-Based Access Control (cross-cutting)
15. Reports & Dashboards
16. Bulk Import / Export
17. Academic Year Rollover & Promotion
18. Parent Portal / Mobile App
19. Payment Gateway Integration
20. Alumni

---

## 1. Admissions & Enrollment
- New applicant form: required-field validation, duplicate applicant detection (same name+DOB+parent phone submitted twice)
- Document upload during application (birth certificate, transfer certificate, photo) -- file type/size limits enforced server-side, not just in the UI
- Seat availability logic under concurrent applications (two applicants grabbing the last seat in a section at the same moment)
- Application status transitions (submitted -> under review -> shortlisted -> admitted/rejected) -- can a status be skipped or reversed incorrectly?
- Fee/deposit collection tied to admission confirmation
- Sibling/quota/reservation category handling
- Mid-year admission into an already-running academic year (partial fee proration, joining an in-progress timetable)
- Waitlist promotion when a seat opens up

## 2. Student Information System (SIS)
- Create/edit/deactivate student profile; deactivation vs. hard delete (should preserve historical records)
- Class/section transfer mid-year, including history of previous sections
- Multiple guardians per student (custody situations, who has portal access, who can be removed)
- Duplicate student detection across the same or different classes
- Required document tracking (ID proof, previous school TC, medical info) with expiry/renewal where relevant
- Search/filter performance at realistic scale (thousands of students, not the 5 seeded in dev)

## 3. Attendance
- Single-entry vs. bulk marking (bulk marking 40+ students in one action)
- Editing attendance after submission -- who is allowed to, and is there an audit trail of the change?
- Biometric/RFID integration failure handling (device offline, duplicate scan, scan for a student not enrolled in that class)
- Leave application affecting attendance calculation
- Attendance percentage calculation correctness (does a half-day count as 0.5? does a public holiday get excluded from the denominator?)
- Substitute teacher marking attendance for a class that isn't theirs
- Attendance report export matching what's actually stored (spot-check totals)

## 4. Fee Management
- Fee structure setup per class/category (regular, scholarship, sibling discount, staff-ward discount) and what happens when a student qualifies for more than one
- Partial payments and installment plans -- does the balance calculate correctly across multiple partial payments?
- Late fee auto-calculation (does it apply correctly at the exact due-date boundary, and to partial payments?)
- Refunds and their effect on already-issued receipts/invoices
- Duplicate payment prevention (double-click submit, browser back-and-resubmit, two devices paying the same invoice at once)
- Payment gateway failure/timeout handling -- does money get deducted but the record not update? Is there a reconciliation path?
- Receipt/invoice generation correctness (tax fields if applicable, running receipt numbering with no gaps or collisions)
- Fee defaulter list and any resulting access restriction (e.g. exam hall ticket blocked) -- correctness and reversibility once paid
- Concurrent fee collection at a physical counter by two clerks for the same student

## 5. Examinations & Report Cards
- Grade/marks entry, including bulk entry and bulk edit
- Grade calculation logic (weighted averages, grace marks, moderation) -- verify the actual formula, don't assume it matches the spec
- Re-evaluation/correction workflow after a report card has already been generated or shared with parents
- Rank/percentile calculation correctness, including ties
- Report card generation for a student with incomplete data (absent for one exam, transferred mid-term)
- Locking exams after results are published -- can marks still be silently edited?
- Multiple exam types (unit test, mid-term, final) rolling up correctly into a final grade

## 6. Timetable & Substitution
- Conflict detection (same teacher or same room double-booked)
- Substitute teacher assignment when a teacher is on leave, and whether the substitute gets correct temporary access
- Timetable changes propagating to attendance, student view, and parent notifications consistently
- Handling of shared resources (labs, sports periods across multiple sections)

## 7. Library
- Book issue/return with due-date and fine calculation
- Duplicate/lost book handling and inventory count reconciliation
- Reservation queue when a popular book is currently issued
- Barcode/ISBN scan failure handling

## 8. Transport
- Route/stop assignment per student, including students who change stops mid-year
- Capacity limits per bus and what happens when a route is over-subscribed
- GPS tracking accuracy and failure/offline handling if live tracking exists
- Fee tied to transport module, prorated for mid-year joiners/leavers

## 9. Hostel
- Room allocation and capacity limits
- Check-in/check-out logging, including late-night entries and leave requests
- Mess/meal tracking if applicable
- Fee tied to hostel module, similar proration concerns as transport

## 10. HR & Payroll (staff)
- Salary structure, deductions, and payslip generation correctness
- Leave management for staff (accrual, approval workflow, balance going negative)
- Attendance/biometric tie-in for payroll calculation
- Role changes (teacher promoted to coordinator) and whether permissions update correctly and immediately

## 11. Communication & Notifications
- SMS/email/push delivery to the correct recipient list (does a class-wide notice actually exclude students who left that class?)
- Delivery failure handling and retry -- silent failures are worse than visible ones
- Parent-teacher messaging privacy (can one parent see another parent's thread?)
- Notification volume/rate limits so a bulk send doesn't get throttled or dropped silently

## 12. Document Management
- Transfer Certificate (TC) and other official document generation with correct, non-editable-after-issue content
- Certificate templates per document type, and version control if templates change
- Access control on sensitive documents (who can generate/download a TC or report card)

## 13. Multi-branch / Multi-campus
- Data isolation between branches (does branch A's admin ever see branch B's students?)
- Shared vs. branch-specific configuration (fee structure, academic calendar)
- Cross-branch reporting for a head office/super-admin role

## 14. Role-Based Access Control (cross-cutting)
See `references/security-checklist.md` for the full matrix -- but at minimum, for every module above, explicitly test: can each role reach only what it should, both through the UI and by directly hitting the API/URL with another user's ID?

## 15. Reports & Dashboards
- Report totals reconciling against the underlying raw data (spot-check, don't trust the dashboard number blindly)
- Report generation performance at realistic data volume
- Export formats (PDF/Excel/CSV) matching on-screen data exactly, including special characters and long names

## 16. Bulk Import/Export
- CSV/Excel bulk student import: malformed rows, duplicate rows, missing required columns, wrong data types, partial-failure handling (does row 500 failing roll back rows 1-499 or leave a half-imported mess?)
- Character encoding for names with special characters/diacritics
- Export completeness at scale (does exporting 10,000 records time out or truncate silently?)

## 17. Academic Year Rollover & Promotion
- Bulk promotion of students to the next class/grade, including students who should be held back
- Data continuity across academic years (historical attendance/marks still accessible after rollover)
- What happens to in-progress fee dues or pending admissions during rollover

## 18. Parent Portal / Mobile App
- A parent with multiple children seeing all of them correctly, with no cross-contamination of one child's data into another's view
- Mobile responsiveness / actual mobile app behavior on a slow or intermittent connection
- Push notification opt-in/opt-out actually being respected

## 19. Payment Gateway Integration
- Success, failure, and timeout paths all reconciling correctly with the fee ledger
- Webhook/callback handling if the gateway confirms payment asynchronously -- does a delayed webhook update the record correctly, or does it get lost if the user already navigated away?
- Idempotency on retried payment confirmations

## 20. Alumni
- Data retention/migration when a student becomes an alumnus (graduates or leaves)
- Alumni access scope (should be far more restricted than current-student access)
