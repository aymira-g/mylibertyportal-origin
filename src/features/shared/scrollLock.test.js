import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  lockScroll,
  unlockScroll,
  getScrollLockCount,
  _resetScrollLockForTesting,
} from "./scrollLock";

describe("scrollLock manager", () => {
  beforeEach(() => {
    globalThis.document = /** @type {any} */ ({
      body: {
        style: {
          overflow: "auto",
        },
      },
    });
    _resetScrollLockForTesting();
  });

  afterEach(() => {
    _resetScrollLockForTesting();
    delete globalThis.document;
  });

  it("locks body scroll on first lock and caches original style", () => {
    document.body.style.overflow = "visible";
    expect(getScrollLockCount()).toBe(0);

    lockScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe("hidden");

    unlockScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe("visible");
  });

  it("correctly handles stacked / nested locks", () => {
    document.body.style.overflow = "";

    // First modal opens
    lockScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe("hidden");

    // Second stacked overlay (e.g. Confirm dialog) opens
    lockScroll();
    expect(getScrollLockCount()).toBe(2);
    expect(document.body.style.overflow).toBe("hidden");

    // Second stacked overlay closes -> body should STILL be locked
    unlockScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe("hidden");

    // First modal closes -> body unlocks
    unlockScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe("");
  });

  it("safely handles unmatched unlocks without going below 0", () => {
    expect(getScrollLockCount()).toBe(0);
    unlockScroll();
    expect(getScrollLockCount()).toBe(0);
  });

  it("handles environment where document is undefined", () => {
    delete globalThis.document;
    expect(() => lockScroll()).not.toThrow();
    expect(() => unlockScroll()).not.toThrow();
  });
});
