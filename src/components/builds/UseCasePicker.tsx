import { useId, useMemo, useState } from "react";
import { Plus, Search, Sparkles } from "lucide-react";
import type { Build } from "../../data/build-model";
import type { UseCase } from "../../data/model";
import type { UseCaseAlias, UseCaseCategory, UseCaseProposal } from "../../data/marketplace-model";
import {
  MAX_USE_CASES_PER_BUILD,
  addUseCase,
  canPropose,
  countUseCaseSlots,
  getUseCaseStats,
  makePrimary,
  removeUseCase,
  suggestUseCases,
  taxonomyPath,
  type MarketplaceData,
  type UseCaseSuggestion,
} from "../../data/use-case-domain";
import { titleGuidance } from "../../data/use-case-text";
import { UseCaseSelectionChip, plural } from "../marketplace";

export interface ProposalInput {
  originalText: string;
  suggestedTitle: string;
  suggestedCategoryId?: string;
  suggestedSubcategoryId?: string;
}

interface Props {
  build: Build;
  onChange: (useCaseIds: string[]) => void;
  useCases: UseCase[];
  aliases: UseCaseAlias[];
  categories: UseCaseCategory[];
  marketplace: MarketplaceData;
  providerName: string;
  proposal?: UseCaseProposal;
  onPropose: (input: ProposalInput) => Promise<void>;
  onWithdraw: () => Promise<void>;
}

/**
 * Use Case selection for the Build publisher: 1–3 approved Use Cases (first is primary),
 * deterministic suggestions from the Build's own text, an APG combobox for search, and
 * at most one new Use Case proposal that stays private until moderated.
 */
