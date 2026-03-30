import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";

const authState = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: authState.useAuth,
}));

import AppShell from "./AppShell";

describe("AppShell", () => {
  beforeEach(() => {
    authState.signOut.mockReset();
    authState.useAuth.mockReturnValue({
      profile: {
        fullName: "Demo Coordinator",
        email: "demo@consultpassport.dev",
        role: "demo",
      },
      signOut: authState.signOut,
    });
  });

  it("signs out and navigates back to /auth", async () => {
    authState.signOut.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/app" element={<AppShell />} />
        <Route path="/auth" element={<div>Auth Route</div>} />
      </Routes>,
      { route: "/app" },
    );

    await user.click(screen.getByRole("button"));

    expect(authState.signOut).toHaveBeenCalled();
    expect(await screen.findByText("Auth Route")).toBeInTheDocument();
  });
});
