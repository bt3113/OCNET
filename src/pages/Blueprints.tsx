import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileKey2,
  GitBranch,
  LockKeyhole,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { PageHeading } from "../components/layout";
import {
  Badge,
  Breadcrumbs,
  ButtonLink,
  EmptyState,
  ErrorState,
  Skeleton,
} from "../components/ui";
import {
  BlueprintArchitecture,
  BlueprintCard,
  EvidenceBadge,
  ImplementationCard,
  StalenessBadge,
} from "../components/intelligence";
import { useActions, useRecords, useUI } from "../state";

export default function Blueprints() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const actions = useActions();
  const { userId, notify } = useUI();
  const [versionId, setVersionId] = useState("");
  const {
    data: blueprints = [],
    isLoading,
    isError,
    refetch,
  } = useRecords("blueprints");
  const { data: versions = [] } = useRecords("blueprint_versions");
  const { data: stackItems = [] } = useRecords("blueprint_stack_items");
  const { data: requirements = [] } = useRecords("blueprint_requirements");
  const { data: licenses = [] } = useRecords("blueprint_licenses");
  const { data: implementations = [] } = useRecords("implementation_records");
  const { data: contexts = [] } = useRecords("implementation_contexts");
  const { data: metrics = [] } = useRecords("implementation_metrics");
  const { data: definitions = [] } = useRecords("metric_definitions");
  const { data: products = [] } = useRecords("products");

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState retry={() => void refetch()} />;

  if (!slug) {
    const published = blueprints.filter(
      (blueprint) =>
        blueprint.publicationState === "published" &&
        blueprint.moderationState === "approved",
    );
    return (
      <>
        <PageHeading
          eyebrow="REUSABLE BLUEPRINTS"
          title="Reuse the pattern — not the customer's private system."
          description="Blueprints are sanitized, versioned reference architectures. They are deliberately separate from implementation evidence and customer-specific intellectual property."
          action={
            <ButtonLink to="/solution-compiler">
              Adapt to my context <ArrowRight size={17} />
            </ButtonLink>
          }
        />
        <div className="blueprint-principles card">
          <div><LockKeyhole size={22} /><strong>Sanitized</strong><span>Customer data, secrets and proprietary business rules stay out.</span></div>
          <div><GitBranch size={22} /><strong>Versioned</strong><span>Dependencies and compatibility can change over time.</span></div>
          <div><FileKey2 size={22} /><strong>Rights-aware</strong><span>Public visibility never automatically means reusable.</span></div>
        </div>
        <div className="grid three blueprint-list-grid">
          {published.map((blueprint) => (
            <BlueprintCard
              key={blueprint.id}
              blueprint={blueprint}
              version={versions.find((version) => version.id === blueprint.currentVersionId)}
              stackItems={stackItems.filter((item) => item.blueprintVersionId === blueprint.currentVersionId)}
              products={products}
            />
          ))}
        </div>
        {!published.length && (
          <EmptyState
            title="No public Blueprints yet"
            description="Reusable assets only appear once rights, sanitization and publication state are explicit."
          />
        )}
      </>
    );
  }

  const blueprint = blueprints.find((item) => item.slug === slug);
  if (!blueprint)
    return (
      <EmptyState
        title="Blueprint not found"
        description="It may be private, archived, or not yet approved for publication."
        to="/blueprints"
        action="Explore Blueprints"
      />
    );
  const blueprintVersions = versions
    .filter((version) => version.blueprintId === blueprint.id)
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  const activeVersion =
    blueprintVersions.find((version) => version.id === versionId) ??
    blueprintVersions.find((version) => version.id === blueprint.currentVersionId) ??
    blueprintVersions[0];
  const activeItems = stackItems.filter(
    (item) => item.blueprintVersionId === activeVersion?.id,
  );
  const sourceImplementation = blueprint.derivedFromImplementationId
    ? implementations.find(
        (implementation) => implementation.id === blueprint.derivedFromImplementationId,
      )
    : undefined;
  const blueprintRequirements = requirements.filter(
    (requirement) => requirement.blueprintId === blueprint.id,
  );
  const license = licenses.find((item) => item.blueprintId === blueprint.id);

  async function requestImplementation() {
    if (!userId) {
      notify("Sign in before creating a private implementation request.");
      navigate("/sign-in");
      return;
    }
    const id = crypto.randomUUID();
    await actions.save("projects", {
      id,
      name: `Implement ${blueprint.name}`,
      sourceBlueprintId: blueprint.id,
      sourceImplementationId: blueprint.derivedFromImplementationId,
      description: `Private requirement seeded from Blueprint “${blueprint.name}”. Replace assumptions and validate every integration before supplier outreach.`,
      contextSummary: "Adapt this reusable reference architecture to the buyer's actual business context.",
      category: "automation",
      budget: "To be discussed",
      timeline: "1–3 months",
      status: "draft",
      capabilities: blueprint.capabilityIds,
      desiredOutcomes: ["Implement the referenced business outcome with validated constraints"],
      currentSystems: [],
      provenance: blueprint.demo ? "demo" : "community supplied",
    });
    notify("Private project draft created from this Blueprint.");
    navigate(`/app/projects/${id}`);
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Blueprints", to: "/blueprints" },
          { name: blueprint.name },
        ]}
      />
      <div className="blueprint-detail-hero">
        <div>
          <div className="row wrap">
            <Badge>{blueprint.demo ? "DEMO BLUEPRINT" : "BLUEPRINT"}</Badge>
            <StalenessBadge state={blueprint.compatibilityState} />
            <EvidenceBadge level={blueprint.demo ? "demo" : "creator-reported"} />
          </div>
          <PageHeading
            eyebrow="SANITIZED REFERENCE ARCHITECTURE"
            title={blueprint.name}
            description={blueprint.description}
          />
          <div className="tags">
            {blueprint.capabilityIds.map((capability) => (
              <span key={capability}>{capability}</span>
            ))}
          </div>
        </div>
        <div className="card blueprint-action-card">
          <strong>Reuse state</strong>
          <dl className="detail-list">
            <div><dt>Rights</dt><dd>{blueprint.reuseRights.replaceAll("-", " ")}</dd></div>
            <div><dt>Commercial use</dt><dd>{blueprint.commercialUseAllowed ? "Allowed" : "Not granted"}</dd></div>
            <div><dt>Source</dt><dd>{blueprint.sourceAvailable ? "Available" : "Not included"}</dd></div>
            <div><dt>Last validated</dt><dd>{blueprint.lastValidatedAt}</dd></div>
          </dl>
          <button className="button dark" type="button" onClick={() => void requestImplementation().catch(() => {})}>
            Request implementation <ArrowRight size={17} />
          </button>
        </div>
      </div>

      {!!blueprintVersions.length && (
        <div className="blueprint-version-bar card">
          <div>
            <span className="eyebrow">VERSION HISTORY</span>
            <strong>Inspect the dependency manifest that was last validated.</strong>
          </div>
          <label>
            Version
            <select
              value={activeVersion?.id ?? ""}
              onChange={(event) => setVersionId(event.target.value)}
            >
              {blueprintVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.version} · {version.compatibilityState.replaceAll("-", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <BlueprintArchitecture
        blueprint={blueprint}
        version={activeVersion}
        items={activeItems}
        products={products}
      />

      <div className="blueprint-detail-columns">
        <section>
          <div className="section-title-text">
            <span className="eyebrow">IMPLEMENTATION REQUIREMENTS</span>
            <h2>What still has to be adapted</h2>
          </div>
          <div className="blueprint-requirements">
            {blueprintRequirements.map((requirement) => (
              <div className="card" key={requirement.id}>
                <CheckCircle2 size={19} />
                <div>
                  <strong>{requirement.name}</strong>
                  <p>{requirement.description}</p>
                  <span>{requirement.type} · {requirement.required ? "required" : "optional"}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="card blueprint-limitations">
            <ShieldAlert size={22} />
            <div>
              <h3>Known limitations</h3>
              <p>{blueprint.knownLimitations}</p>
            </div>
          </div>
        </section>
        <aside>
          <div className="card blueprint-license-card">
            <FileKey2 size={22} />
            <h3>Rights & license</h3>
            <p>{license?.licenseText ?? blueprint.license}</p>
            <dl className="detail-list">
              <div><dt>Attribution</dt><dd>{license?.attributionRequired ? "Required" : "Not specified"}</dd></div>
              <div><dt>Commercial use</dt><dd>{license?.commercialUseAllowed ? "Allowed" : "Not granted"}</dd></div>
            </dl>
          </div>
          <div className="card blueprint-maintenance-card">
            <Wrench size={22} />
            <h3>Maintenance state</h3>
            <p>Blueprints decay as APIs, auth schemes and product capabilities change.</p>
            <StalenessBadge state={blueprint.compatibilityState} />
          </div>
        </aside>
      </div>

      {sourceImplementation && (
        <section className="intelligence-section">
          <div className="section-title-text">
            <span className="eyebrow">DERIVED FROM</span>
            <h2>Implementation evidence remains separate</h2>
            <p>This Blueprint points back to the record that inspired it without copying customer-specific data or private implementation logic.</p>
          </div>
          <div className="grid two">
            <ImplementationCard
              implementation={sourceImplementation}
              context={contexts.find((context) => context.implementationId === sourceImplementation.id)}
              metrics={metrics.filter((metric) => metric.implementationId === sourceImplementation.id)}
              metricDefinitions={definitions}
            />
          </div>
        </section>
      )}

      <div className="implementation-request-banner">
        <div>
          <GitBranch size={25} />
          <span className="eyebrow">ADAPT, DON’T COPY BLINDLY</span>
          <h2>Use the Blueprint as a specification starting point.</h2>
          <p>Oracnet keeps customer evidence, reusable architecture and implementation procurement as separate layers.</p>
        </div>
        <button className="button dark" type="button" onClick={() => void requestImplementation().catch(() => {})}>
          Create a private requirement <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}
