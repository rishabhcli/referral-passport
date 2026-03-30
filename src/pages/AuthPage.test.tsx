import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";

const authState = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/features/auth/AuthProvider", () => ({
  useAuth: authState.useAuth,
}));

import AuthPage from "./AuthPage";

describe("AuthPage", () => {
  beforeEach(() => {
    authState.signIn.mockReset();
    authState.signUp.mockReset();
    authState.useAuth.mockReturnValue({
      signIn: authState.signIn,
      signUp: authState.signUp,
      session: null,
    });
  });

  it("submits the sign-in form and navigates into the app", async () => {
    authState.signIn.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<div>Workspace Route</div>} />
      </Routes>,
      { route: "/auth" },
    );

    await user.type(screen.getByLabelText("Email"), "demo@consultpassport.dev");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(authState.signIn).toHaveBeenCalledWith("demo@consultpassport.dev", "secret");
    expect(await screen.findByText("Workspace Route")).toBeInTheDocument();
  });

  it("switches into sign-up mode and submits the sign-up form", async () => {
    authState.signUp.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<AuthPage />, { route: "/auth" });

    await user.click(screen.getByRole("button", { name: /Need an account\?/i }));
    await user.type(screen.getByLabelText("Full Name"), "Demo Coordinator");
    await user.type(screen.getByLabelText("Email"), "demo@consultpassport.dev");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(authState.signUp).toHaveBeenCalledWith(
      "demo@consultpassport.dev",
      "secret123",
      "Demo Coordinator",
    );
  });

  it("falls back to sign-up during the demo login flow", async () => {
    authState.signIn.mockRejectedValueOnce(new Error("missing user")).mockResolvedValueOnce(undefined);
    authState.signUp.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<div>Workspace Route</div>} />
      </Routes>,
      { route: "/auth" },
    );

    await user.click(screen.getByRole("button", { name: /Continue as Demo Coordinator/i }));

    expect(authState.signUp).toHaveBeenCalledWith(
      "demo@consultpassport.dev",
      "demo-passport-2025",
      "Demo Coordinator",
    );
    expect(authState.signIn).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Workspace Route")).toBeInTheDocument();
  });
});
