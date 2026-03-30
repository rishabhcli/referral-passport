import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

vi.mock("@/services/authService", () => ({
  authService: {
    getProfile: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
}));

import { useAuth } from "./AuthProvider";

function OrphanConsumer() {
  useAuth();
  return null;
}

describe("useAuth", () => {
  it("throws when used outside the provider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<OrphanConsumer />)).toThrow("useAuth must be used within AuthProvider");

    consoleErrorSpy.mockRestore();
  });
});
