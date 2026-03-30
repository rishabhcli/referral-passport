import { describe, expect, it } from "vitest";
import { passportBuilderService } from "./passportBuilderService";

describe("passportBuilderService", () => {
  const patientContext = {
    patientId: "patient-1",
    displayName: "Eleanor Vance",
    age: 67,
    sex: "Female",
    conditionTags: ["CKD Stage 3", "Type 2 Diabetes"],
    fhirContext: {
      fhirUrl: "urn:patient:patient-1",
      patientId: "patient-1",
      tokenPresent: true,
      sourceLabel: "Demo EHR (Synthetic)",
    },
  };

  it("builds a referral passport from patient context and evidence", () => {
    const passport = passportBuilderService.buildPassport(
      patientContext,
      [
        {
          id: "obs-1",
          type: "Observation",
          label: "eGFR",
          date: "2026-02-28",
          value: "38 mL/min/1.73m²",
          source: "Demo EHR (Synthetic)",
          attached: true,
          newlyAdded: false,
          resourceType: "Observation",
          resourceKey: "obs-egfr",
        },
        {
          id: "med-1",
          type: "Medication",
          label: "Lisinopril 20mg",
          date: "2025-12-01",
          value: "Once daily",
          source: "Demo EHR (Synthetic)",
          attached: true,
          newlyAdded: false,
          resourceType: "MedicationRequest",
          resourceKey: "med-lisinopril",
        },
      ],
      "Nephrology Intake",
    );

    expect(passport.title).toContain("Eleanor Vance");
    expect(passport.destination).toBe("Nephrology Intake");
    expect(passport.conditions).toEqual(["CKD Stage 3", "Type 2 Diabetes"]);
    expect(passport.medications).toEqual(["Lisinopril 20mg"]);
    expect(passport.keyFindings).toEqual(["eGFR: 38 mL/min/1.73m²"]);
    expect(passport.attachedEvidenceIds).toEqual(["obs-1", "med-1"]);
    expect(passport.status).toBe("draft");
  });

  it("adds new evidence to an existing passport without duplicating IDs", () => {
    const updated = passportBuilderService.updatePassportWithEvidence(
      {
        id: "passport-1",
        title: "Referral",
        patientSummary: "Summary",
        destination: "Nephrology Intake",
        reasonForReferral: "Reason",
        clinicalContext: "Context",
        conditions: ["CKD Stage 3"],
        medications: [],
        keyFindings: [],
        attachedEvidenceIds: ["obs-1"],
        status: "submitted",
        lastSubmittedAt: null,
      },
      {
        id: "obs-2",
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
    );

    expect(updated.attachedEvidenceIds).toEqual(["obs-1", "obs-2"]);
    expect(updated.keyFindings).toContain("UACR: 285 mg/g");
  });

  it("handles empty condition lists and ignores duplicate non-observation evidence", () => {
    const emptyPassport = passportBuilderService.buildPassport(
      {
        ...patientContext,
        sex: "",
        conditionTags: [],
      },
      [],
      "General Intake",
    );

    expect(emptyPassport.patientSummary).toContain("conditions under evaluation");
    expect(emptyPassport.clinicalContext).toContain("conditions under evaluation");

    const updated = passportBuilderService.updatePassportWithEvidence(
      {
        ...emptyPassport,
        attachedEvidenceIds: ["doc-1"],
        keyFindings: ["Existing finding"],
      },
      {
        id: "doc-1",
        type: "Document",
        label: "Referral Note",
        date: "2026-03-10",
        value: "Document attached",
        source: "Demo EHR (Synthetic)",
        attached: true,
        newlyAdded: false,
        resourceType: "DocumentReference",
        resourceKey: "doc-note",
      },
    );

    expect(updated.attachedEvidenceIds).toEqual(["doc-1"]);
    expect(updated.keyFindings).toEqual(["Existing finding"]);
  });
});
