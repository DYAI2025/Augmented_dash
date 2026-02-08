
import { SystemStats, LogEntry, NexusService } from '../types';

/**
 * PollingSocket replaces MockWebSocket — polls the real nexus-status API
 * and emits events in the same format useRealtimeMetrics expects.
 */
class PollingSocket extends EventTarget {
  private intervalId: number | null = null;
  public readyState: number = 0; // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
  private previousServices: Map<string, string> = new Map();
  private numCPUs: number = 1;

  constructor() {
    super();
    // Detect CPU count (fallback to navigator.hardwareConcurrency or assume 2 for VPS)
    this.numCPUs = 2; // VPS has 2 vCPUs
    this.connect();
  }

  private async connect() {
    try {
      // Test connection with first fetch
      const res = await fetch('/api/status');
      if (res.ok) {
        this.readyState = 1;
        this.dispatchEvent(new Event('open'));
        this.startPolling();
      } else {
        this.retryConnect();
      }
    } catch {
      this.retryConnect();
    }
  }

  private retryConnect() {
    setTimeout(() => this.connect(), 3000);
  }

  private startPolling() {
    // Immediately fetch, then every 3 seconds
    this.poll();
    this.intervalId = window.setInterval(() => {
      if (this.readyState !== 1) return;
      this.poll();
    }, 3000);
  }

  private async poll() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const stats: SystemStats = {
        cpu: Math.min(100, Math.max(0, (data.resources.load.avg1 / this.numCPUs) * 100)),
        ram: data.resources.ram.percent,
        disk: data.resources.disk.percent,
        network: 0,
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
        uptime: data.resources.uptime
      };

      this.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify({ type: 'METRICS_UPDATE', payload: stats })
      }));

      // Emit log events for service status changes
      this.checkServiceChanges(data.services);

    } catch (err) {
      // Connection lost — emit close and try to reconnect
      if (this.readyState === 1) {
        this.readyState = 3;
        if (this.intervalId) clearInterval(this.intervalId);
        this.dispatchEvent(new Event('close'));
        // Attempt reconnect after 5s
        setTimeout(() => {
          this.readyState = 0;
          this.connect();
        }, 5000);
      }
    }
  }

  private checkServiceChanges(services: NexusService[]) {
    for (const svc of services) {
      const prev = this.previousServices.get(svc.name);
      if (prev && prev !== svc.status) {
        const isUp = svc.status === 'up';
        const logEntry: LogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          message: `${svc.name}: ${isUp ? 'Service came back UP' : 'Service went DOWN'} (${svc.detail})`,
          type: isUp ? 'success' : 'error'
        };
        this.dispatchEvent(new MessageEvent('message', {
          data: JSON.stringify({ type: 'LOG_EVENT', payload: logEntry })
        }));
      }
      this.previousServices.set(svc.name, svc.status);
    }
  }

  close() {
    this.readyState = 2;
    if (this.intervalId) clearInterval(this.intervalId);
    setTimeout(() => {
      this.readyState = 3;
      this.dispatchEvent(new Event('close'));
    }, 100);
  }
}

export const createSystemSocket = () => {
  return new PollingSocket();
};
