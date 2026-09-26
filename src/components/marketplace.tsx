import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, ExternalLink, FileSearch, GitBranch, Layers3, ShieldCheck, Star, X } from "lucide-react";
import type { Build } from "../data/build-model";
import type { Product, Provider, UseCase } from "../data/model";
import type { ImplementationRecord } from "../data/intelligence-model";
import type { UseCaseCategory, UseCaseSource } from "../data/marketplace-model";
import type { SolutionProvider } from "../data/solution-providers";
import { maturityLabels, taxonomyPath, type BuildMaturity } from "../data/use-case-domain";
import { Logo } from "./ui";

export const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;

/** Category › Subcategory, as text. */
export function TaxonomyBreadcrumb({ useCase, categories }: { useCase: Pick<UseCase, "categoryId" | "subcategoryId">; categories: UseCaseCategory[] }) {
  const path = taxonomyPath(useCase, categories);
  return path ? <span className="taxonomy-path">{path}</span> : <span className="taxonomy-path muted">Not yet categorised</span>;
}

/** "3 Builds · 5 Technologies · 1 Implementation" — factual counts only. */
export function EntityCountRow({ counts, className = "" }: { counts: [number, string, string?][]; className?: string }) {
  return (
    <p className={`entity-counts ${className}`}>
      {counts.map(([count, singular, pluralForm], index) => (
        <span key={singular} className={count === 0 ? "zero" : ""}>
          {index > 0 && <span aria-hidden> · </span>}
          {plural(count, singular, pluralForm)}
        </span>
      ))}
    </p>
  );
}

/** Where a Use Case came from. Attribution, never ownership. */
export function sourceLabel(useCase: UseCase, vendors: Provider[], providers: SolutionProvider[]) {
  if (useCase.originType === "technology-vendor-sourced") return `Listed by ${vendors.find((vendor) => vendor.id === useCase.originEntityId)?.name ?? "a technology vendor"}`;
  if (useCase.originType === "solution-provider-proposed")
    return `Proposed by ${providers.find((provider) => provider.creatorId === useCase.originEntityId)?.name ?? "a Solution Provider"}`;
  return "Oracnet editorial";
}
export function UseCaseSourceBadge({ useCase, vendors, providers }: { useCase: UseCase; vendors: Provider[]; providers: SolutionProvider[] }) {
  return <span className={`use-case-source source-${useCase.originType ?? "oracnet-editorial"}`}>{sourceLabel(useCase, vendors, providers)}</span>;
}

/** Factual supply wording. Never implies buyer demand. */
export function SupplyGapIndicator({ builds }: { builds: number }) {
  if (builds === 0) return <span className="supply-gap none">No Builds yet</span>;
  if (builds <= 2) return <span className="supply-gap few">Few Builds available</span>;
  return null;
}

export function UseCaseCard({
  useCase,
  categories,
  counts,
  source,
  action,
}: {
  useCase: UseCase;
  categories: UseCaseCategory[];
  counts: { builds: number; technologies: number; implementations: number; providers?: number };
  source?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className="card use-case-card">
      <TaxonomyBreadcrumb useCase={useCase} categories={categories} />
      <h3>
        <Link to={`/use-cases/${useCase.slug}`}>{useCase.name}</Link>
      </h3>
      <p className="use-case-definition">{useCase.description}</p>
      <EntityCountRow
        counts={[
          [counts.builds, "Build"],
          [counts.technologies, "Technology", "Technologies"],
          [counts.implementations, "Implementation"],
        ]}
      />
      <div className="use-case-card-foot">
        {source}
        <SupplyGapIndicator builds={counts.builds} />
        {action}
      </div>
    </article>
  );
}

export function MarketplaceMaturity({ maturity }: { maturity: BuildMaturity }) {
  const Icon = maturity === "build-evidence" ? ShieldCheck : maturity === "build-blueprint" ? Layers3 : GitBranch;
  return (
    <span className={`maturity maturity-${maturity}`}>
      <Icon size={13} aria-hidden />
      {maturityLabels[maturity]}
    </span>
  );
}

export function SolutionProviderCard({ provider, facts }: { provider: SolutionProvider; facts: { builds: number; implementations: number; attested: number; useCases: number } }) {
  return (
    <article className="card solution-provider-card">
      <div className="row">
        <Logo initials={provider.initials} color={provider.color} />
        <div>
          <span className="provider-type">{provider.type}</span>
          <h3>
            <Link to={`/solution-providers/${provider.slug}`}>{provider.name}</Link>
          </h3>
        </div>
      </div>
      <p>{provider.headline}</p>
      <EntityCountRow
        counts={[
          [facts.builds, "Build"],
          [facts.implementations, "Implementation"],
          [facts.useCases, "Use Case"],
        ]}
      />
      <div className="solution-provider-foot">
        <span>{provider.region}</span>
        <span>{provider.verification === "verified" ? "Verified" : provider.provenance === "demo" ? "Illustrative profile" : "Not verified"}</span>
      </div>
    </article>
  );
}

export function TechnologyVendorCard({ vendor, products, useCases }: { vendor: Provider; products: number; useCases: number }) {
  return (
    <article className="card solution-provider-card vendor-card">
      <div className="row">
        <Logo initials={vendor.initials} color={vendor.color} />
        <div>
          <span className="provider-type">Technology Vendor</span>
          <h3>
            <Link to={`/technology-vendors/${vendor.slug}`}>{vendor.name}</Link>
          </h3>
        </div>
      </div>
      <p>{vendor.listing?.tagline ?? vendor.description}</p>
      <EntityCountRow
        counts={[
          [products, "Product"],
          [useCases, "vendor-stated Use Case"],
        ]}
      />
      <div className="solution-provider-foot">
        <span>{vendor.listing ? (vendor.listing.status === "claimed" ? "Maintained by the vendor" : "Unclaimed · compiled from public pages") : vendor.provenance === "demo" ? "Sample directory profile" : "Directory profile"}</span>
      </div>
    </article>
  );
}

