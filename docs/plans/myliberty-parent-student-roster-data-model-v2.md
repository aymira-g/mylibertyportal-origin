# MyLiberty Parent + Student + Class Roster Data Model
## Agent Handoff Specification v2

**Target repository:** `aymira-git/mylibertyportal-origin`  
**Purpose:** Define the correct relationship between parent users, student users, class rosters, and class attendance before implementing authenticated parent access.

---

## 1. Core decision

**Do not replace students with parents.**

**Do not turn students into “roster records.”**

The correct MyLiberty model is:

```text
users
├── parent users
├── student users
├── instructors
├── front office
├── managers
└── admins

classes
└── roster → student users

classAttendance
└── attendance → student + class + date

parent
└── linked to one or more student users
```

A **student remains a real user entity**.

A **parent becomes another real user entity**.

A **class roster is a relationship between a class and student users**, not a replacement for the student entity.

---

# 2. Existing MyLiberty student model

The current repository already uses the `users` collection for students.

A student is therefore expected to remain conceptually like:

```js
users/{studentId}
{
  role: "student",
  displayName: "Ayu",
  ...
}
```

Do not create a second top-level `students` collection merely to support parent accounts or attendance.

The existing student document may continue to contain the normal student profile/business fields already used by MyLiberty.

---

# 3. Parent user model

Add support for authenticated parent users through the existing `users` collection.

Conceptually:

```js
users/{parentUid}
{
  role: "parent",
  displayName: "Mrs. Smith",
  email: "...",
  ...
}
```

The exact parent profile fields should follow the existing MyLiberty user/profile conventions.

Do not invent a completely separate authentication system.

Use the existing:

```text
Firebase Authentication
+
users/{uid}
```

pattern.

---

# 4. Parent ↔ Student relationship

A parent must be explicitly linked to the student(s) they are allowed to access.

Recommended Phase 1 representation:

```js
users/{parentUid}
{
  role: "parent",

  childStudentIds: [
    "student123",
    "student789"
  ]
}
```

This supports:

```text
one parent → one child
one parent → multiple children
```

and avoids assuming that every family has exactly one student.

## Important

The parent relationship must be treated as an authorization relationship.

The client must never be allowed to simply submit:

```text
studentId = "some other student"
```

and retrieve that student's data.

Firestore Rules must verify that the requested student is actually linked to the authenticated parent.

---

# 5. Do not move parent IDs into the student model unless required

The original generic attendance specification suggested a student-side field such as:

```text
parentIds
```

The current MyLiberty integration should **prefer the parent-side relationship**:

```text
parent → childStudentIds
```

for the initial implementation.

This keeps the authorization check straightforward:

```text
request.auth.uid
        ↓
users/{parentUid}
        ↓
childStudentIds
        ↓
studentId
```

A reverse relationship can be introduced later if reporting or administration requires it.

---

# 6. Class roster model

The current MyLiberty repository already has the correct foundation for class membership.

Existing class documents use fields including:

```text
studentIds
enrollments
```

Therefore the roster should remain:

```text
classes/{classId}
{
  studentIds: [
    "student123",
    "student789"
  ],

  enrollments: [
    {
      studentId: "student123",
      dateJoined: "...",
      level: "..."
    }
  ],

  ...
}
```

## Meaning

`studentIds` answers:

> Which students currently belong to this class?

`enrollments` contains additional class-membership information already used by the repository.

The student remains the canonical person/user record.

---

# 7. Conceptual relationship

The intended model is:

```text
                users
          ┌────────┴────────┐
          │                 │
       Parent             Student
          │                 │
          │                 │
          └── linked to ────┘
                            │
                            │
                         belongs to
                            │
                            ▼
                          Class
                            │
                         roster
                            │
                            ▼
                    classAttendance
```

More concretely:

```text
users/parent456
    childStudentIds
        └── student123
                │
                ▼
        classes/classABC
                │
         studentIds[]
                │
                ▼
      classAttendance/
      classABC_student123_2026-09-27
```

