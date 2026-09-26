import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CircleHelp, FileSearch, ListRestart, Search, SlidersHorizontal } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, ErrorState, Skeleton } from "../components/ui";
import {
  ContextSimilarityPanel,
  ImplementationCard,
} from "../components/intelligence";
import {
  DecisionTraceDrawer,
  RequirementBuilder,
  SolutionCandidateCard,
  SolutionCompilerProgress,
  SolutionExplanationDrawer,
  SolutionTradeoffView,
} from "../components/compiler";
import { useActions, useUI } from "../state";
import { useIntelligence, isPublicRecord } from "../data/intelligence-hooks";
import { compileSolutions, substituteComponent, type CompiledSolution } from "../data/solution-compiler";
import { emptyProfile, profileFromIntent, validateProfile } from "../data/requirement";
import { track } from "../data/analytics";
import { isSupabase } from "../data/repository";
import type { RequirementProfile, SolutionCandidate } from "../data/intelligence-model";

const examples = [
  "I run a property maintenance company with three branches. We use HubSpot. I want missed calls and web enquiries answered, qualified and booked automatically. Nobody on the team codes. Human approval for exceptions. Budget £1k–£5k setup.",
  "Two-site salon in Manchester, about 700 enquiries a month by text and website. We want quick replies and fewer no-shows. No tech team.",
  "Creative agency, 20 staff, EU. Qualify inbound leads into Pipedrive before a human sales review.",
];

type Order = "default" | "setup" | "maintenance" | "evidence" | "complexity";

