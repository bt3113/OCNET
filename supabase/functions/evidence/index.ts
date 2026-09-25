import { HttpError, json, requireUser, serve, serviceClient, text } from "../_shared/http.ts";

/**
 * Private evidence boundary. Files go to the private `implementation-evidence`
 * bucket under the uploader's user-id prefix, with server-chosen object names.
 * Active content (HTML, SVG, scripts) is never accepted. Downloads are 60-second
 * signed URLs with a download disposition, for the owner or a reviewer only.
 */
const BUCKET = "implementation-evidence";
const MAX_BYTES = 15 * 1024 * 1024;
const allowed: Record<string, { ext: string; magic?: number[] }> = {
  "application/pdf": { ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "image/webp": { ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
  "text/plain": { ext: "txt" },
  "text/csv": { ext: "csv" },
  "application/json": { ext: "json" },
};
const kinds = new Set(["customer-attestation", "invoice", "analytics-export", "screenshot", "system-log", "contract-excerpt", "deployment-documentation", "repository", "vendor-documentation", "independent-audit", "public-case-study", "other"]);

serve(async (body, request) => {
  const { user, isAdmin } = await requireUser(request);
  const db = serviceClient();

  if (body.action === "upload") {
    const mimeType = text(body.mimeType, 80);
    const size = Number(body.size);
    const kind = text(body.kind, 40);
    if (!allowed[mimeType]) throw new HttpError(415, "File type not accepted. Use PDF, PNG, JPEG, WebP, TXT, CSV or JSON.");
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) throw new HttpError(413, "Files must be under 15 MB.");
    if (!kinds.has(kind)) throw new HttpError(400, "Unknown evidence type");
    const objectName = `${user.id}/${crypto.randomUUID()}.${allowed[mimeType].ext}`;
    const artifactId = `evidence-${crypto.randomUUID()}`;
    const { error } = await db.from("evidence_artifacts").insert({
      id: artifactId,
      name: `${kind.replaceAll("-", " ")} upload`,
      ownerId: user.id,
      kind,
      publicMetadata: text(body.description, 1000),
      storagePath: `${BUCKET}/${objectName}`,
      mimeType,
      private: true,
      provenance: "creator supplied",
    });
    if (error) throw new HttpError(400, "Could not register the evidence");
    const { data, error: signError } = await db.storage.from(BUCKET).createSignedUploadUrl(objectName);
    if (signError || !data) throw new HttpError(500, "Could not prepare the upload");
    return json({ artifactId, uploadUrl: data.signedUrl, token: data.token, path: objectName });
  }

  const artifactId = text(body.artifactId, 200);
  const { data: artifact } = await db.from("evidence_artifacts").select('id,"ownerId","storagePath","mimeType"').eq("id", artifactId).maybeSingle();
  if (!artifact || !artifact.storagePath) throw new HttpError(404, "Evidence not found");
  const objectName = artifact.storagePath.slice(BUCKET.length + 1);

  if (body.action === "finalize") {
    if (artifact.ownerId !== user.id) throw new HttpError(404, "Evidence not found");
    // Content sniffing: the declared type must match the bytes; text must be valid UTF-8 without NUL bytes.
    const { data: file } = await db.storage.from(BUCKET).download(objectName);
    const bytes = file ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
    const rule = allowed[artifact.mimeType];
    let ok = bytes.length > 0 && bytes.length <= MAX_BYTES && !!rule;
    if (ok && rule.magic) ok = rule.magic.every((value, index) => bytes[index] === value);
    if (ok && !rule.magic) {
      try {
        const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        ok = !decoded.includes("\u0000") && !/<\s*(script|html|svg|iframe)/i.test(decoded.slice(0, 4096));
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      await db.storage.from(BUCKET).remove([objectName]);
      await db.from("evidence_artifacts").delete().eq("id", artifact.id);
      throw new HttpError(415, "The file content did not match its declared type and was removed.");
    }
    return json({ verified: true });
  }

  if (body.action === "download") {
    if (artifact.ownerId !== user.id && !isAdmin) throw new HttpError(404, "Evidence not found");
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(objectName, 60, { download: true });
    if (error || !data) throw new HttpError(500, "Could not sign the link");
    return json({ url: data.signedUrl, expiresIn: 60 });
  }

  throw new HttpError(400, "Unknown action");
});
