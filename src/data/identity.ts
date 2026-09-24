import type { Role } from "./model";
export const demoPersonas = {
  "demo-user": {
    name: "Alex Chen",
    roles: ["buyer", "creator"] as Role[],
    creatorId: "alex-chen",
  },
  "demo-studio": {
    name: "Northstar Studio",
    roles: ["buyer", "creator", "provider", "integrator"] as Role[],
    creatorId: "northstar-studio",
  },
  "demo-admin": {
    name: "Demo moderator",
    roles: ["buyer", "creator", "admin"] as Role[],
    creatorId: "",
  },
};
export function demoIdentity() {
  const id = localStorage.getItem("oracnet-persona") || "demo-user";
  return {
    id,
    ...(demoPersonas[id as keyof typeof demoPersonas] ??
      demoPersonas["demo-user"]),
  };
}