export default function SolutionCompiler() {
  const { userId, notify } = useUI();
  const navigate = useNavigate();
  const actions = useActions();
  const data = useIntelligence();
  const [intent, setIntent] = useState("");
  const [profile, setProfile] = useState<RequirementProfile | null>(null);
  const [result, setResult] = useState<CompiledSolution | null>(null);
  const [explain, setExplain] = useState<SolutionCandidate | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [showDominated, setShowDominated] = useState(false);
  const [order, setOrder] = useState<Order>("default");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [params] = useSearchParams();
  const handedOff = useRef(false);
  // Intent handed over from the homepage: structure it once, still fully editable.
  useEffect(() => {
    const incoming = params.get("intent")?.trim();
    if (handedOff.current || !incoming || data.isLoading) return;
    handedOff.current = true;
    setIntent(incoming);
    if (incoming.length >= 12) setProfile(profileFromIntent(incoming, userId || "anonymous", `requirement-${crypto.randomUUID()}`, data.products));
  }, [params, data.isLoading, data.products, userId]);
  const validation = profile ? validateProfile(profile) : null;
  const serviceUseCases = data.useCases.filter((useCase) => data.blueprints.some((blueprint) => blueprint.useCaseIds.includes(useCase.id)));

  const ordered = useMemo(() => {
    if (!result) return [];
    const list = [...result.candidates];
    const key: Record<Order, (c: SolutionCandidate) => number> = {
      default: () => 0,
      setup: (c) => c.objectives.setupCost.high ?? Number.POSITIVE_INFINITY,
      maintenance: (c) => c.objectives.maintenanceHours.high ?? Number.POSITIVE_INFINITY,
      evidence: (c) => -c.objectives.implementationEvidence,
      complexity: (c) => c.objectives.complexity,
    };
    return list.sort((a, b) => Number(a.dominated) - Number(b.dominated) || Number(!a.feasible) - Number(!b.feasible) || key[order](a) - key[order](b));
  }, [result, order]);

  if (data.isLoading) return <Skeleton />;
  if (data.isError) return <ErrorState retry={data.refetch} />;

  const structure = () => {
    if (intent.trim().length < 12) {
      notify("Describe the outcome in a sentence or two, or start from a blank requirement.");
      return;
    }
    setProfile(profileFromIntent(intent, userId || "anonymous", `requirement-${crypto.randomUUID()}`, data.products));
    setResult(null);
    track("solution_compiler_started", "intent");
  };
  const blank = () => {
    setProfile({ ...emptyProfile(userId || "anonymous", `requirement-${crypto.randomUUID()}`), objective: intent.trim() || "Structured requirement" });
    setResult(null);
    track("solution_compiler_started", "blank");
  };
  const update = (next: RequirementProfile) => {
    setProfile(next);
    setResult(null);
  };
  const compile = () => {
    if (!profile || !validation?.ok) return;
    const compiled = compileSolutions(profile, data.catalogue);
    setResult(compiled);
    setEditing(false);
    track("compiler_run_completed", compiled.run.id);
    requestAnimationFrame(() => document.getElementById("compiler-results")?.focus());
  };
  const substitute = (candidateId: string, slotId: string, productId: string) => {
    if (!result) return;
    setResult(substituteComponent(result, candidateId, slotId, productId, data.catalogue));
    track("candidate_substitution", candidateId);
  };
  const save = async () => {
    if (!result || !profile) return;
    if (isSupabase && !userId) {
      notify("Sign in to save requirement profiles and solution runs.");
      navigate("/sign-in");
      return;
    }
    setSaving(true);
    try {
      const owner = userId || "demo-user";
      await actions.save("requirement_profiles", { ...profile, ownerId: owner });
      await actions.save("solution_runs", { ...result.run, ownerId: owner, trace: result.trace });
      for (const candidate of result.candidates) await actions.save("solution_candidates", candidate);
      for (const item of result.items) await actions.save("solution_candidate_items", item);
      notify(isSupabase ? "Solution run saved." : "Solution run saved in this browser (demo).");
    } catch {
      // useActions already surfaced the error.
    } finally {
      setSaving(false);
    }
  };
  const request = async (candidate: SolutionCandidate) => {
    if (!profile) return;
    if (isSupabase && !userId) {
      notify("Sign in before creating a private requirement.");
      navigate("/sign-in");
      return;
    }
    const id = crypto.randomUUID();
    const productIds = Object.values(candidate.assignment);
    try {
      await actions.save("projects", {
      id,
      name: `${profile.businessType || "Business"}: ${candidate.name}`,
      sourceBlueprintId: candidate.sourceBlueprintId,
      sourceImplementationId: candidate.sourceImplementationIds[0],
      sourceStackProductIds: productIds,
      description: `Private requirement from Solution Compiler run ${result?.run.id}. Objective: ${profile.objective}`,
      contextSummary: [profile.businessType, profile.locations ? `${profile.locations} locations` : "", profile.region].filter(Boolean).join(" · "),
      category: "automation",
      budget: profile.budgetMax ? `Up to £${profile.budgetMax.toLocaleString("en-GB")} setup (buyer stated)` : "To be discussed",
      timeline: profile.timeline || "To be discussed",
      status: "draft",
      capabilities: [...new Set(data.blueprintItems.filter((item) => item.id in candidate.assignment).map((item) => item.capabilityId))],
      desiredOutcomes: [profile.objective],
      currentSystems: profile.currentSystems,
      provenance: isSupabase ? "community supplied" : "demo",
      });
    } catch {
      return;
    }
    track("implementation_request_started", candidate.id);
    notify("Private requirement created. Review it before inviting proposals.");
    navigate(`/app/projects/${id}`);
  };

  const shown = ordered.filter((candidate) => showDominated || !candidate.dominated || candidate.substituted);
  const nonDominated = ordered.filter((candidate) => !candidate.dominated && candidate.feasible);
  const publicRecords = data.implementations.filter(isPublicRecord);
  const comparable = result
    ? publicRecords
        .map((record) => ({ record, similarity: result.similarities[record.id] }))
        .filter((entry) => entry.similarity && entry.similarity.level !== "low")
        .sort((a, b) => b.similarity.score - a.similarity.score)
        .slice(0, 3)
    : [];

  const collapsed = !!result && !editing;
  const money = (value: number | null | undefined) => (value == null ? null : `£${value.toLocaleString("en-GB")}`);
  const summary: [string, string][] = profile
    ? ([
        ["Outcome", data.useCases.find((item) => item.id === profile.useCaseId)?.name ?? profile.objective],
        ["Business", [profile.businessType, profile.locations ? `${profile.locations} locations` : ""].filter(Boolean).join(" · ")],
        ["Must keep", profile.mustKeepSystems.map((id) => data.products.find((item) => item.id === id)?.name ?? id).join(", ")],
        ["Setup budget", [money(profile.budgetMin), money(profile.budgetMax)].filter(Boolean).join("–")],
        ["Team", { none: "No in-house developers", basic: "Basic technical skills", intermediate: "Some development skills", advanced: "Developers in-house" }[profile.technicalCapability]],
        ["Human approval", profile.humanApprovalRequired ? "Required" : ""],
      ] as [string, string][]).filter(([, value]) => !!value)
    : [];
  return (
    <>
      <PageHeading
        eyebrow="SOLUTION COMPILER"
        title="What are you trying to improve?"
        description="Describe the outcome, confirm the requirements, then compare approaches that satisfy your hard constraints."
        action={<Badge>Deterministic · no AI model used</Badge>}
      />
      <ol className="compiler-stepper" aria-label="Progress">
        {["Describe the outcome", "Confirm requirements", "Compare approaches"].map((label, index) => {
          const step = result ? 2 : profile ? 1 : 0;
          return (
            <li key={label} className={index === step ? "current" : index < step ? "done" : ""} aria-current={index === step ? "step" : undefined}>
              <span>{index + 1}</span>
              {label}
            </li>
          );
        })}
      </ol>

      {collapsed && profile ? (
        <section className="card requirement-summary" aria-labelledby="requirement-summary-title">
          <div className="row between wrap">
            <h2 id="requirement-summary-title" className="tab-section-title">Your requirement</h2>
            <button type="button" className="button light" onClick={() => setEditing(true)}>
              <ListRestart size={15} aria-hidden /> Edit requirement
            </button>
          </div>
          <dl className="requirement-summary-list">
            {summary.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </section>
      ) : (
      <>
      <section className="compiler-intent card" aria-labelledby="intent-label">
        <div className="compiler-step-label"><span>1</span> Describe the outcome</div>
        <label className="compiler-intent-field" htmlFor="compiler-intent">
          <span id="intent-label">What are you trying to improve?</span>
          <div>
            <Search size={20} aria-hidden />
            <textarea
              id="compiler-intent"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              placeholder="Example: I run a property maintenance company with three branches. We use HubSpot. I want missed calls and web enquiries answered, qualified and booked. Nobody on the team codes."
              rows={4}
            />
          </div>
        </label>
        <div className="compiler-examples" aria-label="Example descriptions">
          {examples.map((example) => (
            <button type="button" key={example} onClick={() => setIntent(example)}>{example.split(".")[0]}</button>
          ))}
        </div>
        <div className="row wrap">
          <button className="button dark" type="button" onClick={structure}>
            Turn into requirement cards <ArrowRight size={17} aria-hidden />
          </button>
          <button className="button light" type="button" onClick={blank}>
            Fill in the cards myself
          </button>
        </div>
        <small className="muted">Text is parsed by deterministic rules in your browser. Nothing is sent to an AI provider.</small>
      </section>

      {profile && (
        <section className="compiler-requirements card" aria-labelledby="requirements-title">
          <div className="compiler-step-label" id="requirements-title"><span>2</span> Confirm your requirement</div>
          <p className="muted">
            Values marked <strong>INFERRED</strong> came from your text — confirm or correct them. Mark each constraint <strong>Hard</strong> (must hold),
            <strong> Soft</strong> (preference) or <strong>Info</strong> (context only).
          </p>
          <RequirementBuilder profile={profile} useCases={serviceUseCases} onChange={update} />
          {validation && !validation.ok && (
            <div className="notice" role="alert"><CircleHelp size={18} aria-hidden /><p>{validation.errors.join(" ")}</p></div>
          )}
          <div className="row wrap compiler-run-row">
            <button className="button dark" type="button" disabled={!validation?.ok} onClick={compile}>
              <SlidersHorizontal size={17} aria-hidden /> Compile feasible approaches
            </button>
            {!!profile.inferredFields?.length && (
              <span className="muted">{profile.inferredFields.length} inferred value{profile.inferredFields.length === 1 ? "" : "s"} not yet confirmed — they are still used, marked as inferred in the run.</span>
            )}
          </div>
        </section>
      )}
      </>
      )}

      {result && profile && (
        <div id="compiler-results" tabIndex={-1} className="compiler-results-region">
          <section className="intelligence-section">
            <div className="compiler-step-label"><span>3</span> Compare feasible approaches</div>
            <p className="tab-section-note">Labels appear only where recorded data supports them — there is no “best stack”. Change a component to re-check feasibility.</p>
            <div className="compiler-toolbar card">
              <label>
                Order by (does not change any value)
                <select value={order} onChange={(event) => setOrder(event.target.value as Order)}>
                  <option value="default">Blueprint</option>
                  <option value="setup">Lower setup cost first</option>
                  <option value="maintenance">Lower maintenance first</option>
                  <option value="evidence">More implementation evidence first</option>
                  <option value="complexity">Lower complexity first</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={showDominated} onChange={(event) => setShowDominated(event.target.checked)} />
                Show dominated options ({ordered.filter((candidate) => candidate.dominated).length})
              </label>
              <button type="button" className="button light" onClick={() => setTraceOpen(true)}>
                <FileSearch size={15} aria-hidden /> Decision trace
              </button>
              <button type="button" className="button light" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save run"}
              </button>
            </div>
            {shown.length ? (
              <div className="solution-candidate-grid">
                {shown.map((candidate) => (
                  <SolutionCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    items={result.items}
                    products={data.products}
                    implementations={data.implementations}
                    onSubstitute={(slotId, productId) => substitute(candidate.id, slotId, productId)}
                    onExplain={() => {
                      setExplain(candidate);
                      track("candidate_viewed", candidate.id);
                    }}
                    onRequest={() => void request(candidate)}
                  />
                ))}
              </div>
            ) : (
              <div className="card compiler-no-candidates" role="status">
                <CircleHelp size={24} aria-hidden />
                <h3>No approach satisfies every hard constraint.</h3>
                <p>Oracnet does not quietly drop a requirement to produce an answer. Review the exclusions below, then relax a hard constraint to Soft if that is acceptable.</p>
                <button type="button" className="button light" onClick={() => setEditing(true)}>
                  <ListRestart size={15} aria-hidden /> Edit requirement
                </button>
              </div>
            )}
          </section>

          {nonDominated.length > 1 && (
            <section className="intelligence-section">
              <h2 className="tab-section-title">Trade-offs between the non-dominated approaches</h2>
              <SolutionTradeoffView candidates={nonDominated} />
            </section>
          )}

          {!!result.trace.exclusions.length && (
            <section className="intelligence-section">
              <h2 className="tab-section-title">What did not appear, and why</h2>
              <details className="card excluded-candidates">
                <summary>{result.trace.exclusions.length} exclusion{result.trace.exclusions.length === 1 ? "" : "s"} recorded</summary>
                <ul>
                  {result.trace.exclusions.map((exclusion) => (
                    <li key={exclusion.id}><strong>{data.blueprints.find((item) => item.id === exclusion.blueprintId)?.name ?? exclusion.blueprintId}</strong> — {exclusion.reason}</li>
                  ))}
                </ul>
              </details>
            </section>
          )}

          <section className="intelligence-section">
            <h2 className="tab-section-title">Businesses like yours</h2>
            <p className="tab-section-note">Similarity compares context only. It is not a prediction that you will see the same outcome.</p>
            {comparable.length ? (
              <div className="compiler-comparable-grid">
                {comparable.map(({ record, similarity }) => (
                  <div key={record.id} className="comparable-pair">
                    <ContextSimilarityPanel similarity={similarity} />
                    <ImplementationCard
                      implementation={record}
                      context={data.contexts.find((context) => context.implementationId === record.id)}
                      metrics={data.metrics.filter((metric) => metric.implementationId === record.id)}
                      metricDefinitions={data.definitions}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted card compiler-none">No published record has a medium or high context match. The approaches below come from Blueprints only.</p>
            )}
          </section>

          <details className="card compiler-method">
            <summary>How this result was computed</summary>
            <SolutionCompilerProgress stages={result.stages} />
          </details>
          <SolutionExplanationDrawer candidate={explain} products={data.products} implementations={data.implementations} onClose={() => setExplain(null)} />
          <DecisionTraceDrawer open={traceOpen} onClose={() => setTraceOpen(false)} result={result} catalogue={data.catalogue} />
        </div>
      )}
    </>
  );
}
