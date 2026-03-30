import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REPLAY_ACCEPTED } from "@/data/replayScenarios";
import { renderWithProviders } from "@/test/render";

const authState = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const runServiceState = vi.hoisted(() => ({
  getReferralRun: vi.fn(),
  repairReferralRun: vi.fn(),
  resetReferralRun: vi.fn(),
}));

vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: authState.useAuth,
}));

vi.mock("@/services/runOrchestratorService", () => ({
  runOrchestratorService: runServiceState,
}));

import ReferralRunPage from "./ReferralRunPage";

describe("ReferralRunPage", () => {
  beforeEach(() => {
    authState.useAuth.mockReturnValue({
      profile: {
        id: "user-1",
      },
    });
    runServiceState.getReferralRun.mockReset();
    runServiceState.repairReferralRun.mockReset();
    runServiceState.resetReferralRun.mockReset();
  });

  it("repairs a run when the missing evidence action is triggered", async () => {
    const inputRequiredRun = {
      ...REPLAY_ACCEPTED,
      state: "input_required" as const,
      stateReason: "Missing UACR",
      isTerminal: false,
      canRepair: true,
      canReset: false,
      requirements: [
        {
          code: "uacr_recent",
          label: "UACR within 90 days",
          status: "unmet" as const,
          description: "Missing UACR",
          required: true,
          repairable: true,
        },
      ],
    };
    runServiceState.getReferralRun.mockResolvedValue(inputRequiredRun);
    runServiceState.repairReferralRun.mockResolvedValue(REPLAY_ACCEPTED);
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/app/runs/:runId" element={<ReferralRunPage />} />
      </Routes>,
      { route: "/app/runs/run-1" },
    );

    await screen.findByText("Consult Passport");
    await user.click(screen.getByTestId("repair-run"));

    expect(runServiceState.repairReferralRun).toHaveBeenCalledWith("run-1", "uacr_recent", "user-1");
    expect(await screen.findByText("Accepted by Nephrology Intake")).toBeInTheDocument();
  });

  it("resets a run and navigates to the new run route", async () => {
    runServiceState.getReferralRun.mockResolvedValue(REPLAY_ACCEPTED);
    runServiceState.resetReferralRun.mockResolvedValue("run-2");
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/app/runs/:runId" element={<ReferralRunPage />} />
        <Route path="/app/runs/run-2" element={<div>New Run Route</div>} />
      </Routes>,
      { route: "/app/runs/run-1" },
    );

    await screen.findByText("Consult Passport");
    await user.click(screen.getByTestId("reset-run"));

    expect(runServiceState.resetReferralRun).toHaveBeenCalledWith("run-1", "user-1");
    expect(await screen.findByText("New Run Route")).toBeInTheDocument();
  });

  it("shows an error state when the run cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    runServiceState.getReferralRun.mockRejectedValue(new Error("missing"));

    renderWithProviders(
      <Routes>
        <Route path="/app/runs/:runId" element={<ReferralRunPage />} />
      </Routes>,
      { route: "/app/runs/missing" },
    );

    expect(await screen.findByText("Failed to load referral run")).toBeInTheDocument();
  });
});
