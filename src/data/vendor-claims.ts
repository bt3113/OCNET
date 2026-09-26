import type { Provider, ProviderListing } from "./model";
import type { ProviderClaim } from "./build-model";

/**
 * Technology Vendor profile claims. A claimant proves control of the vendor's own domain
 * by publishing a DNS TXT record; a reviewer checks it before approving. Approval marks
 * the listing as claimed. It never lets the vendor edit independent Builds or evidence.
 */

export const VERIFICATION_PREFIX = "oracnet-verification=";
export const verificationRecordName = (domain: string) => `_oracnet-verification.${domain}`;
export const verificationValue = (token: string) => `${VERIFICATION_PREFIX}${token}`;

const hostname = /^(?=.{4,253}$)(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

/** The vendor's own domain, from its website ("https://www.x.ai/grok" → "x.ai"). */
export function vendorDomain(provider: Pick<Provider, "website">) {
  try {
    return new URL(provider.website).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export const normalizeDomain = (value: string) => value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

/** Why a claim for `provider` cannot be submitted with this domain and email. */
export function claimErrors(provider: Pick<Provider, "website"> | undefined, domain: string, email: string, evidence: string): string[] {
  const errors: string[] = [];
  if (!provider) return ["Choose the vendor profile you represent."];
  const own = vendorDomain(provider);
  const claimed = normalizeDomain(domain);
  if (!own) errors.push("This profile has no website to verify against; contact Oracnet support.");
  if (!hostname.test(claimed)) errors.push("Enter the company domain, e.g. example.com.");
  else if (own && claimed !== own && !own.endsWith(`.${claimed}`)) errors.push(`The domain must be the vendor's own domain (${own}).`);
  const at = email.trim().toLowerCase().split("@");
  if (at.length !== 2 || !at[0]) errors.push("Enter your work email address.");
  else if (at[1] !== claimed && !at[1].endsWith(`.${claimed}`)) errors.push(`Use an email address at ${claimed || "the company domain"}.`);
  if (evidence.trim().length < 20) errors.push("Describe your role in at least 20 characters.");
  return errors;
}

export function newVerificationToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type DnsCheck = { result: "verified" | "not-found" | "error"; checkedAt: string; detail: string };

/**
 * Look up the TXT record over DNS-over-HTTPS (a fixed resolver; only the validated
 * domain varies, so this is not an open fetch). Runs in the reviewer's browser.
 */
export async function checkDnsVerification(domain: string, token: string, fetchImpl: typeof fetch = fetch): Promise<DnsCheck> {
  const checkedAt = new Date().toISOString();
  const name = verificationRecordName(normalizeDomain(domain));
  if (!hostname.test(normalizeDomain(domain))) return { result: "error", checkedAt, detail: "Invalid domain." };
  try {
    const response = await fetchImpl(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, { headers: { accept: "application/dns-json" } });
    if (!response.ok) return { result: "error", checkedAt, detail: `Resolver returned ${response.status}.` };
    const body = (await response.json()) as { Status?: number; Answer?: { type: number; data: string }[] };
    const values = (body.Answer ?? []).filter((answer) => answer.type === 16).map((answer) => answer.data.replace(/^"|"$/g, "").replace(/" "/g, ""));
    if (values.includes(verificationValue(token))) return { result: "verified", checkedAt, detail: `Found ${verificationValue(token)} at ${name}.` };
    return { result: "not-found", checkedAt, detail: values.length ? `${name} has TXT records, but none match.` : `No TXT record at ${name} yet.` };
  } catch {
    return { result: "error", checkedAt, detail: "The DNS lookup failed. Try again." };
  }
}

/** A claim may be approved only after a successful DNS check. */
export const canApproveClaim = (claim: Pick<ProviderClaim, "status" | "dnsResult">) => claim.status === "pending" && claim.dnsResult === "verified";

/** The listing after an approved claim: marked claimed, sources and wording kept. */
export function claimedListing(provider: Provider, claimedAt: string): ProviderListing {
  return {
    compiledBy: "Oracnet",
    sourcedAt: claimedAt.slice(0, 10),
    sources: provider.website ? [{ label: `${provider.name} website`, url: provider.website }] : [],
    tagline: provider.description,
    about: provider.description,
    ...provider.listing,
    status: "claimed",
  };
}
