import { createClient } from "@supabase/supabase-js";
import type { Repository } from "./repository";
import type { Table, Tables } from "./model";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key)
  throw new Error(
    "Supabase mode needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
export const supabase = createClient(url, key);
export const repository: Repository = {
  async list<K extends Table>(table: K): Promise<Tables[K][]> {
    const { data, error } = await supabase.from(table).select("id,data");
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r.data, id: r.id }) as Tables[K]);
  },
  async save<K extends Table>(table: K, value: Tables[K]) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in to save changes.");
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
