# MyLiberty Portal: Organizational Architecture & Operational Blueprint

## 1. Executive Summary & Core Architectural Framework

This document outlines the foundational logic, organizational hierarchy, and operational workflows for **MyLiberty Portal**, designed for a multi-branch English education company. 

To ensure clean data boundaries, clear security access, and efficient business execution, the system is modeled around a **Two-Pillar Framework**:

1. **Operational Structure (Back-Office & Business Operations):** Focuses on business sustainability, branch management, lead management, finance, and site administration.
2. **Teaching and Learning Structure (Core Educational Delivery):** Focuses on academic quality, curriculum delivery, student assessment, and parent-instructor engagement loops.

---

## 2. Organizational Structure & Roles

### 2.1 Branch & Division Setup
The organization operates across **4 physical branches** located across the province. Each branch hosts **two core divisions**:
* **Course Division** (General/Academic English programs)
* **Kindergarten Division** (Early childhood English & foundational programs)

### 2.2 Role Hierarchy & Reporting Lines

```
Director
 └── Vice Director
      └── [4 Physical Branches]
           ├── Branch Manager (Dual Role: Branch Head & Course Division Manager)
           │    ├── Marketing (Course Division)
           │    ├── Kindergarten Division Manager
           │    │    └── Marketing (Kindergarten Division)
           │    └── Operational Leader
           │         ├── Front Office / Admin
           │         └── Office Boy / Facilities
           └── Instructor Leader
                └── Instructors / Tutors
```

#### Detailed Role Breakdown:

* **Executive Level:**
  * **Director & Vice Director:** Overall strategic leadership, province-wide analytics, and multi-branch performance oversight.

* **Branch & Division Management:**
  * **Branch Manager (Dual Hat):** Oversees overall physical branch operations and acts directly as the **Course Division Manager**.
  * **Kindergarten Division Manager:** Reports to the Branch Manager, managing the Kindergarten division's operational targets, student programs, and intake.

* **Marketing Pillar:**
  * **Marketing (Course Division):** Reports directly to the Branch Manager (Course Division Head) for target-aligned lead generation.
  * **Marketing (Kindergarten Division):** Reports directly to the Kindergarten Division Manager for specialized early-childhood campaigns.

* **Branch Site Operations:**
  * **Operational Leader:** Coordinates site logistics, facility maintenance, and front-office performance.
  * **Front Office / Admin:** Handles walk-in/online inquiries, schedules placement tests, manages student enrollment, collects tuition fees, and manages parent communications.
  * **Office Boy / Facilities:** Ensures physical branch maintenance and operational support.

* **Academic Leadership & Delivery:**
  * **Instructor Leader:** Manages curriculum standardization, academic quality control, teacher schedule assignments, and teacher evaluations.
  * **Instructors / Tutors:** Conduct placement tests, deliver interactive lessons, log attendance, and issue periodic student progress reports.
  * **Students & Parents:** Primary external actors. Parents participate in progress monitoring, attendance tracking, and financial transactions.

---

## 3. New Student Registration Workflow

The registration process bridges the Operational side (Lead Intake & Payment) to the Academic side (Assessment & Class Onboarding) across 5 distinct stages:

```
[ Stage 1: Lead Capture ] (Marketing & Front Office)
         │
         ▼
[ Stage 2: Assessment ] (Placement Test / Observation)
         │
         ▼
[ Stage 3: Enrollment & Finance ] (Tuition Payment & Manager Approval)
         │
         ▼
[ Stage 4: Academic Onboarding ] (Class & Instructor Assignment)
         │
         ▼
[ Stage 5: Active Learning ] (Lesson Delivery & Parent Feedback Loop)
```

### Stage Details:

#### Stage 1: Lead Generation & Intake
* **Actors:** Marketing, Front Office, Prospect (Parent/Student).
* **Process:** Marketing captures inquiries via online/offline campaigns for a specific division. Front Office logs the prospect's details (Name, Age/Grade, Target Division, Contact Details).

#### Stage 2: Placement Assessment
* **Actors:** Front Office, Instructor / Instructor Leader, Prospect.
* **Process:** Front Office schedules a Placement Test (Course Division) or Diagnostic Observation (Kindergarten Division). An Instructor evaluates proficiency and submits recommended levels to Front Office.

#### Stage 3: Enrollment & Payment Processing
* **Actors:** Front Office, Parent, Division/Branch Manager.
* **Process:** Front Office presents program packages and schedule slots. Parent completes enrollment and submits tuition payment. The Branch Manager or Division Manager validates slot availability and approves the registration.

#### Stage 4: Class Assignment & Onboarding
* **Actors:** Front Office, Instructor Leader, Assigned Instructor.
* **Process:** Student status transitions from **Lead/Prospect** to **Active Student**. Instructor Leader assigns the student to a specific class section, schedule, and instructor. Welcome kits and class schedules are sent to the Parent.

#### Stage 5: Learning Activation & Progress Feedback
* **Actors:** Instructor, Student, Parent.
* **Process:** Instructor receives updated roster, conducts classes, tracks attendance, and provides periodic academic progress reports to the Parent.

---

## 4. Software System Architecture & Data Mapping (`MyLiberty Portal`)

### 4.1 Data Scoping Strategy (Firestore)
To support multi-branch operations, core collections (`users`, `leads`, `students`, `classes`, `payments`) utilize dual-level scoping fields:
* **`branchId`**: Identifies 1 of the 4 physical branches.
* **`division`**: Categorizes records into `course` or `kindergarten`.

### 4.2 Application Module Mapping (`src/features/`)

| Feature Directory | Primary Domain Responsibility | Key User Roles Involved |
| :--- | :--- | :--- |
| `src/features/dashboard/marketing/` | Lead intake, campaign performance tracking, prospect routing. | Marketing Staff |
| `src/features/students/` | Prospect profiling, placement test records, active student management. | Front Office, Instructors |
| `src/features/finance/` | Tuition billing, payment logging, financial receipt generation. | Front Office, Branch Manager |
| `src/features/classes/` | Class batching, scheduling, roster management. | Instructor Leader, Front Office |
| `src/features/attendance/` | Student lesson attendance & staff clock-in/out records. | Instructors, Admin |
| `src/features/dashboard/manager/` | Registration approvals, division KPIs, financial summaries. | Branch & Division Managers |
| `src/features/dashboard/instructor/` | Teaching workspace, grading, class rosters, lesson logs. | Instructors |
| `src/features/dashboard/kids/` | Tailored portal for Kindergarten division & parent interaction. | Kindergarten Staff, Parents |

---

## 5. Next Steps for Implementation

1. **Firestore Data Schema:** Define field-level attributes, data types, and collection references for `users`, `leads`, `students`, `classes`, and `transactions`.
2. **Role Permission Matrix:** Map explicit CRUD (Create, Read, Update, Delete) permissions for each role across Firestore Security Rules and UI component access.
