import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import UserForm from "./UserForm";

vi.mock("../shared", async (importOriginal) => {
  const actual = /** @type {Record<string, any>} */ (await importOriginal());
  return {
    ...actual,
    useToast: () => () => {},
    useConfirm: () => () => true,
  };
});

describe("UserForm Component 3-Way Role Separation", () => {
  it("renders Student form when role is student", () => {
    const html = renderToStaticMarkup(
      React.createElement(UserForm, {
        formData: { role: "student", displayName: "Ayu" },
        setFormData: () => {},
        editId: "student123",
        onSubmit: () => {},
      })
    );
    expect(html).toContain("Edit Student Profile");
    expect(html).toContain("Role: student");
    expect(html).not.toContain("Assigned Role");
    expect(html).not.toContain("Edit Staff Profile");
    expect(html).not.toContain("Edit Parent Account");
  });

  it("renders dedicated Parent Account form when role is parent with linked children and student names", () => {
    const html = renderToStaticMarkup(
      React.createElement(UserForm, {
        formData: {
          role: "parent",
          displayName: "Ibu Linda",
          email: "linda@example.com",
          childStudentIds: ["student123"],
        },
        setFormData: () => {},
        editId: "parent456",
        onSubmit: () => {},
        students: [{ id: "student123", displayName: "Ayu Anisa" }],
      })
    );
    expect(html).toContain("Edit Parent Account");
    expect(html).toContain("Authenticated Parent Account");
    expect(html).toContain("Role: parent");
    expect(html).toContain("Linked Children (1)");
    expect(html).toContain("Ayu Anisa");
    expect(html).toContain("student123");
    // Must NOT contain staff role dropdown or staff headers
    expect(html).not.toContain("Edit Staff Profile");
    expect(html).not.toContain("Assigned Role");
    expect(html).not.toContain("Employment Status");
  });

  it("renders 'No children linked yet' message when parent has no linked children", () => {
    const html = renderToStaticMarkup(
      React.createElement(UserForm, {
        formData: {
          role: "parent",
          displayName: "Ibu Linda",
          email: "linda@example.com",
          childStudentIds: [],
        },
        setFormData: () => {},
        editId: "parent456",
        onSubmit: () => {},
      })
    );
    expect(html).toContain("Linked Children (0)");
    expect(html).toContain("No children linked yet. Link children from the Student Profile screen.");
  });

  it("renders Staff Profile form when role is a staff role", () => {
    const html = renderToStaticMarkup(
      React.createElement(UserForm, {
        formData: { role: "instructor", firstName: "Budi", lastName: "Santoso", nickname: "Budi" },
        setFormData: () => {},
        editId: "staff789",
        onSubmit: () => {},
      })
    );
    expect(html).toContain("Edit Staff Profile");
    expect(html).toContain("Role: instructor");
    expect(html).not.toContain("Authenticated Parent Account");
    expect(html).not.toContain("Edit Parent Account");
  });

  it("renders back navigation button and cancel button when onCancel is provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(UserForm, {
        formData: { role: "student", displayName: "Ayu" },
        setFormData: () => {},
        editId: null,
        onSubmit: () => {},
        onCancel: () => {},
      })
    );
    expect(html).toContain("Back to dashboard");
    expect(html).toContain("Cancel");
  });

  it("does not render cancel button when onCancel is not provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(UserForm, {
        formData: { role: "student", displayName: "Ayu" },
        setFormData: () => {},
        editId: null,
        onSubmit: () => {},
      })
    );
    expect(html).not.toContain("Back to dashboard");
    expect(html).not.toContain("Cancel");
  });
});
