"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Analytics {
  totalSent: number;
  totalFailed: number;
  avgPerDay: number;
  peakDay: { date: string; count: number };
  dailyBreakdown: Array<{
    date: string;
    sent: number;
    failed: number;
    total: number;
  }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!user) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await api.getAnalytics();
        setData(response.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div className="spinner"></div>
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

  if (!data) return null;

  return (
    <div className="container">
      <h1 style={{ marginBottom: "24px" }}>📈 Analytics (Últimos 30 dias)</h1>

      {/* Stats Cards */}
      <div className="grid">
        <div className="card">
          <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
            Total Enviadas
          </h3>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#28a745" }}>
            {data.totalSent.toLocaleString("pt-BR")}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
            Total com Falha
          </h3>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#dc3545" }}>
            {data.totalFailed.toLocaleString("pt-BR")}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
            Média por Dia
          </h3>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#0066cc" }}>
            {data.avgPerDay}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
            Dia com Pico
          </h3>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>
            {new Date(data.peakDay.date).toLocaleDateString("pt-BR")}
          </div>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            {data.peakDay.count} mensagens
          </p>
        </div>
      </div>

      {/* Daily Breakdown - Chart */}
      <div className="card">
        <h3 className="card-title">📊 Envios por Dia</h3>
        {data.dailyBreakdown.length > 0 ? (
          <>
            <div style={{ height: "300px", display: "flex", alignItems: "flex-end", justifyContent: "space-around", marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid var(--color-border)" }}>
              {data.dailyBreakdown.map((day, idx) => {
                const maxCount = data.peakDay.count || 1;
                const height = (day.total / maxCount) * 200;
                return (
                  <div key={idx} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        height: `${height}px`,
                        width: "30px",
                        backgroundColor: "#0066cc",
                        borderRadius: "4px 4px 0 0",
                        marginBottom: "8px",
                      }}
                      title={`${day.total} (${day.sent} enviadas, ${day.failed} falhadas)`}
                    />
                    <p style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>
                      {new Date(day.date).getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Enviadas</th>
                    <th>Falhadas</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyBreakdown.map((day, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: "12px" }}>{new Date(day.date).toLocaleDateString("pt-BR")}</td>
                      <td style={{ color: "#28a745", fontWeight: "600" }}>{day.sent}</td>
                      <td style={{ color: "#dc3545", fontWeight: "600" }}>{day.failed}</td>
                      <td>{day.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>Nenhum dado disponível.</p>
        )}
      </div>

      {/* Insights */}
      <div className="card">
        <h3 className="card-title">💡 Insights</h3>
        <ul style={{ paddingLeft: "20px" }}>
          <li>Taxa de sucesso: {data.totalSent > 0 ? Math.round((data.totalSent / (data.totalSent + data.totalFailed)) * 100) : 0}%</li>
          <li>Média diária: {data.avgPerDay} mensagens</li>
          <li>Melhor dia: {new Date(data.peakDay.date).toLocaleDateString("pt-BR")} com {data.peakDay.count} envios</li>
        </ul>
      </div>
    </div>
  );
}
