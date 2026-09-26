import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { UseCase } from "../data/model";
import type { UseCaseAlias, UseCaseProposal } from "../data/marketplace-model";
import { PageHeading, WorkspaceNotice } from "../components/layout";
import { EmptyState, ErrorState, Skeleton, TabbedSections } from "../components/ui";
import { EmptyMarketplaceState, TaxonomyBreadcrumb, plural } from "../components/marketplace";
import { useMarketplace, type MarketplaceState } from "../data/marketplace-hooks";
import { approvedUseCases, getUseCaseStats, suggestUseCases, taxonomyPath } from "../data/use-case-domain";
import { tidyTitle } from "../data/use-case-text";
import { addAlias, archiveUseCase, moderateApprove, moderateMap, moderateMerge, moderateReject } from "../data/use-case-moderation";
import { isSupabase } from "../data/repository";
import { useUI } from "../state";

/**
 * Use Case moderation queue. Nothing merges or publishes automatically: a moderator
 * maps, approves (optionally editing), or rejects each proposal; merges and aliases are
 * explicit. Connected mode runs these through admin-only audited database functions.
 */
export default function UseCaseModeration() {
  const { roles } = useUI();
  const market = useMarketplace();
  const [params, setParams] = useSearchParams();
  if (market.isLoading) return <Skeleton />;
  if (market.isError) return <ErrorState retry={market.refetch} />;
  if (isSupabase && !roles.includes("admin"))
    return <EmptyState title="Moderator access required" description="Use Case moderation needs an admin role, enforced by the database." to="/" action="Back to Oracnet" />;
  const pending = market.proposals.filter((proposal) => proposal.status === "pending");
  const resolved = market.proposals.filter((proposal) => proposal.status !== "pending");
  const tab = params.get("tab") ?? "proposals";
  return (
    <>
      <WorkspaceNotice />
      <PageHeading
        eyebrow="ADMIN · USE CASES"
        title="Use Case moderation"
        description="Review proposed Use Cases, merge duplicates and manage search labels. Every action is recorded in the audit log; nothing is merged automatically."
      />
      <TabbedSections
        label="Moderation sections"
        active={tab}
        onChange={(id) => setParams(id === "proposals" ? {} : { tab: id }, { replace: true })}
        tabs={[
          {
            id: "proposals",
            label: "Proposals",
            count: pending.length,
            content: pending.length ? (
              <div className="moderation-list">
                {pending.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} market={market} />
                ))}
              </div>
            ) : (
              <EmptyMarketplaceState title="No proposals waiting." description="Solution Providers propose a Use Case from the Build publisher when none fits. Proposals appear here before anything becomes public." />
            ),
          },
          { id: "merge", label: "Merge", content: <MergePanel market={market} /> },
          { id: "labels", label: "Labels & archive", content: <LabelsPanel market={market} /> },
          {
            id: "history",
            label: "Resolved",
            count: resolved.length,
            content: resolved.length ? (
              <ul className="moderation-history">
                {resolved.map((proposal) => {
                  const target = market.useCases.find((useCase) => useCase.id === proposal.resolvedUseCaseId);
                  return (
                    <li key={proposal.id}>
                      <strong>“{proposal.originalText}”</strong> <span className={`moderation-status ${proposal.status}`}>{proposal.status}</span>
                      {target && (
                        <>
                          {" "}→ <Link to={`/use-cases/${target.slug}`}>{target.name}</Link>
                        </>
                      )}
                      {proposal.reviewNote && <small className="muted"> · {proposal.reviewNote}</small>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">No resolved proposals yet.</p>
            ),
          },
        ]}
      />
    </>
  );
}

function useRefresh(market: MarketplaceState) {
  const client = useQueryClient();
  return async () => {
    await client.invalidateQueries();
    market.refetch();
  };
}

function ProposalCard({ proposal, market }: { proposal: UseCaseProposal; market: MarketplaceState }) {
  const { userId, notify } = useUI();
  const refresh = useRefresh(market);
  const build = market.builds.find((item) => item.id === proposal.buildId);
  const provider = market.providers.find((item) => item.creatorId === proposal.creatorId);
  const matches = useMemo(
    () => suggestUseCases(`${proposal.originalText} ${proposal.suggestedTitle}`, { useCases: market.useCases, aliases: market.aliases }, { limit: 4 }),
    [proposal, market.useCases, market.aliases],
  );
  const [mode, setMode] = useState<"" | "map" | "approve" | "reject">("");
  const [target, setTarget] = useState(matches[0]?.useCase.id ?? "");
  const [title, setTitle] = useState(proposal.suggestedTitle || tidyTitle(proposal.originalText));
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(proposal.suggestedCategoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(proposal.suggestedSubcategoryId ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const topCategories = market.categories.filter((category) => category.level === "category").sort((a, b) => a.sortOrder - b.sortOrder);
  const subcategories = market.categories.filter((category) => category.parentId === categoryId);
  const approved = approvedUseCases(market.useCases).sort((a, b) => a.name.localeCompare(b.name));
  async function run(action: () => Promise<void>, message: string) {
    setBusy(true);
    try {
      await action();
      notify(message);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Moderation failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  const suggestedPath = [proposal.suggestedCategoryId, proposal.suggestedSubcategoryId]
    .map((id) => market.categories.find((category) => category.id === id)?.name)
    .filter(Boolean)
    .join(" › ");
  return (
    <article className="card moderation-card">
      <header>
        <span className="moderation-status pending">Pending review</span>
        <h3>{proposal.suggestedTitle}</h3>
        <dl className="detail-list">
          <div>
            <dt>Original wording</dt>
            <dd>“{proposal.originalText}”</dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>{build ? <Link to={`/builds/${build.slug}`}>{build.name}</Link> : "Unknown Build"}</dd>
          </div>
          <div>
            <dt>Solution Provider</dt>
            <dd>{provider ? <Link to={`/solution-providers/${provider.slug}`}>{provider.name}</Link> : "Unknown"}</dd>
          </div>
          <div>
            <dt>Suggested category</dt>
            <dd>{suggestedPath || "None suggested"}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{proposal.createdAt.slice(0, 10)}</dd>
          </div>
        </dl>
      </header>
      <section>
        <h4>Possible existing matches</h4>
        {matches.length ? (
          <ul className="moderation-matches">
            {matches.map((match) => (
              <li key={match.useCase.id}>
                <Link to={`/use-cases/${match.useCase.slug}`}>{match.useCase.name}</Link> <small className="muted">{taxonomyPath(match.useCase, market.categories)} · {match.reason}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No close match in the approved catalogue.</p>
        )}
      </section>
      <div className="row wrap moderation-actions" role="group" aria-label={`Actions for ${proposal.suggestedTitle}`}>
        <button type="button" className={`button ${mode === "map" ? "dark" : "light"}`} onClick={() => setMode("map")}>
          Map to existing
        </button>
        <button type="button" className={`button ${mode === "approve" ? "dark" : "light"}`} onClick={() => setMode("approve")}>
          Edit and approve
        </button>
        <button type="button" className={`button ${mode === "reject" ? "dark" : "light"}`} onClick={() => setMode("reject")}>
          Reject
        </button>
      </div>
      {mode === "map" && (
        <form
          className="moderation-form"
          onSubmit={(event) => {
            event.preventDefault();
            const useCase = market.useCases.find((item) => item.id === target);
            if (useCase) void run(() => moderateMap(proposal, useCase, build, userId, note), `Mapped to “${useCase.name}”. The original wording is kept as a label.`);
          }}
        >
          <label>
            Existing Use Case
            <select value={target} onChange={(event) => setTarget(event.target.value)} required>
              <option value="">Choose a Use Case</option>
              {approved.map((useCase) => (
                <option key={useCase.id} value={useCase.id}>
                  {useCase.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Note to the provider (optional)
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
          </label>
          <button type="submit" className="button dark" disabled={busy || !target}>
            Confirm mapping
          </button>
        </form>
      )}
      {mode === "approve" && (
        <form
          className="moderation-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => moderateApprove(proposal, { title, description, categoryId, subcategoryId }, build, userId), `Approved “${title}”.`);
          }}
        >
          <label>
            Public title
            <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={8} maxLength={120} required />
          </label>
          <label>
            Definition
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} maxLength={600} rows={3} required placeholder="One or two sentences describing the work, in neutral words." />
          </label>
          <div className="grid two">
            <label>
              Category
              <select
                value={categoryId}
                required
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setSubcategoryId("");
                }}
              >
                <option value="">Choose a category</option>
                {topCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subcategory
              <select value={subcategoryId} required onChange={(event) => setSubcategoryId(event.target.value)}>
                <option value="">Choose a subcategory</option>
                {subcategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted small-print">The provider’s original wording is stored with the source record and kept as a search label if the title changes.</p>
          <button type="submit" className="button dark" disabled={busy}>
            Approve Use Case
          </button>
        </form>
      )}
      {mode === "reject" && (
        <form
          className="moderation-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => moderateReject(proposal, build, userId, note), "Proposal rejected. The Build keeps its other Use Cases.");
          }}
        >
          <label>
            Reason (shown to the provider)
            <input value={note} onChange={(event) => setNote(event.target.value)} minLength={5} maxLength={500} required />
          </label>
          <button type="submit" className="button dark" disabled={busy}>
            Reject proposal
          </button>
        </form>
      )}
    </article>
  );
}

function MergePanel({ market }: { market: MarketplaceState }) {
  const { userId, notify } = useUI();
  const refresh = useRefresh(market);
  const [from, setFrom] = useState("");
  const [into, setInto] = useState("");
  const [busy, setBusy] = useState(false);
  const approved = approvedUseCases(market.useCases).sort((a, b) => a.name.localeCompare(b.name));
  const source = market.useCases.find((useCase) => useCase.id === from);
  const target = market.useCases.find((useCase) => useCase.id === into);
  const moving = source ? getUseCaseStats(source.id, market.marketplace) : undefined;
  return (
    <section className="intelligence-section moderation-form">
      <p className="tab-section-note">
        Merging moves Build links, sources and labels to the surviving Use Case, keeps the old title as an alternate label and redirects the old URL. Nothing is deleted.
      </p>
      <div className="grid two">
        <label>
          Merge this Use Case
          <select value={from} onChange={(event) => setFrom(event.target.value)}>
            <option value="">Choose the duplicate</option>
            {approved.map((useCase) => (
              <option key={useCase.id} value={useCase.id}>
                {useCase.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Into this Use Case
          <select value={into} onChange={(event) => setInto(event.target.value)}>
            <option value="">Choose the one to keep</option>
            {approved
              .filter((useCase) => useCase.id !== from)
              .map((useCase) => (
                <option key={useCase.id} value={useCase.id}>
                  {useCase.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      {source && target && moving && (
        <p className="notice" role="status">
          {plural(moving.builds.length, "Build")} and {plural(market.sources.filter((item) => item.useCaseId === source.id).length, "source")} move to “{target.name}”. /use-cases/{source.slug} will redirect.
        </p>
      )}
      <button
        type="button"
        className="button dark"
        disabled={busy || !source || !target}
        onClick={async () => {
          if (!source || !target) return;
          setBusy(true);
          try {
            await moderateMerge(source, target, userId, { builds: market.builds, sources: market.sources, aliases: market.aliases });
            notify(`Merged “${source.name}” into “${target.name}”.`);
            setFrom("");
            setInto("");
            await refresh();
          } catch (error) {
            notify(error instanceof Error ? error.message : "Merge failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Merge Use Cases
      </button>
    </section>
  );
}

function LabelsPanel({ market }: { market: MarketplaceState }) {
  const { userId, notify } = useUI();
  const refresh = useRefresh(market);
  const [selected, setSelected] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<UseCaseAlias["aliasType"]>("alternate");
  const approved = approvedUseCases(market.useCases).sort((a, b) => a.name.localeCompare(b.name));
  const useCase: UseCase | undefined = market.useCases.find((item) => item.id === selected);
  const aliases = market.aliases.filter((alias) => alias.useCaseId === selected);
  return (
    <section className="intelligence-section moderation-form">
      <label>
        Use Case
        <select value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Choose a Use Case</option>
          {approved.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {useCase && (
        <>
          <TaxonomyBreadcrumb useCase={useCase} categories={market.categories} />
          <h3 className="tab-section-title">Labels</h3>
          {aliases.length ? (
            <ul className="moderation-history">
              {aliases.map((alias) => (
                <li key={alias.id}>
                  {alias.label} <span className="muted">· {alias.aliasType}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No labels besides the title.</p>
          )}
          <form
            className="row wrap"
            onSubmit={async (event) => {
              event.preventDefault();
              if (label.trim().length < 3) return;
              try {
                await addAlias(useCase, label, type, userId);
                notify("Label added");
                setLabel("");
                await refresh();
              } catch (error) {
                notify(error instanceof Error ? error.message : "Could not add the label.");
              }
            }}
          >
            <label>
              New label
              <input value={label} onChange={(event) => setLabel(event.target.value)} minLength={3} maxLength={120} />
            </label>
            <label>
              Label type
              <select value={type} onChange={(event) => setType(event.target.value as UseCaseAlias["aliasType"])}>
                <option value="alternate">Alternate (shown)</option>
                <option value="hidden-search">Hidden search term</option>
              </select>
            </label>
            <button type="submit" className="button light">
              Add label
            </button>
          </form>
          <h3 className="tab-section-title">Archive</h3>
          <p className="tab-section-note">Archiving hides the Use Case from discovery and the publisher. Builds keep their other Use Cases; use Merge instead when a better Use Case exists.</p>
          <button
            type="button"
            className="button light"
            onClick={async () => {
              try {
                await archiveUseCase(useCase, userId);
                notify(`Archived “${useCase.name}”.`);
                setSelected("");
                await refresh();
              } catch (error) {
                notify(error instanceof Error ? error.message : "Could not archive.");
              }
            }}
          >
            Archive this Use Case
          </button>
        </>
      )}
    </section>
  );
}
