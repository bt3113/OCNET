import type { BuildTables } from "./build-model";
import type { IntelligenceTables } from "./intelligence-model";
import type { MarketplaceTables, SolutionProviderType, UseCaseOriginType, UseCaseStatus } from "./marketplace-model";
export type Role =
  | "creator"
  | "buyer"
  | "provider"
  | "integrator"
  | "consultant"
  | "admin";
export type Provenance =
  | "verified"
  | "vendor supplied"
  | "third-party sourced"
  | "community supplied"
  | "demo"
  | "unverified"
  | "creator supplied"
  | "inferred";
export interface RecordBase {
  id: string;
  name: string;
  createdAt?: string;
  provenance: Provenance;
}
export interface User extends RecordBase {
  email: string;
  role: Role; // legacy active workspace, never an authorization boundary
  roles?: Role[];
  organizationId?: string;
}
export interface Organization extends RecordBase {
  description: string;
  website?: string;
}
export interface Category extends RecordBase {
  slug: string;
  description: string;
  icon: string;
  color: string;
}
export interface Capability extends RecordBase {
  description: string;
}
/**
 * How a company's profile reached Oracnet. "unclaimed" profiles are compiled by
 * Oracnet from the company's public pages; only a claimed profile is maintained
 * by the company itself.
 */
export interface ProviderListing {
  status: "unclaimed" | "claimed";
  compiledBy: string;
  /** ISO date the public sources were last read. */
  sourcedAt: string;
  sources: { label: string; url: string }[];
  tagline: string;
  about: string;
  /** Anything a buyer should know about naming or branding on the sources. */
  note?: string;
}
export interface Provider extends RecordBase {
  slug: string;
  description: string;
  category: string;
  color: string;
  initials: string;
  website: string;
  region: string;
  specialties: string[];
  listing?: ProviderListing;
}
export interface Product extends RecordBase {
  slug: string;
  description: string;
  category: string;
  providerId: string;
  capabilityIds: string[];
  deployment: string;
  pricing: string;
  integrations: string[];
  color: string;
  initials: string;
  /** Lifecycle as last recorded; drives Blueprint staleness. Missing = unknown. */
  lifecycleState?: "active" | "deprecated" | "retired";
  /** Regions where availability has been recorded. Missing = unknown, never assumed. */
  availableRegions?: string[];
  /** Deployment models recorded for the product, e.g. "cloud", "self-hosted". */
  deploymentOptions?: string[];
  /** Data-residency options recorded for the product, e.g. "EU", "UK", "US". */
  dataResidencyOptions?: string[];
  /** Skill recorded for day-to-day administration (not initial setup). */
  operatorSkill?: "no-code" | "low-code" | "developer";
  /** Provenance of the attributes above when they differ from the record provenance. */
  attributeSource?: string;
  /** Public page the description was taken from. */
  sourceUrl?: string;
}
export interface ProductMedia extends RecordBase {
  productId: string;
  type: "image" | "video" | "document";
  url: string;
  alt: string;
}
export interface UseCase extends RecordBase {
  slug: string;
  /** Short definition of the work. */
  description: string;
  outcome: string;
  /** Legacy technology category (kept for older filters). */
  category: string;
  icon: string;
  color: string;
  stackId: string;
  /** Work category and subcategory (`use_case_categories`). */
  categoryId?: string;
  subcategoryId?: string;
  /** Lifecycle. Missing is treated as approved for legacy catalogue rows. */
  status?: UseCaseStatus;
  originType?: UseCaseOriginType;
  /** Vendor, Solution Provider or editorial team that introduced it. Attribution, not ownership. */
  originEntityId?: string;
  mergedIntoId?: string;
  createdBy?: string;
  updatedAt?: string;
}
export interface UseCaseCapability {
  useCaseId: string;
  capabilityId: string;
  required: boolean;
}
export interface SolutionStack extends RecordBase {
  slug: string;
  description: string;
  useCaseId: string;
  items: StackItem[];
}
export interface StackItem {
  capabilityId: string;
  productId: string;
  alternativeIds: string[];
}
export interface Integrator extends Provider {
  services: string[];
  providerType?: SolutionProviderType;
}
export interface Consultant extends Provider {
  services: string[];
}
export interface Review extends RecordBase {
  productId: string;
  userId: string;
  body: string;
  rating: number;
  status: "pending" | "published" | "rejected";
}
export interface Update extends RecordBase {
  slug: string;
  description: string;
  body: string;
  category: string;
  date: string;
}
export type Article = Update;
export interface Project extends RecordBase {
  sourceBuildId?: string;
  sourceImplementationId?: string;
  sourceBlueprintId?: string;
  sourceStackProductIds?: string[];
  description: string;
  category: string;
  budget: string;
  timeline: string;
  status: "draft" | "open" | "awarded" | "closed";
  capabilities: string[];
  desiredOutcomes?: string[];
  currentSystems?: string[];
  contextSummary?: string;
}
export interface Proposal extends RecordBase {
  projectId: string;
  providerId: string;
  description: string;
  estimate: string;
  status: "submitted" | "shortlisted" | "accepted" | "declined";
  proposedArchitecture?: string;
  technologyIds?: string[];
  substitutions?: string[];
  implementationTimeline?: string;
  ongoingService?: string;
  assumptions?: string[];
  dependencies?: string[];
  evidenceImplementationIds?: string[];
}
export interface SavedItem extends RecordBase {
  ownerId?: string;
  entityId: string;
  entityType: string;
}
export interface Comparison extends RecordBase {
  productIds: string[];
}
export interface MessageThread extends RecordBase {
  participantIds: string[];
  providerId: string;
}
export interface Message extends RecordBase {
  threadId: string;
  senderId: string;
  body: string;
  sentAt: string;
}
export interface Notification extends RecordBase {
  body: string;
  read: boolean;
  href: string;
}
export interface VerificationRecord extends RecordBase {
  organizationId: string;
  status: "pending" | "approved" | "rejected";
  evidence: string;
}
export interface Lead extends RecordBase {
  providerId: string;
  description: string;
  status: string;
}
export interface MediaAsset extends RecordBase {
  url: string;
  type: string;
  size: number;
}
export interface Tag extends RecordBase {
  slug: string;
}
export interface Integration extends RecordBase {
  productId: string;
  targetId: string;
  description: string;
}
export interface Compatibility extends RecordBase {
  productId: string;
  targetId: string;
  status: "confirmed" | "unverified" | "incompatible";
  evidence: string;
}
export interface WorkspaceRecord extends RecordBase {
  description?: string;
  status?: string;
  [key: string]: unknown;
}
export interface Tables extends BuildTables, IntelligenceTables, MarketplaceTables {
  users: User;
  organizations: Organization;
  providers: Provider;
  products: Product;
  product_media: ProductMedia;
  categories: Category;
  capabilities: Capability;
  use_cases: UseCase;
  solution_stacks: SolutionStack;
  integrators: Integrator;
  consultants: Consultant;
  reviews: Review;
  updates: Update;
  articles: Article;
  projects: Project;
  proposals: Proposal;
  saved_items: SavedItem;
  comparisons: Comparison;
  message_threads: MessageThread;
  messages: Message;
  notifications: Notification;
  verification_records: VerificationRecord;
  leads: Lead;
  media_assets: MediaAsset;
  tags: Tag;
  integrations: Integration;
  compatibility: Compatibility;
  settings: WorkspaceRecord;
  team: WorkspaceRecord;
}
export type Table = keyof Tables;

export type ProcurementProject = Project;