export function UseCasePicker({ build, onChange, useCases, aliases, categories, marketplace, providerName, proposal, onPropose, onWithdraw }: Props) {
  const id = useId();
  const listId = `${id}-listbox`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const slots = countUseCaseSlots(build);
  const full = slots >= MAX_USE_CASES_PER_BUILD;
  const catalogue = { useCases, aliases };
  const buildText = [build.name, build.tagline, build.description, build.problem].filter(Boolean).join(". ");
  const suggestions = useMemo(
    () => suggestUseCases(buildText, catalogue, { limit: 4, exclude: build.useCaseIds }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildText, useCases, aliases, build.useCaseIds],
  );
  const results = useMemo(
    () => (query.trim().length >= 2 ? suggestUseCases(query, catalogue, { limit: 8, exclude: build.useCaseIds }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, useCases, aliases, build.useCaseIds],
  );
  const counts = (useCaseId: string) => {
    const stats = getUseCaseStats(useCaseId, marketplace);
    return `${plural(stats.builds.length, "Build")} · ${plural(stats.technologies.length, "Technology", "Technologies")} · ${plural(stats.implementations.length, "Implementation")}`;
  };
  function choose(useCaseId: string) {
    if (full) return;
    onChange(addUseCase(build, useCaseId));
    setQuery("");
    setActive(-1);
    setOpen(false);
  }
  const expanded = open && query.trim().length >= 2;
  const selected = build.useCaseIds.map((useCaseId) => useCases.find((useCase) => useCase.id === useCaseId)).filter((item): item is UseCase => !!item);
  return (
    <div className="use-case-picker">
      <p>
        Which piece of work does this Build do? Choose between 1 and {MAX_USE_CASES_PER_BUILD} Use Cases. The first is the <strong>primary</strong> Use Case and decides where the Build is listed first.
      </p>

      <section aria-labelledby={`${id}-selected`}>
        <div className="row between wrap">
          <h3 id={`${id}-selected`}>Selected Use Cases</h3>
          <span className="use-case-slot-count" role="status" aria-live="polite">
            {slots} of {MAX_USE_CASES_PER_BUILD} selected
          </span>
        </div>
        {selected.length || proposal ? (
          <ol className="use-case-chips">
            {selected.map((useCase, index) => (
              <UseCaseSelectionChip
                key={useCase.id}
                useCase={useCase}
                path={taxonomyPath(useCase, categories)}
                primary={index === 0}
                onPrimary={() => onChange(makePrimary(build.useCaseIds, useCase.id))}
                onRemove={() => onChange(removeUseCase(build.useCaseIds, useCase.id))}
              />
            ))}
            {proposal && (
              <li className="use-case-chip proposal">
                <div>
                  <span className="use-case-chip-role">{selected.length ? "Proposed" : "Proposed · primary until reviewed"}</span>
                  <strong>{proposal.suggestedTitle}</strong>
                  <small>Pending review — not public yet. Your wording: “{proposal.originalText}”</small>
                </div>
                <button type="button" className="button light compact" onClick={() => void onWithdraw()}>
                  Withdraw proposal
                </button>
              </li>
            )}
          </ol>
        ) : (
          <p className="muted">None selected yet.</p>
        )}
        {proposal && !selected.length && (
          <p className="notice" role="note">
            This Build relies only on a proposed Use Case, so it will not appear in discovery until the proposal is approved or mapped to an existing Use Case.
          </p>
        )}
      </section>

      {suggestions.length > 0 && (
        <section aria-labelledby={`${id}-suggested`}>
          <h3 id={`${id}-suggested`}>
            <Sparkles size={15} aria-hidden /> Suggested from your Build’s description
          </h3>
          <p className="muted small-print">Matched on words in the name, tagline, description and problem. Nothing is added until you choose it.</p>
          <ul className="use-case-suggestions">
            {suggestions.map((suggestion) => (
              <SuggestionRow key={suggestion.useCase.id} suggestion={suggestion} path={taxonomyPath(suggestion.useCase, categories)} counts={counts(suggestion.useCase.id)} disabled={full} onAdd={() => choose(suggestion.useCase.id)} />
            ))}
          </ul>
        </section>
      )}

      <div className="use-case-combobox">
        <label htmlFor={`${id}-input`} id={`${id}-label`}>
          Search Use Cases
        </label>
        <div className="use-case-combobox-field">
          <Search size={17} aria-hidden />
          <input
            id={`${id}-input`}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-describedby={`${id}-hint`}
            aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
            autoComplete="off"
            value={query}
            placeholder="e.g. chase overdue invoices"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                if (!results.length) return;
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive((current) => (current < 0 ? (step > 0 ? 0 : results.length - 1) : (current + step + results.length) % results.length));
              } else if (event.key === "Enter") {
                if (expanded && active >= 0 && results[active]) {
                  event.preventDefault();
                  choose(results[active].useCase.id);
                }
              } else if (event.key === "Escape") {
                if (expanded) setOpen(false);
                else setQuery("");
                setActive(-1);
              } else if (event.key === "Home" && expanded && results.length) {
                event.preventDefault();
                setActive(0);
              } else if (event.key === "End" && expanded && results.length) {
                event.preventDefault();
                setActive(results.length - 1);
              }
            }}
          />
        </div>
        <p id={`${id}-hint`} className="muted small-print">
          {full ? `You have chosen ${MAX_USE_CASES_PER_BUILD} Use Cases. Remove one to add another.` : "Type at least two letters. Use the arrow keys to move through results and Enter to add one."}
        </p>
        <ul id={listId} role="listbox" aria-labelledby={`${id}-label`} className="use-case-listbox" hidden={!expanded}>
          {results.map((result, index) => (
            <li
              key={result.useCase.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              aria-disabled={full || undefined}
              className={index === active ? "active" : ""}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(result.useCase.id)}
            >
              <strong>{result.useCase.name}</strong>
              <small>
                {taxonomyPath(result.useCase, categories) || "Not yet categorised"}
                {result.matchedLabel ? ` · also called “${result.matchedLabel}”` : ""}
              </small>
              <small className="muted">{counts(result.useCase.id)}</small>
            </li>
          ))}
          {expanded && !results.length && (
            <li role="option" aria-disabled="true" aria-selected="false" className="empty">
              No approved Use Case matches “{query}”. Try other words, or propose a new one below.
            </li>
          )}
        </ul>
        <span className="sr-only" role="status" aria-live="polite">
          {expanded ? `${plural(results.length, "Use Case")} found` : ""}
        </span>
      </div>

      <ProposalForm build={build} catalogue={catalogue} categories={categories} providerName={providerName} proposal={proposal} onPropose={onPropose} onChoose={choose} full={full} />
    </div>
  );
}

function SuggestionRow({ suggestion, path, counts, disabled, onAdd }: { suggestion: UseCaseSuggestion; path: string; counts: string; disabled: boolean; onAdd: () => void }) {
  return (
    <li className="use-case-suggestion">
      <div>
        <strong>{suggestion.useCase.name}</strong>
        <small>{path || "Not yet categorised"}</small>
        <small className="muted">
          {counts} · {suggestion.reason}
        </small>
      </div>
      <button type="button" className="button light compact" disabled={disabled} onClick={onAdd} aria-label={`Add ${suggestion.useCase.name}`}>
        <Plus size={14} aria-hidden /> Add
      </button>
    </li>
  );
}