---

# 8. Attendance relationship

Class attendance should reference the student user directly.

Recommended:

```js
classAttendance/{classId}_{studentId}_{attendanceDate}
{
  classId: "classABC",
  studentId: "student123",
  attendanceDate: "2026-09-27",

  status: "PRESENT",
  method: "SCAN",

  markedBy: "instructorUid",
  markedAt: "...",

  ...
}
```

This means:

```text
attendance
    ↓
student user
    +
class roster
    +
attendance date
```

The attendance document does not replace the student document.

---

# 9. Parent attendance access

When authenticated parent access is implemented, the flow should be:

```text
Parent logs in
      ↓
Firebase Auth identifies parentUid
      ↓
users/{parentUid}
      ↓
read childStudentIds
      ↓
select child
      ↓
read only that child's allowed attendance
```

The parent should have **read-only** access.

Parents must not be able to:

```text
create attendance
update attendance
delete attendance
edit class rosters
edit student academic records
change their own childStudentIds
```

unless a separate explicitly approved feature later permits some of those actions.

---

# 10. Firestore security principle

Parent authorization must be enforced in Firestore Rules.

The UI may hide children the parent is not supposed to see, but UI filtering is not security.

Conceptually, the rule needs to enforce:

```text
request.auth != null
AND
current user has role == "parent"
AND
requested studentId is in that parent's childStudentIds
```

For example, the conceptual rule shape is:

```rules
function isParentOf(studentId) {
  return signedIn()
    && hasRole('parent')
    && studentId in get(
      /databases/$(database)/documents/users/$(request.auth.uid)
    ).data.childStudentIds;
}
```

Then a parent-only attendance read could be conceptually:

```rules
allow read: if isParentOf(resource.data.studentId);
```

**This is draft logic.**

The implementation agent must verify:

- exact parent field names;
- role conventions;
- missing-field behavior;
- whether parent documents are branch-scoped;
- exact Firestore Rules syntax;
- query/list behavior.

## Cost note: Firestore Rules `get()` overhead

The `isParentOf()` function performs a `get()` call inside Firestore Rules on every parent read request. This is an additional billed read that does not appear in client-side query counts.

```text
Per parent read request:
  1 application read (the actual document/query)
+ 1 rules get() read (to verify childStudentIds)
= 2 billed reads per request

At current scale (estimated):
  100 daily active parents × 5 reads/session
  = 500 parent reads/day
  = 500 extra rules get() reads/day
  = 1,000 total billed reads/day

Firestore free tier: 50,000 reads/day
Impact: negligible at current scale.
```

At 1,000+ daily active parents this overhead becomes meaningful. If parent portal usage grows significantly, consider:

- Caching the parent document in Firestore Rules using `getAfter()` where applicable.
- Moving the authorization check to a Cloud Function that returns a custom token with claims.
- Using Firebase Auth custom claims (`parentOf: [studentId1, ...]`) to avoid the `get()` entirely.

For Phase 1, the `get()` approach is correct and cost-effective. Document this as a known scaling consideration.

---

# 11. Important: parent queries must remain scoped

The parent portal must not do something like:

```js
getDocs(collection(db, "classAttendance"))
```

and then filter locally.

That would expose unnecessary records and create unnecessary read cost.

Instead, parent reads should be scoped to the authenticated parent's authorized child/children.

The implementation should design queries around the final Firestore Rules constraints.

---

# 12. Multiple children

The model must support:

```text
Parent A
 ├── Student 1
 └── Student 2
```

The UI can therefore provide:

```text
My Children

[Ayu]
[Rina]
```

Selecting a child shows only that child's:

```text
classes
attendance
approved student-facing information
```

The parent must never be able to manually type another student's ID and bypass the relationship.

---

# 13. Student with multiple parents

The model should also support:

