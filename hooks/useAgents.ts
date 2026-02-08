
import { useState, useEffect } from 'react';
import { NexusAgent } from '../types';

export const useAgents = () => {
  const [agents, setAgents] = useState<NexusAgent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setAgents(data.agents || []);
          setIsLoaded(true);
        }
      } catch {
        // silently retry next interval
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { agents, isLoaded };
};
