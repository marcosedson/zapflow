import axios, { AxiosInstance } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_BFF_URL || "http://localhost:3001";

let apiClient: AxiosInstance | null = null;

export function initializeAPI(token: string): AxiosInstance {
  apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return apiClient;
}

export function getAPI(): AxiosInstance {
  if (!apiClient) {
    throw new Error("API client not initialized. Call initializeAPI first.");
  }
  return apiClient;
}

// API Methods
export const api = {
  // Dashboard
  getDashboard: () => getAPI().get("/api/dashboard"),
  getAnalytics: () => getAPI().get("/api/dashboard/analytics"),
  getInstanceHealth: (instanceId?: string) =>
    getAPI().get("/api/dashboard/instance-health", {
      params: { instanceId },
    }),

  // Instances
  getInstances: () => getAPI().get("/api/instances"),
  getInstance: (id: string) => getAPI().get(`/api/instances/${id}`),
  createInstance: (data: any) => getAPI().post("/api/instances", data),
  updateInstance: (id: string, data: any) =>
    getAPI().put(`/api/instances/${id}`, data),
  deleteInstance: (id: string) => getAPI().delete(`/api/instances/${id}`),
  getInstanceQR: (id: string) => getAPI().get(`/api/instances/${id}/qr`),
  checkInstanceHealth: (id: string) =>
    getAPI().get(`/api/instances/${id}/check-health`),

  // Contacts
  getContacts: (skip = 0, take = 50, optedOut = false) =>
    getAPI().get("/api/contacts", { params: { skip, take, optedOut } }),
  searchContacts: (q: string) =>
    getAPI().get("/api/contacts/search", { params: { q } }),
  importContacts: (contacts: any[]) =>
    getAPI().post("/api/contacts/import", { contacts }),
  updateContact: (id: string, data: any) =>
    getAPI().put(`/api/contacts/${id}`, data),
  deleteContact: (id: string) => getAPI().delete(`/api/contacts/${id}`),
  optOutContact: (id: string) => getAPI().post(`/api/contacts/${id}/opt-out`),

  // Campaigns
  getCampaigns: (status?: string, skip = 0, take = 20) =>
    getAPI().get("/api/campaigns", { params: { status, skip, take } }),
  getCampaign: (id: string, skip = 0, take = 50) =>
    getAPI().get(`/api/campaigns/${id}`, { params: { skip, take } }),
  createCampaign: (data: any) => getAPI().post("/api/campaigns", data),
  updateCampaign: (id: string, data: any) =>
    getAPI().put(`/api/campaigns/${id}`, data),
  deleteCampaign: (id: string) => getAPI().delete(`/api/campaigns/${id}`),
  addRecipients: (id: string, data: any) =>
    getAPI().post(`/api/campaigns/${id}/add-recipients`, data),
  startCampaign: (id: string) => getAPI().post(`/api/campaigns/${id}/start`),
  pauseCampaign: (id: string) => getAPI().post(`/api/campaigns/${id}/pause`),
};
