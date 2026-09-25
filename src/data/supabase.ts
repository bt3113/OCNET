import { createClient } from "@supabase/supabase-js";
import type { Repository } from "./repository";
import type { Table, Tables } from "./model";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key)
  throw new Error(
    "Supabase mode needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
const authStorage = {
  getItem: (k: string) => sessionStorage.getItem(k),
  removeItem: (k: string) => sessionStorage.removeItem(k),
  setItem: (k: string, v: string) => {
    try {
      const x = JSON.parse(v);
      delete x.provider_token;
      delete x.provider_refresh_token;
      sessionStorage.setItem(k, JSON.stringify(x));
    } catch {
      sessionStorage.setItem(k, v);
    }
  },
};
export const supabase = createClient(url, key, {
  auth: { flowType: "pkce", storage: authStorage },
});
const normalized = new Set([
  "creator_profiles",
  "build_offers",
  "collections",
  "collection_items",
  "build_comments",
  "build_updates",
  "creator_follows",
  "build_forks",
  "organization_memberships",
  "user_roles",
  "reports",
  "audit_events",
  "provider_claims",
  "marketplace_events",
  "build_comparisons",
  "build_collaborators",
  "implementation_records",
  "implementation_contexts",
  "implementation_process_steps",
  "implementation_stack_items",
  "implementation_connections",
  "implementation_use_cases",
  "implementation_capabilities",
  "metric_definitions",
  "implementation_metrics",
  "measurement_periods",
  "claims",
  "claim_evidence",
  "evidence_artifacts",
  "attestations",
  "evidence_reviews",
  "verification_events",
  "blueprints",
  "blueprint_versions",
  "blueprint_stack_items",
  "blueprint_connections",
  "blueprint_requirements",
  "blueprint_licenses",
  "technology_relationships",
  "relationship_evidence",
  "compatibility_checks",
  "requirement_profiles",
  "solution_runs",
  "solution_candidates",
  "solution_candidate_items",
  "solution_explanations",
  "staleness_reviews",
]);
export const repository: Repository = {
  async list<K extends Table>(table: K): Promise<Tables[K][]> {
    if (table === "builds") {
      const { data, error } = await supabase.rpc("list_builds");
      if (error) throw error;
      return data as Tables[K][];
    }
    if (normalized.has(table)) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      return data as Tables[K][];
    }
    const { data, error } = await supabase.from(table).select("id,data");
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r.data, id: r.id }) as Tables[K]);
  },
  async save<K extends Table>(table: K, value: Tables[K]) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in to save changes.");
    if (table === "builds") {
      const { data, error } = await supabase.rpc("save_build", {
        document: value,
      });
      if (error) throw error;
      return data as Tables[K];
    }
    if (normalized.has(table)) {
      const { data, error } = await supabase
        .from(table)
        .upsert(value)
        .select()
        .single();
      if (error) throw error;
      return data as Tables[K];
    }
    const { data: existing, error: readError } = await supabase
      .from(table)
      .select("id")
      .eq("id", value.id)
      .maybeSingle();
    if (readError) throw readError;
    const document =
      table === "messages" ? { ...value, senderId: user.id } : value;
    const { error } = existing
      ? await supabase.from(table).update({ data: document }).eq("id", value.id)
      : await supabase
          .from(table)
          .insert({ id: value.id, data: document, owner_id: user.id });
    if (error) throw error;
    return value;
  },
  async remove(table: Table, id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  },
  subscribe(table: Table, callback: () => void) {
    const channel = supabase
      .channel("changes-" + table)
      .on("postgres_changes", { event: "*", schema: "public", table }, callback)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
