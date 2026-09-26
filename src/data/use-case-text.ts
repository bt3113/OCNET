/**
 * Text helpers for Use Case labels: normalisation for matching, and naming guidance
 * for new proposals. Deterministic and dependency-free (also imported by build scripts).
 */

/** Lower-case, strip accents and punctuation, collapse whitespace. */
export function normalizeLabel(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const stopWords = new Set([
  "a", "an", "the", "to", "for", "of", "in", "on", "with", "and", "or", "from", "into", "by", "your", "our", "my",
  "their", "its", "it", "that", "this", "we", "us", "using", "use", "via", "then", "so", "as", "at", "be", "is",
  "are", "can", "will", "automatically", "automated", "automate", "ai", "system", "solution", "workflow",
]);

/** Same suffix rules as the search stemmer, so "invoices"/"invoice" and "chasing"/"chase" align. */
export function stemWord(word: string) {
  let value = word.toLowerCase();
  for (const suffix of ["ations", "ation", "ions", "ion", "ing", "ies", "es", "ed", "s", "e"]) {
    if (value.length - suffix.length >= 4 && value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length) + (suffix === "ies" ? "y" : "");
      break;
    }
  }
  return value;
}

/** Content tokens: normalised, stop words removed, stemmed. */
export function contentTokens(value: string) {
  return normalizeLabel(value)
    .split(" ")
    .filter((word) => word.length > 1 && !stopWords.has(word))
    .map(stemWord);
}

const bareAreas = new Set(["ai", "automation", "finance", "sales", "marketing", "research", "operations", "support", "customer service", "software", "development", "data", "analytics", "productivity"]);
const hype = /\b(best|amazing|ultimate|mega|revolutionary|world class|world-class|cutting edge|cutting-edge|magic|10x|guaranteed|#1|number one)\b/i;
const emoji = /\p{Extended_Pictographic}/u;

export interface TitleGuidance {
  /** Blocking problems: the proposal cannot be submitted until they are fixed. */
  errors: string[];
  /** Advice shown to the provider; moderation makes the final call. */
  warnings: string[];
  /** A tidied version for the provider to confirm or edit. Never applied silently. */
  suggestion: string;
}

/** Naming guidance for a proposed Use Case title. */
export function titleGuidance(raw: string, providerName = ""): TitleGuidance {
  const text = raw.trim();
  const errors: string[] = [];
  const warnings: string[] = [];
  if (text.length < 8) errors.push("Describe the work in at least 8 characters.");
  if (text.length > 120) errors.push("Keep the title under 120 characters.");
  if (emoji.test(text)) errors.push("Remove emoji.");
  if (bareAreas.has(normalizeLabel(text))) errors.push("That is a broad area, not a piece of work. Describe what gets done, e.g. “Chase overdue invoices”.");
  if (text.length > 80) warnings.push("Shorter titles are easier to find — aim for 80 characters or fewer.");
  if (hype.test(text)) warnings.push("Avoid marketing claims; describe the work.");
  if (/[!?]{2,}|!/.test(text)) warnings.push("Avoid exclamation marks.");
  if (/[A-Z]{5,}/.test(text) && text === text.toUpperCase()) warnings.push("Avoid all capitals.");
  if (providerName && normalizeLabel(text).includes(normalizeLabel(providerName))) warnings.push("Leave your company name out of the title.");
  if (text.split(/\s+/).length > 3 && new Set(contentTokens(text)).size < contentTokens(text).length - 2) warnings.push("Avoid repeating keywords.");
  const suggestion = tidyTitle(text);
  return { errors, warnings, suggestion };
}

/** Trim punctuation noise and apply sentence case. The provider must confirm it. */
export function tidyTitle(value: string) {
  const cleaned = value
    .replace(emoji, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[!?]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:\s]+$/, "")
    .trim();
  if (!cleaned) return "";
  const lower = cleaned === cleaned.toUpperCase() ? cleaned.toLowerCase() : cleaned;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
