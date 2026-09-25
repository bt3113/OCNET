import { useMemo, useState } from "react";
import { ArrowRight, Check, CircleHelp, Search, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, ButtonLink, Skeleton } from "../components/ui";
import {
  CompilerEmptyState,
  ContextSimilarityPanel,
  ImplementationCard,
  SolutionCandidateCard,
} from "../components/intelligence";
import { useActions, useRecords, useUI } from "../state";
import {
  compileSolutions,
  profileFromIntent,
  type CompiledSolution,
} from "../data/solution-compiler";
import type { RequirementProfile } from "../data/intelligence-model";

export default function SolutionCompiler() {
  const { userId, notify } = useUI();
  const actions = useActions();
  const [intent, setIntent] = useState("");
  const [profile, setProfile] = useState<RequirementProfile | null>(null);
  const [result, setResult] = useState<CompiledSolution | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: implementations = [], isLoading } = useRecords("implementation_records");
  const { data: contexts = [] } = useRecords("implementation_contexts");
  const { data: metrics = [] } = useRecords("implementation_metrics");
  const { data: definitions = [] } = useRecords("metric_definitions");
  const { data: blueprints = [] } = useRecords("blueprints");
  const { data: blueprintVersions = [] } = useRecords("blueprint_versions");
  const { data: blueprintItems = [] } = useRecords("blueprint_stack_items");
  const { data: products = [] } = useRecords("products");
  const { data: relationships = [] } = useRecords("technology_relationships");

  const catalogue = useMemo(
    () => ({
      implementations,
      contexts,
      blueprints,
      blueprintVersions,
      blueprintItems,
      products,
      relationships,
    }),
    [
      implementations,
      contexts,
      blueprints,
      blueprintVersions,
      blueprintItems,
      products,
      relationships,
    ],
  );

  if (isLoading) return <Skeleton />;

  function structureIntent() {
    if (intent.trim().length < 12) {
      notify("Describe the business outcome in a little more detail.");
      return;
    }
    const next = profileFromIntent(intent.trim(), userId || "demo-user");
    setProfile(next);
    setResult(null);
  }

  async function runCompiler() {
    if (!profile) return;
    const compiled = compileSolutions(profile, catalogue);
    setResult(compiled);
    if (!userId) return;
    setSaving(true);
    try {
      await actions.save("requirement_profiles", profile);
      await actions.save("solution_runs", compiled.run);
      for (const candidate of compiled.candidates)
        await actions.save("solution_candidates", candidate);
      for (const item of compiled.items)
        await actions.save("solution_candidate_items", item);
      for (const explanation of compiled.explanations)
        await actions.save("solution_explanations", explanation);
      notify("Solution run saved to your workspace.");
    } finally {
      setSaving(false);
    }
  }

  function updateProfile<K extends keyof RequirementProfile>(
    key: K,
    value: RequirementProfile[K],
  ) {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
    setResult(null);
  }

  const comparable = result
    ? implementations
        .map((implementation) => ({
          implementation,
          similarity: result.similarities[implementation.id],
        }))
        .filter((entry) => !!entry.similarity)
        .sort((a, b) => b.similarity.score - a.similarity.score)
        .slice(0, 3)
    : [];

  return (
    <>
      <PageHeading
        eyebrow="ORACNET SOLUTION COMPILER · V1"
        title="Turn an outcome into a structured solution space."
        description="This is not a chatbot. Oracnet makes the requirement explicit, checks recorded implementations and Blueprints, applies hard constraints, and exposes trade-offs rather than inventing a single ‘best’ stack."
        action={
          <Badge>Deterministic engine · no model required</Badge>
        }
      />

      <div className="compiler-shell">
        <section className="compiler-intent card">
          <div className="compiler-step-label"><span>1</span> Business intent</div>
          <label className="compiler-intent-field">
            <span>What are you trying to improve?</span>
            <div>
              <Search size={22} />
              <textarea
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                placeholder="Example: I run a property maintenance company with three locations. I want enquiries answered and booked faster, but my team is non-technical and must keep human approval for exceptions."
                rows={4}
              />
            </div>
          </label>
          <div className="compiler-examples">
            {["Automate missed enquiries for a salon", "Qualify agency leads before a sales call", "Handle after-hours reservation requests"].map((example) => (
              <button type="button" key={example} onClick={() => setIntent(example)}>{example}</button>
            ))}
          </div>
          <button className="button dark" type="button" onClick={structureIntent}>
            Structure requirement <ArrowRight size={17} />
          </button>
        </section>

        {!profile ? (
          <CompilerEmptyState />
        ) : (
          <section className="compiler-requirements card">
            <div className="compiler-step-label"><span>2</span> Review the requirement profile</div>
            <div className="compiler-profile-grid">
              <label>
                Business type
                <input value={profile.businessType} onChange={(event) => updateProfile("businessType", event.target.value)} />
              </label>
              <label>
                Organization size
                <select value={profile.organizationSizeBand} onChange={(event) => updateProfile("organizationSizeBand", event.target.value)}>
                  <option>1–10 employees</option>
                  <option>11–50 employees</option>
                  <option>51–200 employees</option>
                  <option>201+ employees</option>
                </select>
              </label>
              <label>
                Region
                <select value={profile.region} onChange={(event) => updateProfile("region", event.target.value)}>
                  <option>United Kingdom</option>
                  <option>Europe</option>
                  <option>North America</option>
                  <option>Global</option>
                </select>
              </label>
              <label>
                Locations
                <input type="number" min="1" max="1000" value={profile.locations ?? ""} onChange={(event) => updateProfile("locations", event.target.value ? Number(event.target.value) : null)} />
              </label>
              <label>
                Monthly enquiries / transactions
                <input type="number" min="0" value={profile.monthlyVolume ?? ""} onChange={(event) => updateProfile("monthlyVolume", event.target.value ? Number(event.target.value) : null)} placeholder="Optional" />
              </label>
              <label>
                Maximum setup budget ({profile.currency})
                <input type="number" min="0" value={profile.budgetMax ?? ""} onChange={(event) => updateProfile("budgetMax", event.target.value ? Number(event.target.value) : null)} />
              </label>
              <label>
                Team technical capability
                <select value={profile.technicalCapability} onChange={(event) => updateProfile("technicalCapability", event.target.value as RequirementProfile["technicalCapability"])}>
                  <option value="none">None</option>
                  <option value="basic">Basic</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label>
                Maintenance tolerance
                <select value={profile.maintenanceTolerance} onChange={(event) => updateProfile("maintenanceTolerance", event.target.value as RequirementProfile["maintenanceTolerance"])}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <div className="compiler-profile-wide">
              <label>
                Current / must-keep systems
                <input
                  value={profile.mustKeepSystems.join(", ")}
                  onChange={(event) => updateProfile("mustKeepSystems", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))}
                  placeholder="Example: HubSpot, Shopify"
                />
                <small>These are recorded as constraints/context; unknown integration support remains visibly unknown.</small>
              </label>
              <label>
                Hard required integrations
                <input
                  value={profile.requiredIntegrations.join(", ")}
                  onChange={(event) => updateProfile("requiredIntegrations", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))}
                  placeholder="Only add this if the product itself must appear in the candidate architecture"
                />
              </label>
            </div>
            <label className="checkbox-label compiler-human-check">
              <input type="checkbox" checked={profile.humanApprovalRequired} onChange={(event) => updateProfile("humanApprovalRequired", event.target.checked)} />
              Keep a human approval / exception path
            </label>
            <div className="compiler-structured-preview">
              <span><strong>Objective</strong>{profile.objective}</span>
              <span><strong>Hard boundary</strong>{profile.budgetMax ? `Setup budget ≤ ${profile.currency} ${profile.budgetMax.toLocaleString()}` : "No budget ceiling recorded"}</span>
              <span><strong>Operating preference</strong>{profile.maintenanceTolerance} maintenance tolerance</span>
              <span><strong>Data sensitivity</strong>{profile.dataSensitivity}</span>
            </div>
            <button className="button dark" type="button" disabled={saving} onClick={() => void runCompiler().catch(() => {})}>
              <SlidersHorizontal size={17} />
              {saving ? "Saving run…" : "Compile feasible options"}
            </button>
          </section>
        )}
      </div>

      {result && profile && (
        <>
          <section className="compiler-results intelligence-section">
            <div className="section-title-text">
              <span className="eyebrow">3 · COMPARABLE IMPLEMENTATIONS</span>
              <h2>Start with context before copying architecture.</h2>
              <p>Similarity is deterministic and explanatory. It is not a prediction that your business will achieve the same observed result.</p>
            </div>
            <div className="compiler-comparable-grid">
              {comparable.map(({ implementation, similarity }) => (
                <div key={implementation.id}>
                  <ContextSimilarityPanel similarity={similarity} />
                  <ImplementationCard
                    implementation={implementation}
                    context={contexts.find((context) => context.implementationId === implementation.id)}
                    metrics={metrics.filter((metric) => metric.implementationId === implementation.id)}
                    metricDefinitions={definitions}
                    similarity={similarity}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="compiler-results intelligence-section">
            <div className="section-title-text">
              <span className="eyebrow">4 · FEASIBLE SOLUTION CANDIDATES</span>
              <h2>Multiple architectures, visible trade-offs.</h2>
              <p>Cost, complexity, maintenance, flexibility and evidence are not collapsed into one hidden score. Dominated options stay visible when useful.</p>
            </div>
            <div className="solution-candidate-grid">
              {result.candidates.map((candidate) => (
                <SolutionCandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  items={result.items}
                  products={products}
                  explanations={result.explanations}
                />
              ))}
            </div>
            {!result.candidates.length && (
              <div className="card compiler-no-candidates">
                <CircleHelp size={24} />
                <h3>No candidate satisfied all hard constraints.</h3>
                <p>Relax a hard integration or budget constraint, then compile again. Oracnet does not silently ignore a requirement to produce an answer.</p>
              </div>
            )}
          </section>

          {!!result.run.excluded.length && (
            <section className="intelligence-section">
              <div className="section-title-text">
                <span className="eyebrow">EXCLUDED CANDIDATES</span>
                <h2>Why some architectures did not appear</h2>
              </div>
              <div className="excluded-candidates card">
                {result.run.excluded.map((excluded) => (
                  <div key={excluded.id}><ShieldCheck size={17} /><span><strong>{excluded.id}</strong>{excluded.reason}</span></div>
                ))}
              </div>
            </section>
          )}

          <div className="compiler-methodology card">
            <Sparkles size={23} />
            <div>
              <strong>What happened behind the interface</strong>
              <p>Requirement profile → relevant implementation context → published Blueprints → hard constraint filtering → evidence/context analysis → multi-objective trade-off comparison.</p>
              <small>Engine {result.run.engineVersion} · ruleset {result.run.rulesetVersion} · no external LLM used for this run.</small>
            </div>
            <ButtonLink to="/resources" variant="light">Read methodology <ArrowRight size={15} /></ButtonLink>
          </div>
        </>
      )}

      <div className="compiler-integrity-note">
        <Check size={17} />
        <span>AI may later help normalize natural language, but compatibility, evidence, rights and feasibility remain structured Oracnet data.</span>
      </div>
    </>
  );
}
