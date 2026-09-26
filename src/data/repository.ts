import type { Table, Tables } from "./model";
import { buildProducts, buildProviders } from "./build-seed";
import {
  intelligenceProducts,
  intelligenceProviders,
  intelligenceSeed,
  intelligenceStacks,
  intelligenceUseCases,
} from "./intelligence-seed";
import { seed } from "./seed";
import { xaiBuilds, xaiCreator, xaiProducts, xaiProvider, xaiRelatedStacks, xaiRelatedUseCases } from "./vendor-xai";
export interface Repository {
  list<K extends Table>(table: K): Promise<Tables[K][]>;
  save<K extends Table>(table: K, value: Tables[K]): Promise<Tables[K]>;
  remove(table: Table, id: string): Promise<void>;
  subscribe(table: Table, callback: () => void): () => void;
}
const key = "oracnet:v1:";
/** Intelligence tables use their own namespace so seed revisions do not mix with older browser data. */
const intelligenceKey = "oracnet:intel-v3:";
const storageKey = (table: Table) => (table in intelligenceSeed ? intelligenceKey : key) + table;
export class DemoRepository implements Repository {
  private read<K extends Table>(table: K): Tables[K][] {
    const raw = localStorage.getItem(storageKey(table));
    const base = (seed[table] ?? intelligenceSeed[table] ?? []) as Tables[K][];
    if (!raw) return structuredClone(base);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw Error();
      // Catalogue entries added after a visitor's data was first stored.
      const additions: Partial<Record<Table, { id: string }[]>> = {
        products: [...buildProducts, ...intelligenceProducts, ...xaiProducts],
        providers: [...buildProviders, ...intelligenceProviders, xaiProvider],
        use_cases: [...intelligenceUseCases, ...xaiRelatedUseCases],
        solution_stacks: [...intelligenceStacks, ...xaiRelatedStacks],
        builds: xaiBuilds,
        creator_profiles: [xaiCreator],
      };
      return [
        ...parsed,
        ...(additions[table] ?? []).filter((x) => !parsed.some((v) => v.id === x.id)),
      ] as Tables[K][];
    } catch {
      throw new Error(
        "Stored demo data could not be read. Export or reset demo data in Settings.",
      );
    }
  }
  async list<K extends Table>(table: K): Promise<Tables[K][]> {
    return this.read(table);
  }
  async save<K extends Table>(table: K, value: Tables[K]) {
    const values = this.read(table);
    const next = values.filter((x) => x.id !== value.id);
    next.push(value);
    localStorage.setItem(storageKey(table), JSON.stringify(next));
    window.dispatchEvent(new Event("oracnet-change"));
    return value;
  }
  async remove(table: Table, id: string) {
    localStorage.setItem(
      storageKey(table),
      JSON.stringify(this.read(table).filter((x) => x.id !== id)),
    );
    window.dispatchEvent(new Event("oracnet-change"));
  }
  subscribe(_table: Table, callback: () => void) {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }
}
export const isSupabase = import.meta.env.VITE_DATA_MODE === "supabase";
let instance: Promise<Repository> | undefined;
export function getRepository() {
  return (instance ??= isSupabase
    ? import("./supabase").then((m) => m.repository)
    : Promise.resolve(new DemoRepository()));
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
