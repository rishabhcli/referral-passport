import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  callback: null as ((event: string, session: unknown) => void) | null,
}));

const authServiceState = vi.hoisted(() => ({
  getProfile: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: supabaseState.getSession,
      onAuthStateChange: supabaseState.onAuthStateChange,
    },
  },
}));

vi.mock("@/services/authService", () => ({
  authService: authServiceState,
}));

import { AuthProvider, useAuth } from "./AuthProvider";

function AuthConsumer() {
  const { session, profile, loading, signIn, signUp, signOut } = useAuth();

  return (
    <div>
      <p>{loading ? "loading" : "ready"}</p>
      <p>{session ? "session:yes" : "session:no"}</p>
      <p>{profile ? `profile:${profile.fullName}` : "profile:none"}</p>
      <button type="button" onClick={() => signIn("demo@consultpassport.dev", "demo-passport-2025")}>
        Sign In
      </button>
      <button type="button" onClick={() => signUp("demo@consultpassport.dev", "demo-passport-2025", "Demo Coordinator")}>
        Sign Up
      </button>
      <button type="button" onClick={() => signOut()}>
        Sign Out
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    supabaseState.getSession.mockReset();
    supabaseState.onAuthStateChange.mockReset();
    supabaseState.unsubscribe.mockReset();
    supabaseState.callback = null;
    authServiceState.getProfile.mockReset();
    authServiceState.signIn.mockReset();
    authServiceState.signUp.mockReset();
    authServiceState.signOut.mockReset();

    supabaseState.onAuthStateChange.mockImplementation((callback) => {
      supabaseState.callback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: supabaseState.unsubscribe,
          },
        },
      };
    });
  });

  it("loads the current session and profile", async () => {
    supabaseState.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    authServiceState.getProfile.mockResolvedValue({
      id: "user-1",
      email: "demo@consultpassport.dev",
      fullName: "Demo Coordinator",
      role: "demo",
      organizationName: "Demo Clinic",
      createdAt: "2026-03-30T00:00:00Z",
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await screen.findByText("ready");
    expect(screen.getByText("session:yes")).toBeInTheDocument();
    expect(screen.getByText("profile:Demo Coordinator")).toBeInTheDocument();
  });

  it("reacts to auth state changes and clears session state after sign out", async () => {
    supabaseState.getSession.mockResolvedValue({
      data: { session: null },
    });
    authServiceState.signOut.mockResolvedValue(undefined);

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await screen.findByText("ready");
    expect(screen.getByText("session:no")).toBeInTheDocument();

    authServiceState.getProfile.mockResolvedValueOnce({
      id: "user-1",
      email: "demo@consultpassport.dev",
      fullName: "Demo Coordinator",
      role: "demo",
      organizationName: "Demo Clinic",
      createdAt: "2026-03-30T00:00:00Z",
    });
    await act(async () => {
      await supabaseState.callback?.("SIGNED_IN", { user: { id: "user-1" } });
    });

    await waitFor(() => {
      expect(screen.getByText("session:yes")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Sign Out" }));

    expect(authServiceState.signOut).toHaveBeenCalled();
    expect(screen.getByText("session:no")).toBeInTheDocument();
    expect(screen.getByText("profile:none")).toBeInTheDocument();
  });

  it("delegates sign-in and sign-up actions and unsubscribes on cleanup", async () => {
    supabaseState.getSession.mockResolvedValue({
      data: { session: null },
    });
    authServiceState.signIn.mockResolvedValue(undefined);
    authServiceState.signUp.mockResolvedValue(undefined);

    const user = userEvent.setup();
    const { unmount } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await screen.findByText("ready");

    await user.click(screen.getByRole("button", { name: "Sign In" }));
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(authServiceState.signIn).toHaveBeenCalledWith("demo@consultpassport.dev", "demo-passport-2025");
    expect(authServiceState.signUp).toHaveBeenCalledWith(
      "demo@consultpassport.dev",
      "demo-passport-2025",
      "Demo Coordinator",
    );

    unmount();

    expect(supabaseState.unsubscribe).toHaveBeenCalled();
  });

  it("keeps the profile empty when the stored session has no profile row", async () => {
    supabaseState.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    authServiceState.getProfile.mockResolvedValue(null);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await screen.findByText("ready");

    expect(screen.getByText("session:yes")).toBeInTheDocument();
    expect(screen.getByText("profile:none")).toBeInTheDocument();
  });
});
