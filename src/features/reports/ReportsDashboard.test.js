import React, { act } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import ReportsDashboard from "./ReportsDashboard";

const exportSpies = {
  today: vi.fn(),
  staff: vi.fn(),
  students: vi.fn(),
  instructors: vi.fn(),
};

vi.mock("./tabs", () => ({
  TodayTab: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ exportCSV: exportSpies.today }));
    return React.createElement("div", { "data-testid": "tab-today" }, "TodayTab");
  }),
  StaffDutyTab: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ exportCSV: exportSpies.staff }));
    return React.createElement("div", { "data-testid": "tab-staff" }, "StaffDutyTab");
  }),
  LearnerProgressTab: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ exportCSV: exportSpies.students }));
    return React.createElement("div", { "data-testid": "tab-students" }, "LearnerProgressTab");
  }),
  AdmissionsTab: React.forwardRef(() => {
    return React.createElement("div", { "data-testid": "tab-admissions" }, "AdmissionsTab");
  }),
  InstructorPunctualityTab: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ exportCSV: exportSpies.instructors }));
    return React.createElement("div", { "data-testid": "tab-instructors" }, "InstructorPunctualityTab");
  }),
  FinancialReportsTab: React.forwardRef(() => {
    return React.createElement("div", { "data-testid": "tab-finance" }, "FinancialReportsTab");
  }),
}));

describe("ReportsDashboard Scope & Export Gating (DOM11-PRIV-01 & DOM11-GOV-05)", () => {
  it("strips province-wide 'All Campuses' option from System Admin (DOM11-GOV-05)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: true,
        userBranch: "Kota Gorontalo",
      })
    );
    // System Admin is locked to their campus and cannot select "All Campuses"
    expect(html).not.toContain("<option value=\"all\">All Campuses</option>");
    expect(html).toContain("Kota Gorontalo");
  });

  it("permits province-wide 'All Campuses' option for Executives", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isExecutiveView: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(html).toContain("All Campuses");
    expect(html).toContain('value="all"');
  });

  it("suppresses top-level 'Export CSV Dataset' button for teaching instructors (DOM11-PRIV-01)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: false,
        isFrontOffice: false,
        isManager: false,
        isExecutiveView: false,
        isInstructorLeader: false,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(html).not.toContain("Export CSV Dataset");
  });

  it("renders top-level 'Export CSV Dataset' button for Executive, Manager, and Academic Lead, but excludes Front Office (OD-FO-03)", () => {
    const execHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isExecutiveView: true }));
    expect(execHtml).toContain("Export CSV Dataset");

    const mgrHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isManager: true }));
    expect(mgrHtml).toContain("Export CSV Dataset");

    const foHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isFrontOffice: true }));
    expect(foHtml).not.toContain("Export CSV Dataset");

    const ilHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isInstructorLeader: true }));
    expect(ilHtml).toContain("Export CSV Dataset");
  });

  it("excludes all four operational sub-tabs when isAdminView is true (OD-ADM-01)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: true,
        userBranch: "Kota Gorontalo",
      })
    );

    // Gated sub-tab buttons must NOT appear for System Admin
    expect(html).not.toContain("Today&#x27;s Check-ins");
    expect(html).not.toContain("Staff Duty Logs");
    expect(html).not.toContain("Learner Progress");
    expect(html).not.toContain("Instructor Punctuality");
    expect(html).not.toContain("Financial &amp; Tuition");
    expect(html).not.toContain("Admissions &amp; Leads");

    // Informational exclusion notice is displayed
    expect(html).toContain("Institutional report views are excluded from System Administrator");
  });

  it("renders operational sub-tabs for non-admin domain leadership", () => {
    const mgrHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: false,
        isManager: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(mgrHtml).toContain("Today&#x27;s Check-ins");
    expect(mgrHtml).toContain("Staff Duty Logs");
    expect(mgrHtml).toContain("Learner Progress");
    expect(mgrHtml).toContain("Financial &amp; Tuition");
    expect(mgrHtml).toContain("Instructor Punctuality");
  });
});

