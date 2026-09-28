"use client";
import { useEffect } from "react";
import { useUiStore } from "../stores/useUiStore";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button, Spinner } from "@heroui/react";
import { EynLoader } from "@eyn/ui/EynLoader";
import { useMerchantCacheScope } from "./MerchantCache";
import {
  ShieldCheck,
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Settings,
  ArrowUpRight,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import { Brand } from "./Brand";
import { useLogout } from "../hooks/useLogout";
export function Shell({
  children,
  storeId,
}: {
  children: (cacheScope: string) => React.ReactNode;
  storeId?: number;
}) {
  const path = usePathname();
  const {
    theme,
    sidebarOpen: open,
    toggleTheme,
    toggleSidebar,
    closeSidebar,
  } = useUiStore();
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, closeSidebar]);
  const dark = theme === "dark";
  const cacheScope = useMerchantCacheScope();
  const logout = useLogout();

  const base = storeId ? `/stores/${storeId}` : "/stores";
  const nav = [
    { href: "/stores", label: "Your stores", icon: Store },
    ...(storeId
      ? [
          { href: base, label: "Overview", icon: LayoutDashboard },
          { href: `${base}/products`, label: "Products", icon: Package },
          { href: `${base}/orders`, label: "Orders", icon: ShoppingBag },
          { href: `${base}/settings`, label: "Store settings", icon: Settings },
        ]
      : []),
  ];
  return (
    <div className="app-shell">
      {logout.isPending && <EynLoader label="Signing out" />}
      <aside
        id="workspace-navigation"
        className={`sidebar ${open ? "open" : ""}`}
      >
        <Brand />
        <div className="workspace-label">MERCHANT WORKSPACE</div>
        <nav aria-label="Workspace navigation">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
              aria-current={path === href ? "page" : undefined}
              onClick={closeSidebar}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
              {path === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="sidebar-note-heading">
            <span className="gold-dot" />
            <ArrowUpRight size={18} aria-hidden="true" />
          </div>
          <strong>Built for your next big idea.</strong>
          <p>
            Your brand. Your store.
            <br />
            Your way forward.
          </p>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">E</span>
          <div>
            EYN workspace
            <small>
              Merchant account
            </small>
          </div>
          <Button
            isIconOnly
            variant="ghost"
            aria-label="Sign out"
            isPending={logout.isPending}
            isDisabled={logout.isPending}
            onPress={logout.logout}
          >
            {logout.isPending ? <Spinner size="sm" /> : <LogOut size={17} />}
          </Button>
        </div>
      </aside>
      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <Button
            className="mobile-toggle"
            variant="ghost"
            isIconOnly
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="workspace-navigation"
            onPress={toggleSidebar}
          >
            {open ? <X /> : <Menu />}
          </Button>
          <span>
            Workspace{" "}
            <span className="crumb">
              / {storeId ? "Store management" : "Your stores"}
            </span>
          </span>
          <div className="top-actions">
            <span className="private-badge">
              <ShieldCheck size={14} aria-hidden="true" /> Your business,
              connected
            </span>
            <Button
              variant="ghost"
              isIconOnly
              aria-label={
                dark ? "Switch to light theme" : "Switch to dark theme"
              }
              onPress={toggleTheme}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <span className="avatar small">E</span>
          </div>
        </header>
        <main className="content">
          {children(cacheScope)}
        </main>
        <footer>
          EYN <span>Everything you need. For everything you’re building.</span>
          <span>© {new Date().getFullYear()} EYN</span>
        </footer>
      </div>
    </div>
  );
}
