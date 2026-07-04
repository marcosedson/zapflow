"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Instance {
  id: string;
  name: string;
  status: string;
  healthScore: number;
  warmupDay: number;
  healthStatus: string;
}

export default function InstancesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!user) return;

    const fetchInstances = async () => {
      try {
        setLoading(true);
        const response = await api.getInstances();
        setInstances(response.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInstances();
  }, [user, authLoading, router]);

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
        <h1>🔌 Instâncias WhatsApp</h1>
        <button className="btn-primary" onClick={() => router.push("/instances/new")}>
          + Conectar Instância
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {instances.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p>Nenhuma instância conectada.</p>
          <button
            className="btn-primary"
            onClick={() => router.push("/instances/new")}
            style={{ marginTop: "16px" }}
          >
            Conectar Primeira Instância
          </button>
        </div>
      ) : (
        <div className="grid">
          {instances.map((inst) => (
            <div key={inst.id} className="card">
              <h3 style={{ marginBottom: "12px" }}>{inst.name}</h3>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`badge badge-${inst.status === "connected" ? "success" : "danger"}`}>
                  {inst.status}
                </span>
              </p>
              <p>
                <strong>Saúde:</strong> {inst.healthScore}%
              </p>
              <p>
                <strong>Warm-up:</strong> Dia {inst.warmupDay}/30
              </p>
              <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                  Ver
                </button>
                <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                  QR Code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
