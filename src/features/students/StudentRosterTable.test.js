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

    // Shows App: N/A badge
    expect(html).toContain("App: N/A");
    expect(html).not.toContain("Linked");
  });

  it("renders 'Linked' badge when student has an authenticated parent account in linkedParentsMap", () => {
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
      })
    );

    // Shows registration contact
    expect(html).toContain("Pak Hendra");
    expect(html).toContain("081234567890");

    // Shows Linked badge with title
    expect(html).toContain("Linked");
    expect(html).toContain("Linked App Account: Hendra (App)");
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
});
