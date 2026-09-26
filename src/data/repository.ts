import type { Table, Tables } from "./model";
export interface Repository {
  list<K extends Table>(table: K): Promise<Tables[K][]>;
  save<K extends Table>(table: K, value: Tables[K]): Promise<Tables[K]>;
  remove(table: Table, id: string): Promise<void>;
  subscribe(table: Table, callback: () => void): () => void;
}
export const isSupabase = import.meta.env.VITE_DATA_MODE === "supabase";
let instance: Promise<Repository> | undefined;
export function getRepository() {
  return (instance ??= isSupabase
    ? import("./supabase").then((m) => m.repository)
    : import("./demo-repository").then((m) => new m.DemoRepository()));
}
export async function list<K extends Table>(table: K) {
  return (await getRepository()).list(table);
}
export async function save<K extends Table>(table: K, value: Tables[K]) {
  return (await getRepository()).save(table, value);
}
export async function remove(table: Table, id: string) {
  return (await getRepository()).remove(table, id);
}
