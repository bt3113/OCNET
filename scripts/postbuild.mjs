import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import {
  publicRoutes,
  buyerRoutes,
  providerRoutes,
  adminRoutes,
  authRoutes,
  creatorRoutes,
  buildAdminRoutes,
  buildProviderRoutes,
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
import { builds, creators } from "../src/data/build-seed.ts";
import { implementationRecords, blueprints } from "../src/data/intelligence-seed.ts";
const entities = [
  ["implementations", implementationRecords],
  ["blueprints", blueprints],
  ["builds", builds],
  ["creators", creators],
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
  records.map((record) => ({
    path: "/" + type + "/" + record.slug,
    name: record.name,
    description: record.description ?? record.summary ?? record.headline,
    type,
    category: record.category,
  })),
);
const routes = [
  ...new Set([
    ...publicRoutes,
    ...buyerRoutes,
    ...providerRoutes,
    ...adminRoutes,
    ...authRoutes,
    ...creatorRoutes,
    ...buildAdminRoutes,
    ...buildProviderRoutes,
    "/implementation/new",
    "/verify/demo-attestation",
    ...entities.map((entity) => entity.path),
  ]),
];
const html = readFileSync("dist/index.html", "utf8");
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
for (const route of routes) {
  const entity = entities.find((candidate) => candidate.path === route);
  const name =
    entity?.name ??
    (route === "/"
      ? "Implementation intelligence for what you want to improve"
      : route.split("/").at(-1).replaceAll("-", " "));
  const description =
    entity?.description ??
    "Explore " +
      name +
      " on Oracnet — implementation evidence, reusable Blueprints, technologies and implementation partners around a business outcome.";
  const canonical = "https://bt3113.github.io/OCNET" + route;
  const privatePage =
    /^\/(app|admin|provider\b|creator\b|collections\b|verify\b|implementation\/new|sign-|forgot|onboarding)/.test(
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
    ...(entity?.type === "implementations"
      ? [{ "@type": "CaseStudy", name, description, url: canonical }]
      : []),
    ...(entity?.type === "blueprints"
      ? [{ "@type": "TechArticle", name, description, url: canonical }]
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
  "User-agent: *\nAllow: /OCNET/\nDisallow: /OCNET/app\nDisallow: /OCNET/provider/\nDisallow: /OCNET/admin\nDisallow: /OCNET/creator/\nDisallow: /OCNET/collections\nDisallow: /OCNET/verify/\nDisallow: /OCNET/implementation/new\nSitemap: https://bt3113.github.io/OCNET/sitemap.xml\n",
);
writeFileSync(
  "dist/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    routes
      .filter(
        (route) =>
          !/^\/(app|admin|provider\b|creator\b|collections\b|verify\b|implementation\/new|sign-|forgot|onboarding)/.test(
            route,
          ),
      )
      .map(
        (route) =>
          "<url><loc>https://bt3113.github.io/OCNET" + route + "</loc></url>",
      )
      .join("") +
    "</urlset>",
);
console.log(
  `Generated ${routes.length} route entry points with metadata and SPA fallback.`,
);