```text
Student 1
   ├── Parent A
   └── Parent B
```

This is another reason not to make:

```text
parentUid
```

a single field on the student.

The parent-side:

```text
childStudentIds[]
```

relationship naturally supports multiple authorized parents.

---

# 14. Class roster authorization

The student must be enrolled in the class before attendance can be created.

Conceptually:

```text
classAttendance.classId
        ↓
classes/{classId}
        ↓
studentIds contains classAttendance.studentId
```

Firestore Rules must verify this.

This prevents:

```text
Instructor selects Class A
    ↓
tries to mark Student X
    ↓
Student X is actually in Class B
    ↓
WRITE MUST FAIL
```

---

# 15. Instructor authorization

Instructor access remains class-scoped.

An instructor may access attendance for:

```text
class.instructorId == request.auth.uid
```

or a valid:

```text
class.substituteInstructorId == request.auth.uid
```

where supported by the current class/substitution workflow.

The instructor is not automatically authorized to see every student in the school.

---

# 16. Parent access is different from instructor access

These are separate authorization paths:

### Instructor

```text
Instructor
  ↓
Assigned Class
  ↓
Roster
  ↓
Class Attendance
```

### Parent

```text
Parent
  ↓
Own Linked Child
  ↓
Child's Class Membership
  ↓
Child's Attendance
```

Do not merge these two security concepts.

---

# 17. Front-office/admin access

Existing privileged MyLiberty roles can continue to use the current branch-aware access rules.

The exact permission matrix should remain aligned with the existing repository role names:

```text
admin
manager
instructor
instructorleader
instructor_leader
frontoffice
opslead
ops_lead
frontofficelead
...
```

Do not introduce generic roles such as:

```text
staff
```

just because an older generic attendance specification used them.

---

# 18. Parent portal vs existing public portal

The repository currently has an existing parent portal workflow based on bounded lookup/read behavior.

This new authenticated-parent model should be treated as an **enhancement / evolution**, not as permission to break the existing portal immediately.

Recommended migration approach:

```text
CURRENT
Public/lookup parent portal
        ↓
NEW
Authenticated parent account
        ↓
Parent sees only explicitly linked children
```

The implementation agent should first inspect the existing:

```text
src/features/students/ParentPortalPage.jsx
src/features/students/parentPortalRepository.js
```

and identify which existing public functionality should remain available during the transition.

Do not delete the current parent portal until the replacement has equivalent required functionality and has been tested.

---

---

# 18A. Identity vs. Portal — important architectural distinction

The terms **user** and **portal** must not be treated as interchangeable.

A user represents **who the person is**.

A portal represents **where/how that person accesses authorized information**.

Therefore:

```text
USER
  ↓
identity + role + relationships
  ↓
PORTAL
  ↓
authorized records
```

## Parent

A parent should eventually be a real authenticated MyLiberty user:

```js
users/{parentUid}
{
  role: "parent",
  displayName: "Mrs. Smith",
  childStudentIds: [
    "student123",
    "student789"
  ]
}
```

The parent then uses the parent-facing portal:

```text
/parent
```

The portal is the interface.

The `users/{parentUid}` document is the identity and authorization record.

## Student

A student remains a real MyLiberty user:

```js
users/{studentId}
{
  role: "student",
  displayName: "Ayu",
  ...
}
```

The student may eventually use an authenticated student-facing portal such as:

```text
/student
```

or a role-aware shared portal.

The existence of a portal does not turn the student into a roster-only record.

## `/portal`

The existing general/public portal should not automatically become the authenticated parent account system.

The implementation agent must first inspect the current:

```text
/portal
/parent
```

routes and their components before changing their behavior.

Recommended long-term separation:

```text
/portal
    ↓
public / limited access
    ↓
non-sensitive information
```

and:

```text
/parent
    ↓
authenticated parent
    ↓
only explicitly linked children
    ↓
attendance / class / approved student-facing records
```

