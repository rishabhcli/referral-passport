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

import { patientContextService } from "./patientContextService";

describe("patientContextService", () => {
  beforeEach(() => {
    supabaseState.from.mockClear();
    supabaseState.queues.clear();
  });

  it("builds synthetic patient context with a demo source label", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T00:00:00Z"));

    const context = patientContextService.buildPatientContext({
      id: "patient-1",
      display_name: "Eleanor Vance",
      birth_date: "1959-04-11",
      sex: "Female",
      primary_conditions: [{ display: "CKD Stage 3" }],
      summary: { sourceLabel: "Ignored" },
      external_patient_key: "demo-accepted",
      is_synthetic: true,
    });

    expect(context.age).toBe(66);
    expect(context.conditionTags).toEqual(["CKD Stage 3"]);
    expect(context.fhirContext.patientId).toBe("demo-accepted");
    expect(context.fhirContext.sourceLabel).toBe("Demo EHR (Synthetic)");
  });

  it("builds non-synthetic patient context with the summary source label", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T00:00:00Z"));

    const context = patientContextService.buildPatientContext({
      id: "patient-2",
      display_name: "Marcus Hale",
      birth_date: "1964-09-02",
      sex: null,
      primary_conditions: [{ display: "CKD Stage 4" }],
      summary: { sourceLabel: "Regional EHR" },
      external_patient_key: null,
      is_synthetic: false,
    });

    expect(context.sex).toBe("Unknown");
    expect(context.fhirContext.fhirUrl).toBe("urn:patient:patient-2");
    expect(context.fhirContext.sourceLabel).toBe("Regional EHR");
  });

  it("falls back to the default EHR label when non-synthetic summary data is missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T00:00:00Z"));

    const context = patientContextService.buildPatientContext({
      id: "patient-3",
      display_name: "Alex Stone",
      birth_date: "1970-01-01",
      sex: "Male",
      primary_conditions: null,
      summary: null,
      external_patient_key: null,
      is_synthetic: null,
    });

    expect(context.conditionTags).toEqual([]);
    expect(context.fhirContext.patientId).toBe("patient-3");
    expect(context.fhirContext.sourceLabel).toBe("EHR");
  });

  it("loads a patient row", async () => {
    queue(
      "patients",
      createQueryChain({
        data: { id: "patient-1", display_name: "Eleanor Vance" },
      }),
    );

    await expect(patientContextService.getPatient("patient-1")).resolves.toEqual({
      id: "patient-1",
      display_name: "Eleanor Vance",
    });
  });

  it("throws when a patient cannot be found", async () => {
    queue(
      "patients",
      createQueryChain({
        data: null,
        error: { message: "missing row" },
      }),
    );

    await expect(patientContextService.getPatient("missing")).rejects.toThrow(
      "Patient not found: missing row",
    );
  });

  it("loads the default synthetic patient and lists patients", async () => {
    queue(
      "patients",
      createQueryChain({
        data: { id: "default-patient", display_name: "Default Patient" },
      }),
    );
    queue(
      "patients",
      createQueryChain({
        data: [
          { id: "patient-1", display_name: "Eleanor Vance" },
          { id: "patient-2", display_name: "Marcus Hale" },
        ],
      }),
    );

    await expect(patientContextService.getDefaultPatient()).resolves.toEqual({
      id: "default-patient",
      display_name: "Default Patient",
    });
    await expect(patientContextService.listPatients()).resolves.toEqual([
      { id: "patient-1", display_name: "Eleanor Vance" },
      { id: "patient-2", display_name: "Marcus Hale" },
    ]);
  });

  it("throws when the default patient or patient list query fails", async () => {
    const listError = new Error("listing failed");

    queue(
      "patients",
      createQueryChain({
        data: null,
        error: { message: "missing synthetic patient" },
      }),
    );
    queue(
      "patients",
      createQueryChain({
        data: null,
        error: listError,
      }),
    );

    await expect(patientContextService.getDefaultPatient()).rejects.toThrow(
      "No default patient: missing synthetic patient",
    );
    await expect(patientContextService.listPatients()).rejects.toBe(listError);
  });
});