describe("Instructor Leader Presentation & Scope Alignment (Owner Approval 2026-10-18)", () => {
  it("1. opens on My Punctuality by default when mounted for Instructor Leader", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
      })
    );

    // Active component mounted must be InstructorPunctualityTab
    expect(html).toContain("InstructorPunctualityTab");
    expect(html).not.toContain("TodayTab");
    expect(html).not.toContain("StaffDutyTab");
    expect(html).not.toContain("LearnerProgressTab");

    // Button label is "My Punctuality" (self-service compliance)
    expect(html).toContain("My Punctuality");
    expect(html).not.toContain("Instructor Punctuality");

    // "My Punctuality" button has active primary styling, other tabs have neutral styling
    expect(html).toMatch(/bg-\[#1a3a8f\][^>]*>.*?My Punctuality/s);
  });

  it("2. locks campus view to home campus and does not show interactive 'All Campuses' selector", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
      })
    );

    // Must NOT contain interactive selector or "All Campuses" option
    expect(html).not.toContain("<option value=\"all\">All Campuses</option>");
    expect(html).not.toContain("<select");

    // Must display locked label with home campus
    expect(html).toContain("Kota Gorontalo");
    expect(html).toContain('class="p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 truncate"');
  });

  it("2b. normalizes home campus filter slug to canonical display name for repository queries", () => {
    // Slug branch ID input e.g. from useInstructorWorkspace ("kota_gorontalo")
    const slugHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "kota_gorontalo",
      })
    );
    expect(slugHtml).not.toContain("All Campuses");
    expect(slugHtml).toContain("Kota Gorontalo");

    // Lean satellite campus input ("bone_bolango")
    const satelliteHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "bone_bolango",
      })
    );
    expect(satelliteHtml).not.toContain("All Campuses");
    expect(satelliteHtml).toContain("Bone Bolango");

    // Fallback on missing branch
    const defaultHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: null,
      })
    );
    expect(defaultHtml).not.toContain("All Campuses");
    expect(defaultHtml).toContain("Kota Gorontalo");
  });

  it("3. other roles retain their existing selector and default behavior", () => {
    // Executive: interactive selector with All Campuses, defaults to finance
    const execHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isExecutiveView: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(execHtml).toContain("All Campuses");
    expect(execHtml).toContain('value="all"');
    expect(execHtml).toContain("FinancialReportsTab");

    // Manager: locked to branch, defaults to staff (Staff Duty Logs)
    const mgrHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isManager: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(mgrHtml).not.toContain("All Campuses");
    expect(mgrHtml).toContain('class="p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 truncate"');
    expect(mgrHtml).toContain("StaffDutyTab");
    expect(mgrHtml).toContain("Staff Duty Logs");

    // Front Office: locked to branch, defaults to today (Today's Check-ins), no export
    const foHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isFrontOffice: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(foHtml).not.toContain("All Campuses");
    expect(foHtml).toContain('class="p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 truncate"');
    expect(foHtml).toContain("TodayTab");
    expect(foHtml).not.toContain("Export CSV Dataset");

    // Teaching Instructor: locked to branch, defaults to today, no export
    const instructorHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: false,
        isFrontOffice: false,
        isManager: false,
        isExecutiveView: false,
        isInstructorLeader: false,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(instructorHtml).not.toContain("All Campuses");
    expect(instructorHtml).toContain('class="p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 truncate"');
    expect(instructorHtml).toContain("TodayTab");
    expect(instructorHtml).not.toContain("Export CSV Dataset");
    expect(instructorHtml).toContain("My Duty Log");
    expect(instructorHtml).toContain("My Punctuality");
  });

  it("4. all four Instructor Leader sub-tabs and their CSV export actions remain available", () => {
    const defaultIlHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
      })
    );

    // All four sub-tabs rendered for Instructor Leader
    expect(defaultIlHtml).toContain("Today&#x27;s Check-ins");
    expect(defaultIlHtml).toContain("My Duty Log");
    expect(defaultIlHtml).toContain("Learner Progress");
    expect(defaultIlHtml).toContain("My Punctuality");

    // Hidden sub-tabs are strictly NOT accessible to Instructor Leader
    expect(defaultIlHtml).not.toContain("Financial &amp; Tuition");
    expect(defaultIlHtml).not.toContain("Admissions &amp; Leads");

    // Top-level export button is present
    expect(defaultIlHtml).toContain("Export CSV Dataset");

    // Verify each sub-tab mounts correctly when requested and maintains export button:
    const todayHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
        initialSubTab: "today",
      })
    );
    expect(todayHtml).toContain("TodayTab");
    expect(todayHtml).toContain("Export CSV Dataset");

    const staffHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
        initialSubTab: "staff",
      })
    );
    expect(staffHtml).toContain("StaffDutyTab");
    expect(staffHtml).toContain("Export CSV Dataset");

    const studentsHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
        initialSubTab: "students",
      })
    );
    expect(studentsHtml).toContain("LearnerProgressTab");
    expect(studentsHtml).toContain("Export CSV Dataset");

    const punctualityHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
        initialSubTab: "instructors",
      })
    );
    expect(punctualityHtml).toContain("InstructorPunctualityTab");
    expect(punctualityHtml).toContain("Export CSV Dataset");
  });
});

