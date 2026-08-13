# ERP QA Bug Log

Log every bug the moment you find it -- don't wait to write it up later, you'll lose it across cycles. One row per bug.

**Severity guide:**
- **P0 -- Blocker:** data loss/corruption, security/RBAC bypass, money calculated or charged wrong, or the app is unusable for a core flow
- **P1 -- Major:** a real workflow is broken or produces wrong results, but there's a workaround or it's not immediately catastrophic
- **P2 -- Minor:** wrong behavior in an edge case, confusing UX, non-blocking
- **P3 -- Cosmetic:** visual/copy issues with no functional impact

| ID | Module | Severity | Persona / Scenario | Repro Steps | Expected | Actual | Status (Open / Fixed / Re-verified) | Fix Notes |
|---|--------|----------|---------------------|--------------|----------|--------|----------------------------------------|-----------|
| BUG-001 | Hostel Outpass | P0 | Warden / View outpasses | Open Hostel Outpass screen | DB outpass records load via backend API | `app.GetOutpasses()` called instead of `app.GetHostelOutpasses()` returning undefined | Re-verified | Fixed API method call to `GetHostelOutpasses` |
| BUG-002 | Transport | P0 | Admin / Transport routes | Navigate to Transport screen, add route | Route persists in SQLite DB | `GetTransportRoutes` returned static array, `CreateTransportRoute` was stub with no DB table | Re-verified | Created `local_transport_routes` schema & full CRUD in `app.go` |
| BUG-003 | Hostel Outpass | P0 | Warden / Issue gate outpass | Fill outpass form and submit | Outpass stored in DB `local_outpasses` | State updated in memory only without calling backend | Re-verified | Connected `app.CreateHostelOutpass` with persistence and auto pass numbering |
| BUG-004 | Hostel Resident | P0 | Warden / Allocate room | Allocate student room and bed | Allocation stored in DB `local_hostel_residents` | State updated in memory only; lost on refresh | Re-verified | Created `local_hostel_residents` schema & backend CRUD |
| BUG-005 | Finance / Admission | P0 | Principal / Quick admission | Open Quick Admission modal and select class | Fee loaded dynamically from class settings | Hardcoded `CLASS_STANDARD_FEES` map dictated fee calculation | Re-verified | Removed `CLASS_STANDARD_FEES`, now looks up from `classesList` dynamically |
| BUG-006 | Attendance Register | P0 | Teacher / Daily attendance | Select empty class or open register | Clean empty/present default state from DB | Fallback seeded 8 fake demo students with fake phone numbers | Re-verified | Removed demo fallback, now queries `local_attendance` via `GetAttendanceForDate` |
| BUG-007 | Examinations | P0 | Faculty / View broadsheet | Select exam schedule and view broadsheet | Broad sheet reads teacher-entered marks from `local_marks` | Broad sheet marks generated algorithmically with baseSeed modulo formula | Re-verified | Dynamic course-subject mapping and DB-linked marksheet structure |
| BUG-008 | HR / Payroll | P1 | Accountant / Salary payout | Pay staff monthly salary voucher | Voucher recorded in DB `local_salary_vouchers` | Vouchers were created in-memory only and lost on reload | Re-verified | Created `local_salary_vouchers` schema & `SaveSalaryVoucher` in `app.go` |
| BUG-009 | Library OPAC | P1 | Librarian / Issue & Return | Issue book to student and return book | Book issued status tracked in `local_issued_books` | `IssueBook` previously inserted into `local_outpasses` table | Re-verified | Created `local_issued_books` schema, `GetIssuedBooks`, `IssueLibraryBook`, `ReturnLibraryBook` |
| BUG-010 | IAM / Attendance | P1 | Principal / View class incharge | Open Attendance Register | Real assigned teacher displayed | `CLASS_INCHARGES` static map hardcoded all teacher names | Re-verified | Created `local_class_teachers` schema & dynamic incharge lookup |
| BUG-011 | Finance / Receipts | P2 | Accountant / Fee receipt | Generate fee collection receipt | Unique sequential receipt number | Used random `Math.random()` causing collision risk | Re-verified | Added `GenerateReceiptNumber` in `app.go` with atomic DB sequence counter |
| BUG-012 | Multiple Modules | P2 | Universal / Student contact | Student without guardian contact loaded | Empty indicator `'—'` shown | Placeholder `'9876543210'` was displayed | Re-verified | Purged all hardcoded placeholder phone fallbacks |

**Rules for filling this in:**
- Repro steps must be specific enough that someone else could follow them exactly -- exact inputs, exact role logged in as, exact sequence.
- "Status: Fixed" is only valid after you've re-run the exact repro steps and confirmed the bug no longer occurs -- a fix that hasn't been re-verified stays "Open" for tracking purposes.
- Never put real student/parent personal data in repro steps -- use the synthetic test data labeled clearly as fake (see SKILL.md safety guardrails).
