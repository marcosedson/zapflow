"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export function Navbar() {
  const { user, logout } = useAuth();
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
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", fontSize: "20px", fontWeight: "bold", color: "#0066cc" }}>
            🚀 ZapFlow
          </Link>

          <div style={{ display: "flex", gap: "24px" }}>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/campaigns">Campanhas</Link>
            <Link href="/instances">Instâncias</Link>
            <Link href="/contacts">Contatos</Link>
            <Link href="/analytics">Analytics</Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "14px", color: "#666" }}>{user?.email}</span>
            <button className="btn-secondary" style={{ padding: "6px 12px" }} onClick={handleLogout}>
              Sair
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
