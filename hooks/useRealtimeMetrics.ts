
import { useState, useEffect } from 'react';
import { SystemStats, LogEntry } from '../types';
import { createSystemSocket } from '../services/metricsService';

export const useRealtimeMetrics = () => {
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    ram: 0,
    disk: 0,
    network: 0,
    time: '',
    date: '',
    uptime: '0h 0m 0s'
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = createSystemSocket();

    const handleOpen = () => setIsConnected(true);
    const handleClose = () => setIsConnected(false);
    
    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'METRICS_UPDATE') {
        setStats(data.payload);
      } else if (data.type === 'LOG_EVENT') {
        setLogs(prev => [data.payload, ...prev].slice(0, 15));
      }
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('message', handleMessage);
      socket.close();
    };
  }, []);

  return { stats, logs, isConnected };
};
