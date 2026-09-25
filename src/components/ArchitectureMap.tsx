import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, List, Maximize2, Minus, Network, Plus, ShieldAlert } from "lucide-react";
import type { EvidenceLevel, TechnologyRelationship } from "../data/intelligence-model";
import type { Product } from "../data/model";
import { relationshipBetween } from "../data/fingerprint";
import { capabilityLabel } from "../data/taxonomy";
import { EvidenceBadge, RelationshipTypeBadge } from "./intelligence";

export interface MapNode {
  id: string;
  productId?: string;
  capabilityId: string;
  role: string;
  evidenceLevel?: EvidenceLevel;
  alternatives?: string[];
}
export interface MapEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  dataFlow: string;
  trustBoundary: boolean;
}

const W = 196;
const H = 74;
const GX = 96;
const GY = 30;
const PAD = 24;

function layout(nodes: MapNode[], edges: MapEdge[]) {
  const depth = new Map(nodes.map((node) => [node.id, 0]));
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    for (const edge of edges) {
      const next = (depth.get(edge.from) ?? 0) + 1;
      if (depth.has(edge.to) && next > (depth.get(edge.to) ?? 0) && next < nodes.length) {
        depth.set(edge.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const columns = new Map<number, MapNode[]>();
  for (const node of nodes) columns.set(depth.get(node.id)!, [...(columns.get(depth.get(node.id)!) ?? []), node]);
  const tallest = Math.max(...[...columns.values()].map((column) => column.length), 1);
  const positions = new Map<string, { x: number; y: number }>();
  for (const [column, members] of columns) {
    const offset = ((tallest - members.length) * (H + GY)) / 2;
    members.forEach((node, row) => positions.set(node.id, { x: PAD + column * (W + GX), y: PAD + offset + row * (H + GY) }));
  }
  return {
    positions,
    width: PAD * 2 + columns.size * W + (columns.size - 1) * GX,
    height: PAD * 2 + tallest * H + (tallest - 1) * GY,
  };
}

export default function ArchitectureMap({
  nodes,
  edges,
  products,
  relationships,
  kind,
  title,
}: {
  nodes: MapNode[];
  edges: MapEdge[];
  products: Product[];
  relationships: TechnologyRelationship[];
  kind: "observed" | "reference";
  title: string;
}) {
  const { positions, width, height } = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const [view, setView] = useState<"graph" | "list">("graph");
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<{ type: "node" | "edge"; id: string } | null>(nodes[0] ? { type: "node", id: nodes[0].id } : null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const product = (id?: string) => products.find((item) => item.id === id);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 700px)").matches) setView("list");
  }, []);

  const zoom = (factor: number) => setScale((value) => Math.min(2, Math.max(0.5, Number((value * factor).toFixed(2)))));
  const fit = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = 40;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (event.target !== event.currentTarget) return;
    if (moves[event.key]) {
      event.preventDefault();
      setPan((value) => ({ x: value.x + moves[event.key][0], y: value.y + moves[event.key][1] }));
    } else if (event.key === "+" || event.key === "=") zoom(1.2);
    else if (event.key === "-") zoom(1 / 1.2);
    else if (event.key === "0") fit();
  };
  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest("[data-selectable]")) return;
    drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    setPan({ x: drag.current.px + (event.clientX - drag.current.x) / scale, y: drag.current.py + (event.clientY - drag.current.y) / scale });
  };
  const selectKey = (type: "node" | "edge", id: string) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected({ type, id });
    }
  };

  const selectedNode = selected?.type === "node" ? nodes.find((node) => node.id === selected.id) : undefined;
  const selectedEdge = selected?.type === "edge" ? edges.find((edge) => edge.id === selected.id) : undefined;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeRelationship = (edge: MapEdge) => {
    const from = nodeById.get(edge.from)?.productId;
    const to = nodeById.get(edge.to)?.productId;
    return from && to ? relationshipBetween(relationships, from, to) : undefined;
  };
  const kindLabel = kind === "observed" ? "Observed implementation" : "Reference Blueprint";

  return (
    <section className={`card architecture-map architecture-${kind}`} aria-label={`${title} — ${kindLabel.toLowerCase()} architecture`}>
      <div className="architecture-map-head">
        <div>
          <span className="eyebrow">{kind === "observed" ? "OBSERVED IMPLEMENTATION" : "REFERENCE BLUEPRINT"}</span>
          <h3>{title}</h3>
          <p className="muted">
            {kind === "observed"
              ? "What was recorded as deployed. Solid outlines = recorded components."
              : "A reusable pattern. Dashed outlines = capability slots that can take alternatives."}
          </p>
        </div>
        <div className="architecture-map-tools" role="group" aria-label="Architecture view controls">
          <button type="button" className="icon-button" aria-pressed={view === "graph"} onClick={() => setView("graph")} aria-label="Graph view">
            <Network size={17} />
          </button>
          <button type="button" className="icon-button" aria-pressed={view === "list"} onClick={() => setView("list")} aria-label="List view">
            <List size={17} />
          </button>
          {view === "graph" && (
            <>
              <button type="button" className="icon-button" onClick={() => zoom(1.2)} aria-label="Zoom in"><Plus size={17} /></button>
              <button type="button" className="icon-button" onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><Minus size={17} /></button>
              <button type="button" className="icon-button" onClick={fit} aria-label="Fit to view"><Maximize2 size={16} /></button>
            </>
          )}
        </div>
      </div>

      {view === "graph" ? (
        <div
          className="architecture-canvas"
          tabIndex={0}
          role="application"
          aria-roledescription="architecture diagram"
          aria-label="Architecture diagram. Arrow keys pan, plus and minus zoom, 0 fits. Tab to components and connections, Enter to inspect."
          onKeyDown={onKey}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            style={{ minHeight: Math.min(height, 420) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerLeave={() => (drag.current = null)}
            onWheel={(event) => {
              if (event.ctrlKey || event.metaKey) zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1);
            }}
          >
            <defs>
              <marker id={`arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#8a847a" />
              </marker>
            </defs>
            <g transform={`translate(${width / 2} ${height / 2}) scale(${scale}) translate(${-width / 2 + pan.x} ${-height / 2 + pan.y})`}>
              {edges.map((edge) => {
                const a = positions.get(edge.from);
                const b = positions.get(edge.to);
                if (!a || !b) return null;
                const x1 = a.x + W;
                const y1 = a.y + H / 2;
                const x2 = b.x;
                const y2 = b.y + H / 2;
                const backwards = x2 <= x1;
                const path = backwards
                  ? `M${a.x + W / 2},${a.y + H} C${a.x + W / 2},${a.y + H + 40} ${b.x + W / 2},${b.y + H + 40} ${b.x + W / 2},${b.y + H}`
                  : `M${x1},${y1} C${x1 + GX / 2},${y1} ${x2 - GX / 2},${y2} ${x2},${y2}`;
                // Label at t=0.7 along the curve so fan-out labels separate by target.
                const t = 0.7;
                const bez = (p0: number, p1: number, p2: number, p3: number) =>
                  (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3;
                const mx = backwards ? (a.x + b.x + W) / 2 : bez(x1, x1 + GX / 2, x2 - GX / 2, x2);
                const my = backwards ? Math.max(a.y, b.y) + H + 30 : bez(y1, y1, y2, y2);
                const active = selected?.type === "edge" && selected.id === edge.id;
                return (
                  <g
                    key={edge.id}
                    data-selectable
                    tabIndex={0}
                    role="button"
                    aria-label={`Connection ${edge.label}${edge.trustBoundary ? ", crosses a trust boundary" : ""}`}
                    aria-pressed={active}
                    className={`map-edge ${active ? "active" : ""} ${edge.trustBoundary ? "boundary" : ""}`}
                    onClick={() => setSelected({ type: "edge", id: edge.id })}
                    onKeyDown={selectKey("edge", edge.id)}
                  >
                    <path d={path} fill="none" markerEnd={`url(#arrow-${kind})`} />
                    <path d={path} fill="none" className="map-edge-hit" />
                    <g transform={`translate(${mx} ${my})`}>
                      <rect x={-54} y={-11} width={108} height={22} rx={11} />
                      <text textAnchor="middle" dy="4">{edge.label.length > 18 ? `${edge.label.slice(0, 17)}…` : edge.label}</text>
                      {edge.trustBoundary && <circle cx={50} cy={-9} r={5} className="boundary-dot" />}
                    </g>
                  </g>
                );
              })}
              {nodes.map((node) => {
                const position = positions.get(node.id)!;
                const item = product(node.productId);
                const active = selected?.type === "node" && selected.id === node.id;
                return (
                  <g
                    key={node.id}
                    data-selectable
                    tabIndex={0}
                    role="button"
                    aria-pressed={active}
                    aria-label={`${capabilityLabel(node.capabilityId)}: ${item?.name ?? node.productId ?? "unassigned"} (${node.role})`}
                    className={`map-node ${active ? "active" : ""}`}
                    transform={`translate(${position.x} ${position.y})`}
                    onClick={() => setSelected({ type: "node", id: node.id })}
                    onKeyDown={selectKey("node", node.id)}
                  >
                    <rect width={W} height={H} rx={14} />
                    <text x={14} y={22} className="map-node-cap">{capabilityLabel(node.capabilityId).toUpperCase().slice(0, 26)}</text>
                    <text x={14} y={44} className="map-node-name">{(item?.name ?? node.productId ?? "Unassigned").slice(0, 22)}</text>
                    <text x={14} y={62} className="map-node-role">{node.role.slice(0, 30)}</text>
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="architecture-legend" aria-hidden="true">
            <span><i className="legend-boundary" /> Crosses a trust boundary (data leaves the business)</span>
            <span>Drag, arrow keys or buttons to move · Ctrl/⌘ + scroll to zoom</span>
          </div>
        </div>
      ) : (
        <ArchitectureList nodes={nodes} edges={edges} products={products} relationships={relationships} onSelect={setSelected} />
      )}

      <div className="architecture-inspector-panel" aria-live="polite">
        {selectedNode && (
          <div>
            <small>{capabilityLabel(selectedNode.capabilityId)} · {selectedNode.role}</small>
            <strong>{product(selectedNode.productId)?.name ?? selectedNode.productId ?? "Unassigned slot"}</strong>
            <p>{product(selectedNode.productId)?.description ?? "No catalogue entry."}</p>
            <div className="row wrap">
              {selectedNode.evidenceLevel && <EvidenceBadge level={selectedNode.evidenceLevel} compact />}
              {!!selectedNode.alternatives?.length && (
                <span className="muted">Alternatives recorded: {selectedNode.alternatives.map((id) => product(id)?.name ?? id).join(", ")}</span>
              )}
              {product(selectedNode.productId) && (
                <Link to={`/technologies/${product(selectedNode.productId)!.slug}`}>
                  Technology profile <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        )}
        {selectedEdge && (
          <div>
            <small>Connection · {nodeById.get(selectedEdge.from)?.role} → {nodeById.get(selectedEdge.to)?.role}</small>
            <strong>{selectedEdge.label}</strong>
            <p>Data: {selectedEdge.dataFlow}</p>
            {selectedEdge.trustBoundary && (
              <p className="boundary-note"><ShieldAlert size={15} /> Crosses a trust boundary: data is sent to a third-party service.</p>
            )}
            <RelationshipLine relationship={edgeRelationship(selectedEdge)} />
          </div>
        )}
      </div>
    </section>
  );
}

function RelationshipLine({ relationship }: { relationship?: TechnologyRelationship }) {
  if (!relationship) return <p className="muted">No typed relationship recorded between these products — compatibility is unknown.</p>;
  return (
    <div className="row wrap relationship-line">
      <RelationshipTypeBadge type={relationship.relationshipType} />
      <EvidenceBadge level={relationship.evidenceLevel} compact />
      <span className="muted">Last checked {relationship.lastCheckedAt}. {relationship.sourceLabel}</span>
    </div>
  );
}

export function ArchitectureList({
  nodes,
  edges,
  products,
  relationships,
  onSelect,
}: {
  nodes: MapNode[];
  edges: MapEdge[];
  products: Product[];
  relationships: TechnologyRelationship[];
  onSelect?: (value: { type: "node" | "edge"; id: string }) => void;
}) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const name = (node?: MapNode) => products.find((product) => product.id === node?.productId)?.name ?? node?.productId ?? "Unassigned";
  return (
    <div className="architecture-list">
      <h4>Components</h4>
      <ol>
        {nodes.map((node) => (
          <li key={node.id}>
            <button type="button" className="text-button" onClick={() => onSelect?.({ type: "node", id: node.id })}>
              <strong>{name(node)}</strong>
            </button>
            <span>{capabilityLabel(node.capabilityId)} · {node.role}</span>
          </li>
        ))}
      </ol>
      <h4>Connections</h4>
      <ol>
        {edges.map((edge) => {
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          const relationship = from?.productId && to?.productId ? relationshipBetween(relationships, from.productId, to.productId) : undefined;
          return (
            <li key={edge.id}>
              <button type="button" className="text-button" onClick={() => onSelect?.({ type: "edge", id: edge.id })}>
                <strong>{name(from)} → {name(to)}</strong>
              </button>
              <span>
                {edge.label}: {edge.dataFlow}
                {edge.trustBoundary ? " · crosses a trust boundary" : ""}
                {" · "}
                {relationship ? relationship.relationshipType.replaceAll("-", " ") : "relationship unknown"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
