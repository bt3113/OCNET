import { useState } from "react";
import { Copy, Send } from "lucide-react";
import { Modal } from "./ui";
import { useActions, useUI } from "../state";
import { createInvitation } from "../data/attestation";
import { isSupabase } from "../data/repository";
import type { Claim, CustomerIdentityVisibility, ImplementationRecord } from "../data/intelligence-model";

/**
 * Contributor invites a customer to attest selected claims. Demo mode shows the
 * link once and states plainly that no email is sent. Connected mode delegates
 * token creation, hashing and email delivery to the `attestation` Edge Function.
 */
export function AttestationInviteDialog({
  record,
  claims,
  open,
  onClose,
}: {
  record: ImplementationRecord;
  claims: Claim[];
  open: boolean;
  onClose: () => void;
}) {
  const actions = useActions();
  const { userId, notify } = useUI();
  const [selected, setSelected] = useState<string[]>([]);
  const [label, setLabel] = useState("Customer representative");
  const [email, setEmail] = useState("");
  const [visibility, setVisibility] = useState<CustomerIdentityVisibility>("anonymous");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const eligible = claims.filter((claim) => claim.status !== "revoked");

  async function create() {
    if (!selected.length) {
      notify("Choose at least one claim for the customer to review.");
      return;
    }
    setBusy(true);
    try {
      if (isSupabase) {
        const { supabase } = await import("../data/supabase");
        const { error } = await supabase.functions.invoke("attestation", {
          body: { action: "create", implementationId: record.id, claimIds: selected, attestorLabel: label, visibility, email },
        });
        if (error) throw new Error("The invitation could not be created or delivered. No email was sent.");
        notify("Invitation created and emailed by the attestation service.");
        onClose();
      } else {
        const { attestation, token } = createInvitation({
          implementationId: record.id,
          ownerId: userId || "demo-user",
          claimIds: selected,
          attestorLabel: label,
          visibility,
          now: new Date(),
          demo: true,
        });
        await actions.save("attestations", attestation);
        setLink(`${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/verify/${token}`);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not create the invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { setLink(null); onClose(); }} title="Invite the customer to attest" description="The customer sees only the claims you select and can confirm or reject each one.">
      {link ? (
        <div className="invite-result">
          <p className="notice"><strong>DEMO — no email was sent.</strong> Copy this single-use link now; only its hash is stored, so it cannot be shown again.</p>
          <input readOnly value={link} aria-label="Attestation link" onFocus={(event) => event.currentTarget.select()} />
          <button type="button" className="button light" onClick={() => void navigator.clipboard?.writeText(link).then(() => notify("Link copied."))}><Copy size={15} aria-hidden /> Copy link</button>
        </div>
      ) : (
        <div className="form-stack">
          <fieldset className="claim-picker">
            <legend>Claims to attest</legend>
            {eligible.map((claim) => (
              <label key={claim.id} className="checkbox-label">
                <input type="checkbox" checked={selected.includes(claim.id)} onChange={(event) => setSelected((current) => (event.target.checked ? [...current, claim.id] : current.filter((id) => id !== claim.id)))} />
                <span><strong>{claim.name}</strong> <small>{claim.value}</small></span>
              </label>
            ))}
          </fieldset>
          <label>Attestor role (shown to them)<input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} /></label>
          {isSupabase && <label>Customer email (used only to deliver the link; never published)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" /></label>}
          <label>
            Suggested identity visibility (the customer decides)
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as CustomerIdentityVisibility)}>
              <option value="public">Public</option>
              <option value="anonymous">Anonymous publicly</option>
              <option value="private">Private to Oracnet</option>
            </select>
          </label>
          <p className="muted small-print">Links expire after 14 days, work once, and can be revoked. {isSupabase ? "" : "In this demo nothing is emailed."}</p>
          <button type="button" className="button dark" disabled={busy || (isSupabase && !email)} onClick={() => void create()}>
            <Send size={15} aria-hidden /> {isSupabase ? "Create and email invitation" : "Create demo invitation link"}
          </button>
        </div>
      )}
    </Modal>
  );
}
