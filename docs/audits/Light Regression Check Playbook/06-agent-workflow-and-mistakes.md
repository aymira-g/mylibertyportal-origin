# 06 — Agent Workflow, Mistakes & Completion

Covers **Section 25 (Light Regression Workflow for Coding Agents)**, **Section 26 (Coding-Agent Handoff Template)**, **Section 27 (Recommended Time Budget)**, **Section 28 (Common Mistakes)**, **Section 29 (Completion Criteria)**, and **Section 31 (Final Principle)**.

---

# 25. Light Regression Workflow for Coding Agents

When an AI coding assistant completes a code change in the repository, it must strictly follow this 10-step sequence:

```text
1. Identify exactly what files and modules were modified
2. Identify the direct workflow affected by the change
3. Identify one adjacent downstream dependency
4. Execute the normal path (assert success)
5. Execute one duplicate or rapid-retry test (assert idempotency)
6. Execute one failure test (assert fail-safe error handling)
7. Execute one relevant permission or branch boundary test (assert authorization)
8. Verify persisted Firestore state and query limits directly (not UI only)
9. Formulate result: PASS / FAIL / BLOCKED / ESCALATE
10. Record structured regression evidence in the final response
```

*For High-Risk Changes:*
```text
11. Explicitly state whether the change warrants escalation to a Section Deep Audit.
```

---

# 26. Coding-Agent Handoff Template

When prompting an AI coding assistant to implement a feature or bug fix, append this standard directive:

```text
After implementing this change, execute a Light Regression Check:
1. Identify the exact workflow affected.
2. Test the normal workflow.
3. Test one duplicate / retry condition.
4. Test one failure condition.
5. Test one permission or branch boundary.
6. Verify persisted database state, not just UI feedback.
7. Verify the nearest downstream workflow still works.
8. If you discover a security, branch, payment, attendance, concurrency, or data corruption flaw, ESCALATE it immediately.
9. Report status (PASS / FAIL / BLOCKED / ESCALATE) with evidence.
```

---

# 27. Recommended Time Budget

Keep the regression check lightweight and proportional to risk:

- **Low-Risk Change:** ~1–5 minutes
- **Medium-Risk Change:** ~5–15 minutes
- **High-Risk Change:** ~10–30 minutes

*Signal:* If a supposedly "light" regression repeatedly exceeds 30 minutes, **the section has accumulated audit debt and requires a Section Deep Audit.**

---

# 28. Seven Common Mistakes to Avoid

### Mistake 1 — Only Testing the Happy Path
Saying *"It works!"* does not prove that it still fails safely. Always test at least one failure or boundary condition.

### Mistake 2 — Testing Only the Changed Screen
The screen you modified may look fine while the repository query or downstream report it feeds is completely broken.

### Mistake 3 — Trusting the UI
A hidden button or disabled input is not a security boundary. Always test the underlying action and rule enforcement.

### Mistake 4 — Checking Only the Browser DOM
The Firestore document, subcollection count, and query cost are part of the workflow. Inspect actual stored data.

### Mistake 5 — Ignoring Duplicate Submissions
Double-clicks, double-scans, and network retries cause the majority of real-world production defects. Always test duplicate actions.

### Mistake 6 — Blaming Every Failure on the Latest Change
A regression check can expose a pre-existing latent bug. Isolate it, record it separately in the Bug Ledger, and do not conflate it with the current commit.

### Mistake 7 — Calling a Critical Flaw "Just a Minor Regression"
If a change reveals cross-branch leakage, silent fail-open fallbacks, or money corruption, stop immediately and **escalate**.

---

# 29. Light Regression Completion Criteria

A light regression is considered **complete** only when:

- [ ] Change scope and touched files identified.
- [ ] Direct workflow tested and working.
- [ ] Normal path succeeded.
- [ ] Duplicate / retry path tested without duplicate data creation.
- [ ] Failure path tested with safe error display.
- [ ] Relevant permission / branch boundary tested and enforced.
- [ ] Persisted database state inspected and verified.
- [ ] Firestore query limits and listener cleanup confirmed.
- [ ] One adjacent downstream workflow checked.
- [ ] Structured regression evidence recorded.
- [ ] Any discovered bug entered into the Master Bug Ledger.
- [ ] Critical flaws escalated if necessary.

---

# 31. Final Principle

The purpose of the Light Regression Check is not to certify the entire Portal as bulletproof.

Its purpose is to replace:

```text
Change feature → Assume it is fine → Keep building → Weeks later: Disastrous hidden bug
```

With a fast, healthy operational habit:

```text
Change feature → Light Regression Check → PASS (continue building) / FAIL (fix now) / ESCALATE (audit)
```

> **Small checks continuously. Deep audits periodically. Full audits at major milestones.**
