import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ConfirmProvider from "./ConfirmProvider";

describe("ConfirmProvider", () => {
  it("renders children cleanly without error", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ConfirmProvider,
        null,
        React.createElement("div", { id: "child-app" }, "App Content")
      )
    );

    expect(html).toContain("App Content");
  });
});
