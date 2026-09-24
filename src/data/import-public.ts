import { safeUrl } from "./build-domain";
import { isSupabase } from "./repository";
export interface ImportResult {
  name: string;
  description: string;
  homepage: string;
  sourceUrl: string;
  readme: string;
  language: string;
  license: string;
  detected: { productId: string; evidence: string }[];
  image?: string;
}
export function githubRepository(input: string) {
  const url = safeUrl(input);
  if (!url) throw Error("Enter a valid public GitHub repository URL.");
  const u = new URL(url);
  const p = u.pathname.split("/").filter(Boolean);
  if (
    u.hostname !== "github.com" ||
    p.length !== 2 ||
    p.some((x) => !/^[-\w.]+$/.test(x))
  )
    throw Error("Use https://github.com/owner/repository.");
  return { owner: p[0], repo: p[1] };
}
export function detectManifest(text: string) {
  const names: Record<string, string> = {
    "@supabase/supabase-js": "supabase",
    supabase: "supabase",
    openai: "openai-api",
    "@anthropic-ai/sdk": "claude",
    anthropic: "claude",
    twilio: "twilio",
    "@vapi-ai/web": "vapi",
    elevenlabs: "elevenlabs",
    n8n: "n8n",
  };
  const result: { productId: string; evidence: string }[] = [];
  let deps: string[] = [];
  try {
    const j = JSON.parse(text);
    deps = Object.keys({ ...j.dependencies, ...j.devDependencies });
  } catch {
    deps = text.split("\n").map((s) => s.trim().split(/[=<>[\s]/)[0]);
  }
  for (const dep of deps) {
    if (names[dep] && !result.some((x) => x.productId === names[dep]))
      result.push({
        productId: names[dep],
        evidence: `Detected dependency: ${dep}`,
      });
  }
  return result;
}
async function publicGithub(path: string) {
  const r = await fetch("https://api.github.com/repos/" + path, {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(10000),
  });
  if (r.status === 403 || r.status === 429)
    throw Error(
      "GitHub’s public API limit was reached. Try later or continue manually.",
    );
  if (!r.ok)
    throw Error(
      "Public repository data is unavailable. Check the URL or continue manually.",
    );
  const text = await r.text();
  if (text.length > 1000000)
    throw Error("Repository response is too large. Continue manually.");
  return JSON.parse(text);
}
export async function importPublicRepository(
  input: string,
): Promise<ImportResult> {
  const { owner, repo } = githubRepository(input);
  if (isSupabase) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase.functions.invoke("import-public", {
      body: { url: input, kind: "github" },
    });
    if (error) throw error;
    return data;
  }
  const root = owner + "/" + repo;
  const meta = await publicGithub(root);
  if (meta.private) throw Error("Only public repositories are supported.");
  let readme = "";
  const detected: ImportResult["detected"] = [];
  for (const path of [
    "readme",
    "contents/package.json",
    "contents/requirements.txt",
  ]) {
    try {
      const d = await publicGithub(root + "/" + path);
      if (d.encoding === "base64" && d.size <= 150000) {
        const bytes = Uint8Array.from(atob(d.content.replace(/\s/g, "")), (c) =>
          c.charCodeAt(0),
        );
        const text = new TextDecoder().decode(bytes);
        if (path === "readme") readme = text.slice(0, 12000);
        else detected.push(...detectManifest(text));
      }
    } catch {
      /* Optional files do not prevent manual completion. */
    }
  }
  return {
    name: meta.name || repo,
    description: meta.description || "",
    homepage: safeUrl(meta.homepage || "") || "",
    sourceUrl: meta.html_url,
    readme,
    language: meta.language || "",
    license: meta.license?.spdx_id || "",
    detected: detected.filter(
      (d, i, a) => a.findIndex((x) => x.productId === d.productId) === i,
    ),
  };
}
export async function importPublicUrl(url: string): Promise<ImportResult> {
  if (!safeUrl(url)) throw Error("Only HTTP(S) URLs are supported.");
  if (!isSupabase)
    throw Error(
      "Website metadata import needs the secure server importer. GitHub public import works here; or enter details manually.",
    );
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase.functions.invoke("import-public", {
    body: { url, kind: "url" },
  });
  if (error) throw error;
  return data;
}
