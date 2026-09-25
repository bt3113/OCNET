import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") || "https://bt3113.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

/** Wraps a handler: CORS preflight, POST-only, JSON body limit, uniform errors (no stack traces). */
export function serve(handler: (body: Record<string, unknown>, request: Request) => Promise<Response>) {
  Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    try {
      const text = await request.text();
      if (text.length > 20000) throw new HttpError(413, "Request too large");
      const body = JSON.parse(text || "{}");
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Invalid request");
      return await handler(body as Record<string, unknown>, request);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error("unhandled", error instanceof Error ? error.name : "error");
      return json({ error: "Request failed" }, 500);
    }
  });
}

/** Service-role client. The key is a server secret and never reaches the browser. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new HttpError(503, "Service not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Resolve the calling user from their JWT. Throws 401 when absent/invalid. */
export async function requireUser(request: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization") ?? "";
  if (!url || !anon) throw new HttpError(503, "Service not configured");
  if (!authorization.startsWith("Bearer ")) throw new HttpError(401, "Sign in required");
  const client = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Sign in required");
  const { data: admin } = await client.rpc("is_admin");
  return { user: data.user, client, isAdmin: admin === true };
}

export const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
export const idList = (value: unknown, max = 50) =>
  Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string" && /^[A-Za-z0-9_.:-]{1,200}$/.test(item)))].slice(0, max) : [];