A future authenticated student experience may be:

```text
/student
    ↓
authenticated student
    ↓
own classes / attendance / progress / schedule / materials
```

The exact route names may be changed to fit the existing application's routing conventions. The important architectural distinction is **identity vs. interface**, not the URL itself.

---

# 18B. Why authenticated users are preferred for long-term sensitive access

The current public portal can use identifiers such as:

```text
phone number
student ID
```

for lookup workflows.

That is convenient, but an identifier by itself is not proof of identity.

For long-term access to sensitive records such as:

```text
attendance
payment history
progress reports
academic records
```

the preferred architecture is:

```text
Firebase Authentication
        ↓
authenticated parent user
        ↓
childStudentIds
        ↓
Firestore Rules
        ↓
authorized child records
```

The portal should not be responsible for deciding whether a parent is authorized.

Firestore Rules must enforce the relationship.

Therefore the implementation should move toward:

```text
public portal
    = limited / non-sensitive access
```

and:

```text
authenticated parent portal
    = sensitive child-specific access
```

---

# 18C. Migration strategy from the existing public parent portal

Do **not** remove the current public parent/student portal immediately.

The repository already contains parent-portal functionality based on bounded lookup/read behavior.

The migration should be incremental:

```text
CURRENT
Public lookup
(phone / student ID)
        ↓
Transitional period
Public limited portal
+
Authenticated parent accounts
        ↓
TARGET
Authenticated parent portal for sensitive records
```

During migration:

```text
/portal
```

may remain available for appropriate non-sensitive/public functionality.

```text
/parent
```

can become the authenticated parent experience once the account/linking flow is implemented.

The implementation agent must not delete the existing public portal until the replacement has been verified to cover all required functionality.

---

# 18D. Recommended access model

Use this model as the long-term target:

| Entity | Identity | Primary access surface |
|---|---|---|
| Parent | `users/{uid}`, role=`parent` | `/parent` |
| Student | `users/{uid}`, role=`student` | `/student` or role-aware portal |
| Staff | existing `users/{uid}` role | existing role dashboards |
| Class | `classes/{classId}` | staff/instructor workflows |
| Roster | class `studentIds` + `enrollments` | class workflows |
| Class attendance | `classAttendance/...` | instructor/staff + authorized parent/student reads |
| Public portal | no user identity required for limited features | `/portal` |

This is **not** a requirement that every portal route be created immediately.

It is the target architecture the implementation should move toward without breaking the current application.

---

# 18E. Authorization flow examples

### Parent

```text
Firebase Auth
    ↓
parentUid
    ↓
users/{parentUid}
    ↓
childStudentIds
    ↓
selected child
    ↓
class membership
    ↓
classAttendance
```

### Student

```text
Firebase Auth
    ↓
studentUid
    ↓
users/{studentUid}
    ↓
own class membership
    ↓
own classAttendance
```

### Instructor

```text
Firebase Auth
    ↓
instructorUid
    ↓
assigned class
    ↓
class roster
    ↓
classAttendance
```

These are separate authorization paths and should remain separate in Firestore Rules.

---

# 18F. Critical implementation rule

**Do not solve the identity problem by keeping everything public.**

**Do not solve the portal problem by turning students into roster-only records.**

The intended model is:

```text
USER = identity
ROLE = permissions/context
RELATIONSHIP = who they are allowed to access
PORTAL = interface
FIRESTORE RULES = enforcement
```

For this project:

```text
parent user
   ↓
authorized children
   ↓
student users
   ↓
class roster
   ↓
class attendance
```

That is the architecture the coding agent should preserve as the feature set expands.

# 19. What “roster” means

This terminology should remain clear in the code and documentation.

### Student

A person/entity represented by:

```text
users/{studentId}
```

with:

```text
role = "student"
```

### Parent

A person/entity represented by:

```text
users/{parentUid}
```

with:

```text
role = "parent"
```

### Class

