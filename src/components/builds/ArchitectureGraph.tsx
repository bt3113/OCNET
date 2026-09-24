import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ZoomIn, ZoomOut, Maximize, List, Network } from "lucide-react";
import type { Build } from "../../data/build-model";
import { useRecords } from "../../state";
import { Logo, Badge } from "../ui";
export default function ArchitectureGraph({ build }: { build: Build }) {
  const { data: products = [] } = useRecords("products");
  const { data: providers = [] } = useRecords("providers");
  const { data: allBuilds = [] } = useRecords("builds");
  const [selected, setSelected] = useState(build.stack[0]?.id ?? "");
  const [zoom, setZoom] = useState(1);
  const [list, setList] = useState(false);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const pane = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const item = build.stack.find((s) => s.id === selected);
  const p = products.find((p) => p.id === (swaps[selected] || item?.productId));
  const provider = providers.find((v) => v.id === p?.providerId);
  const width = Math.max(680, ...build.stack.map((s) => s.x + 300));
  const height = Math.max(330, ...build.stack.map((s) => s.y + 150));
  return (
    <div className="architecture-shell">
      <div className="graph-toolbar">
        <div>
          <strong>Architecture explorer</strong>
          <small>Illustrative flow · validate every connection</small>
        </div>
        <div className="row">
          <button
            className="icon-button"
            aria-label="Zoom out"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.15))}
          >
            <ZoomOut size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Zoom in"
            onClick={() => setZoom(Math.min(1.8, zoom + 0.15))}
          >
            <ZoomIn size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Fit architecture"
            onClick={() => {
              setZoom(
                Math.min(1, (pane.current?.clientWidth ?? width) / width),
              );
              pane.current?.scrollTo(0, 0);
            }}
          >
            <Maximize size={18} />
          </button>
          <button className="button light" onClick={() => setList(!list)}>
            {list ? <Network size={16} /> : <List size={16} />}{" "}
            {list ? "Canvas" : "List"}
          </button>
        </div>
      </div>
      <div className="graph-columns">
        <div className={list ? "graph-list-only" : ""}>
          <div
            ref={pane}
            className="graph-canvas"
            tabIndex={0}
            role="region"
            aria-label="Architecture canvas. Arrow keys pan; use node buttons for details."
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              const directions: Record<string, [number, number]> = {
                ArrowLeft: [-60, 0],
                ArrowRight: [60, 0],
                ArrowUp: [0, -60],
                ArrowDown: [0, 60],
              };
              if (directions[e.key]) {
                e.preventDefault();
                e.currentTarget.scrollBy(...directions[e.key]);
              }
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                left: e.currentTarget.scrollLeft,
                top: e.currentTarget.scrollTop,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current) {
                e.currentTarget.scrollLeft =
                  drag.current.left - (e.clientX - drag.current.x);
                e.currentTarget.scrollTop =
                  drag.current.top - (e.clientY - drag.current.y);
              }
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <div style={{ width: width * zoom, height: height * zoom }}>
              <div
                className="graph-plane"
                style={{ width, height, transform: `scale(${zoom})` }}
              >
                <svg width={width} height={height} aria-hidden="true">
                  <defs>
                    <marker
                      id={"arrow-" + build.id}
                      markerWidth="10"
                      markerHeight="10"
                      refX="8"
                      refY="3"
                      orient="auto"
                    >
                      <path d="M0,0 L0,6 L9,3 z" fill="#b3a78e" />
                    </marker>
                  </defs>
                  {build.connections.map((c) => {
                    const from = build.stack.find((s) => s.id === c.fromId),
                      to = build.stack.find((s) => s.id === c.toId);
                    if (!from || !to) return null;
                    const x1 = from.x + 135,
                      y1 = from.y + 103,
                      x2 = to.x + 135,
                      y2 = to.y + 22;
                    return (
                      <g key={c.id}>
                        <path
                          d={`M${x1},${y1} C${x1},${y1 + 42} ${x2},${y2 - 40} ${x2},${y2}`}
                          stroke="#b3a78e"
                          strokeWidth="2"
                          fill="none"
                          markerEnd={`url(#arrow-${build.id})`}
                        />
                        <text
                          x={(x1 + x2) / 2 + 8}
                          y={(y1 + y2) / 2}
                          fontSize="10"
                          fill="#5e574b"
                        >
                          {c.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {build.stack.map((s) => {
                  const p = products.find(
                    (p) => p.id === (swaps[s.id] || s.productId),
                  );
                  return (
                    <button
                      key={s.id}
                      className={
                        "graph-node " + (selected === s.id ? "selected" : "")
                      }
                      style={{ left: s.x + 20, top: s.y + 22 }}
                      onClick={() => setSelected(s.id)}
                      aria-pressed={selected === s.id}
                    >
                      <Logo initials={p?.initials ?? "?"} color={p?.color} />
                      <span>
                        <small>{s.role}</small>
                        <strong>{p?.name ?? "Unknown component"}</strong>
                        {swaps[s.id] && <em>Exploratory swap</em>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <ol className="architecture-list">
            {build.stack.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelected(s.id)}
                  aria-pressed={selected === s.id}
                >
                  {s.role}:{" "}
                  {
                    products.find((p) => p.id === (swaps[s.id] || s.productId))
                      ?.name
                  }
                </button>
                <ul>
                  {build.connections
                    .filter((c) => c.fromId === s.id)
                    .map((c) => (
                      <li key={c.id}>
                        {c.label} →{" "}
                        {build.stack.find((s) => s.id === c.toId)?.role}
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
        <aside className="node-detail">
          {p && item ? (
            <>
              <Badge>COMPONENT DETAILS</Badge>
              <h3>{p.name}</h3>
              <p>{item.role}</p>
              <p>{item.notes}</p>
              <Link to={"/technologies/" + p.slug}>View technology →</Link>
              {provider && (
                <Link to={"/providers/" + provider.slug}>
                  Provider: {provider.name} →
                </Link>
              )}
              <label>
                Explore an alternative
                <select
                  value={swaps[selected] || item.productId}
                  onChange={(e) =>
                    setSwaps({ ...swaps, [selected]: e.target.value })
                  }
                >
                  {products
                    .filter(
                      (x) =>
                        x.id === item.productId ||
                        item.alternativeIds.includes(x.id) ||
                        x.capabilityIds.some((c) =>
                          p.capabilityIds.includes(c),
                        ),
                    )
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
              </label>
              <small>
                Swaps are exploratory. Compatibility is not guaranteed. Remix
                the blueprint to save changes.
              </small>
              <h4>Related builds</h4>
              {allBuilds
                .filter(
                  (b) =>
                    b.visibility === "public" &&
                    b.moderation === "approved" &&
                    b.id !== build.id &&
                    b.stack.some((s) => s.productId === p.id),
                )
                .slice(0, 3)
                .map((b) => (
                  <Link key={b.id} to={"/builds/" + b.slug}>
                    {b.name} →
                  </Link>
                ))}
            </>
          ) : (
            <p>Select a component to explore its role.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
