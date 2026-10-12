import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PwaUpdateBanner from "./PwaUpdateBanner";
import {
  setPendingSwUpdate,
  getPendingSwUpdate,
  subscribeSwUpdate,
  clearPendingSwUpdate,
} from "./swUpdateStore";
import { shouldAutoApplyUpdate, KIOSK_AUTO_UPDATE_IDLE_MS } from "./autoUpdatePolicy";
import { isRunningAsInstalledApp } from "./usePwaInstall";

afterEach(() => clearPendingSwUpdate());

describe("PwaUpdateBanner", () => {
  it("renders nothing initially when no update is pending", () => {
    const html = renderToStaticMarkup(React.createElement(PwaUpdateBanner));
    expect(html).toBe("");
  });

  it("shows the banner when an update was detected before it mounted (DOM10-SW-01)", () => {
    setPendingSwUpdate(() => {});
    const html = renderToStaticMarkup(React.createElement(PwaUpdateBanner));
    expect(html).toContain("New version available");
    expect(html).toContain("Update Now");
  });

  it("uses kiosk wording when auto-apply is enabled", () => {
    setPendingSwUpdate(() => {});
    const html = renderToStaticMarkup(
      React.createElement(PwaUpdateBanner, { autoApplyWhenIdleMs: 1000 })
    );
    expect(html).toContain("update automatically when idle");
  });
});

describe("swUpdateStore", () => {
  it("keeps the pending update and notifies subscribers", () => {
    const seen = [];
    const unsubscribe = subscribeSwUpdate((fn) => seen.push(fn));
    const fn = () => {};
    setPendingSwUpdate(fn);
    expect(getPendingSwUpdate()).toBe(fn);
    expect(seen).toEqual([fn]);
    unsubscribe();
    setPendingSwUpdate(() => {});
    expect(seen).toHaveLength(1);
  });
});

describe("shouldAutoApplyUpdate (kiosk, DOM10-SW-02)", () => {
  const now = 10_000_000;
  const idle = { now, lastActivityAt: now - KIOSK_AUTO_UPDATE_IDLE_MS, busy: false, hasOpenDialog: false };

  it("applies after the full idle period", () => {
    expect(shouldAutoApplyUpdate(idle)).toBe(true);
  });

  it("waits if there was activity within the idle period", () => {
    expect(shouldAutoApplyUpdate({ ...idle, lastActivityAt: now - KIOSK_AUTO_UPDATE_IDLE_MS + 1 })).toBe(false);
  });

  it("never applies while someone is mid-flow", () => {
    expect(shouldAutoApplyUpdate({ ...idle, busy: true })).toBe(false);
  });

  it("never applies while a dialog is open", () => {
    expect(shouldAutoApplyUpdate({ ...idle, hasOpenDialog: true })).toBe(false);
  });

  it("idle period is 5 minutes", () => {
    expect(KIOSK_AUTO_UPDATE_IDLE_MS).toBe(5 * 60 * 1000);
  });
});

describe("isRunningAsInstalledApp (DOM10-UX-02)", () => {
  const winWith = (modes, standalone = false) => ({
    matchMedia: (q) => ({ matches: modes.some((m) => q === `(display-mode: ${m})`) }),
    navigator: { standalone },
  });

  it("detects standalone, fullscreen and minimal-ui", () => {
    expect(isRunningAsInstalledApp(winWith(["standalone"]))).toBe(true);
    expect(isRunningAsInstalledApp(winWith(["fullscreen"]))).toBe(true);
    expect(isRunningAsInstalledApp(winWith(["minimal-ui"]))).toBe(true);
  });

  it("detects iOS home-screen apps", () => {
    expect(isRunningAsInstalledApp(winWith([], true))).toBe(true);
  });

  it("is false in a normal browser tab or without window", () => {
    expect(isRunningAsInstalledApp(winWith(["browser"]))).toBe(false);
    expect(isRunningAsInstalledApp(undefined)).toBe(false);
  });
});
