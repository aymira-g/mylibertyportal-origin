# Advisor Review 001 — Blueprint v2 (Logic Review)

**Status:** DISCUSSION DRAFT. Nothing in this file is approved.
**Date:** 2026-10-05
**Written by:** Claude, in the advisor + auditor role
**Audience:** (1) the owner, to discuss and decide; (2) later, the executor agent, but only for items the owner has approved.
**Suggested home in the repo (owner decides):** `docs/audits/current/` — do not commit it anywhere until the owner says so.

> ## Executor agent: STOP
> Do **not** change code, security rules, the blueprint, `docs/ARCHITECTURE.md`, `AGENTS.md`, or any other file because of this review.
> This file contains opinions, open questions, and findings that still need an owner decision.
> Section 10 says exactly what you may and may not do with it.

---

## 0. Scope and ground rules

### 0.1 What this review covers
- The **logic** of `MYLIBERTY-AUTHORITATIVE-ORGANIZATIONAL-AND-SYSTEM-BLUEPRINT-v2.md` (all 41 sections, read in full).
- What the GitHub repo shows about **how the company works**, and how that relates to the blueprint.

### 0.2 What this review does NOT cover
- Technical fixes. No code is proposed here.
- Whether the current website works. That was set aside on purpose.

### 0.3 Cost check (free-only rule)
Everything in this file is reading and writing text files. **Cost: zero.** Nothing here needs a paid plan, a subscription, or a new service.

### 0.4 What I actually read
| Source | Read? |
|---|---|
| Blueprint v2 (uploaded file) | Yes, fully |
| Repo `README.md` | Yes |
| Repo `AGENTS.md` | Yes |
| Repo `docs/README.md` (documentation index) | Yes |
| Repo `docs/ARCHITECTURE.md` | Yes |
| Repo `docs/decisions/2026-09-24-multi-branch-data-isolation.md` | Yes |
| Repo `docs/proposals/2026-09-23-front-office-operations-enhancement.md` | Yes |
| Repo `firestore.rules` (816 lines, `main` branch) | Yes |
| Audit reports under `docs/audits/` | **No** |
| Specs and active plans under `docs/specs/`, `docs/plans/` | **No** |
| Source code under `src/` | **No** |

Repo snapshot: `main` branch, 200 commits, seen on 2026-10-05.

### 0.5 Limits of what I can know
- I can see what is **written** in the repo. I cannot see what is **live** (deployed) right now.
- GitHub folder pages were blocked for me, so I only know the documentation index, not every file inside `docs/`.
- The blueprint file is **not listed** in the documentation index I read. It may live somewhere else or not be committed yet.
- "Rule reading" means: I read the text of the database security rules. I did not run or test them. Treat those findings as "needs verification", not "proven".

### 0.6 How to discuss this file
Every item has an ID so you can say "let's debate R3" or "I disagree with M2".

| Prefix | Meaning |
|---|---|
| **G** | Good — keep it |
| **R** | Risk or problem inside the blueprint |
| **M** | Mismatch between the blueprint and what the repo says/does |
| **C** | Challenge — where I would argue against the blueprint's design |
| **Q** | Question or decision the owner has to make |
| **O** | Outside the blueprint's scope but worth flagging |

Evidence tags: `[BP §n]` = blueprint section. `[Repo: path]` = a file in the repo.

---

## 1. Verdict (short version)

**Keep the blueprint's core ideas. They are sound and they fit this company. But do not call it "finished" or "authoritative" yet.**

Four reasons, in order of importance:

1. **It fights with decisions already accepted in the repo**, and with how the app treats the technical Admin today (M1–M4, R1, R2).
2. **It contradicts itself in a few places** (R3, R4, R10, R11).
3. **It leaves out the two things its own rules depend on**: the list of "sensitive actions" that need two people (R6), and the real day-to-day workflows (R13).
4. **It names nobody who can approve changes to it** (R8), and has no rule for absence or emergencies (R7).

The good news: the repo has been moving in the same direction as the blueprint (same role names, same approval idea, same branch fences). So this is a **tightening job, not a rebuild**.

---

## 2. What the blueprint is, in plain language

It is a **company constitution for the app**. It answers:

- Who exists in the company (the org chart: Director → Vice Director → 4 branches → managers, front office, instructors…).
- Who is **not** part of the company chart but still touches the app (the technical **Admin**).
- What kind of power each person may have, and how that power must be limited (by branch, by division, by workflow stage).
- Which sensitive actions need a second person to approve.
- What must always be recorded (who did what, when).
- How humans **and AI agents** must behave when something is unclear (do not guess, flag it).

It says clearly (in §39–40) that the detailed permissions for each role are **not written yet**. The plan (§32) is to write them role by role, then audit everything together (§33).

---

## 3. How the company works, as the repo shows it

> Please correct me anywhere I am wrong. You know the real company; I only know what the repo says.

