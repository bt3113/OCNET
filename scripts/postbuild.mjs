import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import {
  publicRoutes,
  buyerRoutes,
  providerRoutes,
  adminRoutes,
  authRoutes,
} from "../src/routes.ts";
import {
  products,
  providers,
  useCases,
  stacks,
  categories,
  integrators,
  consultants,
  articles,
} from "../src/data/seed.ts";
const entities = [
  ["technologies", products],
  ["providers", providers],
  ["use-cases", useCases],
  ["solution-stacks", stacks],
  ["categories", categories],
  ["integrators", integrators],
  ["consultants", consultants],
  ["resources", articles],
  ["updates", articles],
].flatMap(([type, records]) =>
  records.map((r) => ({
    path: "/" + type + "/" + r.slug,
    name: r.name,
    description: r.description,
    type,
    category: r.category,
  })),
);
const routes = [
  ...new Set([
    ...publicRoutes,
    ...buyerRoutes,
    ...providerRoutes,
    ...adminRoutes,
    ...authRoutes,
    ...entities.map((e) => e.path),
  ]),
];
const html = readFileSync("dist/index.html", "utf8");
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
for (const route of routes) {
  const entity = entities.find((e) => e.path === route);
  const name =
    entity?.name ??
    (route === "/"
      ? "Find the right technology for what you want to build"
      : route.split("/").at(-1).replaceAll("-", " "));
  const description =
    entity?.description ??
    "Discover " +
      name +
      " on Oracnet, the use-case-first technology marketplace.";
  const canonical = "https://bt3113.github.io/OCNET" + route;
  const privatePage = /^\/(app|admin|provider\b|sign-|forgot|onboarding)/.test(
    route,
  );
  const graph = [
    {
      "@type": "Organization",
      name: "Oracnet",
      url: "https://bt3113.github.io/OCNET/",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://bt3113.github.io/OCNET/",
        },
        ...(route === "/"
          ? []
          : [{ "@type": "ListItem", position: 2, name, item: canonical }]),
      ],
    },
    ...(entity?.type === "technologies"
      ? [
          {
            "@type": [
              "robotics-hardware",
              "iot",
              "drones",
              "deep-tech",
            ].includes(entity.category)
              ? "Product"
              : "SoftwareApplication",
            name,
            description: "Demo listing: " + description,
            url: canonical,
          },
        ]
      : []),
  ];
  const metadata = `<link rel="canonical" href="${canonical}"><meta name="robots" content="${privatePage ? "noindex,nofollow" : "index,follow"}"><meta property="og:title" content="${escape(name)} | Oracnet"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="website"><meta property="og:image" content="https://bt3113.github.io/OCNET/media/desert.webp"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(name)} | Oracnet"><meta name="twitter:description" content="${escape(description)}"><script id="structured-data" type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replaceAll("<", "\\u003c")}</script>`;
  const output = html
    .replace(/<title>.*?<\/title>/, `<title>${escape(name)} | Oracnet</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?\s*>/,
      `<meta name="description" content="${escape(description)}">`,
    )
    .replace("</head>", metadata + "</head>");
  const dir = "dist" + (route === "/" ? "" : route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "/index.html", output);
}
writeFileSync(
  "dist/404.html",
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>Opening Oracnet…</title><script>var path=location.pathname.replace(/^\\/OCNET/,'');location.replace('/OCNET/?route='+encodeURIComponent(path+location.search)+location.hash);</script><p>Opening Oracnet… <a href="/OCNET/">Return home</a></p></html>`,
);
writeFileSync("dist/.nojekyll", "");
writeFileSync(
  "dist/robots.txt",
  "User-agent: *\nAllow: /OCNET/\nDisallow: /OCNET/app\nDisallow: /OCNET/provider/\nDisallow: /OCNET/admin\nSitemap: https://bt3113.github.io/OCNET/sitemap.xml\n",
);
writeFileSync(
  "dist/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    routes
      .filter(
        (r) => !/^\/(app|admin|provider\b|sign-|forgot|onboarding)/.test(r),
      )
      .map(
        (r) => "<url><loc>https://bt3113.github.io/OCNET" + r + "</loc></url>",
      )
      .join("") +
    "</urlset>",
);
console.log(
  `Generated ${routes.length} route entry points with metadata and SPA fallback.`,
);
