import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UIProvider } from "../src/state";
import { TechnologyCard, Modal } from "../src/components/ui";
import { products } from "../src/data/seed";
describe("marketplace controls", () => {
  it("saves a technology and exposes pressed state", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <UIProvider>
          <MemoryRouter>
            <TechnologyCard product={products[0]} />
          </MemoryRouter>
        </UIProvider>
      </QueryClientProvider>,
    );
    const button = screen.getByRole("button", { name: "Save Runway" });
    fireEvent.click(button);
    expect(
      await screen.findByRole("button", { name: "Unsave Runway" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Not yet rated")).toBeInTheDocument();
  });
  it("provides an accessible dialog name and close action", () => {
    let closed = false;
    render(
      <Modal
        open
        onClose={() => {
          closed = true;
        }}
        title="Contact provider"
      >
        <p>Enquiry details</p>
      </Modal>,
    );
    expect(
      screen.getByRole("dialog", { name: "Contact provider" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(closed).toBe(true);
  });
});
