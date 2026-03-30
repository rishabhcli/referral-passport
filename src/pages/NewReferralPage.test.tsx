import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { createQueryChain } from "@/test/supabaseMock";

const authState = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const patientServiceState = vi.hoisted(() => ({
  getPatient: vi.fn(),
}));

const runServiceState = vi.hoisted(() => ({
  startReferralRun: vi.fn(),
}));

const supabaseState = vi.hoisted(() => {
  const queues = [];
  const from = vi.fn(() => {
    const chain = queues.shift();

    if (!chain) {
      throw new Error("No Supabase query mock queued");
    }

    return chain;
  });

  return { from, queues };
});

vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: authState.useAuth,
}));

vi.mock("@/services/patientContextService", () => ({
  patientContextService: patientServiceState,
}));

vi.mock("@/services/runOrchestratorService", () => ({
  runOrchestratorService: runServiceState,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

import NewReferralPage from "./NewReferralPage";

describe("NewReferralPage", () => {
  beforeEach(() => {
    authState.useAuth.mockReturnValue({
      profile: {
        id: "user-1",
      },
    });
    patientServiceState.getPatient.mockReset();
    runServiceState.startReferralRun.mockReset();
    supabaseState.from.mockClear();
    supabaseState.queues.length = 0;
  });

  it("selects a destination and starts a referral run", async () => {
    patientServiceState.getPatient.mockResolvedValue({
      id: "patient-1",
      display_name: "Eleanor Vance",
      summary: { age: "67" },
      sex: "Female",
      mrn: "MRN-100101",
      is_synthetic: true,
      primary_conditions: [{ display: "CKD Stage 3" }],
    });
    supabaseState.queues.push(
      createQueryChain({
        data: [
          { id: "dest-1", slug: "cardiology-intake", display_name: "Cardiology Intake", specialty: "Cardiology" },
          { id: "dest-2", slug: "nephrology-intake", display_name: "Nephrology Intake", specialty: "Nephrology" },
        ],
      }),
    );
    runServiceState.startReferralRun.mockResolvedValue({ runId: "run-1" });
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/app/referrals/new" element={<NewReferralPage />} />
        <Route path="/app/runs/:runId" element={<div>Run Route</div>} />
      </Routes>,
      { route: "/app/referrals/new?patient=patient-1" },
    );

    await screen.findByText("Eleanor Vance");
    await user.click(screen.getByTestId("destination-option-nephrology-intake"));
    await user.click(screen.getByTestId("build-submit"));

    expect(runServiceState.startReferralRun).toHaveBeenCalledWith("user-1", "patient-1", "nephrology-intake");
    expect(await screen.findByText("Run Route")).toBeInTheDocument();
  });

  it("shows a submit error when the run cannot be started", async () => {
    patientServiceState.getPatient.mockResolvedValue({
      id: "patient-1",
      display_name: "Eleanor Vance",
      summary: { age: "67" },
      sex: "Female",
      mrn: "MRN-100101",
      is_synthetic: true,
      primary_conditions: [],
    });
    supabaseState.queues.push(
      createQueryChain({
        data: [{ id: "dest-1", slug: "nephrology-intake", display_name: "Nephrology Intake", specialty: "Nephrology" }],
      }),
    );
    runServiceState.startReferralRun.mockRejectedValue(new Error("Destination not found"));
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/app/referrals/new" element={<NewReferralPage />} />
      </Routes>,
      { route: "/app/referrals/new?patient=patient-1" },
    );

    await screen.findByText("Eleanor Vance");
    await user.click(screen.getByTestId("build-submit"));

    expect(await screen.findByText("Destination not found")).toBeInTheDocument();
  });
});
