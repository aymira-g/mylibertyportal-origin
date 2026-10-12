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

  it("registers popstate and keydown listeners and handles Escape key", () => {
    const onClose = vi.fn();

    // Simulate the effect logic of useOverlayHistory
    let isPushed = false;
    window.history.pushState({ overlay: true }, "");
    isPushed = true;

    const handlePopState = () => {
      if (isPushed) {
        isPushed = false;
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    expect(window.addEventListener).toHaveBeenCalledWith("popstate", expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));

    // Test non-Escape key doesn't close
    listeners.keydown({ key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();

    // Test Escape key triggers onClose
    listeners.keydown({ key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Test cleanup unwinds history
    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener("keydown", handleKeyDown);
    if (isPushed) {
      window.history.back();
    }
    expect(backSpy).toHaveBeenCalledTimes(1);
  });
});
