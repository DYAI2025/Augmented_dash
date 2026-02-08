
import { GoogleGenAI, Type } from "@google/genai";
import { SystemStats, ServiceState, GeminiInsight } from "../types";

const API_KEY = process.env.API_KEY || "";

export const getSystemInsight = async (
  stats: SystemStats, 
  services: ServiceState
): Promise<GeminiInsight> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    Analyze the following system status and provide a JSON report:
    CPU: ${stats.cpu}%
    RAM: ${stats.ram}%
    Services: Nginx (${services.nginx ? 'UP' : 'DOWN'}), Docker (${services.docker ? 'UP' : 'DOWN'}), Postgres (${services.postgres ? 'UP' : 'DOWN'})
    
    Provide a professional technical analysis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: "A summary of the current system health." },
            recommendation: { type: Type.STRING, description: "Actionable advice for the sysadmin." },
            prediction: { type: Type.STRING, description: "Forecast of system state for the next hour." }
          },
          required: ["status", "recommendation", "prediction"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as GeminiInsight;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      status: "Analyzing...",
      recommendation: "AI analysis currently unavailable.",
      prediction: "Standby for updates."
    };
  }
};
