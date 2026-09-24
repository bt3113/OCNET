import { createClient } from "npm:@supabase/supabase-js@2";
import { allowedPublicUrl, publicIpv4, extractMetadata } from "./safety.ts";
// Deployment prerequisite: outbound requests must use the configured egress gateway, which resolves
// and pins validated public addresses on EVERY request. Fail closed without it: DNS checks alone
// cannot prevent rebinding between resolution and fetch in a generic Edge fetch implementation.
const headers = {
  "Access-Control-Allow-Origin":
    Deno.env.get("APP_ORIGIN") || "https://bt3113.github.io",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
async function bounded(response: Response) {
  if (Number(response.headers.get("content-length") || 0) > 1000000)
    throw Error("Response too large");
  const reader = response.body?.getReader();
  if (!reader) throw Error("Empty response");
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1000000) {
      await reader.cancel();
      throw Error("Response too large");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.length;
  }
  return new TextDecoder().decode(bytes);
}
async function metadataFetch(input: string) {
  let url = allowedPublicUrl(input);
  const gateway = Deno.env.get("SAFE_FETCH_GATEWAY_URL");
  const gatewayKey = Deno.env.get("SAFE_FETCH_GATEWAY_KEY");
  if (!gateway || !gatewayKey)
    throw Error("Safe metadata import is not configured. Continue manually.");
  for (let redirects = 0; redirects <= 3; redirects++) {
    const addresses = await Deno.resolveDns(url.hostname, "A");
    if (!addresses.length || addresses.some((ip) => !publicIpv4(ip)))
      throw Error("Non-public destination blocked");
    const response = await fetch(gateway, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + gatewayKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url.href,
        allowedAddresses: addresses,
        redirect: "manual",
        maxBytes: 1000000,
        timeoutMs: 8000,
      }),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) throw Error("Invalid redirect");
      url = allowedPublicUrl(new URL(next, url).href);
      continue;
    }
    if (!response.ok) throw Error("Source could not be retrieved");
    if (
      !response.headers.get("content-type")?.toLowerCase().includes("text/html")
    )
      throw Error("HTML pages only");
    return extractMetadata(await bounded(response), url.href);
  }
  throw Error("Too many redirects");
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  try {
    if (req.method !== "POST")
      return new Response("{}", { status: 405, headers });
    const token = req.headers.get("authorization");
    if (!token) throw Error("Sign in required");
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: token } } },
    );
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user)
      return new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401,
        headers,
      });
    const length = Number(req.headers.get("content-length") || 0);
    if (length > 4096) throw Error("Request too large");
    const raw = await req.text();
    if (raw.length > 4096) throw Error("Request too large");
    const { url, kind } = JSON.parse(raw);
    if (typeof url !== "string" || url.length > 2048)
      throw Error("Invalid URL");
    // Shared Postgres rate-limit RPC prevents per-instance counter bypass.
    const rate = await client.rpc("consume_import_budget");
    if (rate.error || !rate.data)
      return new Response(
        JSON.stringify({
          error: "Import limit reached or service unavailable",
        }),
        { status: 429, headers },
      );
    if (kind === "github") {
      const u = allowedPublicUrl(url);
      const parts = u.pathname.split("/").filter(Boolean);
      if (
        u.hostname !== "github.com" ||
        parts.length !== 2 ||
        parts.some((p) => !/^[-\w.]+$/.test(p))
      )
        throw Error("Use a public GitHub repository URL");
      const root = "https://api.github.com/repos/" + parts.join("/");
      async function gh(suffix = "") {
        const r = await fetch(root + suffix, {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "Oracnet-public-import",
          },
          redirect: "error",
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok)
          throw Error("Public GitHub repository unavailable or rate limited");
        return JSON.parse(await bounded(r));
      }
      const repo = await gh();
      if (repo.private) throw Error("Public repositories only");
      let readme = "",
        manifest = "";
      for (const path of [
        "/readme",
        "/contents/package.json",
        "/contents/requirements.txt",
      ])
        try {
          const d = await gh(path);
          if (d.encoding === "base64" && d.size < 150000) {
            const t = new TextDecoder().decode(
              Uint8Array.from(atob(d.content.replace(/\s/g, "")), (c) =>
                c.charCodeAt(0),
              ),
            );
            if (path === "/readme") readme = t.slice(0, 12000);
            else manifest += t + "\n";
          }
        } catch {
          /* Optional file. */
        }
      const mapping: Record<string, string> = {
        "@supabase/supabase-js": "supabase",
        openai: "openai-api",
        "@anthropic-ai/sdk": "claude",
        anthropic: "claude",
        twilio: "twilio",
        elevenlabs: "elevenlabs",
        n8n: "n8n",
      };
      const detected = Object.entries(mapping)
        .filter(([name]) =>
          new RegExp(
            '(?:"|^|\\n)' +
              name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
              '(?:"|[=<>\\s])',
          ).test(manifest),
        )
        .map(([name, productId]) => ({
          productId,
          evidence: "Detected dependency: " + name,
        }));
      return new Response(
        JSON.stringify({
          name: repo.name,
          description: repo.description || "",
          homepage: repo.homepage || "",
          sourceUrl: repo.html_url,
          language: repo.language || "",
          license: repo.license?.spdx_id || "",
          readme,
          detected,
        }),
        { headers },
      );
    }
    return new Response(JSON.stringify(await metadataFetch(url)), { headers });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Import unavailable",
      }),
      { status: 400, headers },
    );
  }
});
