import type { EventType } from "./build-model";
import { isSupabase } from "./repository";

/**
 * Product-learning events. Only the event type, an entity id and the UTC day are
 * recorded — no free text, no personal data. Demo counts stay in this browser and
 * are not traction.
 */
export function track(event: EventType, entityId: string) {
  const day = new Date().toISOString().slice(0, 10);
  if (isSupabase) {
    void import("./supabase").then(async ({ supabase }) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.from("marketplace_events").insert({ id: crypto.randomUUID(), ownerId: data.user.id, event, entityId, day, name: event, provenance: "community supplied" });
    });
    return;
  }
  try {
    const key = "oracnet:demo-analytics";
    const counts = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, number>;
    const bucket = `${day}|${event}|${entityId}`;
    counts[bucket] = (counts[bucket] ?? 0) + 1;
    localStorage.setItem(key, JSON.stringify(counts));
  } catch {
    // Analytics must never break a user flow.
  }
}
