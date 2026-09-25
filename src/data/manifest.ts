import { digest } from "./canonical";
import type {
  Blueprint,
  BlueprintConnection,
  BlueprintLicense,
  BlueprintRequirement,
  BlueprintStackItem,
  BlueprintVersion,
} from "./intelligence-model";
import type { Product, Provider } from "./model";
import { rightsCatalogue } from "./rights";

/**
 * Machine-readable Blueprint version manifest. Oracnet's relational model stays
 * canonical; CycloneDX and SPDX are export adapters for the parts those standards
 * describe well (components/services/dependencies/data flows; package identity,
 * licensing, external references). Business concepts such as capability slots stay
 * in Oracnet properties rather than being forced into either standard.
 */
export const MANIFEST_VERSION = "1.0";

export interface BlueprintManifest {
  manifestVersion: string;
  blueprint: { id: string; name: string; version: string; created: string; maintainer: string; demo: boolean };
  capabilitySlots: { slotId: string; capability: string; role: string; required: boolean; productId?: string; alternatives: string[]; configuration: string }[];
  components: { ref: string; productId: string; name: string; provider?: string; version?: string; website?: string }[];
  dependencies: { from: string; to: string; label: string }[];
  dataFlows: { from: string; to: string; data: string; crossesTrustBoundary: boolean }[];
  requirements: { type: string; description: string; required: boolean }[];
  license: { rights: string; label: string; text: string; commercialUse: boolean; attributionRequired: boolean };
  externalReferences: { type: string; url: string; label: string }[];
  lastValidation: string;
  compatibilityState: string;
  compatibilityNotes: string;
  changeNotes: string;
}

export function buildManifest(input: {
  blueprint: Blueprint;
  version: BlueprintVersion;
  items: BlueprintStackItem[];
  connections: BlueprintConnection[];
  requirements: BlueprintRequirement[];
  license?: BlueprintLicense;
  products: Product[];
  providers: Provider[];
}): BlueprintManifest {
  const { blueprint, version } = input;
  const items = input.items.filter((item) => item.blueprintVersionId === version.id);
  const ref = (productId: string) => `component:${productId}`;
  const productIds = [...new Set(items.flatMap((item) => (item.productId ? [item.productId] : [])))].sort();
  const bySlot = new Map(items.map((item) => [item.id, item]));
  return {
    manifestVersion: MANIFEST_VERSION,
    blueprint: {
      id: blueprint.id,
      name: blueprint.name,
      version: version.version,
      created: version.createdAt ?? version.lastValidatedAt,
      maintainer: blueprint.maintainerId,
      demo: blueprint.demo,
    },
    capabilitySlots: items.map((item) => ({
      slotId: item.id,
      capability: item.capabilityId,
      role: item.role,
      required: item.required,
      productId: item.productId,
      alternatives: item.alternativeProductIds,
      configuration: item.configurationRequirements,
    })),
    components: productIds.map((productId) => {
      const product = input.products.find((candidate) => candidate.id === productId);
      const provider = input.providers.find((candidate) => candidate.id === product?.providerId);
      return {
        ref: ref(productId),
        productId,
        name: product?.name ?? productId,
        provider: provider?.name,
        version: items.find((item) => item.productId === productId)?.version,
        website: provider?.website || undefined,
      };
    }),
    dependencies: input.connections
      .filter((edge) => edge.blueprintVersionId === version.id)
      .flatMap((edge) => {
        const from = bySlot.get(edge.fromItemId)?.productId;
        const to = bySlot.get(edge.toItemId)?.productId;
        return from && to ? [{ from: ref(from), to: ref(to), label: edge.label }] : [];
      }),
    dataFlows: input.connections
      .filter((edge) => edge.blueprintVersionId === version.id)
      .flatMap((edge) => {
        const from = bySlot.get(edge.fromItemId)?.productId;
        const to = bySlot.get(edge.toItemId)?.productId;
        return from && to ? [{ from: ref(from), to: ref(to), data: edge.dataFlow, crossesTrustBoundary: edge.trustBoundary }] : [];
      }),
    requirements: input.requirements.filter((item) => item.blueprintId === blueprint.id).map((item) => ({ type: item.type, description: item.description, required: item.required })),
    license: {
      rights: blueprint.reuseRights,
      label: rightsCatalogue[blueprint.reuseRights].label,
      text: input.license?.licenseText ?? blueprint.license,
      commercialUse: blueprint.commercialUseAllowed,
      attributionRequired: input.license?.attributionRequired ?? false,
    },
    externalReferences: version.externalReferences ?? [],
    lastValidation: version.lastValidatedAt,
    compatibilityState: version.compatibilityState,
    compatibilityNotes: version.compatibilityNotes ?? "",
    changeNotes: version.changeNotes,
  };
}

