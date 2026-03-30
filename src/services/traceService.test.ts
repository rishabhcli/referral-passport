import { describe, expect, it, vi } from "vitest";
import { traceService } from "./traceService";

describe("traceService", () => {
  it("creates trace entries with the requested metadata", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T12:00:00Z"));

    const entry = traceService.createEntry(
      "mcp",
      "Chart snapshot requested",
      "Fetching current chart context",
      "warning",
      "chart-tool-service",
    );

    expect(entry.kind).toBe("mcp");
    expect(entry.label).toBe("Chart snapshot requested");
    expect(entry.status).toBe("warning");
    expect(entry.source).toBe("chart-tool-service");
    expect(entry.timestamp).toBe("2026-03-30T12:00:00.000Z");
  });

  it("uses default status and source values when they are omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T12:00:00Z"));

    const entry = traceService.createEntry("system", "Ready", "No overrides supplied");

    expect(entry.status).toBe("info");
    expect(entry.source).toBe("system");
  });
});
