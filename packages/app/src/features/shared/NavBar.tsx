import { navigate, type RoutePath } from "../../lib/router";

interface NavBarProps {
  currentPath: RoutePath;
}

interface NavItem {
  label: string;
  path: RoutePath;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",    path: "/dashboard",   icon: "⌂"  },
  { label: "Lessons", path: "/lessons",     icon: "📖" },
  { label: "Goals",   path: "/objectives",  icon: "🎯" },
  { label: "Shop",    path: "/shop",        icon: "🛍️" },
  { label: "Profile", path: "/profile",     icon: "👤" },
];

/** Returns true if the current path is "within" the nav item's section. */
function isActive(currentPath: RoutePath, navPath: RoutePath): boolean {
  if (navPath === "/dashboard") {
    return currentPath === "/dashboard";
  }
  // Strip leading slash for prefix matching
  const section = navPath.slice(1); // e.g. "lessons"
  return currentPath === navPath || currentPath.startsWith(`/${section}/`) || currentPath.startsWith(`/${section}:`);
}

export function NavBar({ currentPath }: NavBarProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(currentPath, item.path);
        return (
          <button
            key={item.path}
            className={`bottom-nav-item${active ? " active" : ""}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