**Company:** Liberty English Course. Four branches in Gorontalo province: **Kota Gorontalo** (main branch; older records may say "Cabang Utama"), **Bone Bolango**, **Pohuwato**, **Limboto**. Time zone is WITA. `[Repo: decision 2026-09-24, README]`

**People in the app today** `[Repo: firestore.rules]`
- Staff roles: admin, director, vice_director, manager (also `branch_manager`), instructor, instructor leader, marketing, front office (the app groups "frontoffice", "opslead", "ops_lead", "frontofficelead" together), office boy.
- Outside people: parent, student.

**A student's journey in the app** `[Repo: ARCHITECTURE.md, proposal 2026-09-23, rules]`
1. Interest arrives by an **online application** or a **walk-in** at the front desk (walk-ins are logged as "desk inquiries").
2. Placement test results are recorded on the student.
3. The student is put into a **class roster**.
4. **Attendance** is taken per class (scan or manual).
5. Instructors write **progress reports**.
6. **Tuition is paid at the front desk** (cash, bank transfer, or QRIS) and a receipt can be sent by WhatsApp.
7. **Parents** log in and can see their own children's attendance, schedule, and (per the rules) payments and progress reports.

**Money at the front desk** `[Repo: proposal 2026-09-23]`
- Front office records every payment.
- A daily reconciliation adds up cash / transfer / QRIS totals.
- A **shift handover report** is produced as a WhatsApp/clipboard message for the manager. (That last step happens **outside** the app, so the app cannot audit it.)

**Staff side** `[Repo: ARCHITECTURE.md, rules]`
- Staff clock in/out at a kiosk at the front desk.
- Mistakes in clock-in/out are fixed through an **approval** (maker-checker).
- New staff accounts come through **invites + approval**. Role changes need approval from a Director/Vice Director.
- Staff leave records exist. Directives/to-dos go from managers to staff.

**Marketing** `[Repo: ARCHITECTURE.md]`
- Marketing logs **school outreach** (visits to schools on a map). The Manager sees this read-only.

**How the repo governs itself** `[Repo: AGENTS.md, docs/README.md]`
- `AGENTS.md` (how agents behave) → `docs/ARCHITECTURE.md` ("canonical", protected) → `docs/decisions/` (accepted policies) → plans → audits (3 levels).
- Every plan must include a **zero-budget / free-tier check**. This matches the owner's rule.

**Takeaway:** the blueprint describes the same company the repo describes. The big difference is not in *who exists* but in *where the technical Admin sits* (see M1–M4).

---

## 4. The good — keep these

| ID | What is good | Where | Why it matters for this company |
|---|---|---|---|
| **G1** | **Separate "who you are in the company" from "technical access".** Admin ≠ Front Office/Admin ≠ Director. | BP §11–13, §26, §28 | The person who fixes the app should not be able to approve a refund or change someone's role just because they have the keys. |
| **G2** | **"No permission written = no permission." Unknown rules are flagged, not guessed.** | BP §34–35 | AI agents tend to fill gaps with plausible inventions. This rule blocks that. It is the single most useful rule for an AI-built project. |
| **G3** | **The four-question test**: who, what, on which records, at which stage. | BP §15 | Simple, checkable, and works for any role. Keep it as the master test. |
| **G4** | **Double-checking is risk-based, not everywhere.** | BP §23 | A small company dies under approval paperwork. This avoids it. (But see R6 — the "risky list" is missing.) |
| **G5** | **A hidden button is not security.** The real check must be in the back end. | BP §19, Principle 3 | Same stance as the repo's own docs. Consistent. |
| **G6** | **Organization first, screens last.** | BP §19–20, Principle 1–2 | Prevents "a button was added so a permission was invented". |
| **G7** | **Honest about what is unfinished.** | BP §39–40 | It does not pretend the permission tables exist. |
| **G8** | **Important records must stay traceable and not be silently rewritten — even by Admin.** | BP §24, §13 | Protects the company and the people in it. |
| **G9** | **No self-promotion.** A user must not grant themselves power, use it, then undo it. | BP §25 | Real risk in any system with an admin. The repo already enforces a version of this for role changes (M10). |
| **G10** | **Branch and division fences.** | BP §17, Principle 9 | Four branches means four sets of private data. Matches the repo's branch isolation decision. |

---

## 5. Problems inside the blueprint

Format: **What** → **Why it matters** → **Suggestion** → **Confidence / Priority**.

### R1 — The blueprint claims top authority but does not say where it sits among the repo's existing documents
- **What:** [BP §1] says it beats every other document, prompt, code comment, and agent instruction. But the repo already has: `AGENTS.md` (own authority chain), `docs/ARCHITECTURE.md` (called "canonical" and "protected"), and `docs/decisions/` (accepted policies). `[Repo: AGENTS.md, docs/README.md]`
- **Why it matters:** An executor reading both has no rule for which one wins. Four documents each saying "I am the source of truth" is the classic way projects end up with silent contradictions.
- **Suggestion:** Add one short section: "Order of authority", e.g. *Blueprint (what the company is and who may do what) → Architecture (how the app is built; must obey the blueprint) → Agent rules → Audits.* Owner decides (see Q2).
- **Confidence:** High. **Priority:** High.

