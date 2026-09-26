import type { Provenance, RecordBase } from "./model";

/**
 * Marketplace taxonomy: Category → Subcategory → Use Case.
 *
 * A Use Case is shared marketplace infrastructure. Where it came from (a technology
 * vendor's public page, a Solution Provider's proposal, or Oracnet editors) is
 * attribution recorded in `use_case_sources`, never ownership.
 */

/** A work category (level "category") or one of its subcategories (level "subcategory"). */
export interface UseCaseCategory extends RecordBase {
  slug: string;
  description: string;
  level: "category" | "subcategory";
  /** Parent category for subcategories. */
  parentId?: string;
  sortOrder: number;
}

export type UseCaseOriginType =
  | "technology-vendor-sourced"
  | "solution-provider-proposed"
  | "oracnet-editorial";

export type UseCaseStatus = "approved" | "pending" | "merged" | "archived" | "rejected";

/** Where a Use Case, or a statement about it, came from. Several sources may describe one Use Case. */
export interface UseCaseSource extends RecordBase {
  useCaseId: string;
  sourceType: "technology-vendor" | "solution-provider" | "oracnet-editorial";
  /** Technology vendor, Solution Provider or editorial team the source belongs to. */
  sourceEntityId: string;
  /** The source's own title, when one was captured. Never rewritten. */
  originalTitle?: string;
  /** The source's own wording or a short safe summary of it. Never rewritten. */
  originalDescription: string;
  /** Technologies the source names for this Use Case. */
  productIds: string[];
  sourceUrl?: string;
  retrievedAt?: string;
  lastCheckedAt?: string;
  /** How the wording was captured, e.g. "search-index copy; verify against live page". */
  captureMethod?: string;
  attribution: string;
  status: "active" | "needs-verification" | "superseded";
}

/**
 * Controlled-vocabulary labels (after SKOS prefLabel / altLabel / hiddenLabel).
 * Hidden labels (misspellings, jargon) are searchable but never displayed.
 */
export interface UseCaseAlias extends RecordBase {
  useCaseId: string;
  label: string;
  aliasType: "preferred" | "alternate" | "hidden-search" | "original-source";
  normalizedLabel: string;
  language: string;
  source: string;
}

/** A Solution Provider's request for a new Use Case. Never public taxonomy until moderated. */
export interface UseCaseProposal extends RecordBase {
  buildId: string;
  creatorId: string;
  proposedBy: string;
  /** Exactly what the provider typed. Kept for provenance even after edits. */
  originalText: string;
  /** Provider-confirmed suggested public title. Moderation sets the final title. */
  suggestedTitle: string;
  suggestedCategoryId?: string;
  suggestedSubcategoryId?: string;
  status: "pending" | "approved" | "mapped" | "rejected";
  resolvedUseCaseId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

/** Keeps old Use Case URLs working after a merge, retirement or rename. */
export interface UseCaseRedirect extends RecordBase {
  /** The old slug (also the record id). */
  fromSlug: string;
  targetType: "use-case" | "category";
  /** Use Case id, or category/subcategory id. */
  target: string;
  reason: "merged" | "retired-broad-area" | "renamed" | "migrated-listing";
}

export interface MarketplaceTables {
  use_case_categories: UseCaseCategory;
  use_case_sources: UseCaseSource;
  use_case_aliases: UseCaseAlias;
  use_case_proposals: UseCaseProposal;
  use_case_redirects: UseCaseRedirect;
}

export type SolutionProviderType =
  | "Agency"
  | "Freelancer"
  | "Consultancy"
  | "Studio"
  | "Systems Integrator"
  | "Independent Builder";

/** Three truth levels shown to buyers. */
export type TruthLevel = "illustrative" | "third-party-sourced" | "community-supplied";
export function truthLevel(provenance: Provenance): TruthLevel {
  return provenance === "demo" ? "illustrative" : provenance === "third-party sourced" ? "third-party-sourced" : "community-supplied";
}
