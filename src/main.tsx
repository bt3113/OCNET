import React, { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { UIProvider } from "./state";
import { Layout } from "./components/layout";
import { Skeleton, EmptyState } from "./components/ui";
import {
  buyerRoutes,
  providerRoutes,
  adminRoutes,
  authRoutes,
  creatorRoutes,
  buildAdminRoutes,
  buildProviderRoutes,
} from "./routes";
import "./styles.css";
import "./intelligence.css";
import "./structure.css";
import "./compiler-coverage.css";
const BuildDiscovery = lazy(() => import("./pages/BuildDiscovery"));
const BuildDetail = lazy(() => import("./pages/BuildDetail"));
const Collections = lazy(() => import("./pages/Collections"));
const BuildWorkspace = lazy(() => import("./pages/BuildWorkspace"));
const BuildWizard = lazy(() => import("./pages/BuildWizard"));
const UseCaseModeration = lazy(() => import("./pages/UseCaseModeration"));
const Home = lazy(() => import("./pages/Home"));
const Discovery = lazy(() => import("./pages/Discovery"));
const Details = lazy(() => import("./pages/Details"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Compare = lazy(() => import("./pages/Compare"));
const Content = lazy(() => import("./pages/Content"));
const Auth = lazy(() => import("./pages/Auth"));
const ImplementationDiscovery = lazy(
  () => import("./pages/ImplementationDiscovery"),
);
const ImplementationDetail = lazy(() => import("./pages/ImplementationDetail"));
const ImplementationCompare = lazy(
  () => import("./pages/ImplementationCompare"),
);
const ImplementationWizard = lazy(
  () => import("./pages/ImplementationWizard"),
);
const Blueprints = lazy(() => import("./pages/Blueprints"));
const SearchPage = lazy(() => import("./pages/Search"));
const SolutionCompiler = lazy(() => import("./pages/SolutionCompiler"));
const UseCases = lazy(() => import("./pages/UseCases"));
const SolutionProviders = lazy(() => import("./pages/SolutionProviders"));
const TechnologyVendors = lazy(() => import("./pages/TechnologyVendors"));
const LegacyRedirect = lazy(() => import("./pages/LegacyRedirect"));
const TechnologyIntelligenceDetail = lazy(
  () => import("./pages/TechnologyIntelligenceDetail"),
);
const Verification = lazy(() => import("./pages/Verification"));
const IntelligenceWorkspace = lazy(
  () => import("./pages/IntelligenceWorkspace"),
);
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

const intelligenceWorkspaceRoutes = new Set([
  "/creator/implementations",
  "/creator/blueprints",
  "/creator/requests",
  "/app/requirements",
  "/app/solution-runs",
  "/provider/implementations",
  "/provider/compatibility",
  "/admin/implementations",
  "/admin/claims",
  "/admin/evidence",
  "/admin/attestations",
  "/admin/blueprints",
  "/admin/compatibility",
  "/admin/staleness",
  "/admin/audit",
]);

function SEO() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    const name =
      path === "/"
        ? "Use Cases, Builds and Solution Providers for the work you need done"
        : decodeURIComponent(
            path.split("/").filter(Boolean).at(-1) ?? "Discover",
          ).replaceAll("-", " ");
    document.title =
      name.charAt(0).toUpperCase() + name.slice(1) + " | Oracnet";
    const description = path.startsWith("/implementations/")
      ? `Explore the implementation context, architecture, evidence and reusable options for ${name} on Oracnet.`
      : path.startsWith("/blueprints/")
        ? `Explore the sanitized, versioned reference Blueprint ${name} on Oracnet.`
        : "Find Use Cases, Builds, Solution Providers, technologies and implementation evidence on Oracnet.";
    const canonical =
      "https://bt3113.github.io/OCNET" + (path === "/" ? "/" : path);
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.append(link);
    }
    link.href = canonical;
    for (const [key, value] of Object.entries({
      description,
      "og:title": document.title,
      "og:description": description,
      "og:url": canonical,
      "og:type": "website",
      "og:image": "https://bt3113.github.io/OCNET/media/workspace.svg",
      "twitter:card": "summary_large_image",
      "twitter:title": document.title,
      "twitter:description": description,
      robots:
        /^\/(app|creator\b|collections\b|provider\b|admin|verify\b|implementation\/new|sign-in|sign-up|forgot-password|onboarding)/.test(
          path,
        )
          ? "noindex,nofollow"
          : "index,follow",
    })) {
      let meta = document.querySelector<HTMLMetaElement>(
        `meta[${key.startsWith("og:") ? "property" : "name"}="${key}"]`,
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(key.startsWith("og:") ? "property" : "name", key);
        document.head.append(meta);
      }
      meta.content = value;
    }
    let script = document.getElementById("structured-data");
    if (!script) {
      script = document.createElement("script");
      script.id = "structured-data";
      script.setAttribute("type", "application/ld+json");
      document.head.append(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
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
            ...(path === "/"
              ? []
              : [{ "@type": "ListItem", position: 2, name, item: canonical }]),
          ],
        },
        ...(path.startsWith("/technologies/")
          ? [
              {
                "@type": "SoftwareApplication",
                name,
                description:
                  "Marketplace component profile. Confirm current product details with the provider.",
                applicationCategory: "BusinessApplication",
                url: canonical,
              },
            ]
          : []),
        ...(path.startsWith("/implementations/")
          ? [
              {
                "@type": "CaseStudy",
                name,
                description,
                url: canonical,
              },
            ]
          : []),
      ],
    });
  }, [location.pathname]);
  return null;
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <h1>Something interrupted this view</h1>
        <p>
          Reload to try again. If demo data is damaged, clear Oracnet site data
          in your browser.
        </p>
        <button
          className="button dark"
          onClick={() => window.location.reload()}
        >
          Reload application
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UIProvider>
          <MotionConfig reducedMotion="user">
            <BrowserRouter
              basename={import.meta.env.BASE_URL.replace(/\/$/, "")}
            >
              <SEO />
              <Suspense fallback={<Skeleton />}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="implementations" element={<ImplementationDiscovery />} />
                    <Route path="implementations/:slug" element={<ImplementationDetail />} />
                    <Route path="compare/implementations" element={<ImplementationCompare />} />
                    <Route path="blueprints" element={<Blueprints />} />
                    <Route path="blueprints/:slug" element={<Blueprints />} />
                    <Route path="solution-compiler" element={<SolutionCompiler />} />
                    <Route path="implementation/new" element={<ImplementationWizard />} />
                    <Route path="verify/:token" element={<Verification />} />
                    <Route path="use-cases" element={<UseCases />} />
                    <Route path="use-cases/:slug" element={<UseCases />} />
                    <Route path="solution-providers" element={<SolutionProviders />} />
                    <Route path="solution-providers/:slug" element={<SolutionProviders />} />
                    <Route path="technology-vendors" element={<TechnologyVendors />} />
                    <Route path="technology-vendors/:slug" element={<TechnologyVendors />} />
                    {/* Legacy people/company routes resolve to the two public concepts. */}
                    {["implementers", "integrators", "consultants", "creators", "providers"].map((p) => (
                      <Route key={p} path={p} element={<LegacyRedirect />} />
                    ))}
                    {["implementers", "integrators", "consultants", "creators", "providers"].map((p) => (
                      <Route key={p + "-slug"} path={p + "/:slug"} element={<LegacyRedirect />} />
                    ))}
                    <Route path="admin/use-cases" element={<UseCaseModeration />} />
                    <Route path="search" element={<SearchPage />} />
                    {["builds", "explore"].map((p) => (
                      <Route key={p} path={p} element={<BuildDiscovery />} />
                    ))}
                    <Route path="builds/:slug" element={<BuildDetail />} />
                    <Route path="collections" element={<Collections />} />
                    <Route path="collections/:slug" element={<Collections />} />
                    <Route path="creator/builds/new" element={<BuildWizard />} />
                    <Route path="creator/builds/:id/edit" element={<BuildWizard />} />
                    <Route path="creator/messages" element={<Workspace />} />
                    {[...intelligenceWorkspaceRoutes].map((p) => (
                      <Route key={p} path={p} element={<IntelligenceWorkspace />} />
                    ))}
                    {[
                      ...creatorRoutes.filter(
                        (p) =>
                          !p.endsWith("/new") &&
                          !p.endsWith("/messages") &&
                          !intelligenceWorkspaceRoutes.has(p),
                      ),
                      ...buildAdminRoutes.filter((p) => !intelligenceWorkspaceRoutes.has(p)),
                      ...buildProviderRoutes.filter((p) => !intelligenceWorkspaceRoutes.has(p)),
                    ].map((p) => (
                      <Route key={p} path={p} element={<BuildWorkspace />} />
                    ))}
                    {["solution-stacks", "technologies", "categories", "marketplace"].map((p) => (
                      <Route key={p} path={p} element={<Discovery />} />
                    ))}
                    <Route path="technologies/:slug" element={<TechnologyIntelligenceDetail />} />
                    {["solution-stacks", "categories"].map((p) => (
                      <Route key={p} path={p + "/:slug"} element={<Details />} />
                    ))}
                    {["compare", "app/compare"].map((p) => (
                      <Route key={p} path={p} element={<Compare />} />
                    ))}
                    {[...buyerRoutes, ...providerRoutes, ...adminRoutes]
                      .filter(
                        (p) =>
                          p !== "/app/compare" &&
                          p !== "/admin/use-cases" &&
                          !intelligenceWorkspaceRoutes.has(p),
                      )
                      .map((p) => (
                        <Route key={p} path={p} element={<Workspace />} />
                      ))}
                    <Route path="app/projects/:id" element={<Workspace />} />
                    <Route path="provider/listings/:id" element={<Workspace />} />
                    {authRoutes.map((p) => (
                      <Route key={p} path={p} element={<Auth />} />
                    ))}
                    {[
                      "updates",
                      "resources",
                      "about",
                      "how-it-works",
                      "pricing",
                      "contact",
                      "press",
                      "careers",
                      "security",
                      "trust",
                      "accessibility",
                      "terms",
                      "privacy",
                      "cookies",
                      "marketplace-terms",
                    ].map((p) => (
                      <Route key={p} path={p} element={<Content />} />
                    ))}
                    <Route path="updates/:slug" element={<Content />} />
                    <Route path="resources/:slug" element={<Content />} />
                    <Route path="*" element={<EmptyState title="Page not found" />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </MotionConfig>
        </UIProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
