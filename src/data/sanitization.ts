/**
 * Assistive detection of material that must not travel from a customer
 * implementation into a public Blueprint. Detection is heuristic and incomplete;
 * a human publisher must still confirm the checklist. Passing this scan is not a
 * statement that content is legally safe to publish.
 */
export type FindingKind =
  | "api-key"
  | "token"
  | "private-key"
  | "password"
  | "connection-string"
  | "email"
  | "phone"
  | "ip-address"
  | "internal-endpoint"
  | "payment-card"
  | "national-id";

export interface SanitizationFinding {
  kind: FindingKind;
  field: string;
  excerpt: string;
  severity: "block" | "review";
}

const detectors: { kind: FindingKind; severity: "block" | "review"; pattern: RegExp }[] = [
  { kind: "private-key", severity: "block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { kind: "api-key", severity: "block", pattern: /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{10,}\b/g },
  { kind: "api-key", severity: "block", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { kind: "api-key", severity: "block", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "api-key", severity: "block", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: "token", severity: "block", pattern: /\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { kind: "token", severity: "block", pattern: /\bxox[abpr]-[A-Za-z0-9-]{10,}\b/g },
  { kind: "token", severity: "block", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g },
  { kind: "token", severity: "block", pattern: /\b(api[_-]?key|secret|token|bearer)\s*[:=]\s*["']?[A-Za-z0-9_\-./+]{16,}/gi },
  { kind: "password", severity: "block", pattern: /\b(password|passwd|pwd)\s*[:=]\s*\S{4,}/gi },
  { kind: "connection-string", severity: "block", pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s@]+@[^\s]+/gi },
  { kind: "email", severity: "review", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: "phone", severity: "review", pattern: /(?<![\w.])(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}(?![\w.])/g },
  { kind: "ip-address", severity: "review", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { kind: "internal-endpoint", severity: "block", pattern: /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9.-]+\.(?:internal|local|corp|lan|intranet))(?::\d+)?[^\s]*/gi },
  { kind: "national-id", severity: "review", pattern: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/g },
];

function luhn(digits: string) {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let value = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  }
  return sum % 10 === 0;
}

function mask(value: string) {
  if (value.length <= 8) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

export function scanText(text: string, field: string): SanitizationFinding[] {
  const findings: SanitizationFinding[] = [];
  for (const detector of detectors) {
    for (const match of text.matchAll(detector.pattern)) {
      const value = match[0];
      if (detector.kind === "phone" && value.replace(/\D/g, "").length < 9) continue;
      if (detector.kind === "ip-address" && value.split(".").some((part) => Number(part) > 255)) continue;
      findings.push({ kind: detector.kind, field, excerpt: mask(value), severity: detector.severity });
    }
  }
  for (const match of text.matchAll(/\b(?:\d[ -]?){13,19}\b/g)) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length >= 13 && luhn(digits)) findings.push({ kind: "payment-card", field, excerpt: mask(digits), severity: "block" });
  }
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.kind}:${finding.field}:${finding.excerpt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function scanFields(fields: Record<string, string | undefined>) {
  return Object.entries(fields).flatMap(([field, value]) => (value ? scanText(value, field) : []));
}

/** Items the human publisher must explicitly confirm before a Blueprint can be published. */
export const sanitizationChecklist = [
  { id: "credentials", label: "No credentials, API keys, tokens or passwords" },
  { id: "customer-data", label: "No customer data, personal data or example records" },
  { id: "schemas", label: "No customer-specific schemas, field names or internal identifiers" },
  { id: "prompts", label: "No private prompts or proprietary decision logic without rights" },
  { id: "business-rules", label: "No confidential business rules or pricing" },
  { id: "endpoints", label: "No internal endpoints, hostnames or network details" },
  { id: "documents", label: "No confidential documents or contract terms" },
  { id: "brand", label: "No customer brand assets or identifying descriptions" },
] as const;

export type ChecklistId = (typeof sanitizationChecklist)[number]["id"];

export function sanitizationGate(confirmed: string[], findings: SanitizationFinding[]) {
  const missing = sanitizationChecklist.filter((item) => !confirmed.includes(item.id)).map((item) => item.label);
  const blocking = findings.filter((finding) => finding.severity === "block");
  return {
    ready: missing.length === 0 && blocking.length === 0,
    missing,
    blocking,
    review: findings.filter((finding) => finding.severity === "review"),
  };
}