A teaching group represented by:

```text
classes/{classId}
```

### Roster

The set of student memberships represented by the class document:

```text
studentIds
enrollments
```

### Attendance

A historical event/state record represented by:

```text
classAttendance/{classId}_{studentId}_{date}
```

---

# 20. What must NOT happen

Do not implement:

```text
parent replaces student
```

Do not implement:

```text
student becomes only a roster row
```

Do not implement:

```text
students/{studentId}
```

as a duplicate identity store unless a later architecture decision explicitly requires it.

Do not implement:

```text
one parent = one child
```

Do not implement:

```text
parent can query any student by ID
```

Do not implement:

```text
parent can modify child attendance
```

Do not implement:

```text
instructor can access all students
```

Do not implement:

```text
client decides whether parent owns student
```

---

# 21. Recommended implementation order

The agent should implement this relationship in the following order:

```text
1. Preserve existing student users.
2. Confirm current user role conventions.
3. Add authenticated parent role support.
4. Add parent → child relationship field.
5. Add Firestore Rules for parent-child authorization.
6. Add emulator tests for parent authorization.
7. Integrate parent login/account creation flow.
8. Build child selector.
9. Connect child → classes.
10. Connect child → classAttendance.
11. Keep parent access read-only.
12. Preserve existing public parent portal behavior until migration is verified.
```

Do not start by rewriting the entire parent portal.

---

# 22. Required Firestore emulator tests

At minimum:

```text
✓ authenticated parent can read own child
✗ authenticated parent cannot read another parent's child
✓ parent with multiple children can read both linked children
✗ parent cannot add a fake child to their own childStudentIds
✗ parent cannot modify another user's childStudentIds
✗ parent cannot create attendance
✗ parent cannot update attendance
✗ parent cannot delete attendance
✓ instructor can access assigned class attendance
✗ instructor cannot access unrelated class attendance
✓ enrolled student attendance can be written by an authorized marker
✗ non-enrolled student cannot receive class attendance
```

The negative tests are important.

---

# 23. Final target model

The implementation should converge toward:

```text
AUTHENTICATED USERS
│
├── Parent
│    └── childStudentIds[]
│
├── Student
│    └── student profile
│
├── Instructor
│
├── Front Office
│
├── Manager
│
└── Admin


CLASS
│
├── instructorId
├── substituteInstructorId
├── studentIds[]
└── enrollments[]


CLASS ATTENDANCE
│
└── classId + studentId + attendanceDate
```

Relationship:

```text
Parent
   │
   └──────────→ Student
                   │
                   └──────────→ Class Roster
                                      │
                                      └────→ Class Attendance
```

---

# 24. Relationship to the Attendance Module v4 specification

This document is intentionally separate from:

```text
attendance-module-v4-myliberty-integration-spec.md
```

The attendance specification owns:

```text
attendance behavior
scanner
manual correction
close-out
class attendance
reports
attendance rules
```

This document owns:

```text
parent identity
student identity
parent-child relationship
class roster relationship
parent authorization
parent attendance access
```

The two specifications should be implemented together but should not be merged into one huge module.

---

## Final rule for the coding agent

**Parents and students are both users.**

**Students remain real user entities.**

**A roster is class membership, not a user type.**

**Attendance belongs to the student + class relationship, not to the parent.**

**Parents only receive read access to the attendance of their explicitly linked children.**

---

# 25. Implementation recommendation: parent account creation workflow

The data model defines the parent entity but does not specify how parent accounts are created or linked.

There are three realistic approaches. The implementation agent should select one (or a phased combination) based on MyLiberty's operational reality.

## Option A: Staff-created accounts (recommended for Phase 1)

```text
Front Office / Admin
    ↓
creates parent user in Firebase Auth
    ↓
sets role = "parent"
    ↓
links childStudentIds[]
    ↓
provides credentials to parent
```

Why this is recommended first:

