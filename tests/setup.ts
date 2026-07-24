import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

if (typeof window !== "undefined") {
  window.requestAnimationFrame = (callback) =>
    window.setTimeout(() => callback(performance.now()), 16);
  window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);

  Object.defineProperty(window.HTMLMediaElement.prototype, "load", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
}
