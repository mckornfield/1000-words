import { navigate, getParentRoute, getRouteBreadcrumbLabel, type RoutePath, type RouteParams } from "../../lib/router";

interface BreadcrumbProps {
  currentPath: RoutePath;
  params?: RouteParams;
  /** Optional override labels for parameterized segments */
  labels?: {
    lessonTitle?: string;
    achievementTitle?: string;
    itemName?: string;
  };
}

export function Breadcrumb({ currentPath, params = {}, labels = {} }: BreadcrumbProps) {
  // Build the chain from root → current
  const chain: RoutePath[] = [];
  let p: RoutePath | null = currentPath;
  while (p) {
    chain.unshift(p);
    p = getParentRoute(p);
  }

  // Don't render a breadcrumb on top-level pages (dashboard, login)
  if (chain.length <= 1) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {chain.map((route, idx) => {
        const isLast = idx === chain.length - 1;
        const label = getRouteBreadcrumbLabel(route, params, labels);

        if (isLast) {
          return (
            <span key={route} className="breadcrumb-current" aria-current="page">
              {label}
            </span>
          );
        }

        return (
          <span key={route} style={{ display: "contents" }}>
            <button
              className="breadcrumb-link"
              onClick={() => navigate(route, params)}
              aria-label={`Go to ${label}`}
            >
              {label}
            </button>
            <span className="breadcrumb-sep" aria-hidden="true">›</span>
          </span>
        );
      })}
    </nav>
  );
}
