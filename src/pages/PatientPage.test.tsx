import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";

const authState = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const patientServiceState = vi.hoisted(() => ({
  getPatient: vi.fn(),
}));

const chartToolState = vi.hoisted(() => ({
  getPatientSnapshot: vi.fn(),
}));

const runServiceState = vi.hoisted(() => ({
  listRecentRuns: vi.fn(),
}));

vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: authState.useAuth,
}));

vi.mock("@/services/patientContextService", () => ({
  patientContextService: patientServiceState,
}));

vi.mock("@/services/chartToolService", () => ({
  chartToolService: chartToolState,
}));

vi.mock("@/services/runOrchestratorService", () => ({
  runOrchestratorService: runServiceState,
}));

vi.mock("@/components/EditPatientDialog", () => ({
  default: () => <div>Edit Patient Dialog</div>,
}));

import PatientPage from "./PatientPage";

describe("PatientPage", () => {
  beforeEach(() => {
    authState.useAuth.mockReturnValue({
      profile: {
        id: "user-1",
      },
    });
    patientServiceState.getPatient.mockReset();
    chartToolState.getPatientSnapshot.mockReset();
    runServiceState.listRecentRuns.mockReset();
  });

  it("renders patient details, evidence, and recent runs", async () => {
    patientServiceState.getPatient.mockResolvedValue({
      id: "patient-1",
      display_name: "Eleanor Vance",
      birth_date: "1959-04-11",
      sex: "Female",
      mrn: "MRN-100101",
      is_synthetic: true,
      primary_conditions: [{ display: "CKD Stage 3" }],
      summary: { narrative: "Progressive CKD" },
    });
    chartToolState.getPatientSnapshot.mockResolvedValue({
      evidence: [
        {
          id: "obs-egfr",
          label: "eGFR",
          type: "Observation",
          date: "2026-02-28",
          value: "38 mL/min/1.73m²",
        },
      ],
    });
    runServiceState.listRecentRuns.mockResolvedValue([
      {
        id: "run-1",
        state: "accepted",
        patientId: "patient-1",
        destination: "Nephrology Intake",
        createdAt: "2026-03-30T10:00:00Z",
      },
    ]);
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/app/patients/:patientId" element={<PatientPage />} />
        <Route path="/app/referrals/new" element={<div>Referral Route</div>} />
        <Route path="/app/runs/:runId" element={<div>Run Route</div>} />
      </Routes>,
      { route: "/app/patients/patient-1" },
    );

    await screen.findByText("Eleanor Vance");
    expect(screen.getByText("eGFR")).toBeInTheDocument();
    expect(screen.getByText("Nephrology Intake")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Start Consult Passport/i }));
    expect(screen.getByText("Referral Route")).toBeInTheDocument();
  });

  it("shows a not found state when the patient lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    patientServiceState.getPatient.mockRejectedValue(new Error("missing"));
    chartToolState.getPatientSnapshot.mockResolvedValue({ evidence: [] });
    runServiceState.listRecentRuns.mockResolvedValue([]);

    renderWithProviders(
      <Routes>
        <Route path="/app/patients/:patientId" element={<PatientPage />} />
      </Routes>,
      { route: "/app/patients/missing" },
    );

    expect(await screen.findByText("Patient not found.")).toBeInTheDocument();
  });
});