function uuidFromDigest(value: string) {
  const hex = value.slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** CycloneDX 1.7 JSON. Third-party SaaS products are modelled as `services`. */
export function toCycloneDx(manifest: BlueprintManifest) {
  const serial = uuidFromDigest(digest(manifest));
  const blueprintRef = `blueprint:${manifest.blueprint.id}@${manifest.blueprint.version}`;
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.7",
    serialNumber: `urn:uuid:${serial}`,
    version: 1,
    metadata: {
      timestamp: manifest.blueprint.created,
      tools: { components: [{ type: "application", name: "oracnet-blueprint-manifest", version: manifest.manifestVersion }] },
      component: {
        type: "application",
        "bom-ref": blueprintRef,
        name: manifest.blueprint.name,
        version: manifest.blueprint.version,
        licenses: [{ license: { name: `${manifest.license.label}: ${manifest.license.text}` } }],
        properties: [
          { name: "oracnet:reuseRights", value: manifest.license.rights },
          { name: "oracnet:commercialUse", value: String(manifest.license.commercialUse) },
          { name: "oracnet:compatibilityState", value: manifest.compatibilityState },
          { name: "oracnet:lastValidation", value: manifest.lastValidation },
          { name: "oracnet:demo", value: String(manifest.blueprint.demo) },
        ],
      },
    },
    services: manifest.components.map((component) => ({
      "bom-ref": component.ref,
      name: component.name,
      ...(component.version ? { version: component.version } : {}),
      ...(component.provider ? { provider: { name: component.provider, ...(component.website ? { url: [component.website] } : {}) } } : {}),
      data: manifest.dataFlows
        .filter((flow) => flow.from === component.ref || flow.to === component.ref)
        .map((flow) => ({
          flow: flow.from === component.ref ? "outbound" : "inbound",
          classification: flow.crossesTrustBoundary ? "crosses-trust-boundary" : "internal",
          name: flow.data,
        })),
      properties: manifest.capabilitySlots
        .filter((slot) => slot.productId === component.productId)
        .map((slot) => ({ name: "oracnet:capabilitySlot", value: `${slot.capability} (${slot.role})` })),
    })),
    dependencies: [
      { ref: blueprintRef, dependsOn: manifest.components.map((component) => component.ref) },
      ...manifest.components.map((component) => ({
        ref: component.ref,
        dependsOn: [...new Set(manifest.dependencies.filter((edge) => edge.from === component.ref).map((edge) => edge.to))],
      })),
    ],
    externalReferences: manifest.externalReferences.map((reference) => ({ type: reference.type, url: reference.url, comment: reference.label })),
  };
}

/** SPDX 2.3 JSON for identity, licensing and relationships. SaaS licenses are NOASSERTION. */
export function toSpdx(manifest: BlueprintManifest) {
  const spdxId = (value: string) => `SPDXRef-${value.replace(/[^A-Za-z0-9.-]/g, "-")}`;
  const root = spdxId(`Blueprint-${manifest.blueprint.id}`);
  const declared = manifest.license.rights === "open-source" ? "NOASSERTION" : `LicenseRef-Oracnet-${manifest.license.rights}`;
  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: `${manifest.blueprint.name} ${manifest.blueprint.version}`,
    documentNamespace: `https://bt3113.github.io/OCNET/spdx/${manifest.blueprint.id}/${manifest.blueprint.version}/${digest(manifest).slice(0, 16)}`,
    creationInfo: { created: `${manifest.blueprint.created.slice(0, 10)}T00:00:00Z`, creators: [`Tool: oracnet-blueprint-manifest-${manifest.manifestVersion}`] },
    documentDescribes: [root],
    packages: [
      {
        SPDXID: root,
        name: manifest.blueprint.name,
        versionInfo: manifest.blueprint.version,
        downloadLocation: "NOASSERTION",
        filesAnalyzed: false,
        licenseConcluded: "NOASSERTION",
        licenseDeclared: declared,
        copyrightText: "NOASSERTION",
        comment: `${manifest.license.label}. ${manifest.license.text}`,
      },
      ...manifest.components.map((component) => ({
        SPDXID: spdxId(component.productId),
        name: component.name,
        ...(component.version ? { versionInfo: component.version } : {}),
        supplier: component.provider ? `Organization: ${component.provider}` : "NOASSERTION",
        downloadLocation: "NOASSERTION",
        filesAnalyzed: false,
        licenseConcluded: "NOASSERTION",
        licenseDeclared: "NOASSERTION",
        copyrightText: "NOASSERTION",
        ...(component.website ? { externalRefs: [{ referenceCategory: "OTHER", referenceType: "website", referenceLocator: component.website }] } : {}),
      })),
    ],
    hasExtractedLicensingInfos: declared.startsWith("LicenseRef")
      ? [{ licenseId: declared, name: manifest.license.label, extractedText: manifest.license.text }]
      : [],
    relationships: [
      { spdxElementId: "SPDXRef-DOCUMENT", relationshipType: "DESCRIBES", relatedSpdxElement: root },
      ...manifest.components.map((component) => ({ spdxElementId: root, relationshipType: "DEPENDS_ON", relatedSpdxElement: spdxId(component.productId) })),
    ],
  };
}

export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
