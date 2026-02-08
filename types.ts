
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
  nginx: boolean;
  docker: boolean;
  postgres: boolean;
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

export type Theme = 'light' | 'dark';
