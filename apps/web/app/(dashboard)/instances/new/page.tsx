"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function NewInstancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    instanceName: "",
    apiUrl: "https://evo.marconlabs.com.br",
    apiKey: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.createInstance(formData);
      router.push("/instances");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: "24px" }}>🔗 Conectar Instância WhatsApp</h1>

      <div className="card" style={{ maxWidth: "500px" }}>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              Nome da Instância
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="ex: Loja Principal"
              required
              style={{ width: "100%" }}
            />
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
              Nome amigável para você identificar
            </p>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              Instance Name (Evolution API)
            </label>
            <input
              type="text"
              name="instanceName"
              value={formData.instanceName}
              onChange={handleInputChange}
              placeholder="ex: mesalvai"
              required
              style={{ width: "100%" }}
            />
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
              Nome exato da instância na Evolution API
            </p>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              URL da Evolution API
            </label>
            <input
              type="url"
              name="apiUrl"
              value={formData.apiUrl}
              onChange={handleInputChange}
              placeholder="https://evo.marconlabs.com.br"
              required
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              API Key
            </label>
            <input
              type="password"
              name="apiKey"
              value={formData.apiKey}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              style={{ width: "100%" }}
            />
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
              Sua chave de autenticação na Evolution API
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.back()}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? "Conectando..." : "🔌 Conectar"}
            </button>
          </div>
        </form>

        <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "var(--color-border)", borderRadius: "4px" }}>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            <strong>Dica:</strong> Você pode obter a URL e API Key do seu painel de Evolution API.
          </p>
        </div>
      </div>
    </div>
  );
}
