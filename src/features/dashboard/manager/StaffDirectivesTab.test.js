import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffDirectivesTab } from "./StaffDirectivesTab";
import { ToastProvider, ConfirmProvider } from "../../shared";

describe("StaffDirectivesTab", () => {
  const mockTodos = [
    { id: "t1", title: "Review curriculum", assignee: "instructor", completed: false },
    { id: "t2", title: "Launch promo", assignee: "marketing", completed: false, isPinned: true },
  ];

  it("renders course division directives branding and marketing breakdown", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(StaffDirectivesTab, {
            todos: mockTodos,
            users: [],
            currentUser: { uid: "user-1" },
            branchLabel: "Kota Gorontalo",
            division: "courses",
            onAddTodo: vi.fn(),
            onDeleteTodo: vi.fn(),
            onToggleTodo: vi.fn(),
          })
        )
      )
    );

    expect(html).toContain("Course Directives &amp; Department Delegation");
    expect(html).toContain("Direct Course Division Marketing campaigns");
    expect(html).toContain("Marketing (Direct)");
  });

  it("renders kindergarten division directives branding and early-childhood breakdown", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(StaffDirectivesTab, {
            todos: mockTodos,
            users: [],
            currentUser: { uid: "user-1" },
            branchLabel: "Kota Gorontalo",
            division: "kindergarten",
            onAddTodo: vi.fn(),
            onDeleteTodo: vi.fn(),
            onToggleTodo: vi.fn(),
          })
        )
      )
    );

    expect(html).toContain("Kindergarten Directives &amp; Department Delegation");
    expect(html).toContain("Direct early-childhood learning routines");
    expect(html).toContain("Teaching (Direct)");
  });
});