// Lightweight DOM environment for testing interactive button clicks without external testing-library dependencies
function setupMinimalDOM() {
  // @ts-expect-error Mocking minimal DOM for node testing environment
  globalThis.HTMLIFrameElement = class HTMLIFrameElement {};
  // @ts-expect-error Mocking minimal DOM for node testing environment
  globalThis.Element = class Element {};
  // @ts-expect-error Mocking minimal DOM for node testing environment
  globalThis.Node = class Node {};

  function createMockElement(tagName = "div") {
    const el = {
      nodeType: 1,
      tagName: tagName.toUpperCase(),
      style: {},
      attributes: {},
      childNodes: [],
      parentNode: null,
      ownerDocument: null,
      setAttribute(k, v) {
        this.attributes[k] = String(v);
      },
      getAttribute(k) {
        return this.attributes[k] || null;
      },
      removeAttribute(k) {
        delete this.attributes[k];
      },
      appendChild(child) {
        child.parentNode = this;
        this.childNodes.push(child);
        return child;
      },
      removeChild(child) {
        const idx = this.childNodes.indexOf(child);
        if (idx !== -1) this.childNodes.splice(idx, 1);
        child.parentNode = null;
        return child;
      },
      insertBefore(child, before) {
        const idx = this.childNodes.indexOf(before);
        if (idx !== -1) this.childNodes.splice(idx, 0, child);
        else this.childNodes.push(child);
        child.parentNode = this;
        return child;
      },
      get textContent() {
        if (this.childNodes.length > 0) {
          return this.childNodes.map(c => c.textContent || "").join("");
        }
        return this._textContent || "";
      },
      set textContent(val) {
        this._textContent = String(val);
        this.childNodes = [
          {
            nodeType: 3,
            textContent: String(val),
            parentNode: this,
            ownerDocument: this.ownerDocument,
          },
        ];
      },
      get options() {
        const opts = [];
        function collect(n) {
          if (!n || !n.childNodes) return;
          for (const c of n.childNodes) {
            if (c.tagName === "OPTION") opts.push(c);
            collect(c);
          }
        }
        collect(this);
        return opts;
      },
      get value() {
        return this._value !== undefined ? this._value : (this.getAttribute("value") || "");
      },
      set value(v) {
        this._value = String(v);
        this.setAttribute("value", String(v));
      },
      selected: false,
      defaultSelected: false,
      disabled: false,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
      click() {
        const syntheticEvent = {
          bubbles: true,
          cancelable: true,
          defaultPrevented: false,
          preventDefault() {
            this.defaultPrevented = true;
          },
          stopPropagation() {},
          target: this,
          currentTarget: this,
        };
        for (const k of Object.keys(this)) {
          if (k.startsWith("__reactProps") && typeof this[k]?.onClick === "function") {
            this[k].onClick(syntheticEvent);
            return;
          }
        }
        if (typeof this.onclick === "function") {
          this.onclick(syntheticEvent);
        }
      },
    };
    return el;
  }

  const doc = {
    nodeType: 9,
    createElement(tag) {
      const el = createMockElement(tag);
      el.ownerDocument = doc;
      return el;
    },
    createElementNS(ns, tag) {
      const el = createMockElement(tag);
      el.ownerDocument = doc;
      el.namespaceURI = ns;
      return el;
    },
    createTextNode(text) {
      return {
        nodeType: 3,
        textContent: String(text),
        parentNode: null,
        ownerDocument: doc,
      };
    },
    createComment(text) {
      return {
        nodeType: 8,
        textContent: String(text),
        parentNode: null,
        ownerDocument: doc,
      };
    },
    addEventListener() {},
    removeEventListener() {},
    activeElement: null,
  };
  doc.defaultView = globalThis;

  // @ts-expect-error Mocking minimal DOM document in node test environment
  globalThis.document = doc;
  // @ts-expect-error Mocking minimal DOM window in node test environment
  globalThis.window = globalThis;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return { doc };
}

