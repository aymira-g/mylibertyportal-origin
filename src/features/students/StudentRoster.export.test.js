import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import StudentRoster from "./StudentRoster";
import { ToastProvider, ConfirmProvider } from "../shared";

describe("StudentRoster Bulk CSV Export Authority (OD-OPS-02 / G-014 / FP-OPS-13)", () => {
  const dummyStudents = [
    {
      id: "stu-1",
      displayName: "Ahmad Dahlan",
      currentLevel: "warrior",
      status: "active",
      division: "courses",
      branchId: "kota_gorontalo",
    },
  ];

  function renderRoster(userRole, isAdmin = false) {
    return renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(StudentRoster, {
            students: dummyStudents,
            userRole,
            isAdmin,
            branchId: "kota_gorontalo",
            readOnly: true,
          })
        )
      )
    );
  }

  describe("Ops Lead and recognized role aliases", () => {
    const opsLeadAliases = [
      "opslead",
      "ops_lead",
      "operational_leader",
      "operationalleader",
      "frontofficelead",
      "front_office_lead",
    ];

    opsLeadAliases.forEach((alias) => {
      it(`denies bulk CSV export button for '${alias}' while preserving on-screen roster`, () => {
        const html = renderRoster(alias);

        // Export CSV button must NOT be rendered
        expect(html).not.toContain("Export CSV");

        // On-screen student roster table and records MUST be preserved
        expect(html).toContain("Ahmad Dahlan");
        expect(html).toContain("Active Students");
      });
    });
  });

  describe("Other restricted roles", () => {
    it("denies bulk CSV export for instructor", () => {
      const html = renderRoster("instructor");
      expect(html).not.toContain("Export CSV");
      expect(html).toContain("Ahmad Dahlan");
    });

    it("denies bulk CSV export for admin (role = 'admin')", () => {
      const html = renderRoster("admin");
      expect(html).not.toContain("Export CSV");
      expect(html).toContain("Ahmad Dahlan");
    });

    it("denies bulk CSV export when isAdmin flag is true", () => {
      const html = renderRoster("manager", true);
      expect(html).not.toContain("Export CSV");
      expect(html).toContain("Ahmad Dahlan");
    });
  });

  describe("Authorized roles retain bulk CSV export", () => {
    const authorizedRoles = ["director", "vice_director", "manager", "frontoffice"];

    authorizedRoles.forEach((role) => {
      it(`allows bulk CSV export for '${role}'`, () => {
        const html = renderRoster(role);
        expect(html).toContain("Export CSV");
        expect(html).toContain("Ahmad Dahlan");
      });
    });
  });
});
