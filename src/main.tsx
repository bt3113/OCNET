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
const BuildDiscovery = lazy(() => import("./pages/BuildDiscovery"));
const BuildDetail = lazy(() => import("./pages/BuildDetail"));
const Creators = lazy(() => import("./pages/Creators"));
const Collections = lazy(() => import("./pages/Collections"));
const BuildWorkspace = lazy(() => import("./pages/BuildWorkspace"));
const BuildWizard = lazy(() => import("./pages/BuildWizard"));
const Home = lazy(() => import("./pages/Home"));
const Discovery = lazy(() => import("./pages/Discovery"));
const Details = lazy(() => import("./pages/Details"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Compare = lazy(() => import("./pages/Compare"));
const Content = lazy(() => import("./pages/Content"));
const Auth = lazy(() => import("./pages/Auth"));
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});
function SEO() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    const name =
      path === "/"
        ? "Find the right technology for what you want to build"
        : decodeURIComponent(
            path.split("/").filter(Boolean).at(-1) ?? "Discover",
          ).replaceAll("-", " ");
    document.title =
      name.charAt(0).toUpperCase() + name.slice(1) + " | Oracnet";
    const description =
      "Explore " +
      name +
      " on Oracnet. Discover technologies and expert partners around your business outcome.";
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
      description: description,
      "og:title": document.title,
      "og:description": description,
      "og:url": canonical,
      "og:type": "website",
      "og:image": "https://bt3113.github.io/OCNET/media/workspace.svg",
      "twitter:card": "summary_large_image",
      "twitter:title": document.title,
      "twitter:description": description,
      robots:
        /^\/(app|creator\b|collections\b|provider\b|admin|sign-in|sign-up|forgot-password|onboarding)/.test(
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
                  "Demo marketplace listing. Confirm details with the provider.",
                applicationCategory: "BusinessApplication",
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
                    {["builds", "explore", "search"].map((p) => (
                      <Route key={p} path={p} element={<BuildDiscovery />} />
                    ))}
                    <Route path="builds/:slug" element={<BuildDetail />} />
                    <Route path="creators" element={<Creators />} />
                    <Route path="creators/:slug" element={<Creators />} />
                    <Route path="collections" element={<Collections />} />
                    <Route path="collections/:slug" element={<Collections />} />
                    <Route
                      path="creator/builds/new"
                      element={<BuildWizard />}
                    />
                    <Route
                      path="creator/builds/:id/edit"
                      element={<BuildWizard />}
                    />
                    <Route path="creator/messages" element={<Workspace />} />
                    {[
                      ...creatorRoutes.filter(
                        (p) => !p.endsWith("/new") && !p.endsWith("/messages"),
                      ),
                      ...buildAdminRoutes,
                      ...buildProviderRoutes,
                    ].map((p) => (
                      <Route key={p} path={p} element={<BuildWorkspace />} />
                    ))}
                    {[
                      "use-cases",
                      "solution-stacks",
                      "technologies",
                      "categories",
                      "providers",
                      "integrators",
                      "consultants",
                      "marketplace",
                    ].map((p) => (
                      <Route key={p} path={p} element={<Discovery />} />
                    ))}
                    {[
                      "use-cases",
                      "solution-stacks",
                      "technologies",
                      "categories",
                      "providers",
                      "integrators",
                      "consultants",
                    ].map((p) => (
                      <Route
                        key={p}
                        path={p + "/:slug"}
                        element={<Details />}
                      />
                    ))}
                    {["compare", "app/compare"].map((p) => (
                      <Route key={p} path={p} element={<Compare />} />
                    ))}
                    {[...buyerRoutes, ...providerRoutes, ...adminRoutes]
                      .filter((p) => p !== "/app/compare")
                      .map((p) => (
                        <Route key={p} path={p} element={<Workspace />} />
                      ))}
                    <Route path="app/projects/:id" element={<Workspace />} />
                    <Route
                      path="provider/listings/:id"
                      element={<Workspace />}
                    />
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
                    <Route
                      path="*"
                      element={<EmptyState title="Page not found" />}
                    />
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
