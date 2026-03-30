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

import { chartToolService } from "./chartToolService";

describe("chartToolService", () => {
  beforeEach(() => {
    supabaseState.from.mockClear();
    supabaseState.queues.clear();
  });

  it("maps patient chart resources into evidence rows and trace metadata", async () => {
    queue(
      "fhir_resources",
      createQueryChain({
        data: [
          {
            id: "cond-1",
            resource_type: "Condition",
            resource_key: "cond-ckd3",
            resource_json: {
              code: { coding: [{ display: "CKD Stage 3" }] },
              clinicalStatus: "active",
              onsetDateTime: "2023-06-01",
            },
            effective_at: "2025-11-15T00:00:00Z",
          },
          {
            id: "obs-1",
            resource_type: "Observation",
            resource_key: "obs-egfr",
            resource_json: {
              code: { coding: [{ display: "eGFR" }] },
              valueQuantity: { value: 38, unit: "mL/min/1.73m²" },
            },
            effective_at: "2026-02-28T00:00:00Z",
          },
        ],
      }),
    );

    const result = await chartToolService.getPatientSnapshot("patient-1", "Demo EHR (Synthetic)");

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0]).toMatchObject({
      id: "cond-1",
      label: "CKD Stage 3",
      source: "Demo EHR (Synthetic)",
      attached: true,
    });
    expect(result.evidence[1]).toMatchObject({
      id: "obs-1",
      label: "eGFR",
      value: "38 mL/min/1.73m²",
    });
    expect(result.trace).toHaveLength(2);
  });

  it("throws when snapshot retrieval fails", async () => {
    queue(
      "fhir_resources",
      createQueryChain({
        data: null,
        error: { message: "db down" },
      }),
    );

    await expect(chartToolService.getPatientSnapshot("patient-1")).rejects.toThrow(
      "Chart snapshot failed: db down",
    );
  });

  it("returns a warning trace when no recent UACR exists", async () => {
    queue(
      "fhir_resources",
      createQueryChain({
        data: null,
        error: { message: "missing row" },
      }),
    );

    const result = await chartToolService.getLatestUacr("patient-1", "Demo EHR (Synthetic)");

    expect(result.evidence).toBeNull();
    expect(result.trace.at(-1)).toMatchObject({
      label: "UACR not found in chart",
      status: "warning",
    });
  });

  it("returns newly added evidence when a recent UACR exists", async () => {
    queue(
      "fhir_resources",
      createQueryChain({
        data: {
          id: "obs-uacr",
          resource_type: "Observation",
          resource_key: "obs-uacr-recent",
          resource_json: {
            code: { coding: [{ display: "UACR" }] },
            valueQuantity: { value: 285, unit: "mg/g" },
            interpretation: "elevated",
          },
          effective_at: "2026-03-10T00:00:00Z",
        },
      }),
    );

    const result = await chartToolService.getLatestUacr("patient-1", "Demo EHR (Synthetic)");

    expect(result.evidence).toMatchObject({
      id: "obs-uacr",
      label: "UACR",
      value: "285 mg/g (elevated)",
      newlyAdded: true,
      source: "Demo EHR (Synthetic)",
    });
    expect(result.trace.at(-1)).toMatchObject({
      label: "FHIR Observation retrieved",
      status: "success",
    });
  });

  it("maps additional FHIR resource types into evidence rows", async () => {
    queue(
      "fhir_resources",
      createQueryChain({
        data: [
          {
            id: "obs-panel",
            resource_type: "Observation",
            resource_key: "obs-bmp",
            resource_json: {
              code: { coding: [{ display: "Basic Metabolic Panel" }] },
              component: [
                {
                  code: { coding: [{ display: "Sodium" }] },
                  valueQuantity: { value: 138, unit: "mmol/L" },
                },
                {
                  code: { coding: [{ display: "Potassium" }] },
                  valueQuantity: { value: 4.7, unit: "mmol/L" },
                },
              ],
            },
            effective_at: "2026-03-01T00:00:00Z",
          },
          {
            id: "med-1",
            resource_type: "MedicationRequest",
            resource_key: "med-losartan",
            resource_json: {
              medicationCodeableConcept: { text: "Losartan 50mg" },
              dosageInstruction: [{ text: "Take once daily" }],
            },
            effective_at: "2026-03-01T00:00:00Z",
          },
          {
            id: "med-2",
            resource_type: "MedicationRequest",
            resource_key: "med-unknown",
            resource_json: {},
            effective_at: "",
          },
          {
            id: "doc-1",
            resource_type: "DocumentReference",
            resource_key: "doc-note",
            resource_json: {
              type: { text: "Referral Note" },
              content: "Referral note content that should be truncated in the evidence view.",
            },
            effective_at: "2026-03-01T00:00:00Z",
          },
          {
            id: "doc-2",
            resource_type: "DocumentReference",
            resource_key: "doc-empty",
            resource_json: {},
            effective_at: "",
          },
          {
            id: "careplan-1",
            resource_type: "CarePlan",
            resource_key: "careplan",
            resource_json: {},
            effective_at: "",
          },
        ],
      }),
    );

    const result = await chartToolService.getPatientSnapshot("patient-2");

    expect(result.evidence).toEqual([
      expect.objectContaining({
        id: "obs-panel",
        label: "Basic Metabolic Panel",
        value: "Sodium: 138 mmol/L / Potassium: 4.7 mmol/L",
        source: "EHR",
      }),
      expect.objectContaining({
        id: "med-1",
        type: "Medication",
        label: "Losartan 50mg",
        value: "Take once daily",
      }),
      expect.objectContaining({
        id: "med-2",
        type: "Medication",
        label: "Medication",
        value: "",
      }),
      expect.objectContaining({
        id: "doc-1",
        type: "Document",
        label: "Referral Note",
        value: expect.stringContaining("..."),
      }),
      expect.objectContaining({
        id: "doc-2",
        type: "Document",
        label: "Document",
        value: "",
      }),
      expect.objectContaining({
        id: "careplan-1",
        type: "CarePlan",
        label: "",
        date: "",
      }),
    ]);
  });
});
