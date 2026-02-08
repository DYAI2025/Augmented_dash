
import { SystemStats, LogEntry } from '../types';

/**
 * MockWebSocket simulates a real-time binary-over-text WebSocket connection 
 * to a system monitoring backend.
 */
class MockWebSocket extends EventTarget {
  private intervalId: number | null = null;
  public readyState: number = 0; // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
  private startTime = Date.now();

  constructor(url: string) {
    super();
    console.log(`[MockWS] Connecting to ${url}...`);
    setTimeout(() => {
      this.readyState = 1;
      this.dispatchEvent(new Event('open'));
      this.startHeartbeat();
    }, 1500);
  }

  private startHeartbeat() {
    this.intervalId = window.setInterval(() => {
      if (this.readyState !== 1) return;

      const stats: SystemStats = {
        cpu: this.generateFluctuatingValue(45, 15),
        ram: this.generateFluctuatingValue(65, 5),
        disk: 42,
        network: Math.floor(Math.random() * 1500),
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
        uptime: this.getUptimeString()
      };

      this.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify({ type: 'METRICS_UPDATE', payload: stats })
      }));

      if (Math.random() > 0.9) {
        this.emitLog();
      }
    }, 800);
  }

  private generateFluctuatingValue(base: number, range: number) {
    const noise = (Math.random() - 0.5) * range;
    return Math.min(100, Math.max(0, base + noise + Math.sin(Date.now() / 5000) * 10));
  }

  private emitLog() {
    const logs: { m: string; t: LogEntry['type'] }[] = [
      { m: "Kernel: Inbound packet filtered on eth0", t: 'info' },
      { m: "Nginx: 127.0.0.1 - GET /api/metrics 200", t: 'success' },
      { m: "System: High CPU interrupt on Core #4", t: 'warn' },
      { m: "DB: Vacuuming postgres_prod database", t: 'info' }
    ];
    const log = logs[Math.floor(Math.random() * logs.length)];
    this.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({
        type: 'LOG_EVENT',
        payload: {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          message: log.m,
          type: log.t
        }
      })
    }));
  }

  private getUptimeString() {
    const diff = Math.floor((Date.now() - this.startTime) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h}h ${m}m ${s}s`;
  }

  close() {
    this.readyState = 2;
    if (this.intervalId) clearInterval(this.intervalId);
    setTimeout(() => {
      this.readyState = 3;
      this.dispatchEvent(new Event('close'));
    }, 500);
  }
}

export const createSystemSocket = () => {
  return new MockWebSocket('ws://dyai-backend.local/v1/stream');
};
