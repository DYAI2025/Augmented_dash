
import { SystemStats, ServiceState, GeminiInsight } from "../types";

export const getSystemInsight = async (
  stats: SystemStats,
  services: ServiceState
): Promise<GeminiInsight> => {
  try {
    const res = await fetch("/api/ai-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats, services })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as GeminiInsight;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return {
      status: "Analyzing...",
      recommendation: "AI analysis currently unavailable.",
      prediction: "Standby for updates."
    };
  }
};
