import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PrimaryActionButton from "./PrimaryActionButton";
import { Zap } from "lucide-react";

describe("PrimaryActionButton", () => {
  it("renders with label and description", () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryActionButton, {
        icon: Zap,
        label: "Record Payment",
        description: "Accept tuition and fees",
        badge: "3 due",
      })
    );

    expect(html).toContain("Record Payment");
    expect(html).toContain("Accept tuition and fees");
    expect(html).toContain("3 due");
    expect(html).toContain("min-h-12");
  });

  it("applies variant styling", () => {
    const htmlSecondary = renderToStaticMarkup(
      React.createElement(PrimaryActionButton, {
        label: "Secondary Action",
        variant: "secondary",
      })
    );
    expect(htmlSecondary).toContain("bg-white");

    const htmlEmerald = renderToStaticMarkup(
      React.createElement(PrimaryActionButton, {
        label: "Check In",
        variant: "emerald",
      })
    );
    expect(htmlEmerald).toContain("bg-emerald-600");
  });
});
