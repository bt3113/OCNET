import { BuildImage } from "./BuildImage";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import type { Build, BuildOffer } from "../../data/build-model";
import { offerAction, offerPrice } from "../../data/build-domain";
import { useActions, useRecords, useUI } from "../../state";
import { isSupabase } from "../../data/repository";
import { Modal, Badge, ButtonLink } from "../ui";
import { assetUrl, ProviderListingCover, SafeLink } from "./cards";
import { isProviderListing } from "../../data/build-domain";
import { videoEmbed as safeVideoEmbed } from "../media";
export function BuildGallery({ build }: { build: Build }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const media = build.media[index];
  if (!media && isProviderListing(build)) return <ProviderListingCover build={build} large />;
  if (!media)
    return (
      <div className="card empty-state">
        <p>No media supplied yet. Explore the structured stack below.</p>
      </div>
    );
  const move = (n: number) =>
    setIndex((index + n + build.media.length) % build.media.length);
  return (
    <div className="build-gallery">
      <div
        className="gallery-main"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          if (e.key === "ArrowLeft") move(-1);
        }}
      >
        {media.type === "image" ? (
          <button
            aria-label={"Enlarge " + media.alt}
            onClick={() => setOpen(true)}
          >
            <BuildImage src={assetUrl(media.url)} alt={media.alt} />
          </button>
        ) : media.type === "video" ? (
          <button className="button dark" onClick={() => setOpen(true)}>
            Play video preview
          </button>
        ) : (
          <SafeLink url={media.url}>
            Open document <ExternalLink size={16} />
          </SafeLink>
        )}
        <div className="gallery-controls">
          <button
            className="icon-button"
            aria-label="Previous media"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span aria-live="polite">
            {index + 1} / {build.media.length}
          </span>
          <button
            className="icon-button"
            aria-label="Next media"
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="gallery-thumbs">
        {build.media.map((m, i) => (
          <button
            className={index === i ? "selected" : ""}
            aria-label={"Select build media " + (i + 1)}
            aria-pressed={index === i}
            key={m.id}
            onClick={() => setIndex(i)}
          >
            {m.type === "image" ? (
              <BuildImage loading="lazy" src={assetUrl(m.url)} alt="" />
            ) : (
              <span>{m.type}</span>
            )}
          </button>
        ))}
        <small>
          {build.provenance === "demo"
            ? "Original illustrations · Demo concepts"
            : "Creator-supplied media"}
        </small>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={build.name}
        description={media.alt}
      >
        {media.type === "image" ? (
          <BuildImage
            className="quick-cover"
            src={assetUrl(media.url)}
            alt={media.alt}
          />
        ) : safeVideoEmbed(media.url) ? (
          <iframe
            title={media.alt}
            src={safeVideoEmbed(media.url)!}
            className="video-frame"
            allow="fullscreen"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        ) : (
          <SafeLink url={media.url}>Open video on the creator’s site</SafeLink>
        )}
        <div className="row between">
          <button className="button light" onClick={() => move(-1)}>
            Previous
          </button>
          <button className="button light" onClick={() => move(1)}>
            Next
          </button>
        </div>
      </Modal>
    </div>
  );
}
export function CreatorContact({
  build,
  open,
  close,
}: {
  build: Build;
  open: boolean;
  close: () => void;
}) {
  const { userId, notify } = useUI();
  const actions = useActions();
  const navigate = useNavigate();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={close}
      title="Contact the creator"
      description={"Discuss an implementation based on " + build.name + "."}
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!userId) {
            notify("Sign in to contact this creator.");
            return;
          }
          setBusy(true);
          try {
            let id = crypto.randomUUID();
            if (isSupabase) {
              const { supabase } = await import("../../data/supabase");
              const { data, error } = await supabase.rpc(
                "start_build_enquiry",
                { target_build: build.id, body },
              );
              if (error) throw error;
              id = data;
            } else {
              await actions.save("message_threads", {
                id,
                name: build.name + " · Creator enquiry",
                participantIds: [userId, build.ownerId],
                providerId: build.creatorId,
                provenance: "demo",
              });
              await actions.save("messages", {
                id: crypto.randomUUID(),
                name: "Implementation enquiry",
                threadId: id,
                senderId: userId,
                body,
                sentAt: new Date().toISOString(),
                provenance: "demo",
              });
            }
            notify(
              isSupabase
                ? "Enquiry created"
                : "Demo enquiry saved. No external message sent.",
            );
            close();
            navigate("/creator/messages?thread=" + id);
          } catch (e) {
            notify(
              e instanceof Error ? e.message : "Could not create enquiry.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Your implementation question
          <textarea
            required
            minLength={20}
            maxLength={5000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe the outcome you want, your constraints, and what you would like to adapt."
          />
        </label>
        <p className="notice">
          {isSupabase
            ? "This creates a private conversation with the creator."
            : "Demo only. This enquiry stays in your browser."}
        </p>
        <button className="button dark" disabled={busy}>
          {busy ? "Saving…" : isSupabase ? "Send enquiry" : "Save demo enquiry"}{" "}
          <MessageSquare size={16} />
        </button>
      </form>
    </Modal>
  );
}
export function BuildOfferCard({
  offer,
  build,
}: {
  offer: BuildOffer;
  build: Build;
}) {
  const [preview, setPreview] = useState(false);
  const [contact, setContact] = useState(false);
  const label = offerAction(offer);
  return (
    <article className="card offer-card">
      <div className="row between">
        <Badge>{offer.offerType}</Badge>
        <Badge>{offer.provenance}</Badge>
      </div>
      <h3>{offer.name}</h3>
      <strong className="offer-price">{offerPrice(offer)}</strong>
      <p>{offer.description}</p>
      <small>{offer.deliveryTime}</small>
      <button
        className="button dark"
        disabled={label === "Unavailable"}
        onClick={() =>
          offer.checkoutMode === "contact" ? setContact(true) : setPreview(true)
        }
      >
        {label}
      </button>
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title={offer.name}
        description="Review how this offer is delivered."
      >
        <p>{offer.description}</p>
        {offer.checkoutMode === "external" ? (
          <>
            <p>
              You are leaving Oracnet. The creator’s site controls checkout,
              delivery and refund terms.
            </p>
            <SafeLink url={offer.externalUrl} className="button dark">
              Continue on creator website <ExternalLink size={16} />
            </SafeLink>
          </>
        ) : (
          <>
            <Badge>Demo only · No purchase</Badge>
            <p>
              No payment is taken and no asset has been purchased. You can
              review this build’s implementation notes or discuss an adaptation.
            </p>
            <button
              className="button dark"
              onClick={() => {
                setPreview(false);
                setContact(true);
              }}
            >
              Ask about this offer
            </button>
          </>
        )}
      </Modal>
      <CreatorContact
        build={build}
        open={contact}
        close={() => setContact(false)}
      />
    </article>
  );
}
export function BuildComments({ build }: { build: Build }) {
  const { data: comments = [] } = useRecords("build_comments");
  const { userId, notify, roles } = useUI();
  const actions = useActions();
  const [body, setBody] = useState("");
  return (
    <section className="card form-card">
      <h2>Questions & implementation notes</h2>
      <p>
        Keep discussion about this build. Questions are reviewed before public
        display.
      </p>
      {comments
        .filter(
          (c) =>
            c.buildId === build.id &&
            (c.status === "approved" ||
              c.ownerId === userId ||
              roles.includes("admin")),
        )
        .map((c) => (
          <article className="build-comment" key={c.id}>
            <div className="row between">
              <strong>{c.name}</strong>
              <Badge>
                {c.status} · {c.provenance}
              </Badge>
            </div>
            <p>{c.body}</p>
          </article>
        ))}
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!userId) {
            notify("Sign in to ask a question.");
            return;
          }
          try {
            await actions.save("build_comments", {
              id: crypto.randomUUID(),
              name: "Community question",
              buildId: build.id,
              ownerId: userId,
              body: body.trim(),
              status: "pending",
              updatedAt: new Date().toISOString(),
              provenance: isSupabase ? "community supplied" : "demo",
            });
            setBody("");
            notify("Question submitted for moderation");
          } catch {
            /* handled */
          }
        }}
      >
        <label>
          Question about this build
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={10}
            maxLength={3000}
          />
        </label>
        <button className="button dark">Submit question</button>
      </form>
    </section>
  );
}
export function BuildReport({ build }: { build: Build }) {
  const [open, setOpen] = useState(false);
  const { userId, notify } = useUI();
  const actions = useActions();
  return (
    <>
      <button className="text-link" onClick={() => setOpen(true)}>
        Report this build
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report this build"
        description="Tell moderators what needs review. Reports are private."
      >
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!userId) {
              notify("Sign in to submit a report.");
              return;
            }
            const f = new FormData(e.currentTarget);
            try {
              await actions.save("reports", {
                id: crypto.randomUUID(),
                name: build.name,
                buildId: build.id,
                ownerId: userId,
                reason: String(f.get("reason")) as "other",
                details: String(f.get("details")),
                status: "open",
                provenance: isSupabase ? "community supplied" : "demo",
              });
              notify("Report submitted for review");
              setOpen(false);
            } catch {
              /* handled */
            }
          }}
        >
          <label>
            Reason
            <select name="reason">
              {[
                "spam",
                "misleading",
                "copyright/IP",
                "unsafe link",
                "incorrect attribution",
                "other",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Evidence and context
            <textarea name="details" required minLength={10} maxLength={5000} />
          </label>
          <button className="button dark">Submit report</button>
        </form>
      </Modal>
    </>
  );
}
export function BuildSomething({
  build,
  onRemix,
}: {
  build: Build;
  onRemix: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState(false);
  return (
    <>
      <button className="button gold" onClick={() => setOpen(true)}>
        Build something like this
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Make this a starting point"
        description="Choose the path that fits your team."
      >
        <div className="choice-cards">
          {build.cloneAllowed && (
            <div className="card">
              <h3>Remix the blueprint</h3>
              <p>
                Make a private structured copy. Source code and media are not
                copied.
              </p>
              <button
                className="button dark"
                onClick={() => {
                  setOpen(false);
                  onRemix();
                }}
              >
                Remix it yourself
              </button>
            </div>
          )}
          <div className="card">
            <h3>Request implementation</h3>
            <p>Turn this inspiration into an editable procurement brief.</p>
            <ButtonLink to={"/app/projects/new?build=" + build.id}>
              Create project from build
            </ButtonLink>
            <button
              className="text-link"
              onClick={() => {
                setOpen(false);
                setContact(true);
              }}
            >
              Or contact the creator
            </button>
          </div>
        </div>
      </Modal>
      <CreatorContact
        build={build}
        open={contact}
        close={() => setContact(false)}
      />
    </>
  );
}
