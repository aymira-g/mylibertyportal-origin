import { normalizeBranch, matchesBranchFilter } from "../../../constants/branches";

/**
 * opsLeadUtils.js
 *
 * Pure utility functions for the Operational Leader dashboard.
 * Conforms to Blueprint v3.3 (§6.8, §6.10) and Ratified Owner Decisions OD-O1 to OD-O4:
 * 1. Computes whole-branch site operational bottlenecks.
 * 2. Categorizes facility and Office Boy cleaning tasks.
 * 3. Filters on-duty branch staff across Front Office, Office Support, and Instructors.
 * 4. Summarizes cashier shift payments and drawer totals without mutations.
 */

/**
 * Computes the total operational bottlenecks and severity for a branch site.
 *
 * @param {Object} params
 * @param {number} [params.pendingApprovalsCount=0] - Dual-control approvals waiting for Ops Lead
 * @param {number} [params.pendingTasksCount=0] - Open cleaning or facility maintenance tasks
 * @param {number} [params.uncontactedInquiriesCount=0] - Walk-in parent inquiries without initial contact
 * @param {number} [params.drawerVarianceCount=0] - Unresolved shift cash drawer variances
 * @returns {{
 *   total: number,
 *   severity: 'clear' | 'attention' | 'urgent',
 *   breakdown: {
 *     approvals: number,
 *     facilityTasks: number,
 *     uncontactedInquiries: number,
 *     drawerVariances: number
 *   }
 * }}
 */
export function computeOpsLeadBottlenecks({
  pendingApprovalsCount = 0,
  pendingTasksCount = 0,
  uncontactedInquiriesCount = 0,
  drawerVarianceCount = 0,
} = {}) {
  const approvals = Math.max(0, Number(pendingApprovalsCount) || 0);
  const facilityTasks = Math.max(0, Number(pendingTasksCount) || 0);
  const uncontactedInquiries = Math.max(0, Number(uncontactedInquiriesCount) || 0);
  const drawerVariances = Math.max(0, Number(drawerVarianceCount) || 0);

  const total = approvals + facilityTasks + uncontactedInquiries + drawerVariances;

  /** @type {'clear' | 'attention' | 'urgent'} */
  let severity = "clear";
  if (total > 0) {
    if (approvals > 0 || uncontactedInquiries > 3 || drawerVariances > 0 || total >= 5) {
      severity = "urgent";
    } else {
      severity = "attention";
    }
  }

  return {
    total,
    severity,
    breakdown: {
      approvals,
      facilityTasks,
      uncontactedInquiries,
      drawerVariances,
    },
  };
}

/**
 * Categorizes facility & Office Boy maintenance tasks into status buckets.
 *
 * @param {Array<Object>} todos
 * @returns {{
 *   all: Array<Object>,
 *   pending: Array<Object>,
 *   completed: Array<Object>,
 *   unassigned: Array<Object>,
 *   assigned: Array<Object>,
 *   pendingCount: number,
 *   completedCount: number,
 *   unassignedCount: number
 * }}
 */
export function categorizeFacilityTasks(todos = []) {
  if (!Array.isArray(todos)) {
    return {
      all: [],
      pending: [],
      completed: [],
      unassigned: [],
      assigned: [],
      pendingCount: 0,
      completedCount: 0,
      unassignedCount: 0,
    };
  }

  const pending = [];
  const completed = [];
  const unassigned = [];
  const assigned = [];

  for (const item of todos) {
    if (!item) continue;
    if (item.completed) {
      completed.push(item);
    } else {
      pending.push(item);
      if (!item.assignedTo && !item.assignedToName) {
        unassigned.push(item);
      } else {
        assigned.push(item);
      }
    }
  }

  return {
    all: todos,
    pending,
    completed,
    unassigned,
    assigned,
    pendingCount: pending.length,
    completedCount: completed.length,
    unassignedCount: unassigned.length,
  };
}

/**
 * Filters and categorizes active staff at a given branch site.
 *
 * @param {Array<Object>} users
 * @param {string} branch
 * @returns {{
 *   allStaff: Array<Object>,
 *   frontOffice: Array<Object>,
 *   officeSupport: Array<Object>,
 *   instructors: Array<Object>,
 *   leaders: Array<Object>
 * }}
 */
export function filterBranchStaffByRole(users = [], branch = "") {
  if (!Array.isArray(users)) {
    return {
      allStaff: [],
      frontOffice: [],
      officeSupport: [],
      instructors: [],
      leaders: [],
    };
  }

  const normalizedTarget = branch ? normalizeBranch(branch) : "";

  const allStaff = users.filter((u) => {
    if (!u) return false;
    const isNotResigned = u.status !== "resigned" && u.status !== "terminated";
    if (!isNotResigned) return false;

    // Branch match (if specified and user has branch/branchId)
    const userBranch = u.branch || u.branchId;
    if (normalizedTarget && userBranch) {
      if (!matchesBranchFilter(userBranch, normalizedTarget)) {
        return false;
      }
    }

    return [
      "frontoffice",
      "frontofficelead",
      "officeboy",
      "instructor",
      "instructorleader",
      "opslead",
      "ops_lead",
      "marketing",
    ].includes(u.role);
  });

  const frontOffice = allStaff.filter(
    (u) => u.role === "frontoffice" || u.role === "frontofficelead"
  );
  const officeSupport = allStaff.filter((u) => u.role === "officeboy");
  const instructors = allStaff.filter(
    (u) => u.role === "instructor" || u.role === "instructorleader"
  );
  const leaders = allStaff.filter(
    (u) => u.role === "opslead" || u.role === "ops_lead"
  );

  return {
    allStaff,
    frontOffice,
    officeSupport,
    instructors,
    leaders,
  };
}

/**
 * Summarizes cashier shift payments by payment method and checks for discrepancies.
 *
 * @param {Array<Object>} payments
 * @returns {{
 *   total: number,
 *   cash: number,
 *   transfer: number,
 *   qris: number,
 *   count: number,
 *   discrepancyCount: number
 * }}
 */
export function summarizeShiftPayments(payments = []) {
  if (!Array.isArray(payments)) {
    return {
      total: 0,
      cash: 0,
      transfer: 0,
      qris: 0,
      count: 0,
      discrepancyCount: 0,
    };
  }

  let total = 0;
  let cash = 0;
  let transfer = 0;
  let qris = 0;
  let discrepancyCount = 0;

  for (const p of payments) {
    if (!p) continue;
    const amt = Number(p.amount) || 0;
    total += amt;

    const method = String(p.method || "").toLowerCase().trim();
    if (method === "cash") {
      cash += amt;
    } else if (method === "transfer") {
      transfer += amt;
    } else if (method === "qris") {
      qris += amt;
    }

    if (p.isDiscrepancy === true || (p.discrepancyAmount != null && Number(p.discrepancyAmount) !== 0)) {
      discrepancyCount += 1;
    }
  }

  return {
    total,
    cash,
    transfer,
    qris,
    count: payments.length,
    discrepancyCount,
  };
}
