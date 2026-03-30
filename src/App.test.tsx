import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/auth/AuthGate", () => ({
  AuthGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/AppShell", () => ({
  default: () => (
    <div>
      <div>App Shell</div>
      <Outlet />
    </div>
  ),
}));

vi.mock("@/pages/LandingPage", () => ({
  default: () => <div>Landing Route</div>,
}));

vi.mock("@/pages/AuthPage", () => ({
  default: () => <div>Auth Route</div>,
}));

vi.mock("@/pages/WorkspaceHomePage", () => ({
  default: () => <div>Workspace Route</div>,
}));

vi.mock("@/pages/PatientPage", () => ({
  default: () => <div>Patient Route</div>,
}));

vi.mock("@/pages/NewReferralPage", () => ({
  default: () => <div>New Referral Route</div>,
}));

vi.mock("@/pages/ReferralRunPage", () => ({
  default: () => <div>Referral Run Route</div>,
}));

vi.mock("@/pages/ReplayRunPage", () => ({
  default: () => <div>Replay Route</div>,
}));

vi.mock("@/pages/NotFound", () => ({
  default: () => <div>Not Found Route</div>,
}));

import App from "./App";

describe("App routes", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders the landing route at the root path", () => {
    window.history.replaceState({}, "", "/");

    render(<App />);

    expect(screen.getByText("Landing Route")).toBeInTheDocument();
  });

  it("renders nested app routes inside the shell", () => {
    window.history.replaceState({}, "", "/app/runs/run-1");

    render(<App />);

    expect(screen.getByText("App Shell")).toBeInTheDocument();
    expect(screen.getByText("Referral Run Route")).toBeInTheDocument();
  });

  it("renders replay routes and the not-found fallback", () => {
    window.history.replaceState({}, "", "/replay/blocked");
    const { unmount } = render(<App />);

    expect(screen.getByText("Replay Route")).toBeInTheDocument();

    unmount();
    window.history.replaceState({}, "", "/missing");
    render(<App />);

    expect(screen.getByText("Not Found Route")).toBeInTheDocument();
  });
});
