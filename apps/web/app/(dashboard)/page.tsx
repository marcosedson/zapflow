"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface DashboardData {
  campaigns: Record<string, number>;
  instances: {
    total: number;
    connected: number;
    avgHealthScore: number;
  };
  contacts: {
    active: number;
    optedOut: number;
  };
  daily: {
    sent: number;
    failed: number;
    remaining: number;
    limit: number;
  };
  plan: {
    name: string;
    dailyLimit: number;
    instanceLimit: number;
  };
  recentCampaigns: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!user) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.getDashboard();
        setData(response.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div className="spinner"></div>
        <p style={{ marginTop: "16px" }}>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "24px" }}>📊 Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid">
        <div className="card">
          <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
            Campanhas
          </h3>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#0066cc" }}>
            {Object.values(data.campaigns).reduce((a, b) => a + b, 0)}
          </div>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            {data.campaigns.running} em execução • {data.campaigns.completed} concluídas
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
            Instâncias
          </h3>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#28a745" }}>
            {data.instances.connected}/{data.instances.total}
          </div>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            Health Score: {data.instances.avgHealthScore}%
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
            Contatos
          </h3>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ffc107" }}>
            {data.contacts.active}
          </div>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            {data.contacts.optedOut} opt-out
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
            Uso Hoje
          </h3>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#17a2b8" }}>
            {data.daily.sent}/{data.daily.limit}
          </div>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            {data.daily.remaining} restantes
          </p>
        </div>
      </div>

      {/* Plan Info */}
      <div className="card">
        <h3 className="card-title">📦 Seu Plano</h3>
        <p>
          <strong>{data.plan.name}</strong> • {data.plan.dailyLimit} msgs/dia • {data.plan.instanceLimit} instâncias
        </p>
      </div>

      {/* Recent Campaigns */}
      {data.recentCampaigns.length > 0 && (
        <div className="card">
          <h3 className="card-title">📬 Campanhas Recentes</h3>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Instância</th>
                <th>Status</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {data.recentCampaigns.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.instance.name}</td>
                  <td>
                    <span className={`badge badge-${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{c.messageType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Links */}
      <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
        <a href="/campaigns">
          <button className="btn-primary">Campanhas →</button>
        </a>
        <a href="/instances">
          <button className="btn-secondary">Instâncias →</button>
        </a>
        <a href="/contacts">
          <button className="btn-secondary">Contatos →</button>
        </a>
        <a href="/analytics">
          <button className="btn-secondary">Analytics →</button>
        </a>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "success";
    case "running":
      return "info";
    case "paused":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "info";
  }
}
