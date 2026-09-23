import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  X,
  Search,
  Bookmark,
  Scale,
  Plus,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Bot,
  Users,
  Workflow,
  Database,
  Cpu,
  Scan,
  Radio,
  Video,
  Settings,
  Headphones,
  ShoppingBag,
  Box,
  ChartNoAxesColumn,
  ExternalLink,
} from "lucide-react";
import type {
  Product,
  Provider,
  UseCase,
  Category,
  SolutionStack,
} from "../data/model";
import { useActions, useRecords, useUI } from "../state";
export const icons = {
  Sparkles,
  Bot,
  Users,
  Workflow,
  Database,
  Cpu,
  Scan,
  Radio,
  Video,
  Settings,
  Headphones,
  ShoppingBag,
  Box,
  ChartNoAxesColumn,
};
export function Icon({ name, size = 23 }: { name: string; size?: number }) {
  const C = icons[name as keyof typeof icons] || Sparkles;
  return <C size={size} strokeWidth={1.7} />;
}
export function ButtonLink({
  to,
  children,
  variant = "dark",
}: {
  to: string;
  children: ReactNode;
  variant?: string;
}) {
  return (
    <Link className={"button " + variant} to={to}>
      {children}
    </Link>
  );
}
export function SectionTitle({
  title,
  to,
  label = "View all",
}: {
  title: string;
  to?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {to && (
        <Link to={to}>
          {label}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Badge({ children = "Demo" }: { children?: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Logo({
  initials,
  color = "dark",
}: {
  initials: string;
  color?: string;
}) {
  return <span className={"logo-tile " + color}>{initials}</span>;
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted">
            {description || "Review the details below."}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  description = "Explore the marketplace to find your next opportunity.",
  to = "/explore",
  action = "Explore technologies",
}: {
  title?: string;
  description?: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="empty-state card">
      <Search size={32} />
      <h2>{title}</h2>
      <p>{description}</p>
      <ButtonLink to={to}>
        {action}
        <ArrowRight size={17} />
      </ButtonLink>
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="empty-state card">
      <h2>We couldn’t load this view</h2>
      <p>Check your connection or configuration and try again.</p>
      <button className="button dark" onClick={retry}>
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-grid" aria-label="Loading content" role="status">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton card" />
      ))}
    </div>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { name: string; to?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <Link to="/">Home</Link>
      {items.map((x, i) => (
        <span key={i}>/ {x.to ? <Link to={x.to}>{x.name}</Link> : x.name}</span>
      ))}
    </nav>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="tabs" role="tablist" aria-label="Content sections">
      {items.map((item) => (
        <button
          role="tab"
          key={item}
          aria-selected={value === item}
          onClick={() => onChange(item)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              const next =
                (items.indexOf(item) +
                  (e.key === "ArrowRight" ? 1 : -1) +
                  items.length) %
                items.length;
              onChange(items[next]);
              (
                e.currentTarget.parentElement?.children[next] as HTMLElement
              )?.focus();
            }
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
export function Pagination({
  page,
  count,
  onChange,
}: {
  page: number;
  count: number;
  onChange: (page: number) => void;
}) {
  return count > 1 ? (
    <nav aria-label="Pagination" className="pagination">
      <button
        className="icon-button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={18} />
      </button>
      <span>
        Page {page} of {count}
      </span>
      <button
        className="icon-button"
        disabled={page === count}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  ) : null;
}
export function SaveButton({
  id,
  name,
  type = "products",
}: {
  id: string;
  name: string;
  type?: string;
}) {
  const { data = [] } = useRecords("saved_items");
  const actions = useActions();
  const { notify } = useUI();
  const active = data.some((s) => s.entityId === id);
  return (
    <button
      className={"icon-button " + (active ? "selected" : "")}
      aria-label={(active ? "Unsave " : "Save ") + name}
      aria-pressed={active}
      onClick={() =>
        void (async () => {
          if (active) await actions.remove("saved_items", id);
          else
            await actions.save("saved_items", {
              id,
              name,
              entityId: id,
              entityType: type,
              provenance: "demo",
            });
          notify(active ? "Removed from saved" : "Added to your saved items");
        })().catch(() => {})
      }
    >
      <Bookmark size={18} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
export function CompareButton({ product }: { product: Product }) {
  const { data = [] } = useRecords("comparisons");
  const actions = useActions();
  const { notify } = useUI();
  const ids = data.find((x) => x.id === "current")?.productIds ?? [];
  const active = ids.includes(product.id);
  return (
    <button
      className={"icon-button " + (active ? "selected" : "")}
      aria-label={
        (active ? "Remove from comparison " : "Compare ") + product.name
      }
      aria-pressed={active}
      onClick={() => {
        if (!active && ids.length >= 4) {
          notify("Compare up to four technologies at a time.");
          return;
        }
        void actions
          .save("comparisons", {
            id: "current",
            name: "My comparison",
            productIds: active
              ? ids.filter((x) => x !== product.id)
              : [...ids, product.id],
            provenance: "demo",
          })
          .then(() =>
            notify(active ? "Removed from comparison" : "Added to comparison"),
          )
          .catch(() => {});
      }}
    >
      <Scale size={18} />
    </button>
  );
}
export function TechnologyCard({ product: p }: { product: Product }) {
  return (
    <article className="card technology-card">
      <div className="row between">
        <Logo initials={p.initials} color={p.color} />
        <div className="row">
          <SaveButton id={p.id} name={p.name} />
          <CompareButton product={p} />
        </div>
      </div>
      <Badge />
      <Link to={"/technologies/" + p.slug}>
        <h3>
          {p.name}
          <ArrowRight size={17} />
        </h3>
      </Link>
      <p>{p.description}</p>
      <div className="tags">
        <span>{p.deployment}</span>
        <span>{p.capabilityIds[0]}</span>
      </div>
      <div className="card-foot">
        <span>Not yet rated</span>
        <strong>{p.pricing}</strong>
      </div>
    </article>
  );
}
export function ProviderCard({
  provider: p,
  compact = false,
  type = "providers",
}: {
  provider: Provider;
  compact?: boolean;
  type?: string;
}) {
  const { setContact } = useUI();
  return (
    <article className={compact ? "provider-row" : "card provider-card"}>
      <Logo initials={p.initials} color={p.color} />
      <Link to={"/" + type + "/" + p.slug} className="provider-copy">
        <h3>{p.name}</h3>
        <p>{p.description}</p>
        {!compact && (
          <div className="tags">
            <span>{p.region}</span>
            <span>Demo profile</span>
          </div>
        )}
      </Link>
      {compact ? (
        <button
          className="icon-button"
          aria-label={"Contact " + p.name}
          onClick={() => setContact(p)}
        >
          <Plus size={16} />
        </button>
      ) : (
        <div className="row">
          <SaveButton id={p.id} name={p.name} type={type} />
          <button className="button light" onClick={() => setContact(p)}>
            Contact
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </article>
  );
}
export function UseCaseCard({ item: u }: { item: UseCase }) {
  return (
    <Link to={"/use-cases/" + u.slug} className="card usecase-card">
      <span className={"category-icon " + u.color}>
        <Icon name={u.icon} />
      </span>
      <div>
        <h3>
          {u.id === "product-video-website"
            ? "Automate product video production"
            : u.name}
        </h3>
        <p>{u.description}</p>
        <small>Explore solution stack</small>
      </div>
      <span className="round-arrow">
        <ArrowRight size={17} />
      </span>
    </Link>
  );
}
export function CategoryCard({ item: c }: { item: Category }) {
  return (
    <Link to={"/categories/" + c.slug} className="card category-card">
      <span className={"category-icon " + c.color}>
        <Icon name={c.icon} />
      </span>
      <h3>{c.name}</h3>
      <p>{c.description}</p>
      <small>
        Explore category
        <ArrowRight size={14} />
      </small>
    </Link>
  );
}
export function SolutionStackCard({ stack: s }: { stack: SolutionStack }) {
  return (
    <Link to={"/solution-stacks/" + s.slug} className="card stack-card">
      <span className="category-icon sand">
        <Workflow />
      </span>
      <Badge>Illustrative stack</Badge>
      <h3>{s.name}</h3>
      <p>{s.description}</p>
      <div className="card-foot">
        {s.items.length} capabilities
        <ArrowRight size={18} />
      </div>
    </Link>
  );
}
export function StackVisualizer({
  stack,
  products,
}: {
  stack: SolutionStack;
  products: Product[];
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  return (
    <div className="stack-visualizer">
      {stack.items.map((item, i) => {
        const p = products.find(
          (p) => p.id === (selected[item.capabilityId] || item.productId),
        );
        return p ? (
          <div className="stack-step card" key={item.capabilityId}>
            <span className="step-number">{i + 1}</span>
            <div className="stack-step-body">
              <small>{item.capabilityId.toUpperCase()}</small>
              <Link to={"/technologies/" + p.slug} className="row">
                <Logo initials={p.initials} color={p.color} />
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                </div>
                <ExternalLink size={16} />
              </Link>
              <label className="alternative-label">
                Supplier alternative
                <select
                  value={p.id}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      [item.capabilityId]: e.target.value,
                    })
                  }
                >
                  {[item.productId, ...item.alternativeIds].map((id) => (
                    <option key={id} value={id}>
                      {products.find((x) => x.id === id)?.name}
                    </option>
                  ))}
                </select>
              </label>
              <small>Compatibility unverified · validate with supplier</small>
            </div>
            <SaveButton id={p.id} name={p.name} />
          </div>
        ) : null;
      })}
      <div className="notice">
        <ShieldCheck size={20} />
        <p>
          This is a sample architecture, not a verified integration or a
          recommendation to purchase. Confirm technical fit with your chosen
          providers.
        </p>
      </div>
    </div>
  );
}
export function MediaGallery() {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const files = ["workspace.svg", "product.svg"];
  return (
    <div className="media-gallery">
      <button
        onClick={() => setOpen(true)}
        aria-label="Enlarge illustrative product preview"
      >
        <img
          loading="lazy"
          src={import.meta.env.BASE_URL + "media/" + files[index]}
          alt="Illustrative demo preview, not an actual vendor screenshot"
        />
      </button>
      <div className="row">
        {files.map((f, i) => (
          <button
            key={f}
            className={"thumbnail " + (index === i ? "active" : "")}
            onClick={() => setIndex(i)}
            aria-label={"Select preview " + (i + 1)}
          >
            <img src={import.meta.env.BASE_URL + "media/" + f} alt="" />
          </button>
        ))}
        <small>Original illustrations · Demo media</small>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Demo media preview"
        description="An original illustrative asset, not an actual product screenshot."
      >
        <img
          className="full-image"
          src={import.meta.env.BASE_URL + "media/" + files[index]}
          alt="Demo media preview"
        />
      </Modal>
    </div>
  );
}
export function ReviewCard({
  name,
  body,
  rating,
}: {
  name: string;
  body: string;
  rating: number;
}) {
  return (
    <article className="card">
      <div className="row between">
        <h3>{name}</h3>
        <Badge>Community supplied</Badge>
      </div>
      <p aria-label={rating + " out of 5"}>
        {"★".repeat(rating)}
        {"☆".repeat(5 - rating)}
      </p>
      <p>{body}</p>
    </article>
  );
}
export function DataTable({
  headings,
  rows,
}: {
  headings: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="data-table card">
      <table>
        <thead>
          <tr>
            {headings.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} data-label={headings[j]}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function CheckLine({ children }: { children: ReactNode }) {
  return (
    <p className="check-line">
      <Check size={17} />
      {children}
    </p>
  );
}
