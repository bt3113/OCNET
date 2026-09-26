import { Navigate, useLocation, useParams } from "react-router-dom";
import { Skeleton } from "../components/ui";
import { useMarketplace } from "../data/marketplace-hooks";
import { findSolutionProvider } from "../data/solution-providers";

/**
 * Old public people/company routes (/implementers, /integrators, /consultants,
 * /creators, /providers) resolve to the two public concepts: Solution Providers and
 * Technology Vendors. Deep links keep working.
 */
export default function LegacyRedirect() {
  const { slug } = useParams();
  const { pathname, search } = useLocation();
  const market = useMarketplace();
  const section = pathname.split("/")[1];
  if (section === "providers") return <Navigate replace to={slug ? `/technology-vendors/${slug}${search}` : "/technology-vendors"} />;
  if (!slug) return <Navigate replace to="/solution-providers" />;
  if (market.isLoading) return <Skeleton />;
  const provider = findSolutionProvider(market.providers, `/${section}/${slug}`);
  return <Navigate replace to={provider ? `/solution-providers/${provider.slug}` : "/solution-providers"} />;
}
