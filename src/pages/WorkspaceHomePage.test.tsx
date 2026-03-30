import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";

const authState = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const patientServiceState = vi.hoisted(() => ({
  listPatients: vi.fn(),
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

vi.mock("@/services/runOrchestratorService", () => ({
  runOrchestratorService: runServiceState,
}));

vi.mock("@/components/CreatePatientDialog", () => ({
  default: () => <div>Create Patient Dialog</div>,
}));

import WorkspaceHomePage from "./WorkspaceHomePage";

describe("WorkspaceHomePage", () => {
  beforeEach(() => {
    authState.useAuth.mockReturnValue({
      profile: {
        id: "user-1",
        fullName: "Demo Coordinator",
      },
    });
    patientServiceState.listPatients.mockReset();
    runServiceState.listRecentRuns.mockReset();
  });

  it("renders patient cards and recent runs", async () => {
    patientServiceState.listPatients.mockResolvedValue([
      {
        id: "patient-1",
        display_name: "Eleanor Vance",
        mrn: "MRN-100101",
        sex: "Female",
        is_synthetic: true,
        primary_conditions: [{ display: "CKD Stage 3" }],
        summary: { age: "67" },
      },
    ]);
    runServiceState.listRecentRuns.mockResolvedValue([
      {
        id: "run-1",
        state: "accepted",
        patientId: "patient-1",
        patientName: "Eleanor Vance",
        destination: "Nephrology Intake",
        createdAt: "2026-03-30T10:00:00Z",
      },
    ]);
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/app" element={<WorkspaceHomePage />} />
        <Route path="/app/patients/:patientId" element={<div>Patient Route</div>} />
        <Route path="/app/referrals/new" element={<div>Referral Route</div>} />
        <Route path="/app/runs/:runId" element={<div>Run Route</div>} />
      </Routes>,
      { route: "/app" },
    );

    await screen.findByTestId("patient-link-patient-1");
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Recent Referral Runs")).toBeInTheDocument();

    await user.click(screen.getByTestId("patient-link-patient-1"));
    expect(screen.getByText("Patient Route")).toBeInTheDocument();
  });

  it("shows an empty state when no runs exist yet", async () => {
    patientServiceState.listPatients.mockResolvedValue([]);
    runServiceState.listRecentRuns.mockResolvedValue([]);

    renderWithProviders(<WorkspaceHomePage />, { route: "/app" });

    expect(await screen.findByText("No referral runs yet.")).toBeInTheDocument();
  });
});
