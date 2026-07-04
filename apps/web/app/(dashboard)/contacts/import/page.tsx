"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface ParsedContact {
  name: string;
  phone: string;
  tags?: string[];
}

export default function ImportContactsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [preview, setPreview] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        const parsed: ParsedContact[] = [];

        for (const line of lines) {
          // Suportar: "Nome\t+5534999999999" ou "Nome,+5534999999999"
          const parts = line.split(/[\t,]/);
          if (parts.length < 2) continue;

          parsed.push({
            name: parts[0].trim(),
            phone: parts[1].trim(),
            tags: parts[2]?.split(";").map((t) => t.trim()) || [],
          });
        }

        if (parsed.length === 0) {
          setError("Nenhum contato encontrado no arquivo");
          return;
        }

        setContacts(parsed);
        setPreview(true);
      } catch (err: any) {
        setError(err.message);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (contacts.length === 0) {
      setError("Nenhum contato para importar");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.importContacts(contacts);
      setSuccess(
        `✓ ${response.data.imported} contatos importados, ${response.data.skipped} duplicados, ${response.data.invalid} inválidos`
      );
      setContacts([]);
      setPreview(false);

      setTimeout(() => {
        router.push("/contacts");
      }, 2000);
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
      <h1 style={{ marginBottom: "24px" }}>📥 Importar Contatos</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card" style={{ maxWidth: "600px" }}>
        {!preview ? (
          <>
            <h3 style={{ marginBottom: "16px" }}>Escolha seu arquivo CSV</h3>

            <div
              style={{
                border: "2px dashed var(--color-border)",
                borderRadius: "8px",
                padding: "40px",
                textAlign: "center",
                cursor: "pointer",
                marginBottom: "24px",
              }}
            >
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="file-input"
              />
              <label
                htmlFor="file-input"
                style={{ cursor: "pointer", display: "block" }}
              >
                <p style={{ fontSize: "24px", marginBottom: "8px" }}>📄</p>
                <p style={{ fontWeight: "600" }}>Clique para selecionar</p>
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  ou arraste o arquivo aqui
                </p>
              </label>
            </div>

            <div style={{ backgroundColor: "var(--color-border)", padding: "12px", borderRadius: "4px", marginTop: "16px" }}>
              <p style={{ fontSize: "12px" }}>
                <strong>Formato esperado:</strong>
              </p>
              <p style={{ fontSize: "11px", fontFamily: "monospace", marginTop: "4px" }}>
                João Silva	5534999999999<br />
                Maria Santos	(34) 99999-9999<br />
                Pedro Costa	34 99999-9999
              </p>
              <p style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
                Use TAB, vírgula ou espaço como separador. Suporta: nome + telefone + tags (opcional)
              </p>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ marginBottom: "16px" }}>
              Preview: {contacts.length} contatos
            </h3>

            <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "24px" }}>
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.slice(0, 10).map((c, idx) => (
                    <tr key={idx}>
                      <td>{c.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{c.phone}</td>
                      <td style={{ fontSize: "12px" }}>
                        {c.tags?.join(", ") || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {contacts.length > 10 && (
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
                  ... e mais {contacts.length - 10}
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPreview(false)}
                style={{ flex: 1 }}
              >
                ← Voltar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleImport}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "Importando..." : "✓ Importar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
