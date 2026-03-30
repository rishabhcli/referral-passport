import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { REPLAY_ACCEPTED } from "@/data/replayScenarios";
import { renderWithProviders } from "@/test/render";
import ReferralRunView from "./ReferralRunView";

describe("ReferralRunView", () => {
  it("renders terminal outcome details and exposes the debug inspector", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ReferralRunView
        runState={REPLAY_ACCEPTED}
        actions={<button type="button">External Action</button>}
      />,
    );

    expect(screen.getByText("Accepted by Nephrology Intake")).toBeInTheDocument();
    expect(screen.getByText("External Action")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Debug Inspector/i }));

    expect(screen.getByText(/"runId": "replay-accepted"/)).toBeInTheDocument();
  });
});
