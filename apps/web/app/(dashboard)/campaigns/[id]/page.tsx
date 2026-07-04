"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCampaignProgress } from "@/lib/use-campaign-progress";
import { api } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
  status: string;
  messageType: string;
  content: string;
  createdAt: string;
  instance: { name: string };
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { data: progress, loading: progressLoading } = useCampaignProgress(campaignId, !!user);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!user || !campaignId) return;

    const fetchCampaign = async () => {
      try {
        const response = await api.getCampaign(campaignId);
        setCampaign(response.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [user, authLoading, campaignId, router]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await api.startCampaign(campaignId);
      setCampaign((prev) => prev ? { ...prev, status: "running" } : null);
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await api.pauseCampaign(campaignId);
      setCampaign((prev) => prev ? { ...prev, status: "paused" } : null);
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="container">
        <div className="alert alert-error">{error || "Campanha não encontrada"}</div>
      </div>
    );
  }

  const total = (progress?.stats.sent || 0) + (progress?.stats.failed || 0) + (progress?.stats.pending || 0);
  const percentage = total > 0 ? Math.round(((progress?.stats.sent || 0) / total) * 100) : 0;

  return (
    <div className="container">
      <button className="btn-secondary btn-small" onClick={() => router.back()} style={{ marginBottom: "16px" }}>
        ← Voltar
      </button>

      <h1 style={{ marginBottom: "24px" }}>{campaign.name}</h1>

      <div className="grid">
        {/* Status Card */}
        <div className="card">
          <h3 style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
            Status
          </h3>
          <div style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "16px" }}>
            <span className={`badge badge-${getStatusColor(campaign.status)}`} style={{ fontSize: "14px" }}>
              {campaign.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Envios Card */}
        <div className="card">
          <h3 style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
            Enviadas
          </h3>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#28a745" }}>
            {progress?.stats.sent || 0}
          </div>
        </div>

        {/* Falhadas Card */}
        <div className="card">
          <h3 style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
            Falhadas
          </h3>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#dc3545" }}>
            {progress?.stats.failed || 0}
          </div>
        </div>

        {/* Pendentes Card */}
        <div className="card">
          <h3 style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
            Pendentes
          </h3>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ffc107" }}>
            {progress?.stats.pending || 0}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="card">
          <h3 className="card-title">Progresso</h3>
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                height: "30px",
                backgroundColor: "var(--color-border)",
                borderRadius: "4px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  backgroundColor: "#28a745",
                  width: `${percentage}%`,
                  transition: "width 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                {percentage > 10 && `${percentage}%`}
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
              {progress?.stats.sent || 0} de {total} mensagens enviadas
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      {campaign.status === "draft" && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button className="btn-primary" onClick={handleStart} disabled={actionLoading}>
            {actionLoading ? "Iniciando..." : "▶ Iniciar Envios"}
          </button>
        </div>
      )}

      {campaign.status === "running" && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button className="btn-secondary" onClick={handlePause} disabled={actionLoading}>
            {actionLoading ? "Pausando..." : "⏸ Pausar"}
          </button>
        </div>
      )}

      {/* Details */}
      <div className="card">
        <h3 className="card-title">Detalhes</h3>
        <table>
          <tbody>
            <tr>
              <td style={{ fontWeight: "600", width: "150px" }}>Instância</td>
              <td>{campaign.instance.name}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "600" }}>Tipo</td>
              <td>{campaign.messageType}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "600" }}>Criada em</td>
              <td>{new Date(campaign.createdAt).toLocaleDateString("pt-BR")}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "600" }} colSpan={2}>
                Mensagem
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "var(--color-border)", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px" }}>
          {campaign.content}
        </div>
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
