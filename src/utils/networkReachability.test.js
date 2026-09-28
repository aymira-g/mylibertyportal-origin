import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkNetworkReachability } from "./networkReachability";

describe("checkNetworkReachability", () => {
  const originalFetch = globalThis.fetch;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("returns false immediately when navigator.onLine is false without fetching", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      writable: true,
      configurable: true,
    });

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const reachable = await checkNetworkReachability();
    expect(reachable).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns true when probe fetch succeeds with 200 OK", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const reachable = await checkNetworkReachability();
    expect(reachable).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/manifest.webmanifest?_reachability="),
      expect.objectContaining({ method: "HEAD", cache: "no-store" })
    );
  });

  it("returns false when probe fetch throws (e.g. network failure or captive portal abort)", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    const reachable = await checkNetworkReachability({ timeoutMs: 100 });
    expect(reachable).toBe(false);
  });

  it("returns false when probe fetch returns a 4xx or 5xx status", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });

    const reachable = await checkNetworkReachability();
    expect(reachable).toBe(false);
  });
});
