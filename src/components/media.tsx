import { useState } from "react";
import { z } from "zod";
import { ExternalLink, Play, FileText, Plus, Trash2 } from "lucide-react";
import { useActions, useRecords, useUI } from "../state";
import { isSupabase } from "../data/repository";
import { supabaseUpload } from "../data/uploads";
import { Badge } from "./ui";
export function videoEmbed(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (["www.youtube.com", "youtube.com", "youtu.be"].includes(url.hostname)) {
      const id =
        url.hostname === "youtu.be"
          ? url.pathname.slice(1)
          : url.searchParams.get("v");
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id)
        ? "https://www.youtube-nocookie.com/embed/" + id
        : null;
    }
    if (
      ["vimeo.com", "www.vimeo.com"].includes(url.hostname) &&
      /^\/\d+$/.test(url.pathname)
    )
      return "https://player.vimeo.com/video" + url.pathname;
    return null;
  } catch {
    return null;
  }
}
const mediaSchema = z
  .object({
    name: z.string().trim().min(2).max(140),
    productId: z.string().min(1),
    type: z.enum(["image", "video", "document"]),
    url: z.url().refine((v) => v.startsWith("https://"), "Use an HTTPS URL."),
  })
  .refine((v) => v.type !== "video" || !!videoEmbed(v.url), {
    message: "Use a valid YouTube or Vimeo video URL.",
    path: ["url"],
  });
export function ProductMediaList({ productId }: { productId: string }) {
  const { data = [] } = useRecords("product_media");
  const [playing, setPlaying] = useState("");
  const assets = data.filter((m) => m.productId === productId);
  return (
    <div className="product-media-list">
      {assets.map((m) => (
        <article className="card media-card" key={m.id}>
          <Badge>{m.provenance}</Badge>
          <h3>{m.name}</h3>
          {m.type === "image" ? (
            <img loading="lazy" src={m.url} alt={m.alt} />
          ) : m.type === "document" ? (
            <a
              className="button light"
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText size={18} />
              Open document
              <ExternalLink size={15} />
            </a>
          ) : playing === m.id && videoEmbed(m.url) ? (
            <iframe
              className="video-frame"
              src={videoEmbed(m.url)!}
              title={m.name}
              loading="lazy"
              allow="fullscreen; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <>
              <p>Playing loads content from the video provider.</p>
              <button className="button light" onClick={() => setPlaying(m.id)}>
                <Play size={18} />
                Load video
              </button>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
export function MediaManager() {
  const { data: media = [] } = useRecords("media_assets");
  const { data: products = [] } = useRecords("products");
  const { data: productMedia = [] } = useRecords("product_media");
  const actions = useActions();
  const { notify } = useUI();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="card form-card">
        <h2>Your media library</h2>
        <p>
          Upload original company imagery. Demo images stay in this browser.
          Maximum 1 MB per image; PNG, JPEG, or WebP.
        </p>
        <label>
          Add image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (
                file.size > 1_000_000 ||
                !["image/png", "image/jpeg", "image/webp"].includes(file.type)
              ) {
                notify("Choose a PNG, JPEG, or WebP under 1 MB.");
                return;
              }
              setBusy(true);
              void (async () => {
                try {
                  const url = isSupabase
                    ? await supabaseUpload(file)
                    : await new Promise<string>((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(String(r.result));
                        r.onerror = () => reject(Error("Could not read image"));
                        r.readAsDataURL(file);
                      });
                  await actions.save("media_assets", {
                    id: crypto.randomUUID(),
                    name: file.name,
                    url,
                    type: file.type,
                    size: file.size,
                    provenance: isSupabase ? "vendor supplied" : "demo",
                  });
                  notify("Image added");
                } catch (e) {
                  notify(e instanceof Error ? e.message : "Upload failed");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        </label>
      </div>
      <form
        className="card form-card"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const parsed = mediaSchema.safeParse(
            Object.fromEntries(new FormData(form)),
          );
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          setError("");
          void actions
            .save("product_media", {
              ...parsed.data,
              id: crypto.randomUUID(),
              alt: parsed.data.name,
              provenance: isSupabase ? "vendor supplied" : "demo",
            })
            .then(() => {
              form.reset();
              notify("Product media added");
            })
            .catch(() => {});
        }}
      >
        <h2>Attach product media</h2>
        <p>
          Add a licensed screenshot, brochure, or a YouTube/Vimeo video.
          External media keeps its original hosting.
        </p>
        <label>
          Media title
          <input name="name" required minLength={2} maxLength={140} />
        </label>
        <label>
          Technology
          <select name="productId">
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Media type
          <select name="type">
            <option value="image">Screenshot / image</option>
            <option value="video">YouTube / Vimeo video</option>
            <option value="document">Document / brochure</option>
          </select>
        </label>
        <label>
          HTTPS media URL
          <input name="url" type="url" required placeholder="https://…" />
        </label>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <button className="button dark">
          <Plus size={17} />
          Add product media
        </button>
      </form>
      <div className="grid three">
        {media.map((m) => (
          <article className="card media-card" key={m.id}>
            <img src={m.url} alt={m.name} />
            <h3>{m.name}</h3>
            <button
              className="button light"
              onClick={() => void actions.remove("media_assets", m.id)}
            >
              <Trash2 size={17} />
              Remove
            </button>
          </article>
        ))}
      </div>
      {productMedia.map((m) => (
        <div className="card saved-row" key={m.id}>
          <span>
            {m.name} · {m.type}
          </span>
          <button
            className="icon-button"
            aria-label={"Remove " + m.name}
            onClick={() => void actions.remove("product_media", m.id)}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
    </>
  );
}
