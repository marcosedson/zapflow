import { useEffect, useState } from "react";
import { api } from "./api";

interface CampaignProgress {
  id: string;
  status: string;
  stats: {
    sent: number;
    failed: number;
    pending: number;
  };
}

export function useCampaignProgress(campaignId: string, enabled = true) {
  const [data, setData] = useState<CampaignProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !campaignId) return;

    // Polling a cada 2 segundos
    const interval = setInterval(async () => {
      try {
        const response = await api.getCampaign(campaignId);
        setData({
          id: response.data.id,
          status: response.data.status,
          stats: {
            sent: response.data.stats.sent || 0,
            failed: response.data.stats.failed || 0,
            pending: response.data.stats.pending || 0,
          },
        });
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
      }
    }, 2000);

    // Fetch imediato
    (async () => {
      try {
        const response = await api.getCampaign(campaignId);
        setData({
          id: response.data.id,
          status: response.data.status,
          stats: {
            sent: response.data.stats.sent || 0,
            failed: response.data.stats.failed || 0,
            pending: response.data.stats.pending || 0,
          },
        });
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
      }
    })();

    return () => clearInterval(interval);
  }, [campaignId, enabled]);

  return { data, loading, error };
}
