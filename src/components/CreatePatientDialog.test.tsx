import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import { createQueryChain } from "@/test/supabaseMock";

const toastState = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const supabaseState = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: supabaseState.from,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastState.success,
    error: toastState.error,
  },
}));

import CreatePatientDialog from "./CreatePatientDialog";

describe("CreatePatientDialog", () => {
  beforeEach(() => {
    supabaseState.from.mockReset();
    toastState.success.mockReset();
    toastState.error.mockReset();
  });

  it("creates a patient and invalidates the patients query", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const insertChain = createQueryChain({ data: null });

    supabaseState.from.mockReturnValue(insertChain);
    const user = userEvent.setup();

    renderWithProviders(<CreatePatientDialog />, { queryClient });

    await user.click(screen.getByTestId("create-patient-trigger"));
    await user.type(screen.getByLabelText("Full Name *"), "Test Patient");
    await user.type(screen.getByLabelText("Date of Birth"), "1980-01-01");
    await user.type(screen.getByLabelText("MRN"), "MRN-123");
    await user.type(screen.getByPlaceholderText("e.g. Type 2 diabetes"), "Type 2 Diabetes");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByTestId("create-patient-submit"));

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: "Test Patient",
        birth_date: "1980-01-01",
        sex: null,
        mrn: "MRN-123",
        is_synthetic: false,
        primary_conditions: [{ display: "Type 2 Diabetes" }],
        summary: { age: expect.any(String) },
      }),
    );
    expect(toastState.success).toHaveBeenCalledWith("Patient created");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["patients"] });
  });
});
