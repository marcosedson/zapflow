"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  optedOut: boolean;
}

export default function ContactsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!user) return;

    const fetchContacts = async () => {
      try {
        setLoading(true);
        const response = await api.getContacts(0, 100);
        setContacts(response.data.contacts);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
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
        <h1>👥 Contatos</h1>
        <button className="btn-primary" onClick={() => router.push("/contacts/import")}>
          📥 Importar Contatos
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {contacts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p>Nenhum contato importado.</p>
          <button
            className="btn-primary"
            onClick={() => router.push("/contacts/import")}
            style={{ marginTop: "16px" }}
          >
            Importar Contatos
          </button>
        </div>
      ) : (
        <div>
          <div className="card" style={{ marginBottom: "16px", padding: "12px" }}>
            Total: <strong>{contacts.length}</strong> contatos
          </div>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Tags</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td style={{ fontFamily: "monospace" }}>{c.phone}</td>
                  <td>
                    {c.tags.map((tag) => (
                      <span key={tag} className="badge badge-info" style={{ marginRight: "4px" }}>
                        {tag}
                      </span>
                    ))}
                  </td>
                  <td>
                    {c.optedOut ? (
                      <span className="badge badge-danger">opt-out</span>
                    ) : (
                      <span className="badge badge-success">ativo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
