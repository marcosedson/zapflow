"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Instance {
  id: string;
  name: string;
  status: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    instanceId: "",
    messageType: "text",
    content: "",
    mediaUrl: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!user) return;

    const fetchInstances = async () => {
      try {
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNextStep = () => {
    if (step === 1 && !formData.name) {
      setError("Nome da campanha é obrigatório");
      return;
    }
    if (step === 2 && !formData.instanceId) {
      setError("Selecione uma instância");
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setError("");
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await api.createCampaign(formData);
      router.push(`/campaigns/${response.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
      <h1 style={{ marginBottom: "24px" }}>✨ Nova Campanha</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ maxWidth: "600px" }}>
        {/* Progress Steps */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px" }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: "4px",
                backgroundColor: s <= step ? "var(--color-primary)" : "var(--color-border)",
                marginRight: "8px",
                borderRadius: "2px",
              }}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Step 1: Informações Básicas */}
          {step === 1 && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Nome da Campanha
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="ex: Flash Sale Março"
                  style={{ width: "100%" }}
                />
              </div>
              <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
                Passo 1 de 3: Informações Básicas
              </p>
            </>
          )}

          {/* Step 2: Instância */}
          {step === 2 && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Qual instância usar?
                </label>
                <select
                  name="instanceId"
                  value={formData.instanceId}
                  onChange={handleInputChange}
                  style={{ width: "100%" }}
                >
                  <option value="">Selecione uma instância</option>
                  {instances.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} {inst.status !== "connected" && `(${inst.status})`}
                    </option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
                Passo 2 de 3: Selecione Instância
              </p>
            </>
          )}

          {/* Step 3: Mensagem */}
          {step === 3 && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Tipo de Mensagem
                </label>
                <select
                  name="messageType"
                  value={formData.messageType}
                  onChange={handleInputChange}
                  style={{ width: "100%" }}
                >
                  <option value="text">Texto</option>
                  <option value="image">Imagem</option>
                  <option value="audio">Áudio</option>
                  <option value="document">Documento</option>
                  <option value="video">Vídeo</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Mensagem (use {{"{{"}}nome{{"}}"}}) para personalizar)
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Opa {{nome}}! Confira nossos produtos..."
                  style={{ width: "100%", minHeight: "120px" }}
                />
              </div>

              {formData.messageType !== "text" && (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                    URL da Mídia
                  </label>
                  <input
                    type="url"
                    name="mediaUrl"
                    value={formData.mediaUrl}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
                Passo 3 de 3: Mensagem
              </p>
            </>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            {step > 1 && (
              <button type="button" className="btn-secondary" onClick={handlePrevStep}>
                ← Voltar
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={handleNextStep}
                style={{ flex: 1 }}
              >
                Próximo →
              </button>
            ) : (
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ flex: 1 }}
              >
                {submitting ? "Criando..." : "✓ Criar Campanha"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
