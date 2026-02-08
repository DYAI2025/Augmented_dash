
export interface SystemStats {
  cpu: number;
  ram: number;
  disk: number;
  network: number;
  time: string;
  date: string;
  uptime: string;
}

export interface ServiceState {
  gateway: boolean;
  agentZero: boolean;
  whisper: boolean;
  tts: boolean;
  perr00bot: boolean;
  ollama: boolean;
  dashboard: boolean;
  marvin: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

export interface GeminiInsight {
  status: string;
  recommendation: string;
  prediction: string;
}

export interface NexusService {
  name: string;
  port: number | null;
  status: 'up' | 'down' | 'degraded';
  detail: string;
  cpu: number;
  ramMB: number;
}

export interface NexusAgent {
  name: string;
  status: string;
  accent: string;
  model: string;
  detail: string;
  metrics: { label: string; value: string | number }[];
  tags: string[];
}

export type Theme = 'light' | 'dark';
