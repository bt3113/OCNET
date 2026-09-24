// Pure boundary checks are shared with unit tests. DNS checks and bounded fetching run only on Edge.
export function allowedPublicUrl(input: string) {
  const u = new URL(input);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    !["", "80", "443"].includes(u.port)
  )
    throw Error("Only standard public HTTP(S) URLs are supported.");
  const host = u.hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    !host.includes(".") ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".test") ||
    host.includes(":") ||
    /^\d+(\.\d+){3}$/.test(host)
  )
    throw Error("IP literals and local addresses are not allowed.");
  return u;
}
export function publicIpv4(ip: string) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return false;
  const [a, b, c] = p;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || b === 2)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export function cleanText(s: string) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&(?:amp|#38);/g, "&")
    .replace(/&(?:lt|#60);/g, "<")
    .replace(/&(?:gt|#62);/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}
export function extractMetadata(html: string, sourceUrl: string) {
  const safe = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const meta = new Map<string, string>();
  for (const match of safe.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const a of match[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g))
      attrs[a[1].toLowerCase()] = a[2];
    const key = attrs.property || attrs.name;
    if (key) meta.set(key.toLowerCase(), cleanText(attrs.content || ""));
  }
  const name =
    meta.get("og:title") ||
    cleanText(safe.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  return {
    name,
    description: meta.get("og:description") || meta.get("description") || "",
    homepage: sourceUrl,
    sourceUrl,
    readme: "",
    language: "",
    license: "",
    detected: [],
    image: meta.get("og:image") || "",
  };
}
