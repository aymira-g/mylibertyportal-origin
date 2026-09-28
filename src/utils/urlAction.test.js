import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getUrlAction, clearUrlAction } from "./urlAction";

describe("urlAction utility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it("returns null when window is undefined", () => {
    delete globalThis.window;
    expect(getUrlAction("action")).toBe(null);
  });

  it("getUrlAction reads the action parameter", () => {
    globalThis.window = /** @type {any} */ ({
      location: new URL("https://portal.myliberty.id/?action=attendance&foo=bar"),
      history: { replaceState: vi.fn() },
    });

    expect(getUrlAction("action")).toBe("attendance");
    expect(getUrlAction("foo")).toBe("bar");
    expect(getUrlAction("missing")).toBe(null);
  });

  it("clearUrlAction strips the action parameter and calls history.replaceState", () => {
    const fakeUrl = new URL("https://portal.myliberty.id/dashboard?action=attendance&tab=classes");
    const replaceStateSpy = vi.fn();
    globalThis.window = /** @type {any} */ ({
      location: fakeUrl,
      history: { replaceState: replaceStateSpy },
    });

    clearUrlAction("action");
    expect(replaceStateSpy).toHaveBeenCalledWith({}, expect.any(String), "/dashboard?tab=classes");
  });

  it("clearUrlAction leaves URL clean when action is the only param", () => {
    const fakeUrl = new URL("https://portal.myliberty.id/?action=attendance");
    const replaceStateSpy = vi.fn();
    globalThis.window = /** @type {any} */ ({
      location: fakeUrl,
      history: { replaceState: replaceStateSpy },
    });

    clearUrlAction("action");
    expect(replaceStateSpy).toHaveBeenCalledWith({}, expect.any(String), "/");
  });
});
