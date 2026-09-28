# MyLiberty Portal — Shared Design Language Specification

> **Status:** Active  
> **Scope:** UI Typography, Hierarchy, Shells, Navigation, Button Systems, and Spacing  
> **Related:** [`docs/plans/active/myliberty-pwa-system-review.md`](../plans/active/myliberty-pwa-system-review.md)

---

## 1. Type Scale

To ensure legibility across small mobile screens (e.g. 360px Android devices) up to desktop displays, the portal standardizes on the following typography tokens:

| Level | Size (px) | Tailwind Utility | Weight | Usage |
|---|---|---|---|---|
| **Page Title** | 24–28px | `text-2xl` / `text-[26px]` | `font-black` | Top-level dashboard headers, public portal titles |
| **Section Heading** | 18–20px | `text-lg` / `text-xl` | `font-extrabold` / `font-black` | Card titles, modal headers, major tab sections |
| **Subsection Heading** | 15–16px | `text-sm` / `text-base` | `font-bold` | Inner card headings, table group headers |
| **Primary Action** | 14–16px | `text-sm` / `text-base` | `font-bold` | Main buttons, launcher tiles, major CTA buttons |
| **Navigation Label** | 12–14px | `text-xs` / `text-sm` | `font-bold` / `font-semibold` | Desktop sidebar items, mobile bottom nav items |
| **Body & Form Input** | 13–14px | `text-xs` / `text-sm` | `font-medium` / `font-normal` | Form fields, descriptive paragraphs, table rows |
| **Supporting Text** | 12–13px | `text-xs` | `font-medium` / `font-normal` | Help text, field explanations, secondary timestamps |
| **Metadata & Badges** | 10–11px | `text-[10px]` / `text-[11px]` | `font-extrabold` / `font-bold` | Status pills, counts, uppercase category labels |

> [!IMPORTANT]
> `text-[10px]` is strictly reserved for metadata tags, status pills, and small uppercase section dividers. Primary and secondary content must use `text-xs` (12px) or higher to prevent visual fatigue.

---

## 2. Button Hierarchy

1. **Primary Action (`PrimaryActionButton` or brand CTA):**
   - **Styling:** `#1a3a8f` solid background, white text, rounded corners (`rounded-xl` or `rounded-2xl`), subtle shadow.
   - **Height:** Minimum 44px (`min-h-11` or `min-h-12`) to comply with touch accessibility guidelines.
   - **Usage:** Exactly 1 or 2 per screen for the most frequent task (e.g., "Save Payment", "Check In Student", "Add Student").
2. **Secondary Action:**
   - **Styling:** White background, `border border-slate-200`, `text-slate-700`, hover `bg-slate-50`.
   - **Usage:** Alternative choices, filter triggers, modal cancel buttons.
3. **Quiet / Ghost Action:**
   - **Styling:** No border, transparent background, text color matching intent (`text-slate-500` or `text-red-600`), hover background tint.
   - **Usage:** Icon buttons (Close, Refresh, More, Dismiss), inline table row actions.

---

## 3. Cards vs. Rows

- **Cards (`bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs`):**
  - Use cards to delineate distinct conceptual entities (e.g. Overview metrics, Today's Classes, Cash Drawer Summary).
  - **Avoid card inception:** Do not place cards inside cards inside cards.
- **Rows & List Items:**
  - Inside a card, prefer structured, bordered or alternating rows (`divide-y divide-slate-100` or clean `py-2.5 px-3` rounded item rows) rather than nesting miniature cards.

---

## 4. Navigation & Shell Standards

### Desktop Sidebar (`w-64 lg:w-72`)
- **Container:** Indigo/brand gradient (`from-[#1a3a8f] via-[#152e74] to-indigo-950`).
- **Items:** Height at least 38px, `text-xs font-bold` or `text-sm font-semibold`.
- **Active State:** High-contrast translucent white pill (`bg-white/15 ring-1 ring-white/25 text-white`) with high-contrast icon badge (`bg-white text-[#1a3a8f]`).
- **Grouping:** Logical categorization (e.g., Today / Operations / Reports / Admin) using `tabUtils`.

### Mobile Bottom Nav (`MobileDashboardShell`)
- **Height:** Ergonomic floating bar with `min-h-14` touch targets and safe-area padding (`env(safe-area-inset-bottom)`).
- **Tab Quota:** Exactly 4 primary tabs per role + 1 "More" button for remaining tabs.
- **Role Primary Tab Priorities:**
  - **Front Office:** Overview, Payment Cashier, Walk-in Inquiries, Student Applications.
  - **Instructor:** Overview, Attendance, Classes, Student Progress.
  - **Manager:** Overview, Branch Approvals, Classes & Coverage, Reports.
  - **Admin:** Overview, User Management, Classes, Branch Approvals.
  - **Fallback:** First 4 visible non-hidden tabs.
- **Typography:** Labels use `text-[11px] font-bold` with max-width containment to avoid truncation on 360px viewports.