### R2 — It directly contradicts an accepted decision, without saying it replaces it
- **What:** The accepted decision dated 2026-09-24 says the top tier (Owner / Director / Vice Director) is *provisionally represented by the `admin` role*. `[Repo: decisions/2026-09-24-…]` The blueprint says the opposite: Director and Vice Director are **not** the technical Admin, and Admin has **no** automatic business authority. `[BP §5, §12–13, Principle 4]`
- **Why it matters:** The word "provisionally" suggests the decision was always temporary — fair. But nothing in the blueprint says "this replaces that decision", and the rules in the repo still treat Admin like an executive (M1).
- **Suggestion:** When the owner approves the blueprint, record it as a formal amendment that supersedes that part of the decision. Keep the history; do not delete the old text.
- **Confidence:** High. **Priority:** High.

### R3 — The blueprint gives the System Admin a business job, against its own rule
- **What:** The domain table lists **"Instructors, System Admin"** as the roles for the Attendance area (student attendance *and* staff clock-in/out). `[BP §18]` But Admin must have **no business authority**. `[BP §13]`
- **Why it matters:** Staff clock-in/out is the basis for pay and discipline — it is a business record. If the technical role is listed as an owner of that area, an executor will give Admin full edit rights there. The repo already does (M3).
- **Suggestion:** Rewrite that row to name the **company roles** that own staff attendance (e.g., Front Office for the kiosk, Branch Manager for review). Admin gets "technical support only — no editing of records."
- **Confidence:** High (plain text contradiction). **Priority:** High.

### R4 — "Kindergarten staff" appears, but no such role exists in the org chart
- **What:** The Kindergarten Dashboard row says "Kindergarten staff, Parents". `[BP §18]` The hierarchy (§4) only has a Kindergarten Division Manager and Kindergarten Marketing. No kindergarten teachers, no kindergarten front desk. Yet the blueprint also forbids inventing roles. `[BP §34 rule 1]`
- **Why it matters:** The repo shows a separate Kids front-office dashboard exists, so these people exist in reality. `[Repo: proposal 2026-09-23]` Nobody knows who they report to — the Instructor Leader? The Kindergarten Manager? Both?
- **Suggestion:** Ask the owner (Q9), then add the real roles to the chart.
- **Confidence:** High. **Priority:** Medium–High.

### R5 — The Instructor Leader has no stated boss, and academic vs. operations conflicts have no tie-breaker
- **What:** The org tree draws the Instructor Leader **next to** the Branch Manager, both under "Four Physical Branches". `[BP §4]` The text never says who the Instructor Leader reports to. The two "pillars" (Operations vs Teaching) are described as separate. `[BP §2]`
- **Why it matters:** Real conflicts will happen at branch level: the Instructor Leader assigns teacher schedules, Front Office manages rosters, the Branch Manager owns branch results. If the only tie-break is the Vice Director (province-wide), small disputes stall.
- **Suggestion:** State the reporting line and the tie-break rule per branch (Q10).
- **Confidence:** Medium–High. **Priority:** Medium.

### R6 — The list of "sensitive actions" that need two people is missing
- **What:** [BP §23] says double-checking applies only to risky actions, but **never lists a single one**.
- **Why it matters:** The whole approval system depends on this list. Without it, an executor either makes everything need approval (bureaucracy) or nothing (no protection) — or guesses, which §35 forbids.
- **Suggestion:** Owner approves a short list (candidate list in Q4). Anything not on the list needs only one person.
- **Confidence:** High. **Priority:** High.

### R7 — No rule for absence, delegation, or emergencies
- **What:** Approvals must come from specific roles. The blueprint says nothing about what happens when that person is sick, on leave, resigned, or locked out. It even lists "emergency procedures" as not yet defined. `[BP §39]`
- **Why it matters:** In real life, when approvals stall, people **share passwords** to keep the business running. That destroys the audit trail the blueprint is trying to protect. Four branches across a province makes this very likely.
- **Suggestion:** One short section: each approver role has a named deputy; if none, escalate to Director/Vice Director; password sharing is explicitly forbidden; a logged "emergency override" exists with after-the-fact review (Q6).
- **Confidence:** High. **Priority:** High.

### R8 — Nobody is named as the final authority, and nobody watches the System Admin
- **What:** The blueprint talks about "approved amendments" and "governance decisions" repeatedly `[BP §1, §34, §37]` but never says **who** approves them. There is no "Owner" role in the blueprint, although the repo decision mentions "Owner". Also: Admin manages accounts and access `[BP §12]`, but nothing says who **appoints, removes, or reviews** the Admin.
- **Why it matters:** "Authoritative" with no named authority is a document that anyone — or any AI agent — can claim to speak for. And an unwatched Admin is the biggest single-point risk in any system.
- **Suggestion:** Name the approver of amendments (Q3). State who appoints/removes Admin and that Admin's own sensitive actions need a Director-level checker.
- **Confidence:** High. **Priority:** High.

