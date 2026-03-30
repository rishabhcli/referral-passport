import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "@/test/supabaseMock";

const supabaseState = vi.hoisted(() => {
  const queues = new Map();
  const from = vi.fn((table) => {
    const queue = queues.get(table);

    if (!queue?.length) {
      throw new Error(`No Supabase mock queued for table: ${table}`);
    }

    return queue.shift();
  });

  return { from, queues };
});

function queue(table, chain) {
  const entries = supabaseState.queues.get(table) ?? [];
  entries.push(chain);
  supabaseState.queues.set(table, entries);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

import { intakeDeskService } from "./intakeDeskService";

function queueProfile(requirements) {
  queue(
    "destinations",
    createQueryChain({
      data: {
        id: "dest-1",
        display_name: "Nephrology Intake",
        agent_label: "Nephrology Intake Desk",
      },
    }),
  );
  queue(
    "requirement_profiles",
    createQueryChain({
      data: {
        id: "profile-1",
        profile_json: { requirements },
      },
    }),
  );
}

describe("intakeDeskService", () => {
  beforeEach(() => {
    supabaseState.from.mockClear();
    supabaseState.queues.clear();
  });

  it("accepts a referral when every required item is satisfied", async () => {
    queueProfile([
      { code: "reason_present", label: "Reason", description: "Reason present", required: true, repairable: false },
      { code: "uacr_recent", label: "UACR", description: "Recent UACR", required: true, repairable: true },
    ]);

    const result = await intakeDeskService.evaluate(
      "dest-1",
      [
        {
          id: "obs-uacr",
          type: "Observation",
          label: "UACR",
          date: "2026-03-10",
          value: "285 mg/g",
          source: "Demo EHR (Synthetic)",
          attached: true,
          newlyAdded: true,
          resourceType: "Observation",
          resourceKey: "obs-uacr-recent",
        },
      ],
      { reasonForReferral: "Progressive CKD" },
    );

    expect(result.decision).toBe("accepted");
    expect(result.taskState).toBe("completed");
    expect(result.missingRequirements).toEqual([]);
  });

  it("requests more input when a repairable requirement is missing", async () => {
    queueProfile([
      { code: "reason_present", label: "Reason", description: "Reason present", required: true, repairable: false },
      { code: "uacr_recent", label: "UACR", description: "Recent UACR", required: true, repairable: true },
    ]);

    const result = await intakeDeskService.evaluate(
      "dest-1",
      [],
      { reasonForReferral: "Progressive CKD" },
    );

    expect(result.decision).toBe("input_required");
    expect(result.taskState).toBe("input-needed");
    expect(result.missingRequirements.map((item) => item.code)).toEqual(["uacr_recent"]);
  });

  it("blocks a referral when the missing requirement is not repairable", async () => {
    queueProfile([
      { code: "reason_present", label: "Reason", description: "Reason present", required: true, repairable: false },
    ]);

    const result = await intakeDeskService.evaluate("dest-1", [], {});

    expect(result.decision).toBe("blocked");
    expect(result.taskState).toBe("blocked");
    expect(result.missingRequirements[0]).toMatchObject({ code: "reason_present", repairable: false });
  });

  it("throws when there is no active requirement profile", async () => {
    queue(
      "destinations",
      createQueryChain({
        data: {
          id: "dest-1",
          display_name: "Nephrology Intake",
          agent_label: null,
        },
      }),
    );
    queue(
      "requirement_profiles",
      createQueryChain({
        data: null,
        error: { message: "missing row" },
      }),
    );

    await expect(intakeDeskService.evaluate("dest-1", [], {})).rejects.toThrow(
      "No active requirement profile found for destination",
    );
  });

  it("evaluates the remaining requirement codes and falls back to the destination display name", async () => {
    queue(
      "destinations",
      createQueryChain({
        data: {
          id: "dest-2",
          display_name: "General Intake",
          agent_label: null,
        },
      }),
    );
    queue(
      "requirement_profiles",
      createQueryChain({
        data: {
          id: "profile-2",
          profile_json: {
            requirements: [
              { code: "kidney_context_present", label: "Kidney Context", description: "CKD evidence present", required: true, repairable: false },
              { code: "renal_labs_present", label: "Renal Labs", description: "Recent renal labs present", required: true, repairable: false },
              { code: "medications_present", label: "Medications", description: "Medication list present", required: true, repairable: false },
              { code: "unknown_code", label: "Unknown", description: "Unknown rule", required: false, repairable: false },
            ],
          },
        },
      }),
    );

    const result = await intakeDeskService.evaluate(
      "dest-2",
      [
        {
          id: "cond-ckd",
          type: "Condition",
          label: "CKD Stage 3",
          date: "2026-03-10",
          value: "active",
          source: "Demo EHR (Synthetic)",
          attached: true,
          newlyAdded: false,
          resourceType: "Condition",
          resourceKey: "cond-ckd3",
        },
        {
          id: "obs-egfr",
          type: "Observation",
          label: "eGFR",
          date: "2026-03-10",
          value: "38",
          source: "Demo EHR (Synthetic)",
          attached: true,
          newlyAdded: false,
          resourceType: "Observation",
          resourceKey: "obs-egfr",
        },
        {
          id: "med-1",
          type: "Medication",
          label: "Lisinopril",
          date: "2026-03-10",
          value: "Once daily",
          source: "Demo EHR (Synthetic)",
          attached: true,
          newlyAdded: false,
          resourceType: "MedicationRequest",
          resourceKey: "med-lisinopril",
        },
      ],
      {},
    );

    expect(result.agentLabel).toBe("General Intake (A2A)");
    expect(result.satisfiedRequirements.map((item) => item.code)).toEqual([
      "kidney_context_present",
      "renal_labs_present",
      "medications_present",
    ]);
    expect(result.missingRequirements).toEqual([]);
  });
});
