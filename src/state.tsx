import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  list,
  save,
  remove,
  getRepository,
  isSupabase,
} from "./data/repository";
import type { Table, Tables, Role, Provider } from "./data/model";
export function useRecords<K extends Table>(table: K) {
  const client = useQueryClient();
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let active = true;
    void getRepository().then((r) => {
      if (active)
        cleanup = r.subscribe(
          table,
          () => void client.invalidateQueries({ queryKey: [table] }),
        );
    });
    return () => {
      active = false;
      cleanup?.();
    };
  }, [table, client]);
  return useQuery({ queryKey: [table], queryFn: () => list(table) });
}
export function useActions() {
  const client = useQueryClient();
  const { notify } = useUI();
  return {
    save: async <K extends Table>(table: K, value: Tables[K]) => {
      try {
        await client.cancelQueries({ queryKey: [table] });
        const r = await save(table, value);
        client.setQueryData([table], await list(table));
        return r;
      } catch (e) {
        notify(
          e instanceof Error ? e.message : "Could not save. Please retry.",
        );
        throw e;
      }
    },
    remove: async (table: Table, id: string) => {
      try {
        await client.cancelQueries({ queryKey: [table] });
        await remove(table, id);
        client.setQueryData([table], await list(table));
      } catch (e) {
        notify(
          e instanceof Error ? e.message : "Could not remove. Please retry.",
        );
        throw e;
      }
    },
  };
}
interface UIState {
  notify: (text: string) => void;
  command: boolean;
  setCommand: (value: boolean) => void;
  contact: Provider | null;
  setContact: (value: Provider | null) => void;
  role: Role;
  setRole: (role: Role) => void;
}
const UI = createContext<UIState | null>(null);
export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState("");
  const [command, setCommand] = useState(false);
  const [contact, setContact] = useState<Provider | null>(null);
  const [role, updateRole] = useState<Role>(() => {
    const v = localStorage.getItem("oracnet-role");
    return ["buyer", "provider", "integrator", "consultant", "admin"].includes(
      v ?? "",
    )
      ? (v as Role)
      : "buyer";
  });
  function setRole(r: Role) {
    if (!isSupabase) {
      updateRole(r);
      localStorage.setItem("oracnet-role", r);
    }
  }
  useEffect(() => {
    if (isSupabase)
      void import("./data/supabase").then(async ({ supabase }) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        updateRole((user?.app_metadata.role as Role) || "buyer");
      });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <UI.Provider
      value={{
        notify: setToast,
        command,
        setCommand,
        contact,
        setContact,
        role,
        setRole,
      }}
    >
      {children}
      <div
        className={"toast " + (toast ? "visible" : "")}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </UI.Provider>
  );
}
export function useUI() {
  const c = useContext(UI);
  if (!c) throw Error("UIProvider is required");
  return c;
}