- Staff already manages student enrollment and class assignment.
- The existing staff invitation pattern (`/join/` route) provides a reference implementation.
- Keeps control of the parent-child linkage entirely on the staff side.
- No risk of orphaned or unlinked parent accounts.

The implementation can reuse the existing pattern:

```text
Admin/FO dashboard
    ↓
"Link Parent Account" action on student profile
    ↓
creates or finds parent user
    ↓
adds studentId to parent's childStudentIds[]
```

## Option B: Invitation link

```text
Staff generates a parent invitation link
    ↓
parent opens link in browser
    ↓
parent registers (email + password)
    ↓
account is created with role = "parent"
    ↓
childStudentIds[] is pre-populated from the invitation
```

This is similar to the existing `/join/:token` staff signup flow.

It requires:

- A secure invitation token mechanism.
- Token expiry.
- One-time use or limited use.
- Verification that the token maps to a valid student.

This is a good Phase 2 approach once the basic parent model is working.

## Option C: Self-registration with staff approval

```text
Parent visits /register-parent
    ↓
submits name + email + child information
    ↓
account created with role = "parent" and status = "pending"
    ↓
childStudentIds[] is EMPTY until staff approves
    ↓
staff reviews and links children
    ↓
status → "active"
```

This is the most flexible but requires:

- A staff approval queue.
- A "pending parent" state that has no data access.
- UI for staff to match parent requests to existing students.

Recommended only as a Phase 3 enhancement.

## Decision for the implementation agent

Unless Kifry specifies otherwise, **start with Option A** (staff-created).

The minimum viable parent account flow is:

```text
1. Admin/FO opens a student's profile.
2. Clicks "Add Parent Account."
3. Enters parent email (and optionally name/phone).
4. System creates the Firebase Auth user and Firestore user doc.
5. System adds the student's ID to childStudentIds[].
6. Staff shares login credentials with the parent.
```

---

# 26. Implementation recommendation: childStudentIds management UI

The `childStudentIds[]` field on the parent document requires a management interface for staff.

## Required capabilities

```text
VIEW    which students are linked to a parent
ADD     link an existing student to a parent
REMOVE  unlink a student from a parent
```

## Where this UI should live

Two recommended locations:

### 1. Student profile (primary)

On the existing student detail/profile view:

```text
Student: Ayu
    ↓
Linked Parents: [Mrs. Smith (parent456)]  [+ Add Parent]
```

This is the natural workflow: staff is looking at the student and wants to link or verify the parent.

### 2. Parent profile (secondary)

If a parent user profile view exists or is created:

```text
Parent: Mrs. Smith
    ↓
Linked Children: [Ayu (student123)]  [Rina (student789)]  [+ Link Child]
```

## Authorization

Only these roles should be able to modify `childStudentIds`:

```text
admin
manager
frontoffice
opslead
```

Firestore Rules must enforce this. The parent must never be able to modify their own `childStudentIds`.

Conceptual rule:

```rules
allow update: if isStaffOrAdmin()
              && request.resource.data.diff(resource.data).affectedKeys()
                   .hasOnly(['childStudentIds', 'updatedAt']);
```

The exact rule shape depends on the existing rules patterns in the repository.

## Unlinking considerations

When unlinking a student from a parent:

```text
✓ remove studentId from childStudentIds[]
✗ do NOT delete the parent account
✗ do NOT delete the student account
✗ do NOT modify attendance records
```

The relationship is a link, not ownership.

---

# 27. Implementation recommendation: query patterns and Firestore indexes

The parent portal requires specific query patterns. These should be designed before implementation to avoid runtime errors from missing indexes.

## Query 1: Load parent's linked children

```js
// After authenticating parent, read their user doc
const parentDoc = await getDoc(doc(db, "users", parentUid));
const childStudentIds = parentDoc.data().childStudentIds || [];
```

```text
Collection: users
Operation: single document get
Index: none required (document read by ID)
Reads: 1
```

