
import { GoogleGenAI, Type } from "@google/genai";
import { SystemStats, ServiceState, GeminiInsight } from "../types";

const API_KEY = process.env.API_KEY || "";

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Executes a function with exponential backoff retries.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.message?.includes("429") || error?.status === 429;
      const isRetryable = isRateLimit || (error?.status >= 500 && error?.status < 600);
      
      if (i === maxRetries - 1 || !isRetryable) {
        throw error;
      }
      
      console.warn(`[Gemini] Attempt ${i + 1} failed. Retrying in ${delay}ms...`, error.message);
      await wait(delay);
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error("Max retries exceeded");
}

export const getSystemInsight = async (
  stats: SystemStats, 
  services: ServiceState
): Promise<GeminiInsight> => {
  if (!API_KEY) {
    return {
      status: "Configuration Missing",
      recommendation: "API Key not found in environment.",
      prediction: "Check deployment settings."
    };
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    Analyze the following system status and provide a JSON report:
    CPU: ${stats.cpu}%
    RAM: ${stats.ram}%
    Services: Nginx (${services.nginx ? 'UP' : 'DOWN'}), Docker (${services.docker ? 'UP' : 'DOWN'}), Postgres (${services.postgres ? 'UP' : 'DOWN'})
    
    Provide a professional technical analysis.
  `;

  try {
    const response = await retryWithBackoff(async () => {
      const result = await ai.models.generateContent({
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
      return result;
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as GeminiInsight;
    }
    throw new Error("Empty response from AI");
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    if (error?.message?.includes("429")) {
      return {
        status: "Quota Exceeded (429)",
        recommendation: "System is hitting API rate limits. Reducing refresh frequency is recommended.",
        prediction: "Cooling down for 30 seconds."
      };
    }

    return {
      status: "Telemetry Link Unstable",
      recommendation: "Attempting to reconnect to the neural engine. Check your internet connection.",
      prediction: "Waiting for next polling cycle."
    };
  }
};
