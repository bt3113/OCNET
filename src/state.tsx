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
import { demoIdentity, demoPersonas } from "./data/identity";
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
  userId: string;
  userName: string;
  roles: Role[];
  setPersona: (id: string) => void;
  role: Role;
  setRole: (role: Role) => void;
}
const UI = createContext<UIState | null>(null);
export function UIProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [identity, setIdentity] = useState(() =>
    isSupabase
      ? { id: "", name: "Your account", roles: [] as Role[] }
      : demoIdentity(),
  );
  function setPersona(id: string) {
    if (isSupabase || !(id in demoPersonas)) return;
    localStorage.setItem("oracnet-persona", id);
    setIdentity(demoIdentity());
    client.clear();
  }
  const [toast, setToast] = useState("");
  const [command, setCommand] = useState(false);
  const [contact, setContact] = useState<Provider | null>(null);
  const [role, updateRole] = useState<Role>(() => {
    const v = localStorage.getItem("oracnet-role");
    return [
      "buyer",
      "creator",
      "provider",
      "integrator",
      "consultant",
      "admin",
    ].includes(v ?? "")
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
    if (!isSupabase) return;
    let cleanup: (() => void) | undefined;
    let active = true;
    void import("./data/supabase").then(async ({ supabase }) => {
      const sync = (
        user: {
          id: string;
          app_metadata: Record<string, unknown>;
          email?: string;
        } | null,
      ) => {
        if (!active) return;
        const trusted = Array.isArray(user?.app_metadata.roles)
          ? (user.app_metadata.roles as Role[])
          : user?.app_metadata.role
            ? [user.app_metadata.role as Role]
            : [];
        setIdentity({
          id: user?.id || "",
          name: user?.email || "Your account",
          roles: trusted,
        });
        updateRole(trusted[0] || "buyer");
        client.clear();
        // Defer database access until the Auth callback has released its lock.
        if (user)
          queueMicrotask(() => {
            void supabase
              .from("user_roles")
              .select("role")
              .eq("userId", user.id)
              .then(({ data, error }) => {
                if (!active || error) return;
                const roles = [
                  ...new Set([
                    ...trusted,
                    ...(data ?? []).map((r) => r.role as Role),
                  ]),
                ];
                setIdentity((current) =>
                  current.id === user.id ? { ...current, roles } : current,
                );
              });
          });
      };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      sync(user);
      const { data } = supabase.auth.onAuthStateChange((_event, session) =>
        sync(session?.user ?? null),
      );
      cleanup = () => data.subscription.unsubscribe();
    });
    return () => {
      active = false;
      cleanup?.();
    };
  }, [client]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <UI.Provider
      value={{
        userId: identity.id,
        userName: identity.name,
        roles: isSupabase
          ? identity.roles
          : [...new Set([...identity.roles, role])],
        setPersona,
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
