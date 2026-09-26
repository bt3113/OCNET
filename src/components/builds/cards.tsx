import { BuildImage } from "./BuildImage";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  GitFork,
  Share2,
  Scale,
  FolderPlus,
  Plus,
  Check,
} from "lucide-react";
import type { Build, CreatorProfile } from "../../data/build-model";
import { useActions, useRecords, useUI } from "../../state";
import { Badge, ButtonLink, Logo, Modal, SaveButton } from "../ui";
import { safeUrl } from "../../data/build-domain";
export const assetUrl = (url: string) =>
  url.startsWith("media/") ? import.meta.env.BASE_URL + url : url;
export function BuildCard({
  build,
  variant = "grid",
}: {
  build: Build;
  variant?: "featured" | "grid" | "compact" | "horizontal" | "search";
}) {
  const { data: creators = [] } = useRecords("creator_profiles");
  const { data: products = [] } = useRecords("products");
  const { data: useCases = [] } = useRecords("use_cases");
  const primaryUseCase = useCases.find((useCase) => useCase.id === build.useCaseIds[0]);
  const [preview, setPreview] = useState(false);
  const [share, setShare] = useState(false);
  const creator = creators.find((c) => c.id === build.creatorId);
  const cover = build.media.find((m) => m.type === "image");
  return (
    <article className={`build-card ${variant}`}>
      <Link className="build-cover" to={"/builds/" + build.slug}>
        {cover ? (
          <BuildImage
            loading="lazy"
            src={assetUrl(cover.url)}
            alt={cover.alt}
          />
        ) : (
          <div className="build-cover-empty">
            <GitFork size={40} />
            <span>Blueprint in progress</span>
          </div>
        )}
        <span className="build-cover-label">
          {build.provenance === "demo" ? "ILLUSTRATIVE BUILD" : "BUILD"}
        </span>
      </Link>
      <div className="build-card-body">
        <div className="row between">
          <span className="eyebrow build-card-use-case">{primaryUseCase?.name ?? (build.industry || "New Build")}</span>
          <SaveButton id={build.id} name={build.name} type="builds" />
        </div>
        <h3>
          <Link to={"/builds/" + build.slug}>{build.name}</Link>
        </h3>
        <p>{build.tagline}</p>
        <Link
          className="creator-byline"
          to={"/solution-providers/" + (creator?.slug ?? "")}
        >
          <span className={"mini-avatar " + (creator?.color ?? "sand")}>
            {creator?.name.slice(0, 1) ?? "C"}
          </span>
          Built by {creator?.name ?? "a Solution Provider"}
        </Link>
        <div className="stack-chips">
          {build.stack.slice(0, 4).map((s) => {
            const p = products.find((p) => p.id === s.productId);
            return p ? (
              <Link key={s.id} to={"/technologies/" + p.slug}>
                <span className={"chip-logo " + p.color}>{p.initials}</span>
                {p.name}
              </Link>
            ) : null;
          })}
        </div>
        <div className="build-card-foot">
          <span>
            {build.cloneAllowed ? (
              <>
                <GitFork size={14} />
                Blueprint remix
              </>
            ) : (
              "Showcase only"
            )}
          </span>
          <div className="row">
            <button
              className="icon-button"
              aria-label={"Preview " + build.name}
              onClick={() => setPreview(true)}
            >
              <Eye size={17} />
            </button>
            <button
              className="icon-button"
              aria-label={"Share " + build.name}
              onClick={() => setShare(true)}
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title={build.name}
        description={build.tagline}
      >
        {cover && (
          <BuildImage
            className="quick-cover"
            src={assetUrl(cover.url)}
            alt={cover.alt}
          />
        )}
        <Badge>{build.provenance}</Badge>
        <p>{build.description}</p>
        <div className="row wrap">
          <ButtonLink to={"/builds/" + build.slug}>
            Explore build <ArrowRight size={16} />
          </ButtonLink>
          <SaveButton id={build.id} name={build.name} type="builds" />
        </div>
      </Modal>
      <ShareDialog build={build} open={share} close={() => setShare(false)} />
    </article>
  );
}
export function ShareDialog({
  build,
  open,
  close,
}: {
  build: Build;
  open: boolean;
  close: () => void;
}) {
  const { notify } = useUI();
  const url =
    window.location.origin + import.meta.env.BASE_URL + "builds/" + build.slug;
  return (
    <Modal
      open={open}
      onClose={close}
      title="Share this build"
      description="Share the implementation context, with attribution to its creator."
    >
      <label>
        Permanent link
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <div className="row wrap">
        <button
          className="button dark"
          onClick={() =>
            void navigator.clipboard
              .writeText(url)
              .then(() => notify("Build link copied"))
              .catch(() => notify("Select and copy the link above."))
          }
        >
          Copy link
        </button>
        {typeof navigator.share === "function" && (
          <button
            className="button light"
            onClick={() =>
              void navigator
                .share({ title: build.name, text: build.tagline, url })
                .catch(() => {})
            }
          >
            Share…
          </button>
        )}
        <a
          className="button light"
          href={
            "https://twitter.com/intent/tweet?text=" +
            encodeURIComponent(build.name + " — " + build.tagline) +
            "&url=" +
            encodeURIComponent(url)
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on X
        </a>
        <a
          className="button light"
          href={
            "https://www.linkedin.com/sharing/share-offsite/?url=" +
            encodeURIComponent(url)
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
      </div>
    </Modal>
  );
}
export function CreatorCard({ creator }: { creator: CreatorProfile }) {
  return (
    <article className="card creator-card">
      <div className="row between">
        <Logo
          initials={creator.name
            .split(" ")
            .map((s) => s[0])
            .join("")
            .slice(0, 2)}
          color={creator.color}
        />
        <Badge>{creator.provenance}</Badge>
      </div>
      <h3>
        <Link to={"/creators/" + creator.slug}>{creator.name}</Link>
      </h3>
      <p>{creator.headline}</p>
      <div className="tags">
        {creator.expertise.slice(0, 3).map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <div className="row between">
        <span className="availability">
          <i className={creator.available ? "available" : ""} />
          {creator.available ? "Open to enquiries" : "Sharing work"}
        </span>
        <Link
          className="icon-button"
          aria-label={"View " + creator.name}
          to={"/creators/" + creator.slug}
        >
          <ArrowRight size={18} />
        </Link>
      </div>
    </article>
  );
}
export function FollowButton({ creator }: { creator: CreatorProfile }) {
  const { userId, notify } = useUI();
  const { data: rows = [] } = useRecords("creator_follows");
  const actions = useActions();
  const existing = rows.find(
    (r) => r.ownerId === userId && r.creatorId === creator.id,
  );
  return (
    <button
      className="button light"
      aria-pressed={!!existing}
      onClick={() => {
        if (!userId) {
          notify("Sign in to follow a creator.");
          return;
        }
        void (
          existing
            ? actions.remove("creator_follows", existing.id)
            : actions.save("creator_follows", {
                id: crypto.randomUUID(),
                name: creator.name,
                ownerId: userId,
                creatorId: creator.id,
                provenance: "community supplied",
              })
        )
          .then(() =>
            notify(existing ? "Creator unfollowed" : "Following creator"),
          )
          .catch(() => {});
      }}
    >
      {existing ? <Check size={16} /> : <Plus size={16} />}{" "}
      {existing ? "Following" : "Follow creator"}
    </button>
  );
}
export function BuildCompareButton({ build }: { build: Build }) {
  const { userId, notify } = useUI();
  const { data: rows = [] } = useRecords("build_comparisons");
  const actions = useActions();
  const current = rows.find((r) => r.ownerId === userId);
  const ids = current?.buildIds ?? [];
  return (
    <button
      className="button light"
      aria-pressed={ids.includes(build.id)}
      onClick={() => {
        if (!userId) {
          notify("Sign in to compare builds.");
          return;
        }
        if (ids.length >= 3 && !ids.includes(build.id)) {
          notify("Compare up to three builds.");
          return;
        }
        void actions
          .save("build_comparisons", {
            id: current?.id ?? crypto.randomUUID(),
            name: "Build comparison",
            ownerId: userId,
            buildIds: ids.includes(build.id)
              ? ids.filter((x) => x !== build.id)
              : [...ids, build.id],
            provenance: "demo",
          })
          .then(() => notify("Build comparison updated"))
          .catch(() => {});
      }}
    >
      <Scale size={16} />
      {ids.includes(build.id) ? "Added to comparison" : "Compare build"}
    </button>
  );
}
export function CollectionPicker({
  entityId,
  entityType,
  name,
}: {
  entityId: string;
  entityType: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const { userId, notify } = useUI();
  const { data: collections = [] } = useRecords("collections");
  const { data: items = [] } = useRecords("collection_items");
  const actions = useActions();
  return (
    <>
      <button className="button light" onClick={() => setOpen(true)}>
        <FolderPlus size={16} />
        Collect
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add to a collection"
        description="Collections are private by default. Keep your research organized."
      >
        {collections
          .filter((c) => c.ownerId === userId)
          .map((c) => {
            const current = items.find(
              (i) => i.collectionId === c.id && i.entityId === entityId,
            );
            return (
              <button
                key={c.id}
                className="collection-option"
                aria-pressed={!!current}
                onClick={() =>
                  void (
                    current
                      ? actions.remove("collection_items", current.id)
                      : actions.save("collection_items", {
                          id: crypto.randomUUID(),
                          name,
                          entityId,
                          entityType,
                          collectionId: c.id,
                          ownerId: userId,
                          provenance: "demo",
                        })
                  )
                    .then(() =>
                      notify(
                        current
                          ? "Removed from collection"
                          : "Added to collection",
                      ),
                    )
                    .catch(() => {})
                }
              >
                {c.name}
                {current ? <Check size={18} /> : <Plus size={18} />}
              </button>
            );
          })}
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!userId) {
              notify("Sign in to create a collection.");
              return;
            }
            const id = crypto.randomUUID();
            try {
              await actions.save("collections", {
                id,
                slug: id,
                name: title.trim(),
                description: "",
                visibility: "private",
                ownerId: userId,
                provenance: "demo",
              });
              await actions.save("collection_items", {
                id: crypto.randomUUID(),
                name,
                entityId,
                entityType,
                collectionId: id,
                ownerId: userId,
                provenance: "demo",
              });
              setTitle("");
              notify("Collection created with this item");
            } catch {
              /* reported */
            }
          }}
        >
          <label>
            New collection name
            <input
              required
              minLength={3}
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button className="button dark">Create collection</button>
        </form>
        <Link className="text-link" to="/collections">
          Manage collections →
        </Link>
      </Modal>
    </>
  );
}
export function SafeLink({
  url,
  children,
  className = "text-link",
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return safeUrl(url) ? (
    <a
      className={className}
      href={safeUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ) : null;
}
