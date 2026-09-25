import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, MapPin, ShieldCheck } from "lucide-react";
import { PageHeading } from "../components/layout";
import { Badge, EmptyState, Logo, Skeleton } from "../components/ui";
import { EvidenceBadge } from "../components/intelligence";
import { useRecords } from "../state";

export default function Implementers() {
  const { data: integrators = [], isLoading } = useRecords("integrators");
  const { data: implementations = [] } = useRecords("implementation_records");
  const { data: blueprints = [] } = useRecords("blueprints");
  if (isLoading) return <Skeleton />;
  return (
    <>
      <PageHeading
        eyebrow="IMPLEMENTERS"
        title="Find people with implementation context — not just a profile."
        description="Profiles increasingly connect to implementation records, maintained Blueprints and evidence states. Current partner and deployment content is synthetic demo data."
      />
      <div className="implementer-directory-grid">
        {integrators.map((partner) => {
          const records = implementations.filter((record) =>
            record.implementerIds.includes(partner.id),
          );
          const maintained = blueprints.filter((blueprint) =>
            records.some((record) => record.derivedBlueprintIds.includes(blueprint.id)),
          );
          return (
            <article className="card implementer-card" key={partner.id}>
              <div className="row between">
                <Logo initials={partner.initials} color={partner.color} />
                <Badge>DEMO PROFILE</Badge>
              </div>
              <Link to={`/integrators/${partner.slug}`}>
                <h3>{partner.name} <ArrowRight size={16} /></h3>
              </Link>
              <p>{partner.description}</p>
              <div className="implementer-facts">
                <span><MapPin size={14} /> {partner.region}</span>
                <span><ClipboardCheck size={14} /> {records.length} linked implementation record{records.length === 1 ? "" : "s"}</span>
                <span><ShieldCheck size={14} /> {maintained.length} linked Blueprint{maintained.length === 1 ? "" : "s"}</span>
              </div>
              <div className="tags">
                {partner.specialties.map((specialty) => <span key={specialty}>{specialty}</span>)}
              </div>
              {!!records.length && (
                <div className="implementer-record-list">
                  <small>Demonstrated context in Oracnet</small>
                  {records.map((record) => (
                    <Link key={record.id} to={`/implementations/${record.slug}`}>
                      <span>{record.name}</span>
                      <EvidenceBadge level={record.verificationState} compact />
                    </Link>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!integrators.length && (
        <EmptyState
          title="No implementation partners yet"
          description="Profiles should become useful through demonstrated work and evidence, not self-reported expertise alone."
        />
      )}
    </>
  );
}
