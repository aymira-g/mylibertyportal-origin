import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import StudentRosterTable from "./StudentRosterTable";

describe("StudentRosterTable Parent Contact & App Account Badges", () => {
  const dummyStudentWithContact = {
    id: "stu-1",
    displayName: "Budi Pratama",
    parentName: "Pak Hendra",
    parentPhone: "081234567890",
    currentLevel: "warrior",
    status: "active",
  };

  const dummyStudentNoContact = {
    id: "stu-2",
    displayName: "Citra Dewi",
    parentName: "",
    parentPhone: "",
    currentLevel: "master",
    status: "active",
  };

  it("renders 'App: N/A' badge when student has no linked parent account", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentRosterTable, {
        pageItems: [dummyStudentWithContact],
        linkedParentsMap: {},
      })
    );

    // Shows registration contact
    expect(html).toContain("Pak Hendra");
    expect(html).toContain("081234567890");

    // Shows App: N/A badge and link action when onLinkParent is present
    expect(html).toContain("App: N/A");
    expect(html).not.toContain("Linked");
  });

  it("renders interactive '+ Link' button when onLinkParent is provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentRosterTable, {
        pageItems: [dummyStudentWithContact],
        linkedParentsMap: {},
        onLinkParent: () => {},
      })
    );

    expect(html).toContain("+ Link");
    expect(html).toContain("No authenticated app account. Click to link or create parent account.");
  });

  it("renders interactive 'Linked' button when student has an authenticated parent account", () => {
    const linkedParentsMap = {
      "stu-1": [
        {
          id: "parent-1",
          role: "parent",
          displayName: "Hendra (App)",
          email: "hendra@example.com",
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(StudentRosterTable, {
        pageItems: [dummyStudentWithContact],
        linkedParentsMap,
        onOpenParentProfile: () => {},
      })
    );

    // Shows registration contact
    expect(html).toContain("Pak Hendra");
    expect(html).toContain("081234567890");

    // Shows Linked button with tooltip
    expect(html).toContain("Linked");
    expect(html).toContain("Linked: Hendra (App). Click to view/edit parent profile.");
    expect(html).not.toContain("App: N/A");
  });

  it("renders fallback for missing parent contact and App: N/A", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentRosterTable, {
        pageItems: [dummyStudentNoContact],
        linkedParentsMap: {},
      })
    );

    expect(html).toContain("—");
    expect(html).toContain("No contact");
    expect(html).toContain("App: N/A");
  });

  it("renders sortable Payment column header and supports reminders for pending status", () => {
    const pendingStudent = {
      id: "stu-3",
      displayName: "Doni Pratama",
      parentPhone: "081987654321",
      paymentStatus: "pending",
      paymentHealth: { status: "pending", label: "Pending", tone: "amber", remainingDays: null },
      status: "active",
      effectiveStatus: "active",
    };

    const html = renderToStaticMarkup(
      React.createElement(StudentRosterTable, {
        pageItems: [pendingStudent],
        studentSortField: "paidUntil",
        studentSortAsc: true,
        onSort: () => {},
      })
    );

    // Header has sortable Payment label
    expect(html).toContain("Payment");
    // Displays the Pending payment status badge
    expect(html).toContain("Pending");
    // Displays the Remind button for pending payment students with a phone number
    expect(html).toContain("Remind");
  });

  it("strictly suppresses edit, delete, parent link, and WhatsApp chat/remind triggers in readOnly mode", () => {
    const student = {
      id: "stu-99",
      displayName: "Protected Student",
      parentName: "Parent Protected",
      parentPhone: "08111222333",
      paidUntil: "2026-10-01", // expired
      paymentHealth: { status: "expired", label: "Expired", tone: "rose", remainingDays: -5 },
      status: "active",
      effectiveStatus: "active",
    };

    const html = renderToStaticMarkup(
      React.createElement(StudentRosterTable, {
        pageItems: [student],
        readOnly: true,
        onEdit: () => {},
        onDeleteStudent: () => {},
        onLinkParent: () => {},
        onSendRenewalReminder: () => {},
      })
    );

    // Should not contain interactive mutation triggers
    expect(html).not.toContain("<span>Edit</span>");
    expect(html).not.toContain("Delete record");
    expect(html).not.toContain("+ Link");
    expect(html).not.toContain("Chat with parent on WhatsApp");
    expect(html).not.toContain("Remind");
    // Displays App: N/A without + Link
    expect(html).toContain("App: N/A");
  });
});

describe("StudentRosterTable Academic Promotion Guard (DOM05-GOV-01)", () => {
  it("renders Promote button when active student is recommended for a higher level", () => {
    const student = {
      id: "stu-promo-1",
      displayName: "Budi Promo",
      currentLevel: "warrior",
      status: "active",
      effectiveStatus: "active",
    };
    const pendingPromotionsMap = {
      "stu-promo-1": { recommendedLevel: "elite" },
    };

    const html = renderToStaticMarkup(
      React.createElement(StudentRosterTable, {
        pageItems: [student],
        pendingPromotionsMap,
        onPromote: () => {},
      })
    );

    expect(html).toContain("Promote");
    expect(html).toContain("Promote to ELITE");
  });

  it("suppresses Promote button when student is already at or above recommended level", () => {
    const student = {
      id: "stu-promo-2",
      displayName: "Siti Advanced",
      currentLevel: "elite",
      status: "active",
      effectiveStatus: "active",
    };
    const pendingPromotionsMap = {
      "stu-promo-2": { recommendedLevel: "elite" },
    };

    const html = renderToStaticMarkup(
      React.createElement(StudentRosterTable, {
        pageItems: [student],
        pendingPromotionsMap,
        onPromote: () => {},
      })
    );

    expect(html).not.toContain("Promote");
  });

  it("suppresses Promote button when student is inactive or graduated", () => {
    const inactiveStudent = {
      id: "stu-promo-3",
      displayName: "Inactive Student",
      currentLevel: "warrior",
      status: "inactive",
      effectiveStatus: "inactive",
    };
    const pendingPromotionsMap = {
      "stu-promo-3": { recommendedLevel: "elite" },
    };

    const html = renderToStaticMarkup(
      React.createElement(StudentRosterTable, {
        pageItems: [inactiveStudent],
        pendingPromotionsMap,
        onPromote: () => {},
      })
    );

    expect(html).not.toContain("Promote");
  });

  describe("ID Badge Action Gating (DOM05-PRIV-03)", () => {
    const mockStudent = {
      id: "stu-badge-1",
      displayName: "Alex Pratama",
      currentLevel: "warrior",
      status: "active",
    };

    it("renders Badge button when onBadgeClick is provided for authorized roles", () => {
      const html = renderToStaticMarkup(
        React.createElement(StudentRosterTable, {
          pageItems: [mockStudent],
          onBadgeClick: () => {},
        })
      );
      expect(html).toContain("Badge");
      expect(html).toContain("View / Print ID Badge");
    });

    it("suppresses Badge button when onBadgeClick is null (teaching instructors)", () => {
      const html = renderToStaticMarkup(
        React.createElement(StudentRosterTable, {
          pageItems: [mockStudent],
          onBadgeClick: null,
        })
      );
      expect(html).not.toContain("Badge");
      expect(html).not.toContain("View / Print ID Badge");
    });
  });
});

