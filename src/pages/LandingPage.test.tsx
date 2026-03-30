import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";

const authState = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: authState.useAuth,
}));

import LandingPage from "./LandingPage";

describe("LandingPage", () => {
  beforeEach(() => {
    authState.useAuth.mockReset();
  });

  it("redirects authenticated users into the app", () => {
    authState.useAuth.mockReturnValue({ session: { user: { id: "user-1" } }, loading: false });

    renderWithProviders(
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<div>Workspace Route</div>} />
      </Routes>,
    );

    expect(screen.getByText("Workspace Route")).toBeInTheDocument();
  });

  it("navigates to auth and replay routes from the CTA buttons", async () => {
    authState.useAuth.mockReturnValue({ session: null, loading: false });
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<div>Auth Route</div>} />
        <Route path="/replay/:scenario" element={<div>Replay Route</div>} />
      </Routes>,
    );

    await user.click(screen.getByRole("button", { name: /Get Started/i }));
    expect(screen.getByText("Auth Route")).toBeInTheDocument();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<div>Auth Route</div>} />
        <Route path="/replay/:scenario" element={<div>Replay Route</div>} />
      </Routes>,
    );

    await user.click(screen.getByRole("button", { name: /View Demo Replay/i }));
    expect(screen.getByText("Replay Route")).toBeInTheDocument();
  });
});
