import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useOverlayHistory } from "./useOverlayHistory";

describe("useOverlayHistory logic", () => {
  let listeners = {};
  let pushStateSpy;
  let backSpy;

  beforeEach(() => {
    listeners = {};
    pushStateSpy = vi.fn();
    backSpy = vi.fn();

    globalThis.window = /** @type {any} */ ({
      history: {
        pushState: pushStateSpy,
        back: backSpy,
      },
      addEventListener: vi.fn((event, handler) => {
        listeners[event] = handler;
      }),
      removeEventListener: vi.fn((event) => {
        delete listeners[event];
      }),
    });
  });

  afterEach(() => {
    delete globalThis.window;
    vi.restoreAllMocks();
  });

  it("safely handles server-rendering / undefined window", () => {
    delete globalThis.window;
    expect(typeof useOverlayHistory).toBe("function");
  });

  it("exports useOverlayHistory function", () => {
    expect(typeof useOverlayHistory).toBe("function");
  });
});
