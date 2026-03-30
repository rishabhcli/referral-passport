import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "@/test/supabaseMock";

const supabaseState = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

import { auditService } from "./auditService";

describe("auditService", () => {
  beforeEach(() => {
    supabaseState.from.mockReset();
  });

  it("writes audit log entries with explicit and default metadata", async () => {
    const firstInsert = createQueryChain({ data: null });
    const secondInsert = createQueryChain({ data: null });

    supabaseState.from.mockReturnValueOnce(firstInsert).mockReturnValueOnce(secondInsert);

    await auditService.log("user-1", "referral.created", "referral_run", "run-1", { source: "test" });
    await auditService.log("user-2", "referral.viewed", "referral_run", "run-2");

    expect(firstInsert.insert).toHaveBeenCalledWith([
      {
        actor_id: "user-1",
        action: "referral.created",
        entity_type: "referral_run",
        entity_id: "run-1",
        metadata: { source: "test" },
      },
    ]);
    expect(secondInsert.insert).toHaveBeenCalledWith([
      {
        actor_id: "user-2",
        action: "referral.viewed",
        entity_type: "referral_run",
        entity_id: "run-2",
        metadata: {},
      },
    ]);
  });
});