## Query 2: Load child student profiles

```js
// For each linked child, fetch their user doc
for (const studentId of childStudentIds) {
  const studentDoc = await getDoc(doc(db, "users", studentId));
}
```

```text
Collection: users
Operation: document get per child
Index: none required (document reads by ID)
Reads: 1 per child (typically 1–3)
```

Note: If a parent has many children (unlikely but possible), this could be batched. For MyLiberty's scale (1–3 children per parent), individual reads are fine.

## Query 3: Load child's enrolled classes

```js
const classesQuery = query(
  collection(db, "classes"),
  where("studentIds", "array-contains", studentId),
  where("status", "==", "open"),
  limit(20)
);
```

```text
Collection: classes
Operation: query
Index: composite index required
  - studentIds (array-contains) + status (==)
Reads: 1–10 per child (number of enrolled classes)
```

## Query 4: Load child's attendance for a specific class

```js
const attendanceQuery = query(
  collection(db, "classAttendance"),
  where("classId", "==", classId),
  where("studentId", "==", studentId),
  orderBy("attendanceDate", "desc"),
  limit(50)
);
```

```text
Collection: classAttendance
Operation: query
Index: composite index required
  - classId (==) + studentId (==) + attendanceDate (desc)
Reads: bounded by limit (max 50)
```

## Query 5: Load child's recent attendance across all classes

```js
const recentAttendanceQuery = query(
  collection(db, "classAttendance"),
  where("studentId", "==", studentId),
  orderBy("attendanceDate", "desc"),
  limit(30)
);
```

```text
Collection: classAttendance
Operation: query
Index: composite index required
  - studentId (==) + attendanceDate (desc)
Reads: bounded by limit (max 30)
```

## Total reads per parent session (estimated)

```text
Parent login + view one child + recent attendance:

  1  parent doc
  1  child student doc
  5  enrolled classes (typical)
  30 recent attendance records
  ──
  ~37 reads

At 100 daily active parents:
  ~3,700 reads/day

Firestore free tier: 50,000 reads/day
Comfortable headroom at current scale.
```

## Required composite indexes

The implementation agent should add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "classAttendance",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "classId", "order": "ASCENDING" },
    { "fieldPath": "studentId", "order": "ASCENDING" },
    { "fieldPath": "attendanceDate", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "classAttendance",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "studentId", "order": "ASCENDING" },
    { "fieldPath": "attendanceDate", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "classes",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "studentIds", "arrayConfig": "CONTAINS" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

The implementation agent must verify these against the existing `firestore.indexes.json` to avoid duplicates or conflicts.

---

# 28. Implementation recommendation: parentPhone field transition

The existing student model contains a `parentPhone` field used by the current public parent portal for lookup:

```js
// parentPortalRepository.js
const qPhone = query(usersRef, where("parentPhone", "==", term), limit(5));
```

This field is currently used as a pseudo-authentication mechanism: the parent enters a phone number, and the portal finds the matching student.

## Transition strategy

```text
PHASE 1: Keep parentPhone
  - Existing public portal continues to use parentPhone for lookup.
  - New authenticated parent portal uses childStudentIds for authorization.
  - Both coexist.

PHASE 2: Deprecate parentPhone as an auth mechanism
  - Public portal remains for non-sensitive info (schedule, general status).
  - Sensitive records (attendance, payments, progress) require authenticated parent.
  - parentPhone field remains on student docs for contact/display purposes only.

PHASE 3 (optional): Remove public portal student lookup
  - Once all active parents have authenticated accounts.
  - parentPhone becomes a contact field, not a lookup key.
```

Do not remove `parentPhone` from student documents. It is still useful as a contact information field even after the authenticated parent model is fully implemented.

The key distinction is:

```text
parentPhone = contact information (keep)
parentPhone as lookup key = pseudo-authentication (deprecate)
childStudentIds = real authorization (implement)
```
