import { describe, it, expect } from "vitest";
import { DemoRepository } from "../src/data/repository";
import { products, providers, useCases, stacks, seed } from "../src/data/seed";
import { projectSchema } from "../src/components/forms";
import {
  XAI_USE_CASES_URL,
  xaiBuilds,
  xaiCreator,
  xaiProducts,
  xaiProvider,
  xaiRelatedStacks,
  xaiRelatedUseCases,
} from "../src/data/vendor-xai";
describe("catalogue integrity", () => {
  it("every product and stack resolves its relationships", () => {
    for (const p of products)
      expect(providers.some((v) => v.id === p.providerId)).toBe(true);
    for (const u of useCases)
      expect(stacks.some((s) => s.id === u.stackId)).toBe(true);
    for (const s of stacks)
      for (const i of s.items) {
        expect(products.some((p) => p.id === i.productId)).toBe(true);
        for (const id of i.alternativeIds)
          expect(products.some((p) => p.id === id)).toBe(true);
      }
  });
  // Seed rows are demo data unless they come from a vendor module that cites its
  // public sources (currently xAI). Sourced rows must link to where they came from;
  // nothing else may leave the demo label.
  it("labels seed records as demo unless they cite a public source", () => {
    const sourcedIds = new Set<string>([
      xaiProvider.id,
      xaiCreator.id,
      ...xaiProducts.map((row) => row.id),
      ...xaiBuilds.map((row) => row.id),
      ...xaiRelatedUseCases.map((row) => row.id),
      ...xaiRelatedStacks.map((row) => row.id),
    ]);
    for (const rows of Object.values(seed))
      for (const row of rows as { id: string; provenance: string }[]) {
        if (row.provenance === "demo") continue;
        expect(sourcedIds.has(row.id), `${row.id} is not demo data and has no declared source`).toBe(true);
        expect(["third-party sourced", "inferred"]).toContain(row.provenance);
      }
    expect(xaiProvider.listing?.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
    for (const product of xaiProducts) expect(product.sourceUrl).toMatch(/^https:\/\//);
    for (const build of xaiBuilds) {
      expect(build.sources.some((source) => source.evidence === "third-party sourced" && source.url === XAI_USE_CASES_URL)).toBe(true);
      expect(build.cloneAllowed || build.commercialUseAllowed).toBe(false);
      expect(`${build.buildCost}${build.buildTime}`).toBe("");
      expect(build.description).not.toMatch(/caused|resulted in|increased|reduced .* by/i);
    }
  });
  it("validates project requirements", () => {
    expect(
      projectSchema.safeParse({ name: "x", description: "short" }).success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({
        name: "Video storefront",
        description: "Create product videos from product photography.",
        category: "ai-software",
        budget: "To be discussed",
        timeline: "1–3 months",
      }).success,
    ).toBe(true);
  });
});
describe("demo persistence", () => {
  it("persists saved items across repository instances and supports removal", async () => {
    const r = new DemoRepository();
    await r.save("saved_items", {
      id: "runway-video",
      name: "Runway",
      entityId: "runway-video",
      entityType: "products",
      provenance: "demo",
    });
    expect(await new DemoRepository().list("saved_items")).toHaveLength(1);
    await r.remove("saved_items", "runway-video");
    expect(await r.list("saved_items")).toEqual([]);
  });
  it("does not duplicate an updated record", async () => {
    const r = new DemoRepository();
    const p = (await r.list("projects"))[0];
    await r.save("projects", { ...p, name: "Updated project" });
    await r.save("projects", { ...p, name: "Updated again" });
    const rows = await r.list("projects");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Updated again");
  });
  it("reports corrupt stored data", async () => {
    localStorage.setItem("oracnet:v1:projects", "{broken");
    await expect(new DemoRepository().list("projects")).rejects.toThrow(
      "Stored demo data",
    );
  });
});

import { videoEmbed } from "../src/components/media";
describe("external media validation", () => {
  it("accepts known video sources and rejects executable or arbitrary embed URLs", () => {
    expect(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbed("https://vimeo.com/123456")).toBe(
      "https://player.vimeo.com/video/123456",
    );
    expect(videoEmbed("javascript:alert(1)")).toBeNull();
    expect(videoEmbed("https://example.com/embed/test")).toBeNull();
  });
});

describe("concurrent local writes", () => {
  it("preserves simultaneous saves in one table", async () => {
    const r = new DemoRepository();
    await Promise.all(
      ["one", "two"].map((id) =>
        r.save("saved_items", {
          id,
          name: id,
          entityId: id,
          entityType: "products",
          provenance: "demo",
        }),
      ),
    );
    expect(await r.list("saved_items")).toHaveLength(2);
  });
});
