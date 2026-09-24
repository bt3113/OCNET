import { describe, it, expect } from "vitest";
import { builds, creators, buildOffers } from "../src/data/build-seed";
import {
  products,
  providers,
  useCases,
  stacks,
  articles,
} from "../src/data/seed";
import {
  validateBuild,
  remixBuild,
  filterBuilds,
  safeUrl,
} from "../src/data/build-domain";
import { searchDocuments, searchIndex } from "../src/data/search";
import { detectManifest, githubRepository } from "../src/data/import-public";
import {
  allowedPublicUrl,
  publicIpv4,
  extractMetadata,
} from "../supabase/functions/import-public/safety";
describe("Build marketplace domain", () => {
  it("all demo builds are publishable and reference existing technologies", () => {
    for (const b of builds) {
      expect(validateBuild(b)).toEqual([]);
      for (const s of b.stack)
        expect(products.some((p) => p.id === s.productId)).toBe(true);
    }
  });
  it("requires rights and human confirmation of imported technology", () => {
    expect(
      validateBuild({
        ...builds[0],
        ownershipConfirmed: false,
        stack: builds[0].stack.map((s) => ({ ...s, evidence: "detected" })),
      }).length,
    ).toBeGreaterThan(1);
  });
  it("remixes preserve attribution and structure without copying media or public status", () => {
    const b = remixBuild(builds[0], "other", "new-creator", "Alex");
    expect(b.forkedFromBuildId).toBe(builds[0].id);
    expect(b.media).toEqual([]);
    expect(b.publication).toBe("draft");
    expect(b.ownershipConfirmed).toBe(false);
    expect(b.attribution).toContain("Alex");
    expect(
      b.connections.every(
        (e) =>
          b.stack.some((s) => s.id === e.fromId) &&
          b.stack.some((s) => s.id === e.toId),
      ),
    ).toBe(true);
    expect(b.stack[0].id).not.toBe(builds[0].stack[0].id);
  });
  it("does not permit a remix without creator permission", () => {
    expect(() =>
      remixBuild({ ...builds[0], cloneAllowed: false }, "a", "b", "c"),
    ).toThrow();
  });
  it("combines technology, creator, reuse and offer filters", () => {
    const result = filterBuilds(
      builds,
      { technology: "vapi", creator: "alex-chen", remix: "yes", offer: "yes" },
      products,
      creators,
      buildOffers,
    );
    expect(result.map((b) => b.slug)).toEqual(["ai-dental-receptionist"]);
    expect(
      filterBuilds(
        builds,
        { technology: "vapi", creator: "maya-rivera" },
        products,
        creators,
        buildOffers,
      ),
    ).toEqual([]);
  });
  it("connects natural language keywords to tools and outcomes and hides drafts", () => {
    const docs = searchDocuments({
      builds: [
        ...builds,
        { ...builds[0], id: "secret", name: "Secret", publication: "draft" },
      ],
      products,
      creators,
      providers,
      cases: useCases,
      stacks,
      articles,
    });
    expect(
      searchIndex(docs, "customer support using Claude").some(
        (r) => r.type === "Build",
      ),
    ).toBe(true);
    expect(searchIndex(docs, "Runway")[0].type).toBe("Technology");
    expect(docs.some((d) => d.id === "secret")).toBe(false);
  });
  it("detects dependencies, without claiming deployment vendors from frameworks", () => {
    expect(
      detectManifest(
        JSON.stringify({
          dependencies: {
            "@supabase/supabase-js": "1",
            react: "1",
            next: "1",
            openai: "1",
          },
        }),
      ).map((x) => x.productId),
    ).toEqual(["supabase", "openai-api"]);
    expect(githubRepository("https://github.com/bt3113/OCNET")).toEqual({
      owner: "bt3113",
      repo: "OCNET",
    });
    expect(() =>
      githubRepository("https://github.com.evil.test/a/b"),
    ).toThrow();
  });
  it("rejects active links, credentials and SSRF address classes", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://user:secret@example.com")).toBeUndefined();
    for (const u of [
      "http://127.0.0.1",
      "http://2130706433",
      "http://[::1]",
      "http://localhost",
      "http://metadata.internal",
      "file:///etc/passwd",
    ])
      expect(() => allowedPublicUrl(u)).toThrow();
    for (const ip of [
      "127.0.0.1",
      "10.1.1.1",
      "169.254.169.254",
      "172.16.1.1",
      "192.168.1.1",
      "100.64.1.1",
    ])
      expect(publicIpv4(ip)).toBe(false);
    expect(publicIpv4("8.8.8.8")).toBe(true);
  });
  it("extracts bounded text metadata without executing scripts", () => {
    const r = extractMetadata(
      '<title>Example</title><script>alert(1)</script><meta property="og:description" content="A useful project">',
      "https://example.com",
    );
    expect(r.name).toBe("Example");
    expect(r.description).toBe("A useful project");
  });
});
