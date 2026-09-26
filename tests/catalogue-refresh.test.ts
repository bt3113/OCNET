import { beforeEach, describe, expect, it } from "vitest";
import { DemoRepository } from "../src/data/repository";
import { xaiProvider } from "../src/data/vendor-xai";

describe("demo catalogue refresh", () => {
  beforeEach(() => localStorage.clear());

  it("does not reuse the pre-verification taxonomy catalogue", async () => {
    localStorage.setItem(
      "oracnet:taxonomy-v1:use_cases",
      JSON.stringify([{ id: "stale-vendor-case", provenance: "third-party sourced" }]),
    );
    const rows = await new DemoRepository().list("use_cases");
    expect(rows.some((row) => row.id === "stale-vendor-case")).toBe(false);
    expect(rows.some((row) => row.id === "synthesize-research-across-sources")).toBe(true);
  });

  it("preserves a provider's pending Use Case proposal across the catalogue refresh", async () => {
    const proposal = {
      id: "proposal-existing-browser",
      name: "Use Case proposal",
      buildId: "build-one",
      creatorId: "creator-one",
      proposedBy: "demo-user",
      originalText: "Send appointment reminders after a booking",
      suggestedTitle: "Send appointment reminders",
      status: "pending",
      createdAt: "2026-09-26T16:00:00Z",
      provenance: "demo",
    };
    localStorage.setItem("oracnet:taxonomy-v1:use_case_proposals", JSON.stringify([proposal]));
    const rows = await new DemoRepository().list("use_case_proposals");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(proposal.id);
  });

  it("refreshes source-controlled xAI provider data stored by an earlier browser session", async () => {
    localStorage.setItem(
      "oracnet:v1:providers",
      JSON.stringify([{ ...xaiProvider, listing: { ...xaiProvider.listing!, note: "stale catalogue copy" } }]),
    );
    const rows = await new DemoRepository().list("providers");
    const xai = rows.find((row) => row.id === "xai");
    expect(xai?.listing?.note).not.toBe("stale catalogue copy");
    expect(xai?.listing?.status).toBe("unclaimed");
  });
});