function ProposalForm({
  build,
  catalogue,
  categories,
  providerName,
  proposal,
  onPropose,
  onChoose,
  full,
}: {
  build: Build;
  catalogue: { useCases: UseCase[]; aliases: UseCaseAlias[] };
  categories: UseCaseCategory[];
  providerName: string;
  proposal?: UseCaseProposal;
  onPropose: (input: ProposalInput) => Promise<void>;
  onChoose: (id: string) => void;
  full: boolean;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const guidance = titleGuidance(title || text, providerName);
  const duplicates = useMemo(() => (text.trim().length >= 4 ? suggestUseCases(text, catalogue, { limit: 3, exclude: build.useCaseIds }) : []), [text, catalogue, build.useCaseIds]);
  const topCategories = categories.filter((category) => category.level === "category").sort((a, b) => a.sortOrder - b.sortOrder);
  const subcategories = categories.filter((category) => category.parentId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
  if (proposal) return <p className="muted small-print">One new Use Case can be proposed per Build. Withdraw the current proposal to propose a different one.</p>;
  const allowed = canPropose(build);
  return (
    <details className="use-case-proposal">
      <summary>Can’t find the right Use Case? Propose one</summary>
      <p className="muted small-print">
        One proposal per Build. It is reviewed before it appears anywhere public; a moderator may map it to an existing Use Case or approve it with an edited title. Your original wording is kept with the record.
      </p>
      {!allowed ? (
        <p className="notice">{full ? `Remove a Use Case first — a proposal uses one of the ${MAX_USE_CASES_PER_BUILD} slots.` : "This Build already has a proposal."}</p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (guidance.errors.length) return;
            setBusy(true);
            try {
              await onPropose({
                originalText: text.trim(),
                suggestedTitle: (title || guidance.suggestion).trim(),
                suggestedCategoryId: categoryId || undefined,
                suggestedSubcategoryId: subcategoryId || undefined,
              });
              setText("");
              setTitle("");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Describe the work in a few words
            <input value={text} maxLength={160} onChange={(event) => setText(event.target.value)} placeholder="e.g. Reconcile card payouts against bank deposits" aria-describedby={`${id}-guidance`} />
          </label>
          {duplicates.length > 0 && (
            <div className="proposal-duplicates" role="note">
              <strong>These already exist. Is one of them the same work?</strong>
              <ul>
                {duplicates.map((duplicate) => (
                  <li key={duplicate.useCase.id}>
                    <span>
                      {duplicate.useCase.name} <small className="muted">{taxonomyPath(duplicate.useCase, categories)}</small>
                    </span>
                    <button type="button" className="button light compact" disabled={full} onClick={() => onChoose(duplicate.useCase.id)}>
                      Use this instead
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div id={`${id}-guidance`} aria-live="polite">
            {text.trim() && guidance.errors.length > 0 && (
              <ul className="field-errors">
                {guidance.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
            {text.trim() && guidance.warnings.length > 0 && (
              <ul className="field-warnings">
                {guidance.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
          {text.trim() && guidance.suggestion && guidance.suggestion !== text.trim() && !title && (
            <p className="small-print">
              Suggested public title: “{guidance.suggestion}”{" "}
              <button type="button" className="text-button" onClick={() => setTitle(guidance.suggestion)}>
                Use this title
              </button>
            </p>
          )}
          {title && (
            <label>
              Suggested public title
              <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
            </label>
          )}
          <div className="grid two">
            <label>
              Suggested category (optional)
              <select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setSubcategoryId("");
                }}
              >
                <option value="">Let a moderator decide</option>
                {topCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Suggested subcategory (optional)
              <select value={subcategoryId} disabled={!subcategories.length} onChange={(event) => setSubcategoryId(event.target.value)}>
                <option value="">{categoryId ? "Let a moderator decide" : "Choose a category first"}</option>
                {subcategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="button dark" disabled={busy || !text.trim() || guidance.errors.length > 0}>
            {busy ? "Submitting…" : "Submit proposal for review"}
          </button>
        </form>
      )}
    </details>
  );
}
