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

import EditPatientDialog from "./EditPatientDialog";

describe("EditPatientDialog", () => {
  beforeEach(() => {
    supabaseState.from.mockReset();
    toastState.success.mockReset();
    toastState.error.mockReset();
  });

  it("preloads the patient and submits updates", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const updateChain = createQueryChain({ data: null });

    supabaseState.from.mockReturnValue(updateChain);
    const user = userEvent.setup();

    renderWithProviders(
      <EditPatientDialog
        patient={{
          id: "patient-1",
          display_name: "Eleanor Vance",
          birth_date: "1959-04-11",
          sex: "Female",
          mrn: "MRN-100101",
          primary_conditions: [{ display: "CKD Stage 3" }],
          is_synthetic: true,
        }}
      />,
      { queryClient },
    );

    await user.click(screen.getByRole("button", { name: /Edit/i }));
    expect(await screen.findByDisplayValue("Eleanor Vance")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Full Name *"));
    await user.type(screen.getByLabelText("Full Name *"), "Updated Patient");
    await user.click(screen.getByTestId("edit-patient-submit"));

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: "Updated Patient",
        birth_date: "1959-04-11",
        sex: "Female",
        mrn: "MRN-100101",
        primary_conditions: [{ display: "CKD Stage 3" }],
        summary: { age: expect.any(String) },
      }),
    );
    expect(toastState.success).toHaveBeenCalledWith("Patient updated");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["patient", "patient-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["patients"] });
  });
});
