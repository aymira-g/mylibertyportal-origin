# 04 — Domain Playbooks: Branch, Deletion, Rules & Worker

Covers **Section 15 (Light Regression for Branch Changes)**, **Section 16 (Light Regression for Deletion Changes)**, **Section 17 (Light Regression for Firestore Rule Changes)**, and **Section 18 (Light Regression for Worker/API Changes)**.

---

# 15. Light Regression for Branch Changes

After any change to branch selection, branch filtering, or multi-branch data isolation:

1. **Same-Branch Permitted:** Verify a user assigned to Branch A can perform normal operations on Branch A records.
2. **Cross-Branch Denied:** Verify a user assigned to Branch A cannot view, edit, or delete Branch B records.
3. **Display Consistency:** Verify the active branch indicator displays the correct branch name.
4. **Field Concordance:** Inspect stored documents to verify branch identifiers match canonical constants:
   ```text
   branch vs branchId vs branch slug vs branch name
   ```
   *(Ensure these representations do not silently drift or conflict).*
5. **Query Scoping:** Verify that list and dashboard queries explicitly scope by branch rather than retrieving all branches and filtering in client memory.

---

# 16. Light Regression for Deletion Changes

After any change touching record deletion, archiving, or cascade logic:

1. **Delete Target Record:** Perform the deletion or soft-delete action.
2. **Verify Target Removal:** Confirm the primary document is either deleted or marked `status: "archived"`.
3. **Inspect Cascaded Dependencies:** Check directly linked records to ensure references are updated or cleaned:
   ```text
   Delete Student
        ↓
   Student document removed / archived
        ↓
   Class rosters cleaned (student removed from active lists)
        ↓
   Parent relationships handled (no broken links in Parent Portal)
        ↓
   Attendance history preserved for audit without creating ghost active records
   ```
4. **Downstream Feature Sanity:** Confirm dashboard totals and reports load without crashing on `null` / missing references.
5. **No Orphaned IDs:** Verify no dangling foreign keys remain in active operational lists.

---

# 17. Light Regression for Firestore Rule Changes

After modifying `firestore.rules`, always execute the four-part validation suite:

```text
1. ALLOW TEST:
   Authorized user performing valid operation → succeeds.

2. DENY TEST:
   Unauthenticated or unauthorized user performing same operation → permission-denied.

3. WRONG BRANCH TEST:
   Authorized Branch A user attempting write to Branch B path → permission-denied.

4. WRONG ROLE TEST:
   Authenticated user with insufficient role claims → permission-denied.
```

### Check Availability:
Confirm that legitimate application queries still execute without index or permission errors.
> *A security rule change can cause both security leaks (overly permissive) and application outages (overly restrictive). Both must be tested.*

---

# 18. Light Regression for Worker/API Changes

After changing Cloudflare Worker endpoints, API routes, or cryptographic challenge handlers:

1. **Valid Request:** Normal client payload with valid signature/headers succeeds with HTTP 200.
2. **Invalid Request:** Payload missing mandatory fields or containing malformed JSON returns HTTP 400.
3. **Authentication Failure:** Missing, expired, or invalid authorization token returns HTTP 401.
4. **Identity & Role Enforcement:** Client providing mismatched employee or role claims returns HTTP 403.
5. **Verify Authoritative Storage:** Do not rely on HTTP response body alone; inspect Firestore directly to confirm server-side mutation committed accurately.
6. **No Fail-Open Fallback:** Confirm that if the Worker endpoint fails or is unreachable, the client aborts safely rather than falling back to an unauthenticated direct client write.
