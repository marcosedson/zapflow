"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
  status: string;
  messageType: string;
  stats: Record<string, number>;
  createdAt: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!user) return;

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const response = await api.getCampaigns();
        setCampaigns(response.data.campaigns);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [user, authLoading, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta campanha?")) return;

    try {
      await api.deleteCampaign(id);
      setCampaigns(campaigns.filter((c) => c.id !== id));
    } catch (err: any) {
      alert("Erro ao deletar: " + err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1>📬 Campanhas</h1>
        <button className="btn-primary" onClick={() => router.push("/campaigns/new")}>
          + Nova Campanha
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p>Nenhuma campanha ainda.</p>
          <button
            className="btn-primary"
            onClick={() => router.push("/campaigns/new")}
            style={{ marginTop: "16px" }}
          >
            Criar Primeira Campanha
          </button>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Status</th>
              <th>Tipo</th>
              <th>Enviadas</th>
              <th>Falhadas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <span className={`badge badge-${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td>{c.messageType}</td>
                <td>{c.stats.sent || 0}</td>
                <td>{c.stats.failed || 0}</td>
                <td>
                  <button
                    className="btn-secondary"
                    onClick={() => router.push(`/campaigns/${c.id}`)}
                    style={{ marginRight: "8px", padding: "4px 8px", fontSize: "12px" }}
                  >
                    Ver
                  </button>
                  {(c.status === "draft" || c.status === "paused") && (
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(c.id)}
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                      Deletar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
