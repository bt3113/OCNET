import type { Build } from "./build-model";
import type { UseCase } from "./model";
import type { UseCaseAlias, UseCaseProposal, UseCaseSource } from "./marketplace-model";
import { approveProposal, mapProposal, mergeUseCases, rejectProposal, type ModerationResult } from "./use-case-domain";
import { auditEvent } from "./review";
import { isSupabase, list, save } from "./repository";
import { normalizeLabel } from "./use-case-text";

/**
 * Use Case moderation writes. Connected mode calls admin-only, audited database
 * functions (RLS denies direct writes); the demo applies the same pure domain
 * transitions to browser storage and appends an audit event.
 */

async function rpc(name: string, args: Record<string, unknown>) {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

async function applyDemo(result: ModerationResult, reviewerId: string, entityId: string, detail = "") {
  if (result.useCase) await save("use_cases", result.useCase);
  for (const source of result.sources) await save("use_case_sources", source);
  for (const alias of result.aliases) await save("use_case_aliases", alias);
  if (result.build) await save("builds", result.build);
  await save("use_case_proposals", result.proposal);
  await save("audit_events", auditEvent(reviewerId, "use-case-proposal", entityId, result.auditAction, new Date(), detail));
}

export async function moderateMap(proposal: UseCaseProposal, target: UseCase, build: Build | undefined, reviewerId: string, note = "") {
  if (isSupabase) return void (await rpc("map_use_case_proposal", { target_proposal: proposal.id, target_use_case: target.id, note }));
  await applyDemo(mapProposal(proposal, target, build, reviewerId, note), reviewerId, proposal.id, `mapped to ${target.id}`);
}

export async function moderateApprove(
  proposal: UseCaseProposal,
  review: { title: string; description: string; categoryId: string; subcategoryId: string },
  build: Build | undefined,
  reviewerId: string,
) {
  if (isSupabase)
    return void (await rpc("approve_use_case_proposal", {
      target_proposal: proposal.id,
      title: review.title,
      definition: review.description,
      category: review.categoryId,
      subcategory: review.subcategoryId,
    }));
  const existing = (await list("use_cases")).map((useCase) => useCase.slug);
  await applyDemo(approveProposal(proposal, review, build, reviewerId, existing), reviewerId, proposal.id, review.title);
}

export async function moderateReject(proposal: UseCaseProposal, build: Build | undefined, reviewerId: string, note: string) {
  if (isSupabase) return void (await rpc("reject_use_case_proposal", { target_proposal: proposal.id, note }));
  await applyDemo(rejectProposal(proposal, build, reviewerId, note), reviewerId, proposal.id, note);
}

export async function moderateMerge(from: UseCase, into: UseCase, reviewerId: string, data: { builds: Build[]; sources: UseCaseSource[]; aliases: UseCaseAlias[] }) {
  if (isSupabase) return void (await rpc("merge_use_cases", { from_id: from.id, into_id: into.id }));
  const result = mergeUseCases(from, into, data);
  await save("use_cases", result.from);
  for (const build of result.builds) await save("builds", build);
  for (const source of result.sources) await save("use_case_sources", source);
  for (const alias of result.aliases) await save("use_case_aliases", alias);
  await save("use_case_redirects", result.redirect);
  await save("audit_events", auditEvent(reviewerId, "use-case", from.id, "use-case-merged", new Date(), `into ${into.id}`));
}

/** Aliases and archiving are admin-only table writes in connected mode (RLS: is_admin()). */
export async function addAlias(useCase: UseCase, label: string, aliasType: UseCaseAlias["aliasType"], reviewerId: string) {
  const normalizedLabel = normalizeLabel(label);
  const alias: UseCaseAlias = {
    id: `alias-${useCase.id}-${normalizedLabel.replace(/ /g, "-")}`,
    name: label,
    useCaseId: useCase.id,
    label: label.trim(),
    aliasType,
    normalizedLabel,
    language: "en",
    source: "Moderator",
    provenance: isSupabase ? "community supplied" : "demo",
  };
  await save("use_case_aliases", alias);
  if (!isSupabase) await save("audit_events", auditEvent(reviewerId, "use-case", useCase.id, "use-case-alias-added", new Date(), label));
  return alias;
}

export async function archiveUseCase(useCase: UseCase, reviewerId: string) {
  await save("use_cases", { ...useCase, status: "archived", updatedAt: new Date().toISOString() });
  if (!isSupabase) await save("audit_events", auditEvent(reviewerId, "use-case", useCase.id, "use-case-archived", new Date()));
}
