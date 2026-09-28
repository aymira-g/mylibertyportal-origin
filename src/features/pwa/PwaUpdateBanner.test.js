import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PwaUpdateBanner from "./PwaUpdateBanner";

describe("PwaUpdateBanner", () => {
  it("renders nothing initially when no update is pending", () => {
    const html = renderToStaticMarkup(React.createElement(PwaUpdateBanner));
    expect(html).toBe("");
  });
});
