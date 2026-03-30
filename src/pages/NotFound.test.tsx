import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import NotFound from "./NotFound";

describe("NotFound", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it("renders the fallback page and logs the missing path", () => {
    render(
      <MemoryRouter
        initialEntries={["/missing-route"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to Home" })).toHaveAttribute("href", "/");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      "/missing-route",
    );
  });
});
