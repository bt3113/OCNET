import type { RecordBase, Role } from "./model";
export type Visibility =
  "draft" | "public" | "unlisted" | "private" | "archived";
export type Moderation = "pending" | "approved" | "flagged" | "rejected";
export interface BuildMedia {
  id: string;
  type: "image" | "video" | "document";
  url: string;
  alt: string;
}
export interface BuildStackItem {
  id: string;
  productId: string;
  capabilityId: string;
  role: string;
  notes: string;
  alternativeIds: string[];
  evidence: "detected" | "creator-confirmed" | "demo";
  sourceUrl?: string;
  x: number;
  y: number;
}
export interface BuildConnection {
  id: string;
  fromId: string;
  toId: string;
  label: string;
}
export interface BuildSource {
  id: string;
  url: string;
  label: string;
  kind: "repository" | "demo" | "documentation" | "post";
  evidence: "creator supplied" | "third-party sourced" | "demo";
}
export interface Build extends RecordBase {
  slug: string;
  tagline: string;
  description: string;
  problem: string;
  intendedUsers: string;
  notes: string;
  ownerId: string;
  creatorId: string;
  organizationId?: string;
  visibility: Visibility;
  publication: "draft" | "published";
  moderation: Moderation;
  verification: "unverified" | "verified";
  category: string;
  industry: string;
  useCaseIds: string[];
  capabilityIds: string[];
  stack: BuildStackItem[];
  connections: BuildConnection[];
  media: BuildMedia[];
  sources: BuildSource[];
  demoUrl: string;
  githubUrl: string;
  sourceAvailable: boolean;
  cloneAllowed: boolean;
  commercialUseAllowed: boolean;
  license: string;
  attribution: string;
  forkedFromBuildId?: string;
  buildTime: string;
  buildCost: string;
  currency: string;
  difficulty: string;
  requirements: string;
  setupNotes: string;
  limitations: string;
  updatedAt: string;
  featured: boolean;
  ownershipConfirmed: boolean;
}
export interface CreatorProfile extends RecordBase {
  slug: string;
  ownerId: string;
  organizationId?: string;
  headline: string;
  bio: string;
  location: string;
  website: string;
  github: string;
  expertise: string[];
  technologyIds: string[];
  useCaseIds: string[];
  available: boolean;
  kind: "individual" | "studio" | "company";
  verification: "unverified" | "verified";
  color: string;
}
export type OfferType =
  | "Free guide"
  | "Template"
  | "Source package"
  | "Starter kit"
  | "Setup service"
  | "Customisation"
  | "Full implementation"
  | "Support plan"
  | "Consultation";
export interface BuildOffer extends RecordBase {
  buildId: string;
  ownerId: string;
  description: string;
  offerType: OfferType;
  pricingModel:
    "free" | "fixed" | "starting from" | "monthly" | "yearly" | "request quote";
  price: number | null;
  currency: string;
  deliveryTime: string;
  checkoutMode: "contact" | "external" | "demo";
  externalUrl: string;
  active: boolean;
  moderation: Moderation;
}
export interface Collection extends RecordBase {
  slug: string;
  ownerId: string;
  description: string;
  visibility: "private" | "public";
}
export interface CollectionItem extends RecordBase {
  collectionId: string;
  entityId: string;
  entityType: string;
  ownerId: string;
}
export interface BuildComment extends RecordBase {
  buildId: string;
  ownerId: string;
  body: string;
  status: Moderation;
  updatedAt: string;
}
export interface BuildUpdate extends RecordBase {
  buildId: string;
  ownerId: string;
  body: string;
  date: string;
}
export interface CreatorFollow extends RecordBase {
  creatorId: string;
  ownerId: string;
}
export interface BuildFork extends RecordBase {
  buildId: string;
  parentBuildId: string;
  ownerId: string;
  attribution: string;
}
export interface OrganizationMembership extends RecordBase {
  organizationId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
}
export interface UserRole extends RecordBase {
  userId: string;
  role: Role;
}
export interface BuildCollaborator extends RecordBase {
  buildId: string;
  userId: string;
  role: "editor" | "viewer";
}
export interface Report extends RecordBase {
  buildId: string;
  ownerId: string;
  reason:
    | "spam"
    | "misleading"
    | "copyright/IP"
    | "unsafe link"
    | "incorrect attribution"
    | "other";
  details: string;
  status: "open" | "resolved";
}
export interface ProviderClaim extends RecordBase {
  providerId: string;
  ownerId: string;
  evidence: string;
  status: Moderation;
}
export interface AuditEvent extends RecordBase {
  actorId: string;
  entityId: string;
  entityType: string;
  action: string;
  at: string;
}
export type EventType =
  | "build_view"
  | "technology_view"
  | "save_build"
  | "save_technology"
  | "remix_build"
  | "outbound_demo_click"
  | "source_click"
  | "provider_click"
  | "offer_click"
  | "contact_creator"
  | "search"
  | "filter_use"
  | "implementation_view"
  | "implementation_saved"
  | "metric_provenance_opened"
  | "implementation_compared"
  | "context_similarity_viewed"
  | "blueprint_view"
  | "blueprint_started"
  | "solution_compiler_started"
  | "requirement_confirmed"
  | "compiler_run_completed"
  | "candidate_viewed"
  | "candidate_rejected"
  | "candidate_substitution"
  | "implementation_request_started"
  | "implementer_contacted";
export interface MarketplaceEvent extends RecordBase {
  ownerId: string;
  event: EventType;
  entityId: string;
  day: string;
}
export interface BuildComparison extends RecordBase {
  ownerId: string;
  buildIds: string[];
}
export interface BuildTables {
  builds: Build;
  creator_profiles: CreatorProfile;
  build_offers: BuildOffer;
  collections: Collection;
  collection_items: CollectionItem;
  build_comments: BuildComment;
  build_updates: BuildUpdate;
  creator_follows: CreatorFollow;
  build_forks: BuildFork;
  organization_memberships: OrganizationMembership;
  user_roles: UserRole;
  build_collaborators: BuildCollaborator;
  reports: Report;
  audit_events: AuditEvent;
  provider_claims: ProviderClaim;
  marketplace_events: MarketplaceEvent;
  build_comparisons: BuildComparison;
}
