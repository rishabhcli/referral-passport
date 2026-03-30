import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ReplayRunPage from "./ReplayRunPage";

describe("ReplayRunPage", () => {
  it("renders the accepted replay scenario by default", () => {
    render(
      <MemoryRouter
        initialEntries={["/replay/accepted"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/replay/:scenario" element={<ReplayRunPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Replay Mode")).toBeInTheDocument();
    expect(screen.getByText(/pre-loaded accepted scenario/i)).toBeInTheDocument();
    expect(screen.getByText("Replay")).toBeInTheDocument();
    expect(screen.getByText("Accepted by Nephrology Intake")).toBeInTheDocument();
  });

  it("renders the blocked replay scenario", () => {
    render(
      <MemoryRouter
        initialEntries={["/replay/blocked"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/replay/:scenario" element={<ReplayRunPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/pre-loaded blocked scenario/i)).toBeInTheDocument();
    expect(screen.getByText(/manual follow-up required/i)).toBeInTheDocument();
  });
});