### R9 — Roles are separated, but people might not be
- **What:** The separation-of-duties rules are about **roles** `[BP §22–23]`. In a small company one human can wear several hats (for example owner + Director + the person who runs the Admin account).
- **Why it matters:** If one human holds both the "maker" and "checker" hats, the separation exists only on paper. The blueprint does not address this.
- **Suggestion:** Add: *"Maker and Checker must be two different human beings."* Then ask the owner which real humans hold which hats (Q1). If one person holds all of them today, the blueprint must say what the interim rule is.
- **Confidence:** Medium (depends on facts I don't have). **Priority:** Medium–High.

### R10 — The approval chain vocabulary is inconsistent and too long for a small team
- **What:** [BP §16] has four separate abilities: Check, Approve, Sign, Execute. [BP §21] has states Checked → Approved → Executed. [BP §23] merges "Checker / Signer" into one role and says Execute is **not** a governance role. [BP §31] then lists **Executor** and **Observer** as workflow roles.
- **Why it matters:** An executor agent cannot tell how many human steps a sensitive action needs: one? two? three? And for a company with small branch teams, three human steps is unrealistic.
- **Suggestion:** Default to **two steps**: Maker → Approver. "Execute" is just the system applying an approved action. Keep a third "Checked" step only where the owner decides money size justifies it (Q16).
- **Confidence:** High. **Priority:** Medium.

### R11 — A "durable" document that contains temporary technical details
- **What:** [BP §38 second] says technical details must **not** live in the blueprint, and that it must stay valid even if the app is rebuilt. But [BP §17, §29, §30, §39] name database field names, collection names, folder paths (`src/features/...`), and "Firestore Security Rule".
- **Also:** Two sections are both numbered **38**.
- **Why it matters:** If the app is ever redesigned, those parts become wrong, and an authoritative document with wrong parts is worse than none.
- **Suggestion:** Keep the *principles* ("every record belongs to one branch and one division"). Move the technical names to `docs/ARCHITECTURE.md`. Fix the duplicate numbering.
- **Confidence:** High. **Priority:** Low–Medium (easy fix).

### R12 — Heavy for the team that has to live with it
- **What:** 41 sections; 12 roles to define one by one; then a full audit; plus an amendment process. `[BP §32–33, §37]`
- **Why it matters:** The owner has zero coding experience and zero budget, and every governance gap the executor flags needs an owner decision (§35). Risk: months of paperwork while the real risks (cash handling, children's data) stay open. Also, long rule files tend to be followed less reliably by AI agents than short core rules plus separate detail files.
- **Suggestion:** Split into a **short constitution** (principles, org chart, Admin boundary — 2–3 pages) and **role cards** that are written risk-first (see C1, C2).
- **Confidence:** Medium (judgement call). **Priority:** Medium.

### R13 — The company's real workflows are missing, but the permission model needs them
- **What:** Every permission must say "at which workflow stage" `[BP §15]`. But the blueprint defines no actual workflows — only a generic state ladder `[BP §21]` and a note that "every workflow in the company" is not yet defined `[BP §39]`.
- **Why it matters:** You cannot finish the permission tables without knowing the steps. The cross-role audit at the end `[BP §33]` would then discover the gaps late and expensively.
- **Suggestion:** Write ~6 workflows in plain language first (C1): student journey; payment / refund / void; staff clock-in → leave → pay; staff join / leave / role change; class creation and scheduling; parent access.
- **Confidence:** High. **Priority:** High.

### R14 — Money handling is thin, and money is where most mistakes and fraud happen
- **What:** The blueprint says "payment logging, receipt generation" `[BP §18]` and that Front Office collects tuition `[BP §8.2]`. Nothing about: refunds, discounts, voiding a receipt, correcting a wrong amount, cash vs transfer vs QRIS differences, daily reconciliation, or handover to the manager.
- **Evidence:** The repo shows cash is collected at the front desk and the daily handover to the manager is a WhatsApp/clipboard message, i.e. **outside** the app. `[Repo: proposal 2026-09-23]`
- **Why it matters:** Front Office handles real cash, yet in the blueprint's own §32 order it is defined 8th of 13.
- **Suggestion:** Treat the money workflow as the first role-card priority (C1). Decide whether the daily handover should be recorded inside the app (Q15).
- **Confidence:** High. **Priority:** High.

### R15 — No privacy rule for children's and parents' data
- **What:** The blueprint has no principle about personal data: who may see a child's record, phone numbers, photos; how long records are kept; what happens when a student leaves.
- **Why it matters:** The Kindergarten Division holds data about very young children. Indonesia has a personal-data protection law; I have **not** checked its details and I am not a lawyer — treat this as a flag to verify with someone qualified, not as legal advice.
- **Suggestion:** Add one principle ("collect and show only what the job needs; children's data gets extra care") and a short rule table later (Q12, Q13).
- **Confidence:** Medium. **Priority:** Medium–High.

### R16 — "Four branches" and "two divisions" are hard-wired into the principles
- **What:** [BP §3, §17, Principle 9] state the counts as fundamental.
- **Why it matters:** A fifth branch, or a new program, would need a formal amendment of the *principles*. The repo already mentions Private/TOEFL work and corporate events — I don't know whether those fit inside "Course" or "Kindergarten". `[Repo: docs/README.md plan titles]`
- **Suggestion:** Keep the *principle* ("every record belongs to one branch and one division") and move the actual **list** of branches/divisions into a short changeable table (Q14).
- **Confidence:** Medium. **Priority:** Low–Medium.

### R17 — Parents and students are mentioned but barely defined
- **What:** Parents "participate in … financial transactions" `[BP §10]`, but there is no rule for what that means. Adult students have no defined access at all.
- **Suggestion:** Short "external access" card (the blueprint plans one at step 12 of §32). Low urgency.
- **Confidence:** Medium. **Priority:** Low.

### R18 — "Established" is not the same as "built"
- **What:** [BP §40] says the Admin boundary and authority model are "established". In the repo they are **not** implemented (M1–M8).
- **Why it matters:** If the blueprint is "authoritative" and the app disagrees, every future check will report violations. That is noise unless gaps are tracked in one place.
- **Suggestion:** Label the blueprint **"Authoritative target"** and keep one **gap table** (blueprint vs app) that shrinks over time (C4).
- **Confidence:** High. **Priority:** Medium.

---

## 6. Blueprint vs. what the repo says (mismatches and matches)

> **Reminder:** these are findings from reading the **text** of the rules and docs. They are *not* automatically bugs. For each one the owner must decide: **is the blueprint right and the app wrong, or is the app right and the blueprint wrong?** Until then nobody changes anything.

### 6.1 Mismatches

| ID | What the blueprint says | What the repo says/does | Where | Owner decision needed |
|---|---|---|---|---|
| **M1** | Admin is **not** an executive and has no automatic business authority. `[BP §5, §13]` | The app's rules put Admin in the same "executive" group as Director and Vice Director. That group gets province-wide read/write on most business data (students, payments, etc.). The decision doc also says Director/Vice are provisionally represented by Admin. | `[Repo: firestore.rules; decisions/2026-09-24]` | Q1, Q5, Q8 |
| **M2** | Admin must not approve business items or its own requests. `[BP §13, §22]` | Rule reading: Admin has a blanket right to update approvals (except role changes), and I found no rule stopping an Admin from approving a request it created itself. | `[Repo: firestore.rules → approvals]` | Q5 |
| **M3** | Business history must not be silently deleted or rewritten, including by Admin. `[BP §24, §34 rule 11]` | Rule reading: Admin can delete payments, student attendance scans, staff shifts (clock-in/out), classes, outreach records, and user accounts (except Director/Vice/Admin). Executives can delete error logs. | `[Repo: firestore.rules]` | Q5 |
| **M4** | Class scheduling and rosters belong to the Instructor Leader and Front Office. `[BP §27]` | Rule reading: only **Admin** can create or delete a class; Front Office can only change the student list of an existing class. The technical role is doing a business job — the exact "accidental Admin business authority" the blueprint warns about `[BP §33]`. Also, executives (incl. Admin) can create staff-leave records directly as "approved". | `[Repo: firestore.rules → classes, staffLeave]` | Q11 |
| **M5** | Operational Leader and Front Office / Admin are **two different roles**. Ops Leader's job is site logistics and coordinating the front office. `[BP §4, §8]` | The app groups them: Ops Leader gets the same permissions as Front Office, including recording payments and editing student data. | `[Repo: firestore.rules → isFrontOffice]` | Q7 |
| **M6** | Least necessary authority; Office Boy has no management/financial/academic authority. `[BP §8.3, Principle 5]` | Rule reading: **any** staff role (including facilities and marketing) can read student and parent profiles in their branch, and any staff can create and edit walk-in inquiries. Instructors can read all students in the branch, not only their own. | `[Repo: firestore.rules → users, deskInquiries]` | Q12 |
| **M7** | Branch **and division** scope applies to core records. `[BP §17]` | Division fence exists but only for manager, front-office-family, and marketing roles — not for instructors or instructor leaders, and not on school-outreach records (Course marketing and Kindergarten marketing see the same outreach list). A user's division is `all`, `kindergarten`, or anything else (treated as Course). | `[Repo: firestore.rules → isDivisionAllowedForBranchStaff, schoolOutreach]` | Q9, Q12 |
| **M8** | Director = strategic leadership, province-wide analytics, oversight. `[BP §5.1]` | In the app, Director has the same data powers as Admin (including creating and editing payments). "Oversight" in the blueprint may mean view-only. | `[Repo: firestore.rules → isExecutive]` | Q8 |
| **M9** | One authoritative source of truth. `[BP Principle 10]` | The repo's own documents disagree with each other: `ARCHITECTURE.md` lists staff roles **without** director, vice_director, or instructor leader (the rules do have them); the decision doc (verified 2026-09-28) says branch-rule enforcement was "pending deployment" while the rules file already contains it (whether it is live, I can't tell). | `[Repo: ARCHITECTURE.md §7A, decision §4, firestore.rules]` | Q2 |

### 6.2 Matches — where the repo already follows the blueprint (fair credit)

| ID | Blueprint idea | What I saw in the repo |
|---|---|---|
| **M10** | No self-promotion `[BP §25]`; role changes need independent approval | Role changes require approval from a Director or Vice Director who is **not** the requester and **not** the person being promoted. Admin's blanket approval bypass explicitly **excludes** role changes. |
| **M11** | Admin cannot erase leaders `[BP §13]` | Rules stop Admin from terminating or resigning a Director/Vice Director account. |
| **M12** | Audit trail `[BP §24]` | Approvals can never be deleted. Shift audit events are append-only. |
| **M13** | Branch fences `[BP §17]` | Branch checks exist across most records; list-queries use a stricter check so one branch cannot list another's data. |
| **M14** | Hidden UI ≠ security `[BP Principle 3]` | Both README and ARCHITECTURE say the same thing. |
| **M15** | External access ≠ internal authority `[BP §10]` | Parents are read-only for their own linked children's records. Parents cannot edit their own child links (Front Office manages them). |

---

## 7. Challenges — where I would argue against the blueprint's design

### C1 — Change the order of work: workflow-first and risk-first, not org-chart-first
- **Blueprint says (§32):** define roles top-down: Admin → Director → Vice Director → Branch Manager → … → Front Office (8th) → … → audit last.
- **My argument:**
  1. The blueprint's own test needs "at which workflow stage" `[BP §15]`. So workflows must exist **before** permissions can be finished.
  2. Risk is not spread evenly. Cash and student data sit with Front Office and Branch Managers. Director/Vice Director are mostly oversight.
  3. Doing the audit last means gaps are found at the most expensive moment.
- **Proposed order:**
  1. System Admin boundary (agree — keep it first)
  2. ~6 plain-language workflows (R13)
  3. Role cards derived from those workflows: **Front Office → Branch Manager → Instructor Leader → Instructors → Kindergarten Manager → Marketing → Ops Leader → Director/Vice → Office Boy → external**
  4. Cross-role audit (should now be mostly a checklist)
- **What would change my mind:** if the owner needs the top-level roles settled first for a real-world reason (e.g., a hiring or ownership change coming up).

### C2 — Make the "must-read" document short
- **Blueprint:** one long document that every agent must treat as the primary source of truth.
- **My argument:** A short constitution (principles, org chart, Admin boundary, order of authority, who approves changes) is easier to keep consistent and easier for agents to obey. Detail belongs in separate role cards and workflow cards that link back to it.
- **Rough split:** keep §1–15, 19–26, 34–38 (trimmed); move §17/18/29/30 technical parts to ARCHITECTURE; move §16, 21, 23, 31 into one simplified "approval model" page.

### C3 — Enforce "different humans", not just "different roles"
See R9. The control that actually protects money is that **two different people** touch a sensitive action. If the company only has one trusted person, the blueprint should say so and name the interim rule honestly instead of implying protection that does not exist.

### C4 — Call it "Authoritative target", and track the gap
See R18. Honest labeling avoids a pile of false alarms and gives the executor a single, shrinking to-do table instead of scattered findings.

---

## 8. Decisions needed from the owner (with my recommended default)

> You can answer in one line each, e.g. "Q3: agree" or "Q7: no, Ops Leader never touches money". Where you agree with the default, say so and I record it.

### Tier 1 — decide first (everything else depends on these)

| ID | Question | Why it matters | My recommended default |
|---|---|---|---|
| **Q1** | Who are the real people holding: Owner, Director, Vice Director, System Admin? Is any one person holding more than one of those hats? | Separation only works if hats are held by different humans (R9). | System Admin should not be the same human as the Director where possible. If it must be, Admin's money/role actions need approval from a different trusted human. |
| **Q2** | Where does the blueprint sit among the repo's documents? | R1, M9. | Blueprint (business truth) → Architecture (must obey it) → Agent rules → Audits. Older decisions that conflict are marked "superseded by amendment", not deleted. |
| **Q3** | Who can approve an amendment to the blueprint? | R8. Without it, "authoritative" has no authority. | A named owner. Each change is logged at the bottom of the blueprint with date, reason, and approver. |
| **Q5** | May the technical Admin ever edit or delete business records (payments, attendance, classes, students)? | M1–M4. | No. If a repair is truly needed, it is a logged, approved "emergency override" with a reason, reviewed afterwards by a Director-level person. |

### Tier 2 — decide next

| ID | Question | My recommended default |
|---|---|---|
| **Q4** | Which actions are "sensitive" (need two different people)? | Candidate list: change someone's role or access; terminate a staff member; refund / void / discount; edit or delete a payment record; change tuition prices; correct staff clock-in/out; delete a student record; export all student data. Everything else: one person is enough. |
| **Q6** | What happens when an approver is absent, or in an emergency? | Each approver role has a named deputy per branch; if none, escalate to Director/Vice Director; password sharing is explicitly forbidden; emergency override is logged and reviewed. |
| **Q7** | Does the Operational Leader handle money (tuition) in real life? | If no: remove payment powers from that role. If yes: say so in the blueprint and treat Ops Leader as a money-handling role with its own checks. |
| **Q8** | Do Director and Vice Director **edit** data, or only **view and approve**? | View everything + approve. No direct editing of payments or attendance. |
| **Q11** | Who creates and schedules classes: Instructor Leader, Front Office, or both? | Instructor Leader creates/schedules; Front Office manages the student roster. Admin does neither. |
| **Q16** | How many human steps does a sensitive action need? | Two: Maker → Approver. A third "Checked" step only for money items the owner marks as high-value. |

### Tier 3 — decide later (after the above)

| ID | Question | My recommended default |
|---|---|---|
| **Q9** | Which kindergarten roles exist (teachers, front desk)? Who do kindergarten teachers report to? | Ask the owner for the real list; likely they sit under the Instructor Leader for teaching and the Kindergarten Manager for operations — **to be confirmed, not assumed**. |
| **Q10** | Who does the Instructor Leader report to, and what is the tie-break between Branch Manager and Instructor Leader? | Report to the Vice Director for academic matters; disputes inside a branch go to the Vice Director. |
| **Q12** | Which staff may see which student/parent details? | Only staff whose job needs it. Facilities staff: none. Instructors: only their own students. |
| **Q13** | Rules for children's data (who sees, photos, how long kept, when a student leaves)? | Draft a short principle first; verify local legal requirements with a qualified person. |
| **Q14** | Do Private/TOEFL classes and corporate events fit inside Course/Kindergarten? | Likely Course — owner to confirm. Move the branch/division list into an editable table. |
| **Q15** | Should the daily cash handover be recorded **inside** the app? | Yes: "handover submitted → manager acknowledged", so it is part of the audit trail. |

---

## 9. Suggested discussion order (not tasks for the executor)

1. Owner reads §1 (verdict) and §5 (R-items), then picks what to debate (use the IDs).
2. Settle **Tier 1** decisions (Q1, Q2, Q3, Q5).
3. Advisor writes **Review 002: "Blueprint patch list"** — exact wording changes to the blueprint (fix duplicate §38, remove technical parts, resolve R3/R4/R10, add order-of-authority, deputy rule, sensitive-action list). Only after the owner approves the direction.
4. Advisor and owner write **Review 003: "Workflow cards"** — ~6 plain-language workflows (R13).
5. Advisor writes **Review 004: "Gap table"** — blueprint vs app (M-items, updated after decisions). **This** is the first document that becomes a work list for the executor.
6. Only then: role cards, in the risk-first order from C1.

No code changes until step 5 is approved and prioritized.

---

## 10. Rules for the executor agent regarding this file

**You MAY:**
- Read this file to understand the owner's open questions and the findings.
- Reference item IDs (R3, M2, Q5…) when reporting back.
- Report anything in the repo that contradicts a finding here (evidence + file path).

**You MAY NOT:**
- Edit code, security rules, `docs/ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`, or the blueprint because of this file.
- Treat any M-item as a bug to fix. Each one first needs the owner to decide which side is right.
- Invent roles, permissions, or defaults. Where this file gives a "recommended default", it is a **proposal**, not a rule, until the owner says "approved".
- Add anything that needs a paid plan, subscription, or new paid service.
- Present a "rule reading" finding as tested or proven.

**If the owner later approves specific items:** the approval must name the IDs (for example "approved: Q5 and Q8, apply M2 and M3 fixes"). Only those IDs become work. Follow the repo's own process (pre-execution plan under `docs/plans/active/`, post-execution report, light regression check) and keep it free-tier safe.

---

## 11. Outside the blueprint's scope, but worth flagging

### O1 — The repo is public
- **What I saw:** the repo page says **Public**. `[Repo: main page]` The docs index also lists audit reports and security-hardening proposals. I have not read them, but their titles suggest they may describe known weaknesses.
- **Why it matters:** Public security rules are not, by themselves, a break-in (the rules are enforced by the server). But a public list of **known unfixed weaknesses** helps the wrong people.
- **Cost:** As far as I know, GitHub's free plan allows private repositories at no cost. I'd confirm that on GitHub's own pricing page before relying on it.
- **Before switching:** check whether hosting or automation (Firebase, Cloudflare, GitHub Actions) depends on the repo being public. I can't see that from here.
- **Confidence:** Medium. **Priority:** Medium–High. **Owner's call.** Not part of the blueprint review.

---

## Appendix A — Section-by-section verdict on the blueprint

| Blueprint section | Verdict | Notes |
|---|---|---|
| §1 Authority of this document | **Fix** | Add order of authority and a named approver (R1, R8, Q2, Q3). |
| §2–3 Identity, branches | Keep | Move the actual branch/division list to a changeable table (R16). |
| §4 Hierarchy | **Fix** | Add Instructor Leader's boss and kindergarten roles (R4, R5). |
| §5 Executive roles | Keep, extend | Say what Director/Vice may do: view/approve vs edit (Q8). |
| §6 Branch & division management | Keep | Spell out the Branch Manager's dual hat: who approves the Branch Manager's own sensitive actions? (Escalates to Director/Vice.) |
| §7 Marketing | Keep | Division scope on outreach is a repo mismatch (M7). |
| §8 Site operations | **Fix** | Ops Leader vs Front Office: does Ops Leader handle money? (M5, Q7). |
| §9 Academic | Keep | Reporting line missing (R5). |
| §10 Students & parents | **Expand** | R15, R17. |
| §11–13 Admin separation | **Keep — core** | Strongest part of the blueprint. Resolve the §18 contradiction (R3). |
| §14 Role identity | Keep | |
| §15 Four-question test | Keep | |
| §16 Permission vocabulary | **Simplify** | R10. |
| §17 Data scope | Keep principle | Move field names out (R11). |
| §18 Domain table | **Fix** | R3, R4. Also: no workspace is defined for Director/Vice Director's "province-wide analytics" in this table. |
| §19–20 Dashboard & menu rules | Keep | |
| §21 Workflow states | **Simplify** | R10. |
| §22 Separation of duties | Keep, strengthen | Add "different humans" (R9, C3). |
| §23 Maker–Checker | **Fix** | Add the sensitive-action list (R6, Q4). |
| §24 Auditability | Keep | |
| §25 Self-escalation ban | Keep | |
| §26 Seniority ≠ authority | Keep | |
| §27 Responsibility table | Keep, extend | Missing: HR/leave, data privacy, money details. |
| §28 Front Office vs Admin | Keep | |
| §29–30 Data model, features | **Move out** | Technical; belongs in ARCHITECTURE (R11). |
| §31 Role definition standard | Keep | Remove or define "Executor"/"Observer" (R10). |
| §32 Role-by-role order | **Re-order** | C1. |
| §33 Cross-role audit | Keep | Tie it to a gap table (C4). |
| §34–36 Agent rules, ambiguity, conflicts | **Keep — core** | Add who decides (R8). |
| §37 Amendment control | **Fix** | Name the approver (Q3). |
| §38 (first) Principles | Keep | |
| §38 (second) Durable boundary | Keep | **Renumber**; the document should obey it (R11). |
| §39 Readiness boundary | Keep | Remove technical mentions. |
| §40 Current status | **Clarify** | "Established" vs "built" (R18). |
| §41 Foundation statement | Keep | |

**Missing from the blueprint entirely:** absence/delegation rule (R7), emergency override, who appoints and watches Admin (R8), a named Owner/approver (R8), HR basics (joining, leaving, leave, link to pay), privacy for children's data (R15), money details (R14), real workflows (R13), a workspace for Director/Vice Director.

---

## Appendix B — Evidence index (where each repo claim comes from)

| Claim | Source |
|---|---|
| Four branches and their names; Admin exempt from branch limits; top tier "provisionally represented by admin" | `docs/decisions/2026-09-24-multi-branch-data-isolation.md` |
| Approval (maker-checker) added; parent roles added | `docs/ARCHITECTURE.md` change log (2026-09-24, 2026-09-27) |
| Cash / transfer / QRIS, daily reconciliation, WhatsApp handover, Kids front-office dashboard | `docs/proposals/2026-09-23-front-office-operations-enhancement.md` |
| Executive group includes Admin; Admin delete rights; approvals bypass; class create/delete by Admin only; Ops Leader = Front Office group; staff-wide read of students/parents; division fence limited to some roles; role-elevation approval rules; append-only audit collections | `firestore.rules` (816 lines, `main`) |
| Document hierarchy and agent rules; owner has no coding experience and no budget; free-tier check in every plan | `AGENTS.md`, `README.md`, `docs/README.md` |
| Role list in architecture doc lacks director / vice_director / instructor leader | `docs/ARCHITECTURE.md` §7A |

---

## Appendix C — What I have not verified (honesty list)

- Whether the current rules are the ones **deployed live**.
- Whether any M-finding actually causes harm in practice. They are readings of rule text, not tests.
- The contents of `docs/audits/`, `docs/specs/`, `docs/plans/`, and `src/`.
- Any legal requirement about personal data (R15). Needs a qualified person.
- Whether the blueprint file exists inside the repo.
- The real people behind each role (Q1).

If any of these matter to a decision, tell me and I will check the repo again (you said to re-check only when you ask or when the repo is updated).
