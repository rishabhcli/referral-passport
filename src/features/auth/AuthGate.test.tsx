import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("./AuthProvider", () => ({
  useAuth: authState.useAuth,
}));

import { AuthGate } from "./AuthGate";

describe("AuthGate", () => {
  beforeEach(() => {
    authState.useAuth.mockReset();
  });

  it("shows a loading state while auth is resolving", () => {
    authState.useAuth.mockReturnValue({ session: null, loading: true });

    render(
      <MemoryRouter
        initialEntries={["/protected"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthGate>Secret</AuthGate>
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to /auth", () => {
    authState.useAuth.mockReturnValue({ session: null, loading: false });

    render(
      <MemoryRouter
        initialEntries={["/protected"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/protected"
            element={<AuthGate>Secret</AuthGate>}
          />
          <Route path="/auth" element={<div>Auth Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Auth Route")).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    authState.useAuth.mockReturnValue({ session: { user: { id: "user-1" } }, loading: false });

    render(
      <MemoryRouter
        initialEntries={["/protected"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthGate>Secret</AuthGate>
      </MemoryRouter>,
    );

    expect(screen.getByText("Secret")).toBeInTheDocument();
  });
});
