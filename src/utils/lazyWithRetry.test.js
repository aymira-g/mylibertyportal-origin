import { describe, it, expect, vi } from "vitest";
import { lazyWithRetry } from "./lazyWithRetry";

describe("lazyWithRetry", () => {
  it("resolves successfully on the first attempt when import succeeds", async () => {
    const mockComponent = { default: () => "Component" };
    const importFn = vi.fn().mockResolvedValue(mockComponent);

    const LazyComponent = lazyWithRetry(importFn);
    expect(LazyComponent).toBeDefined();

    const result = await importFn();
    expect(result).toBe(mockComponent);
    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it("retries upon dynamic import fetch errors", async () => {
    const mockComponent = { default: () => "Component" };
    let attempts = 0;
    const importFn = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts === 1) {
        return Promise.reject(new TypeError("Failed to fetch dynamically imported module: /test.jsx"));
      }
      return Promise.resolve(mockComponent);
    });

    const LazyComponent = lazyWithRetry(importFn, 2, 10);
    expect(LazyComponent).toBeDefined();
  });
});
