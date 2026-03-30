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

const chartToolState = vi.hoisted(() => ({
  getPatientSnapshot: vi.fn(),
  getLatestUacr: vi.fn(),
}));

const intakeDeskState = vi.hoisted(() => ({
  evaluate: vi.fn(),
}));

const passportBuilderState = vi.hoisted(() => ({
  buildPassport: vi.fn(),
  updatePassportWithEvidence: vi.fn(),
}));

const patientContextState = vi.hoisted(() => ({
  getPatient: vi.fn(),
  buildPatientContext: vi.fn(),
}));

const traceState = vi.hoisted(() => ({
  createEntry: vi.fn(),
}));

const auditState = vi.hoisted(() => ({
  log: vi.fn(),
}));

function queue(table, chain) {
  const entries = supabaseState.queues.get(table) ?? [];
  entries.push(chain);
  supabaseState.queues.set(table, entries);
  return chain;
}

function queueNoop(table) {
  return queue(table, createQueryChain({ data: null }));
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

vi.mock("./chartToolService", () => ({
  chartToolService: chartToolState,
}));

vi.mock("./intakeDeskService", () => ({
  intakeDeskService: intakeDeskState,
}));

vi.mock("./passportBuilderService", () => ({
  passportBuilderService: passportBuilderState,
}));

vi.mock("./patientContextService", () => ({
  patientContextService: patientContextState,
}));

vi.mock("./traceService", () => ({
  traceService: traceState,
}));

vi.mock("./auditService", () => ({
  auditService: auditState,
}));

import { runOrchestratorService } from "./runOrchestratorService";

describe("runOrchestratorService", () => {
  const patientContext = {
    patientId: "patient-1",
    displayName: "Eleanor Vance",
    age: 67,
    sex: "Female",
    conditionTags: ["CKD Stage 3"],
    fhirContext: {
      fhirUrl: "urn:patient:patient-1",
      patientId: "patient-1",
      tokenPresent: true,
      sourceLabel: "Demo EHR (Synthetic)",
    },
  };

  const destination = {
    id: "dest-1",
    slug: "nephrology-intake",
    display_name: "Nephrology Intake",
    specialty: "Nephrology",
    agent_label: "Nephrology Intake Desk",
    is_active: true,
  };

  const snapshot = {
    evidence: [
      {
        id: "obs-egfr",
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
    ],
    trace: [
      {
        id: "trace-1",
        kind: "mcp",
        label: "Chart snapshot requested",
        description: "Fetching current chart context",
        status: "info" as const,
        timestamp: "2026-03-30T10:00:00Z",
        source: "chart-tool-service",
      },
    ],
  };

  const passport = {
    id: "passport-1",
    title: "Referral",
    patientSummary: "Summary",
    destination: "Nephrology Intake",
    reasonForReferral: "Reason",
    clinicalContext: "Context",
    conditions: ["CKD Stage 3"],
    medications: ["Lisinopril"],
    keyFindings: ["eGFR: 38 mL/min/1.73m²"],
    attachedEvidenceIds: ["obs-egfr"],
    status: "draft" as const,
    lastSubmittedAt: null,
  };

  beforeEach(() => {
    supabaseState.from.mockClear();
    supabaseState.queues.clear();
    chartToolState.getPatientSnapshot.mockReset();
    chartToolState.getLatestUacr.mockReset();
    intakeDeskState.evaluate.mockReset();
    passportBuilderState.buildPassport.mockReset();
    passportBuilderState.updatePassportWithEvidence.mockReset();
    patientContextState.getPatient.mockReset();
    patientContextState.buildPatientContext.mockReset();
    traceState.createEntry.mockReset();
    auditState.log.mockReset();

    patientContextState.getPatient.mockResolvedValue({ id: "patient-1" });
    patientContextState.buildPatientContext.mockReturnValue(patientContext);
    chartToolState.getPatientSnapshot.mockResolvedValue(snapshot);
    passportBuilderState.buildPassport.mockReturnValue({ ...passport });
    traceState.createEntry.mockImplementation((kind, label, description, status = "info", source = "system") => ({
      id: `${kind}-${label}`,
      kind,
      label,
      description,
      status,
      timestamp: "2026-03-30T10:00:00Z",
      source,
    }));
    auditState.log.mockResolvedValue(undefined);
  });

  it("starts a referral run and returns an input-required read model", async () => {
    queue("destinations", createQueryChain({ data: destination }));
    queue("demo_scenarios", createQueryChain({ data: { id: "scenario-1" } }));
    queue("referral_runs", createQueryChain({ data: { id: "run-1" } }));
    const submittedUpdate = queue("referral_runs", createQueryChain({ data: null }));
    const finalUpdate = queue("referral_runs", createQueryChain({ data: null }));
    queueNoop("run_events");
    queueNoop("run_events");
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queueNoop("artifact_snapshots");
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queueNoop("artifact_snapshots");
    queueNoop("run_events");
    queueNoop("run_events");
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queueNoop("artifact_snapshots");
    queueNoop("run_events");
    queue(
      "run_events",
      createQueryChain({
        data: [
          {
            id: "event-1",
            run_id: "run-1",
            event_type: "run.created",
            source: "orchestrator",
            stage: "init",
            payload: {},
            created_at: "2026-03-30T10:00:00Z",
          },
        ],
      }),
    );

    intakeDeskState.evaluate.mockResolvedValue({
      decision: "input_required",
      taskState: "input-needed",
      missingRequirements: [
        {
          code: "uacr_recent",
          label: "UACR within 90 days",
          status: "unmet",
          description: "Missing UACR",
          required: true,
          repairable: true,
        },
      ],
      satisfiedRequirements: [],
      summary: "Missing UACR",
      agentLabel: "Nephrology Intake Desk",
      timestamp: "2026-03-30T10:02:00Z",
    });

    const result = await runOrchestratorService.startReferralRun("user-1", "patient-1", "nephrology-intake");

    expect(result.runId).toBe("run-1");
    expect(result.state).toBe("input_required");
    expect(result.canRepair).toBe(true);
    expect(result.destination?.displayName).toBe("Nephrology Intake");
    expect(result.requirements).toHaveLength(1);
    expect(submittedUpdate.update).toHaveBeenCalledWith({ state: "submitted" });
    expect(finalUpdate.update).toHaveBeenCalledWith({
      state: "input_required",
      state_reason: "Missing UACR",
      current_requirement_code: "uacr_recent",
    });
    expect(auditState.log).toHaveBeenCalledWith(
      "user-1",
      "referral_run.started",
      "referral_run",
      "run-1",
      { patientId: "patient-1", destinationSlug: "nephrology-intake" },
    );
  });

  it("throws when the destination cannot be resolved", async () => {
    queue(
      "destinations",
      createQueryChain({
        data: null,
        error: { message: "missing destination" },
      }),
    );

    await expect(
      runOrchestratorService.startReferralRun("user-1", "patient-1", "unknown-destination"),
    ).rejects.toThrow("Destination not found");
  });

  it("starts a referral run directly into the accepted state when intake has no missing requirements", async () => {
    queue("destinations", createQueryChain({ data: destination }));
    queue("demo_scenarios", createQueryChain({ data: null }));
    queue("referral_runs", createQueryChain({ data: { id: "run-accepted" } }));
    const submittedUpdate = queue("referral_runs", createQueryChain({ data: null }));
    const finalUpdate = queue("referral_runs", createQueryChain({ data: null }));
    queueNoop("run_events");
    queueNoop("run_events");
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queueNoop("artifact_snapshots");
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queueNoop("artifact_snapshots");
    queueNoop("run_events");
    queueNoop("run_events");
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queueNoop("artifact_snapshots");
    queue(
      "run_events",
      createQueryChain({
        data: [
          {
            id: "event-accepted",
            run_id: "run-accepted",
            event_type: "intake.accepted",
            source: "intake-desk",
            stage: "accepted",
            payload: {},
            created_at: "2026-03-30T10:02:00Z",
          },
        ],
      }),
    );

    intakeDeskState.evaluate.mockResolvedValue({
      decision: "accepted",
      taskState: "completed",
      missingRequirements: [],
      satisfiedRequirements: [],
      summary: "Accepted",
      agentLabel: "Nephrology Intake Desk",
      timestamp: "2026-03-30T10:02:00Z",
    });

    const result = await runOrchestratorService.startReferralRun("user-1", "patient-1", "nephrology-intake");

    expect(result.runId).toBe("run-accepted");
    expect(result.state).toBe("accepted");
    expect(result.canRepair).toBe(false);
    expect(submittedUpdate.update).toHaveBeenCalledWith({ state: "submitted" });
    expect(finalUpdate.update).toHaveBeenCalledWith({
      state: "accepted",
      state_reason: "Accepted",
      current_requirement_code: null,
    });
  });

  it("reconstructs a stored referral run into the read model", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          id: "run-1",
          state: "accepted",
          state_reason: "Accepted",
          patients: {
            id: "patient-1",
          },
          destinations: destination,
        },
      }),
    );
    queue(
      "artifact_snapshots",
      createQueryChain({
        data: [
          { artifact_name: "intake_decision", content: { decision: "accepted", missingRequirements: [], satisfiedRequirements: [] } },
          { artifact_name: "evidence_table", content: snapshot.evidence },
          { artifact_name: "referral_passport", content: passport },
        ],
      }),
    );
    queue(
      "run_events",
      createQueryChain({
        data: [
          {
            id: "event-1",
            run_id: "run-1",
            event_type: "intake.accepted",
            source: "intake-desk",
            stage: "accepted",
            payload: {},
            created_at: "2026-03-30T10:02:00Z",
          },
        ],
      }),
    );

    const result = await runOrchestratorService.getReferralRun("run-1");

    expect(result.state).toBe("accepted");
    expect(result.canReset).toBe(true);
    expect(result.trace[0]).toMatchObject({
      kind: "a2a",
      label: "Accepted by Nephrology Intake",
      status: "success",
    });
    expect(result.passport).toMatchObject({ id: "passport-1" });
  });

  it("returns empty requirements when a stored run has no decision artifact", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          id: "run-2",
          state: "submitted",
          state_reason: null,
          patients: {
            id: "patient-1",
          },
          destinations: null,
        },
      }),
    );
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queue("run_events", createQueryChain({ data: [] }));

    const result = await runOrchestratorService.getReferralRun("run-2");

    expect(result.requirements).toEqual([]);
    expect(result.destination).toBeNull();
    expect(result.intakeDecision).toBeNull();
  });

  it("maps replayable event history into warning, fhir, and system trace entries", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          id: "run-trace",
          state: "input_required",
          state_reason: "Need more input",
          patients: {
            id: "patient-1",
          },
          destinations: destination,
        },
      }),
    );
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queue(
      "run_events",
      createQueryChain({
        data: [
          {
            id: "event-warning",
            run_id: "run-trace",
            event_type: "intake.input_required",
            source: "intake-desk",
            stage: "evaluation",
            payload: { missing: ["uacr_recent"] },
            created_at: "2026-03-30T10:02:00Z",
          },
          {
            id: "event-fhir",
            run_id: "run-trace",
            event_type: "passport.created",
            source: "passport-builder",
            stage: "assembly",
            payload: {},
            created_at: "2026-03-30T10:01:00Z",
          },
          {
            id: "event-system",
            run_id: "run-trace",
            event_type: "system.notice",
            source: "system",
            stage: "info",
            payload: { message: "noop" },
            created_at: "2026-03-30T10:00:00Z",
          },
        ],
      }),
    );

    const result = await runOrchestratorService.getReferralRun("run-trace");

    expect(result.trace).toEqual([
      expect.objectContaining({ id: "event-warning", kind: "a2a", label: "Input required by intake", status: "warning" }),
      expect.objectContaining({ id: "event-fhir", kind: "fhir", label: "Referral passport built", status: "info" }),
      expect.objectContaining({ id: "event-system", kind: "system", label: "system.notice", status: "info" }),
    ]);
  });

  it("maps context, mcp, and failed events while normalizing missing event fields", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          id: "run-trace-2",
          state: "failed",
          state_reason: "Pipeline failed",
          patients: {
            id: "patient-1",
          },
          destinations: destination,
        },
      }),
    );
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queue(
      "run_events",
      createQueryChain({
        data: [
          {
            id: "event-context",
            run_id: "run-trace-2",
            event_type: "context.bound",
            source: null,
            stage: null,
            payload: null,
            created_at: null,
          },
          {
            id: "event-mcp",
            run_id: "run-trace-2",
            event_type: "repair.started",
            source: "orchestrator",
            stage: "repair",
            payload: {},
            created_at: "2026-03-30T10:03:00Z",
          },
          {
            id: "event-failed",
            run_id: "run-trace-2",
            event_type: "run.failed",
            source: "orchestrator",
            stage: "failed",
            payload: {},
            created_at: "2026-03-30T10:04:00Z",
          },
        ],
      }),
    );

    const result = await runOrchestratorService.getReferralRun("run-trace-2");

    expect(result.events[0]).toMatchObject({
      source: "",
      stage: "",
      payload: {},
      createdAt: "",
    });
    expect(result.trace).toEqual([
      expect.objectContaining({ id: "event-context", kind: "context", label: "Patient context bound", status: "info" }),
      expect.objectContaining({ id: "event-mcp", kind: "mcp", label: "Repair initiated", status: "info" }),
      expect.objectContaining({ id: "event-failed", kind: "a2a", label: "Run failed", status: "error" }),
    ]);
  });

  it("throws when reconstructing a run that does not exist", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: null,
        error: { message: "missing run" },
      }),
    );

    await expect(runOrchestratorService.getReferralRun("missing-run")).rejects.toThrow("Run not found");
  });

  it("repairs a referral run to an accepted state when UACR is found", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          id: "run-1",
          state: "input_required",
          patient_id: "patient-1",
          destination_id: "dest-1",
          patients: { id: "patient-1" },
          destinations: destination,
        },
      }),
    );
    const repairingUpdate = queue("referral_runs", createQueryChain({ data: null }));
    const resubmittingUpdate = queue("referral_runs", createQueryChain({ data: null }));
    const finalUpdate = queue("referral_runs", createQueryChain({ data: null }));
    const terminalUpdate = queue("referral_runs", createQueryChain({ data: null }));
    queueNoop("run_events");
    queueNoop("run_events");
    queueNoop("run_events");
    queue(
      "artifact_snapshots",
      createQueryChain({
        data: [
          { artifact_name: "referral_passport", content: passport },
          { artifact_name: "evidence_table", content: snapshot.evidence },
        ],
      }),
    );
    queue("artifact_snapshots", createQueryChain({ data: [{ artifact_version: 1 }] }));
    queueNoop("artifact_snapshots");
    queue("artifact_snapshots", createQueryChain({ data: [{ artifact_version: 1 }] }));
    queueNoop("artifact_snapshots");
    queueNoop("run_events");
    queue("artifact_snapshots", createQueryChain({ data: [{ artifact_version: 1 }] }));
    queueNoop("artifact_snapshots");
    queueNoop("run_events");
    queue(
      "run_events",
      createQueryChain({
        data: [
          {
            id: "event-1",
            run_id: "run-1",
            event_type: "intake.accepted",
            source: "intake-desk",
            stage: "accepted",
            payload: {},
            created_at: "2026-03-30T10:05:00Z",
          },
        ],
      }),
    );

    chartToolState.getLatestUacr.mockResolvedValue({
      evidence: {
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
      trace: [],
    });
    passportBuilderState.updatePassportWithEvidence.mockReturnValue({
      ...passport,
      attachedEvidenceIds: ["obs-egfr", "obs-uacr"],
    });
    intakeDeskState.evaluate.mockResolvedValue({
      decision: "accepted",
      taskState: "completed",
      missingRequirements: [],
      satisfiedRequirements: [
        {
          code: "uacr_recent",
          label: "UACR within 90 days",
          status: "met",
          description: "UACR present",
          required: true,
          repairable: true,
        },
      ],
      summary: "Accepted",
      agentLabel: "Nephrology Intake Desk",
      timestamp: "2026-03-30T10:05:00Z",
    });

    const result = await runOrchestratorService.repairReferralRun("run-1", "uacr_recent", "user-1");

    expect(result.state).toBe("accepted");
    expect(result.canReset).toBe(true);
    expect(repairingUpdate.update).toHaveBeenCalledWith({ state: "repairing" });
    expect(resubmittingUpdate.update).toHaveBeenCalledWith({ state: "resubmitting" });
    expect(finalUpdate.update).toHaveBeenCalledWith({ state: "accepted", state_reason: "Accepted" });
    expect(terminalUpdate.update).toHaveBeenCalledWith({
      repair_attempted: true,
      accepted_at: expect.any(String),
    });
    expect(passportBuilderState.updatePassportWithEvidence).toHaveBeenCalled();
    expect(auditState.log).toHaveBeenCalledWith(
      "user-1",
      "referral_run.repaired",
      "referral_run",
      "run-1",
      { requirementCode: "uacr_recent", outcome: "accepted" },
    );
  });

  it("throws when repairing a run that does not exist", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: null,
        error: { message: "missing run" },
      }),
    );

    await expect(
      runOrchestratorService.repairReferralRun("missing-run", "uacr_recent", "user-1"),
    ).rejects.toThrow("Run not found");
  });

  it("throws when attempting to repair a non-repairable state", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          id: "run-accepted",
          state: "accepted",
          patient_id: "patient-1",
          destination_id: "dest-1",
          patients: { id: "patient-1" },
          destinations: destination,
        },
      }),
    );

    await expect(
      runOrchestratorService.repairReferralRun("run-accepted", "uacr_recent", "user-1"),
    ).rejects.toThrow("Cannot repair from state: accepted");
  });

  it("blocks a referral repair when UACR cannot be found", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          id: "run-1",
          state: "input_required",
          patient_id: "patient-1",
          destination_id: "dest-1",
          patients: { id: "patient-1" },
          destinations: destination,
        },
      }),
    );
    const repairingUpdate = queue("referral_runs", createQueryChain({ data: null }));
    const blockedUpdate = queue("referral_runs", createQueryChain({ data: null }));
    queueNoop("run_events");
    queueNoop("run_events");
    queue("artifact_snapshots", createQueryChain({ data: [] }));
    queueNoop("artifact_snapshots");
    queueNoop("run_events");
    queue(
      "run_events",
      createQueryChain({
        data: [
          {
            id: "event-1",
            run_id: "run-1",
            event_type: "run.blocked",
            source: "orchestrator",
            stage: "blocked",
            payload: { reason: "uacr_not_found" },
            created_at: "2026-03-30T10:04:00Z",
          },
        ],
      }),
    );
    queue(
      "artifact_snapshots",
      createQueryChain({
        data: [
          { artifact_name: "referral_passport", content: passport },
          { artifact_name: "evidence_table", content: snapshot.evidence },
        ],
      }),
    );

    chartToolState.getLatestUacr.mockResolvedValue({
      evidence: null,
      trace: [],
    });

    const result = await runOrchestratorService.repairReferralRun("run-1", "uacr_recent", "user-1");

    expect(result.state).toBe("blocked");
    expect(result.canReset).toBe(true);
    expect(repairingUpdate.update).toHaveBeenCalledWith({ state: "repairing" });
    expect(blockedUpdate.update).toHaveBeenCalledWith({
      state: "blocked",
      state_reason: "UACR not found in patient chart. Manual follow-up required.",
    });
  });

  it("blocks a referral run after resubmission when intake still rejects the packet", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          id: "run-3",
          state: "input_required",
          patient_id: "patient-1",
          destination_id: "dest-1",
          patients: { id: "patient-1" },
          destinations: destination,
        },
      }),
    );
    queue("referral_runs", createQueryChain({ data: null }));
    queue("referral_runs", createQueryChain({ data: null }));
    const finalUpdate = queue("referral_runs", createQueryChain({ data: null }));
    const terminalUpdate = queue("referral_runs", createQueryChain({ data: null }));
    queueNoop("run_events");
    queueNoop("run_events");
    queueNoop("run_events");
    queue(
      "artifact_snapshots",
      createQueryChain({
        data: [
          { artifact_name: "referral_passport", content: passport },
          { artifact_name: "evidence_table", content: snapshot.evidence },
        ],
      }),
    );
    queue("artifact_snapshots", createQueryChain({ data: [{ artifact_version: 1 }] }));
    queueNoop("artifact_snapshots");
    queue("artifact_snapshots", createQueryChain({ data: [{ artifact_version: 1 }] }));
    queueNoop("artifact_snapshots");
    queueNoop("run_events");
    queue("artifact_snapshots", createQueryChain({ data: [{ artifact_version: 1 }] }));
    queueNoop("artifact_snapshots");
    queueNoop("run_events");
    queue(
      "run_events",
      createQueryChain({
        data: [
          {
            id: "event-blocked",
            run_id: "run-3",
            event_type: "run.blocked",
            source: "intake-desk",
            stage: "blocked",
            payload: {},
            created_at: "2026-03-30T10:06:00Z",
          },
        ],
      }),
    );

    chartToolState.getLatestUacr.mockResolvedValue({
      evidence: {
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
      trace: [],
    });
    passportBuilderState.updatePassportWithEvidence.mockReturnValue({
      ...passport,
      attachedEvidenceIds: ["obs-egfr", "obs-uacr"],
    });
    intakeDeskState.evaluate.mockResolvedValue({
      decision: "blocked",
      taskState: "blocked",
      missingRequirements: [
        {
          code: "uacr_recent",
          label: "UACR within 90 days",
          status: "unmet",
          description: "UACR still unacceptable",
          required: true,
          repairable: true,
        },
      ],
      satisfiedRequirements: [],
      summary: "Manual review required",
      agentLabel: "Nephrology Intake Desk",
      timestamp: "2026-03-30T10:06:00Z",
    });

    const result = await runOrchestratorService.repairReferralRun("run-3", "uacr_recent", "user-1");

    expect(result.state).toBe("blocked");
    expect(finalUpdate.update).toHaveBeenCalledWith({ state: "blocked", state_reason: "Manual review required" });
    expect(terminalUpdate.update).toHaveBeenCalledWith({
      repair_attempted: true,
      blocked_at: expect.any(String),
    });
  });

  it("lists recent runs and falls back to unknown names when nested data is absent", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: [
          {
            id: "run-summary",
            state: "submitted",
            patient_id: "patient-1",
            created_at: "2026-03-30T10:00:00Z",
            patients: null,
            destinations: null,
          },
        ],
      }),
    );

    await expect(runOrchestratorService.listRecentRuns("user-1")).resolves.toEqual([
      {
        id: "run-summary",
        state: "submitted",
        patientId: "patient-1",
        patientName: "Unknown",
        destination: "Unknown",
        createdAt: "2026-03-30T10:00:00Z",
      },
    ]);
  });

  it("surfaces Supabase errors while listing recent runs", async () => {
    const listingError = new Error("listing failed");
    queue(
      "referral_runs",
      createQueryChain({
        data: null,
        error: listingError,
      }),
    );

    await expect(runOrchestratorService.listRecentRuns("user-1")).rejects.toBe(listingError);
  });

  it("resets a referral run by starting a fresh run for the same patient and destination", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          patient_id: "patient-1",
          destination_id: "dest-1",
        },
      }),
    );
    queue(
      "destinations",
      createQueryChain({
        data: {
          slug: "nephrology-intake",
        },
      }),
    );

    const startSpy = vi
      .spyOn(runOrchestratorService, "startReferralRun")
      .mockResolvedValue({ runId: "run-2" } as Awaited<ReturnType<typeof runOrchestratorService.startReferralRun>>);

    await expect(runOrchestratorService.resetReferralRun("run-1", "user-1")).resolves.toBe("run-2");

    expect(startSpy).toHaveBeenCalledWith("user-1", "patient-1", "nephrology-intake");
    startSpy.mockRestore();
  });

  it("falls back to the default destination slug when a reset run has no destination lookup", async () => {
    queue(
      "referral_runs",
      createQueryChain({
        data: {
          patient_id: "patient-1",
          destination_id: "dest-1",
        },
      }),
    );
    queue("destinations", createQueryChain({ data: null }));

    const startSpy = vi
      .spyOn(runOrchestratorService, "startReferralRun")
      .mockResolvedValue({ runId: "run-4" } as Awaited<ReturnType<typeof runOrchestratorService.startReferralRun>>);

    await expect(runOrchestratorService.resetReferralRun("run-3", "user-1")).resolves.toBe("run-4");

    expect(startSpy).toHaveBeenCalledWith("user-1", "patient-1", "nephrology-intake");
    startSpy.mockRestore();
  });

  it("throws when attempting to reset a missing run", async () => {
    queue("referral_runs", createQueryChain({ data: null }));

    await expect(runOrchestratorService.resetReferralRun("missing-run", "user-1")).rejects.toThrow("Run not found");
  });
});
