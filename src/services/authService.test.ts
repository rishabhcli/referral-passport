import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "@/test/supabaseMock";

const supabaseState = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: supabaseState.signInWithPassword,
      signUp: supabaseState.signUp,
      signOut: supabaseState.signOut,
      getSession: supabaseState.getSession,
      onAuthStateChange: supabaseState.onAuthStateChange,
    },
    from: supabaseState.from,
  },
}));

import { authService } from "./authService";

describe("authService", () => {
  beforeEach(() => {
    supabaseState.signInWithPassword.mockReset();
    supabaseState.signUp.mockReset();
    supabaseState.signOut.mockReset();
    supabaseState.getSession.mockReset();
    supabaseState.onAuthStateChange.mockReset();
    supabaseState.from.mockReset();
  });

  it("signs users in and out", async () => {
    supabaseState.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "token" } }, error: null });
    supabaseState.signOut.mockResolvedValue({ error: null });

    await expect(authService.signIn("demo@consultpassport.dev", "secret")).resolves.toEqual({
      session: { access_token: "token" },
    });
    await expect(authService.signOut()).resolves.toBeUndefined();
    expect(supabaseState.signInWithPassword).toHaveBeenCalledWith({
      email: "demo@consultpassport.dev",
      password: "secret",
    });
  });

  it("signs users up with demo metadata", async () => {
    supabaseState.signUp.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    await expect(
      authService.signUp("demo@consultpassport.dev", "secret", "Demo Coordinator"),
    ).resolves.toEqual({ user: { id: "user-1" } });

    expect(supabaseState.signUp).toHaveBeenCalledWith({
      email: "demo@consultpassport.dev",
      password: "secret",
      options: { data: { full_name: "Demo Coordinator", role: "demo" } },
    });
  });

  it("surfaces Supabase auth errors", async () => {
    const signInError = new Error("invalid credentials");
    const signUpError = new Error("signup failed");
    const signOutError = new Error("signout failed");

    supabaseState.signInWithPassword.mockResolvedValue({ data: null, error: signInError });
    supabaseState.signUp.mockResolvedValue({ data: null, error: signUpError });
    supabaseState.signOut.mockResolvedValue({ error: signOutError });

    await expect(authService.signIn("demo@consultpassport.dev", "wrong")).rejects.toBe(signInError);
    await expect(authService.signUp("demo@consultpassport.dev", "secret", "Demo Coordinator")).rejects.toBe(signUpError);
    await expect(authService.signOut()).rejects.toBe(signOutError);
  });

  it("returns the current session", async () => {
    supabaseState.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });

    await expect(authService.getSession()).resolves.toEqual({ user: { id: "user-1" } });
  });

  it("returns null when there is no active session", async () => {
    supabaseState.getSession.mockResolvedValue({ data: { session: null } });

    await expect(authService.getProfile()).resolves.toBeNull();
  });

  it("maps the current profile and swallows profile lookup errors", async () => {
    supabaseState.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });

    const profileChain = createQueryChain({
      data: {
        id: "user-1",
        email: "demo@consultpassport.dev",
        full_name: "Demo Coordinator",
        role: "demo",
        organization_name: "Demo Clinic",
        created_at: "2026-03-30T00:00:00Z",
      },
    });
    const failedChain = createQueryChain({
      data: null,
      error: { message: "boom" },
    });

    supabaseState.from.mockReturnValueOnce(profileChain).mockReturnValueOnce(failedChain);

    await expect(authService.getProfile()).resolves.toEqual({
      id: "user-1",
      email: "demo@consultpassport.dev",
      fullName: "Demo Coordinator",
      role: "demo",
      organizationName: "Demo Clinic",
      createdAt: "2026-03-30T00:00:00Z",
    });

    await expect(authService.getProfile()).resolves.toBeNull();
  });

  it("fills empty profile fields with defaults", async () => {
    supabaseState.getSession.mockResolvedValue({ data: { session: { user: { id: "user-2" } } } });

    const profileChain = createQueryChain({
      data: {
        id: "user-2",
        email: null,
        full_name: null,
        role: null,
        organization_name: null,
        created_at: null,
      },
    });

    supabaseState.from.mockReturnValueOnce(profileChain);

    await expect(authService.getProfile()).resolves.toEqual({
      id: "user-2",
      email: "",
      fullName: "",
      role: "demo",
      organizationName: "",
      createdAt: "",
    });
  });

  it("passes auth state change subscriptions through to Supabase", () => {
    const callback = vi.fn();

    authService.onAuthStateChange(callback);

    expect(supabaseState.onAuthStateChange).toHaveBeenCalledWith(callback);
  });
});
