# 02 — Business Flows & Missing Links

Covers **Section 4 (Business / Logic Flow Audit)** and **Section 5 (Missing-Link Audit)**.

---

# 4. Business / Logic Flow Audit

Trace important business workflows from beginning to end.

### Minimum Workflows to Inspect:
- authentication and onboarding;
- student application and intake;
- student and class relationships;
- attendance and staff shifts;
- staff leave requests and approvals;
- payments, cash collection, and refunds;
- staff directives and assigned tasks;
- corporate event attendance;
- school outreach;
- manager outreach tracking;
- reporting and analytics;
- error and audit logging.

### The 9 Mandatory Questions for Every Workflow:
For each workflow ask:

1. **What starts it?** (User action, automated trigger, scanner, webhook).
2. **Where is the authoritative record created?** (Client direct write, Cloudflare Worker, Cloud Function).
3. **What updates related records?** (Cascade writes, triggers, manual secondary steps).
4. **What closes/completes the workflow?** (Status flag, clock-out, approval, archival).
5. **What happens if the workflow is interrupted?** (Network drop, tab closed, crash mid-flow).
6. **What happens if the same action is submitted twice?** (Double click, retry, concurrent tabs).
7. **What happens if another user changes the same data at the same time?** (Conflict resolution, last-write-wins, transaction).
8. **What can the user see that the database does not actually contain?** (Optimistic UI assumptions, stale cache).
9. **What database state can exist that the UI does not know how to represent?** (Malformed data, legacy records, partial writes).

---

# 5. Missing-Link Audit

Explicitly look for broken chains in business logic and data propagation.

### Example Broken Chain:

```text
School
  ↓
Visit
  ↓
Progress
  ↓
Manager Dashboard
```

### For Every Link in the Chain, Verify:
- the writer exists;
- the reader exists;
- the schema agrees;
- field names agree;
- IDs and relationships agree;
- permissions allow the intended operation;
- indexes support the query;
- failure states are handled.

### Also Look For:
- **created-but-never-updated data** — documents that initialize state but no workflow ever advances them;
- **updated-but-never-displayed data** — fields that code carefully maintains but no UI or report ever consumes;
- **deleted parents with orphaned children** — deleted student/class records leaving ghost enrollments, attendance, or payments;
- **historical records overwritten instead of appended** — mutations that erase audit trails instead of creating versioned events;
- **dashboard aggregates based on data that a workflow never persists** — stats calculated on client assumptions rather than authoritative database records.
