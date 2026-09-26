import { describe, expect, it } from "vitest";
import type { Provider } from "../src/data/model";
import { canApproveClaim, checkDnsVerification, claimErrors, claimedListing, newVerificationToken, vendorDomain, verificationRecordName, verificationValue } from "../src/data/vendor-claims";

const vendor = { id: "acme", name: "Acme", website: "https://www.acme.com/products", description: "Acme tools" } as Provider;
const dnsResponse = (answers: string[], status = 200) =>
  (async () => new Response(JSON.stringify({ Status: 0, Answer: answers.map((data) => ({ type: 16, data: `"${data}"` })) }), { status })) as unknown as typeof fetch;

describe("vendor claims", () => {
  it("derives the vendor's domain from its website", () => {
    expect(vendorDomain(vendor)).toBe("acme.com");
    expect(vendorDomain({ website: "not a url" })).toBe("");
  });
  it("accepts only the vendor's own domain and an email at it", () => {
    expect(claimErrors(vendor, "acme.com", "me@acme.com", "Head of partnerships at Acme")).toEqual([]);
    expect(claimErrors(vendor, "https://www.acme.com/", "me@eu.acme.com", "Head of partnerships at Acme")).toEqual([]);
    expect(claimErrors(vendor, "evil.com", "me@evil.com", "Head of partnerships at Acme").join(" ")).toContain("vendor's own domain (acme.com)");
    expect(claimErrors(vendor, "acme.com", "me@gmail.com", "Head of partnerships at Acme").join(" ")).toContain("email address at acme.com");
    expect(claimErrors(vendor, "acme.com", "me@acme.com", "short").join(" ")).toContain("20 characters");
    expect(claimErrors(undefined, "", "", "")).toEqual(["Choose the vendor profile you represent."]);
  });
  it("issues unguessable tokens and a fixed record name", () => {
    const token = newVerificationToken();
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(newVerificationToken()).not.toBe(token);
    expect(verificationRecordName("acme.com")).toBe("_oracnet-verification.acme.com");
  });
  it("verifies only an exact TXT match", async () => {
    const token = "a".repeat(32);
    expect((await checkDnsVerification("acme.com", token, dnsResponse([verificationValue(token)]))).result).toBe("verified");
    expect((await checkDnsVerification("acme.com", token, dnsResponse(["v=spf1 -all", verificationValue("b".repeat(32))]))).result).toBe("not-found");
    expect((await checkDnsVerification("acme.com", token, dnsResponse([]))).detail).toContain("No TXT record");
    expect((await checkDnsVerification("acme.com", token, dnsResponse([], 502))).result).toBe("error");
    expect((await checkDnsVerification("not a domain", token, dnsResponse([verificationValue(token)]))).result).toBe("error");
  });
  it("queries a fixed resolver for the validated name only", async () => {
    let url = "";
    await checkDnsVerification("acme.com", "t", (async (input: string) => {
      url = input;
      return new Response("{}");
    }) as unknown as typeof fetch);
    expect(url).toBe("https://cloudflare-dns.com/dns-query?name=_oracnet-verification.acme.com&type=TXT");
  });
  it("approves only verified pending claims and keeps listing wording", () => {
    expect(canApproveClaim({ status: "pending", dnsResult: "verified" })).toBe(true);
    expect(canApproveClaim({ status: "pending", dnsResult: "not-found" })).toBe(false);
    expect(canApproveClaim({ status: "approved", dnsResult: "verified" })).toBe(false);
    expect(claimedListing(vendor, "2026-09-27T10:00:00Z")).toMatchObject({ status: "claimed", tagline: "Acme tools", sources: [{ url: vendor.website }] });
    const listed = { ...vendor, listing: { status: "unclaimed" as const, compiledBy: "Oracnet", sourcedAt: "2026-09-26", sources: [], tagline: "Own", about: "About" } };
    expect(claimedListing(listed, "2026-09-27T10:00:00Z")).toMatchObject({ status: "claimed", tagline: "Own", sourcedAt: "2026-09-26" });
  });
});