function findButtonByText(container, textOrRegex) {
  function getNodeText(n) {
    if (!n) return "";
    if (n.nodeType === 3) return n.textContent || "";
    if (!n.childNodes) return "";
    return n.childNodes.map(getNodeText).join("");
  }
  function walk(n) {
    if (!n) return null;
    if (n.tagName === "BUTTON") {
      const txt = getNodeText(n);
      const matches =
        typeof textOrRegex === "string" ? txt.includes(textOrRegex) : textOrRegex.test(txt);
      if (matches) return n;
    }
    if (n.childNodes) {
      for (const child of n.childNodes) {
        const found = walk(child);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(container);
}

describe("Instructor Leader Reports Export Routing Interaction (UI Button Clicks)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exercises active sub-tab export routing via actual button clicks across all four sub-tabs", () => {
    const { doc } = setupMinimalDOM();
    const rootEl = doc.createElement("div");
    rootEl.ownerDocument = doc;
    // @ts-expect-error Mocking root DOM container in node testing environment
    const root = createRoot(rootEl);

    // 1. Opens Reports as an Instructor Leader, where My Punctuality is the default.
    act(() => {
      root.render(
        React.createElement(ReportsDashboard, {
          isInstructorLeader: true,
          userBranch: "Kota Gorontalo",
        })
      );
    });

    const getExportButton = () => findButtonByText(rootEl, "Export CSV Dataset");
    expect(getExportButton()).not.toBeNull();

    // Verify initial clean state: no handler called
    expect(exportSpies.instructors).not.toHaveBeenCalled();
    expect(exportSpies.today).not.toHaveBeenCalled();
    expect(exportSpies.staff).not.toHaveBeenCalled();
    expect(exportSpies.students).not.toHaveBeenCalled();

    // 2. Clicks Export CSV Dataset and confirms only the punctuality handler is called.
    act(() => {
      getExportButton().click();
    });

    expect(exportSpies.instructors).toHaveBeenCalledTimes(1);
    expect(exportSpies.today).not.toHaveBeenCalled();
    expect(exportSpies.staff).not.toHaveBeenCalled();
    expect(exportSpies.students).not.toHaveBeenCalled();

    // 3a. Selects Today's Check-ins and clicks export.
    const todayTabButton = findButtonByText(rootEl, "Today's Check-ins");
    expect(todayTabButton).not.toBeNull();

    act(() => {
      todayTabButton.click();
    });

    act(() => {
      getExportButton().click();
    });

    // Confirms only the active sub-tab's handler was called on this click
    expect(exportSpies.instructors).toHaveBeenCalledTimes(1);
    expect(exportSpies.today).toHaveBeenCalledTimes(1);
    expect(exportSpies.staff).not.toHaveBeenCalled();
    expect(exportSpies.students).not.toHaveBeenCalled();

    // 3b. Selects My Duty Log and clicks export.
    const staffTabButton = findButtonByText(rootEl, "My Duty Log");
    expect(staffTabButton).not.toBeNull();

    act(() => {
      staffTabButton.click();
    });

    act(() => {
      getExportButton().click();
    });

    // Confirms only the active sub-tab's handler was called on this click
    expect(exportSpies.instructors).toHaveBeenCalledTimes(1);
    expect(exportSpies.today).toHaveBeenCalledTimes(1);
    expect(exportSpies.staff).toHaveBeenCalledTimes(1);
    expect(exportSpies.students).not.toHaveBeenCalled();

    // 3c. Selects Learner Progress and clicks export.
    const studentsTabButton = findButtonByText(rootEl, "Learner Progress");
    expect(studentsTabButton).not.toBeNull();

    act(() => {
      studentsTabButton.click();
    });

    act(() => {
      getExportButton().click();
    });

    // 4. Confirms each click calls only the active sub-tab's handler, exactly once.
    expect(exportSpies.instructors).toHaveBeenCalledTimes(1);
    expect(exportSpies.today).toHaveBeenCalledTimes(1);
    expect(exportSpies.staff).toHaveBeenCalledTimes(1);
    expect(exportSpies.students).toHaveBeenCalledTimes(1);

    // Clean up
    act(() => {
      root.unmount();
    });
  });
});
