"use client";

import { useAuth } from "@/lib/auth-context";
import { useDarkMode } from "@/lib/use-dark-mode";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const router = useRouter();
  const pathname = usePathname();

  if (!user || pathname.includes("/login")) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header>
      <div className="container">
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", fontSize: "20px", fontWeight: "bold", color: "var(--color-primary)", whiteSpace: "nowrap" }}>
            🚀 ZapFlow
          </Link>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/campaigns">Campanhas</Link>
            <Link href="/instances">Instâncias</Link>
            <Link href="/contacts">Contatos</Link>
            <Link href="/analytics">Analytics</Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button className="dark-mode-toggle" onClick={toggle} title="Toggle dark mode">
              {isDark ? "☀️" : "🌙"}
            </button>
            <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>{user?.email}</span>
            <button className="btn-secondary btn-small" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
