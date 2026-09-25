import { HttpError, idList, json, requireUser, serve, serviceClient, text } from "../_shared/http.ts";
import { generateToken, hashToken, validTokenShape } from "../_shared/token.ts";
import { emailProvider } from "../_shared/email.ts";

/**
 * Customer attestation boundary.
 *  create — authenticated record owner; token generated here, stored only as a hash
 *  load   — token in POST body only; returns just the invitation-scoped claims
 *  submit — applies decisions atomically through a service-role-only SQL function
 * Invalid, expired, revoked and used tokens all return the same 404 so a token
 * lookup never reveals whether a record exists.
 */
const TTL_DAYS = 14;
const visibilityValues = new Set(["public", "anonymous", "private"]);
const notUsable = () => new HttpError(404, "This attestation link is invalid, expired, revoked or already used.");

serve(async (body, request) => {
  const db = serviceClient();
  const action = body.action;

  if (action === "create") {
    const { user } = await requireUser(request);
    const email = text(body.email, 254);
    const claimIds = idList(body.claimIds);
    const visibility = text(body.visibility, 20);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "A valid customer email is required");
    if (!claimIds.length || !visibilityValues.has(visibility)) throw new HttpError(400, "Choose claims and a visibility option");
    const provider = emailProvider();
    if (!provider) throw new HttpError(503, "Email delivery is not configured. No invitation was created.");
    const token = generateToken();
    const { data: id, error } = await db.rpc("create_attestation", {
      p_owner: user.id,
      p_implementation: text(body.implementationId, 200),
      p_claims: claimIds,
      p_label: text(body.attestorLabel, 80) || "Customer representative",
      p_visibility: visibility,
      p_token_hash: await hashToken(token),
      p_expires: new Date(Date.now() + TTL_DAYS * 86400000).toISOString(),
      p_email: email,
    });
    if (error || !id) throw new HttpError(403, "You can only invite attestation for claims on your own records.");
    const base = `${Deno.env.get("APP_ORIGIN") ?? "https://bt3113.github.io"}${Deno.env.get("APP_BASE_PATH") ?? "/OCNET"}`;
    try {
      await provider.send({
        to: email,
        subject: "Please review claims about an implementation you were part of",
        text: `You have been asked to confirm or reject specific claims about an implementation on Oracnet.\n\nReview them here (single use, expires in ${TTL_DAYS} days):\n${base}/verify/${token}\n\nIf you did not expect this, ignore this email.`,
      });
    } catch {
      await db.from("attestations").update({ status: "revoked" }).eq("id", id);
      throw new HttpError(502, "The invitation email could not be delivered, so the invitation was revoked.");
    }
    return json({ id, delivered: true });
  }

  if (action === "load" || action === "submit") {
    if (!validTokenShape(body.token)) throw notUsable();
    const tokenHash = await hashToken(body.token);
    const { data: attestation } = await db
      .from("attestations")
      .select('id,"implementationId","attestorLabel","expiresAt",status,"claimIds"')
      .eq("tokenHash", tokenHash)
      .maybeSingle();
    if (!attestation || attestation.status !== "pending" || Date.parse(attestation.expiresAt) <= Date.now()) throw notUsable();

    if (action === "load") {
      const [{ data: record }, { data: claims }] = await Promise.all([
        db.from("implementation_records").select('name,"contextSummary"').eq("id", attestation.implementationId).single(),
        db.from("claims").select('id,name,value,unit,period,predicate,"evidenceLevel",provenance').in("id", attestation.claimIds),
      ]);
      if (!record) throw notUsable();
      return json({
        implementationName: record.name,
        contextSummary: record.contextSummary,
        attestorLabel: attestation.attestorLabel,
        expiresAt: attestation.expiresAt,
        claims: claims ?? [],
      });
    }

    const decisions = body.decisions && typeof body.decisions === "object" ? (body.decisions as Record<string, unknown>) : {};
    const clean: Record<string, "confirm" | "reject"> = {};
    for (const [claimId, decision] of Object.entries(decisions)) {
      if (decision === "skip") continue;
      if (decision !== "confirm" && decision !== "reject") throw new HttpError(400, "Invalid decision");
      if (!attestation.claimIds.includes(claimId)) throw new HttpError(400, "Decision outside this invitation");
      clean[claimId] = decision;
    }
    const visibility = text(body.visibility, 20);
    if (!Object.keys(clean).length || !visibilityValues.has(visibility)) throw new HttpError(400, "Confirm or reject at least one claim");
    const { error } = await db.rpc("apply_attestation", { p_token_hash: tokenHash, p_decisions: clean, p_visibility: visibility });
    if (error) throw notUsable();
    return json({ submitted: true });
  }

  throw new HttpError(400, "Unknown action");
});