/** Proof on a Build: linked real deployments, never creator notes. */
export function BuildImplementationList({
  records,
  describe,
}: {
  records: ImplementationRecord[];
  describe: (record: ImplementationRecord) => { context: string; result?: string; evidence: string };
}) {
  if (!records.length)
    return (
      <div className="card empty-inline proof-empty">
        <ShieldCheck size={20} aria-hidden />
        <p>No real deployment has been linked to this Build yet. The Build describes a solution; it is not evidence that it has been deployed.</p>
      </div>
    );
  return (
    <ul className="build-implementation-list">
      {records.map((record) => {
        const info = describe(record);
        return (
          <li key={record.id} className="card">
            <Link to={`/implementations/${record.slug}`}>
              <strong>{record.name}</strong>
            </Link>
            <span className="muted">{info.context}</span>
            {info.result && <span className="proof-result">{info.result}</span>}
            <span className="proof-evidence">{info.evidence}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Where each statement about a Use Case came from. */
export function SourceProvenancePanel({ sources, vendors, providers }: { sources: UseCaseSource[]; vendors: Provider[]; providers: SolutionProvider[] }) {
  if (!sources.length) return <p className="muted">No source is recorded for this Use Case.</p>;
  return (
    <ul className="source-provenance">
      {sources.map((source) => {
        const entity =
          source.sourceType === "technology-vendor"
            ? vendors.find((vendor) => vendor.id === source.sourceEntityId)?.name ?? source.sourceEntityId
            : source.sourceType === "solution-provider"
              ? providers.find((provider) => provider.creatorId === source.sourceEntityId)?.name ?? "A Solution Provider"
              : "Oracnet editorial";
        return (
          <li key={source.id} className="card">
            <div className="row between wrap">
              <strong>
                {source.sourceType === "technology-vendor" ? "Technology vendor" : source.sourceType === "solution-provider" ? "Solution Provider proposal" : "Editorial"} · {entity}
              </strong>
              {source.status === "needs-verification" && <span className="source-status">Wording to be verified</span>}
            </div>
            {source.originalTitle && source.sourceType !== "oracnet-editorial" && (
              <p>
                <span className="muted">Original title: </span>“{source.originalTitle}”
              </p>
            )}
            <blockquote>{source.originalDescription}</blockquote>
            <dl className="detail-list">
              {source.retrievedAt && (
                <div>
                  <dt>Retrieved</dt>
                  <dd>{source.retrievedAt}</dd>
                </div>
              )}
              {source.lastCheckedAt && (
                <div>
                  <dt>Last checked</dt>
                  <dd>{source.lastCheckedAt}</dd>
                </div>
              )}
              {source.captureMethod && (
                <div>
                  <dt>How captured</dt>
                  <dd>{source.captureMethod}</dd>
                </div>
              )}
            </dl>
            {source.sourceUrl && (
              <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">
                Open source page <ExternalLink size={13} aria-hidden />
              </a>
            )}
            <small className="muted">{source.attribution}</small>
          </li>
        );
      })}
    </ul>
  );
}

export function EmptyMarketplaceState({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="card empty-marketplace" role="status">
      <FileSearch size={22} aria-hidden />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {actions && <div className="row wrap">{actions}</div>}
      </div>
    </div>
  );
}

/** A selected Use Case in the publisher, with primary control. */
export function UseCaseSelectionChip({
  useCase,
  path,
  primary,
  onPrimary,
  onRemove,
}: {
  useCase: Pick<UseCase, "id" | "name">;
  path: string;
  primary: boolean;
  onPrimary: () => void;
  onRemove: () => void;
}) {
  return (
    <li className={`use-case-chip${primary ? " primary" : ""}`}>
      <div>
        <span className="use-case-chip-role">{primary ? "Primary" : "Secondary"}</span>
        <strong>{useCase.name}</strong>
        <small>{path}</small>
      </div>
      <div className="row">
        {!primary && (
          <button type="button" className="button light compact" onClick={onPrimary} aria-label={`Make ${useCase.name} the primary Use Case`}>
            <Star size={14} aria-hidden /> Make primary
          </button>
        )}
        <button type="button" className="icon-button" onClick={onRemove} aria-label={`Remove ${useCase.name}`}>
          <X size={16} aria-hidden />
        </button>
      </div>
    </li>
  );
}

export function ProviderLink({ provider, fallback = "Not listed" }: { provider?: SolutionProvider; fallback?: string }) {
  return provider ? (
    <Link to={`/solution-providers/${provider.slug}`}>
      {provider.name} <ArrowRight size={13} aria-hidden />
    </Link>
  ) : (
    <span className="muted">{fallback}</span>
  );
}

export function VendorLink({ vendor }: { vendor?: Provider }) {
  return vendor ? (
    <Link to={`/technology-vendors/${vendor.slug}`}>
      <Building2 size={13} aria-hidden /> {vendor.name}
    </Link>
  ) : null;
}

/** Technologies with the basis for listing them (vendor statement, Builds, Blueprints, deployments). */
export function technologyBasisText(basis: { vendorListed: boolean; builds: number; blueprints: number; implementations: number }) {
  return [
    basis.vendorListed ? "Listed by vendor" : "",
    basis.builds ? `Used in ${plural(basis.builds, "Build")}` : "",
    basis.blueprints ? `In ${plural(basis.blueprints, "Blueprint")}` : "",
    basis.implementations ? `Observed in ${plural(basis.implementations, "Implementation")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
export type { Build, Product };
