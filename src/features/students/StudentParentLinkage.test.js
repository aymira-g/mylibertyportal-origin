import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import StudentParentLinkage from "./StudentParentLinkage";

vi.mock("../../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "staff1" } },
  getSecondaryAuth: () => ({ secondary: true }),
}));

vi.mock("../dashboard/usersRepository", () => ({
  findParentsForStudent: vi.fn().mockResolvedValue([]),
  createParentAccount: vi.fn().mockResolvedValue("new_parent_id"),
  unlinkChildFromParent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../shared", () => ({
  useToast: () => vi.fn(),
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

describe("StudentParentLinkage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders notice when no studentId is passed", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentParentLinkage, { studentId: null })
    );
    expect(html).toContain("Parent accounts can be linked once the student profile has been created");
  });

  it("renders header and Add Parent Account button for an existing student", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentParentLinkage, {
        studentId: "student_123",
        studentName: "Ayu",
        readOnly: false,
      })
    );
    expect(html).toContain("Authenticated Parent Accounts");
    expect(html).toContain("Add Parent Account");
  });

  it("hides Add Parent Account button when readOnly is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentParentLinkage, {
        studentId: "student_123",
        studentName: "Ayu",
        readOnly: true,
      })
    );
    expect(html).toContain("Authenticated Parent Accounts");
    expect(html).not.toContain("Add Parent Account");
  });
});
