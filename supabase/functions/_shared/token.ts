// Must match src/data/attestation.ts hashToken(): SHA-256 hex of a namespaced token.
export async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(`oracnet-attestation:v1:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const validTokenShape = (token: unknown): token is string => typeof token === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(token);
