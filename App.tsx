
import React, { useState, useEffect, useCallback } from 'react';
import { useRealtimeMetrics } from './hooks/useRealtimeMetrics';
import { useAgents } from './hooks/useAgents';
import { Card } from './components/Card';
import { ThemeToggle } from './components/ThemeToggle';
import { InternalLink } from './components/InternalLink';
import { ServiceState, GeminiInsight, Theme, NexusAgent, NexusService } from './types';
import { getSystemInsight } from './services/geminiService';

const SERVICE_MAP: { key: keyof ServiceState; label: string; apiName: string }[] = [
  { key: 'gateway', label: 'Clawdbot Gateway', apiName: 'Clawdbot Gateway' },
  { key: 'agentZero', label: 'Agent Zero', apiName: 'Agent Zero' },
  { key: 'whisper', label: 'Whisper STT', apiName: 'Whisper STT' },
  { key: 'tts', label: 'TTS Server', apiName: 'TTS Server' },
  { key: 'perr00bot', label: 'Perr00bot', apiName: 'Perr00bot' },
  { key: 'ollama', label: 'Ollama', apiName: 'Ollama' },
  { key: 'dashboard', label: 'Dashboard', apiName: 'Dashboard' },
  { key: 'marvin', label: 'Marvin', apiName: 'Marvin Cron' },
];

const NON_CONTROLLABLE = ['Dashboard', 'Marvin Cron', 'Claude Processes'];

function cpuBarColor(cpu: number): string {
  if (cpu >= 80) return 'from-red-500 to-red-400';
  if (cpu >= 50) return 'from-orange-500 to-orange-400';
  return 'from-blue-500 to-teal-400';
}

function ramBarColor(pct: number): string {
  if (pct >= 30) return 'from-red-500 to-red-400';
  if (pct >= 15) return 'from-orange-500 to-orange-400';
  return 'from-indigo-500 to-blue-400';
}

function formatRam(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}G`;
  return `${mb}M`;
}

const ACCENT_COLORS: Record<string, string> = {
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
};

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
  active: { dot: 'bg-green-500', text: 'text-green-500' },
  idle: { dot: 'bg-amber-500', text: 'text-amber-500' },
  down: { dot: 'bg-red-500', text: 'text-red-500' },
};

const AgentCard: React.FC<{ agent: NexusAgent }> = ({ agent }) => {
  const statusStyle = STATUS_COLORS[agent.status] || STATUS_COLORS.down;
  const accentColor = ACCENT_COLORS[agent.accent] || 'bg-blue-500';

  return (
    <div className="p-4 rounded-2xl soft-ui-inset border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${accentColor}`}></div>
          <span className="font-black text-sm text-gray-700 dark:text-gray-200 uppercase tracking-tight">{agent.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusStyle.dot} ${agent.status === 'active' ? 'animate-live' : ''}`}></span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${statusStyle.text}`}>{agent.status}</span>
        </div>
      </div>
      <div className="text-[10px] text-gray-400 font-mono mb-2">{agent.model}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 italic">{agent.detail}</div>
      <div className="flex flex-wrap gap-1 mb-3">
        {agent.tags.map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[8px] font-black rounded uppercase tracking-tighter">{tag}</span>
        ))}
      </div>
      {agent.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {agent.metrics.map(m => (
            <div key={m.label} className="text-[10px]">
              <span className="text-gray-400 font-bold uppercase tracking-widest">{m.label}: </span>
              <span className="text-gray-600 dark:text-gray-300 font-mono">{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { stats, logs, isConnected } = useRealtimeMetrics();
  const { agents, isLoaded: agentsLoaded } = useAgents();
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) || 'dark'
  );
  const [services, setServices] = useState<ServiceState>({
    gateway: false, agentZero: false, whisper: false, tts: false,
    perr00bot: false, ollama: false, dashboard: false, marvin: false
  });
  const [aiInsight, setAiInsight] = useState<GeminiInsight | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [fullServices, setFullServices] = useState<NexusService[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [totalSystemRamMB, setTotalSystemRamMB] = useState(4096);

  // Poll /api/status for service states + resource data
  useEffect(() => {
    if (!isConnected) return;
    let active = true;

    const fetchServices = async () => {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        const svcList: NexusService[] = data.services || [];
        setFullServices(svcList);
        if (data.resources?.ram?.total) setTotalSystemRamMB(data.resources.ram.total);
        const newState: ServiceState = { ...services };
        for (const mapping of SERVICE_MAP) {
          const found = svcList.find(s => s.name === mapping.apiName);
          (newState as any)[mapping.key] = found ? found.status === 'up' : false;
        }
        setServices(newState);
      } catch { /* handled by metricsService reconnect */ }
    };

    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [isConnected]);

  const handleServiceAction = useCallback(async (serviceName: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoading(serviceName);
    try {
      const res = await fetch('/api/service/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceName, action }),
      });
      await res.json();
    } catch { /* next poll will update */ }
    finally { setActionLoading(null); }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  const fetchAiInsight = async () => {
    if (!isConnected) return;
    setIsAiLoading(true);
    const insight = await getSystemInsight(stats, services);
    setAiInsight(insight);
    setIsAiLoading(false);
  };

  useEffect(() => {
    if (isConnected) {
      fetchAiInsight();
      const interval = setInterval(fetchAiInsight, 60000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const getLogClasses = (type: string) => {
    switch (type) {
      case 'error': return { border: 'border-red-500/50', text: 'text-red-500 dark:text-red-400', bg: 'hover:bg-red-500/5' };
      case 'warn': return { border: 'border-orange-500/50', text: 'text-orange-500 dark:text-orange-400', bg: 'hover:bg-orange-500/5' };
      case 'success': return { border: 'border-green-500/50', text: 'text-green-600 dark:text-green-500', bg: 'hover:bg-green-500/5' };
      default: return { border: 'border-blue-500/50', text: 'text-blue-500 dark:text-blue-400', bg: 'hover:bg-blue-500/5' };
    }
  };

  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const upCount = Object.values(services).filter(Boolean).length;
  const totalCount = Object.keys(services).length;
  const sortedServices = [...fullServices].sort((a, b) => b.ramMB - a.ramMB);
  const totalServiceRam = sortedServices.reduce((sum, s) => sum + s.ramMB, 0);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8 min-h-screen">

      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-600 dark:text-gray-300">Nexus <span className="text-blue-500">System Dashboard</span></h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">
              {isConnected ? 'Live API Connected' : 'Connecting to API...'}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            onClick={fetchAiInsight}
            disabled={isAiLoading || !isConnected}
            className="soft-ui w-12 h-12 flex items-center justify-center text-xl hover:soft-ui-pressed disabled:opacity-30 transition-all rounded-full"
            title="Refresh AI Insights"
          >
            {isAiLoading ? '...' : 'AI'}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Time Card */}
        <Card className="md:col-span-8 flex flex-col justify-center relative overflow-hidden h-64">
          <div className="relative z-10">
            <div className="text-7xl md:text-8xl font-mono font-black text-blue-700 dark:text-blue-400 tracking-tight drop-shadow-sm">
              {stats.time || '00:00:00'}
            </div>
            <div className="text-xl text-gray-600 dark:text-gray-400 font-bold mt-2 tracking-wide uppercase">{stats.date}</div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 soft-ui-inset rounded-full text-[10px] font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-widest">
               Uptime: {stats.uptime}
            </div>
          </div>
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-500 rounded-full blur-[100px] opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </Card>

        {/* CPU Circle */}
        <Card className="md:col-span-4 flex flex-col items-center justify-center relative h-64 overflow-hidden">
          <h3 className="absolute top-5 left-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Real-time CPU</h3>
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg viewBox="0 0 176 176" className="w-full h-full transform -rotate-90 overflow-visible">
              <defs>
                <linearGradient id="cpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="88" cy="88" r="76" stroke="currentColor" strokeWidth="1" fill="none" className="text-blue-500 opacity-5" />
              <circle cx="88" cy="88" r="70" stroke="currentColor" strokeWidth="12" fill="none" className="text-gray-300 dark:text-gray-800 opacity-20" />
              <circle cx="88" cy="88" r="70" stroke="url(#cpuGradient)" strokeWidth="12" fill="none" strokeDasharray={circumference} strokeDashoffset={circumference - (stats.cpu / 100) * circumference} strokeLinecap="round" filter="url(#glow)" className="transition-all duration-1000 ease-in-out" />
              <circle cx={88 + 70 * Math.cos((stats.cpu / 100) * 2 * Math.PI - Math.PI / 2)} cy={88 + 70 * Math.sin((stats.cpu / 100) * 2 * Math.PI - Math.PI / 2)} r="4" fill="#ffffff" className="transition-all duration-1000 ease-in-out opacity-80" />
            </svg>
            <div className="absolute flex flex-col items-center select-none pointer-events-none">
              <span className={`text-5xl font-black font-mono tracking-tighter transition-all duration-300 ${stats.cpu > 85 ? 'text-red-500 scale-110' : 'text-gray-900 dark:text-gray-100'}`}>
                {Math.round(stats.cpu)}<span className="text-xl ml-0.5 opacity-50">%</span>
              </span>
            </div>
          </div>
        </Card>

        {/* Internal Links */}
        <Card className="md:col-span-12 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Nexus Links</h3>
            <div className="h-px flex-1 mx-6 soft-ui-inset opacity-30"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InternalLink
              title="Kanban Board"
              description="Task management and project tracking with Upstash Redis backend."
              icon="K"
              path="https://kanban-jet-seven.vercel.app"
              tag="Vercel"
            />
            <InternalLink
              title="Agent Zero"
              description="Autonomous agentic AI framework with tool use and monologue loop."
              icon="A0"
              path="http://localhost:50080"
              tag="Docker"
            />
            <InternalLink
              title="Marvin Logs"
              description="System watchdog session logs and intervention history."
              icon="M"
              path="#marvin"
            />
            <InternalLink
              title="Gateway"
              description="Multi-channel messaging gateway (WhatsApp, Telegram, Discord)."
              icon="GW"
              path="#gateway"
              tag="Active"
            />
          </div>
        </Card>

        {/* Neural Insights */}
        <Card className="md:col-span-4 h-80 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Neural Insights</h3>
             <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-[10px] rounded-full font-bold tracking-tighter">GEMINI AI</span>
          </div>
          {!isConnected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">Waiting for telemetry...</div>
          ) : isAiLoading && !aiInsight ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 text-xs animate-pulse font-mono">Analyzing Nexus Systems...</p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="p-3 rounded-xl soft-ui-inset bg-opacity-20 border border-white/5">
                <p className="text-[10px] text-blue-500 font-bold uppercase mb-1 tracking-widest">AI Conclusion</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">"{aiInsight?.status}"</p>
              </div>
              <div className="p-3 rounded-xl soft-ui-inset bg-opacity-20 border border-white/5">
                <p className="text-[10px] text-orange-500 font-bold uppercase mb-1 tracking-widest">Recommended Action</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{aiInsight?.recommendation}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Resource Graph */}
        <Card className="md:col-span-4 flex flex-col justify-between h-80">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resource Graph</h3>
          <div className="flex space-x-5 h-48 items-end justify-center py-4">
            <div className="flex flex-col items-center h-full" title={`RAM: ${Math.round(stats.ram)}%`}>
               <div className="w-6 soft-ui-inset relative h-full rounded-full overflow-hidden">
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-full transition-all duration-700 ease-in-out" style={{ height: `${stats.ram}%` }}></div>
              </div>
              <span className="text-[10px] mt-2 font-bold text-gray-400">RAM</span>
            </div>
            <div className="flex flex-col items-center h-full" title={`Disk Usage: ${Math.round(stats.disk)}%`}>
              <div className="w-6 soft-ui-inset relative h-full rounded-full overflow-hidden">
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-green-600 to-green-400 rounded-full transition-all duration-700 ease-in-out" style={{ height: `${stats.disk}%` }}></div>
              </div>
              <span className="text-[10px] mt-2 font-bold text-gray-400">DSK</span>
            </div>
            <div className="flex flex-col items-center h-full" title={`CPU Load: ${stats.cpu.toFixed(1)}%`}>
              <div className="w-6 soft-ui-inset relative h-full rounded-full overflow-hidden">
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-full transition-all duration-700 ease-in-out opacity-80" style={{ height: `${stats.cpu}%` }}></div>
              </div>
              <span className="text-[10px] mt-2 font-bold text-gray-400">CPU</span>
            </div>
          </div>
          <div className="text-center font-mono text-xs font-bold text-gray-400 uppercase tracking-tighter">
            {upCount}/{totalCount} SERVICES UP
          </div>
        </Card>

        {/* Service Status + Resources */}
        <Card className="md:col-span-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Services</h3>
            {totalServiceRam > 0 && (
              <span className="text-[9px] font-mono text-gray-400">
                {formatRam(totalServiceRam)} / {formatRam(totalSystemRamMB)}
              </span>
            )}
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {sortedServices.map(svc => {
              const isUp = svc.status === 'up';
              const isDegraded = svc.status === 'degraded';
              const controllable = !NON_CONTROLLABLE.includes(svc.name);
              const isLoading = actionLoading === svc.name;
              const ramPct = totalSystemRamMB > 0 ? Math.min((svc.ramMB / totalSystemRamMB) * 100, 100) : 0;

              return (
                <div key={svc.name} className="p-3 rounded-xl soft-ui-inset border border-white/5">
                  {/* Header: dot + name + status + controls */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-green-500 animate-live' : isDegraded ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <span className="font-bold text-xs text-gray-700 dark:text-gray-200">{svc.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${isUp ? 'text-green-500' : isDegraded ? 'text-amber-500' : 'text-red-500'}`}>
                        {isUp ? 'UP' : isDegraded ? 'DEG' : 'DOWN'}
                      </span>
                      {controllable && (
                        <>
                          <button
                            disabled={isLoading}
                            onClick={() => handleServiceAction(svc.name, 'restart')}
                            className="w-6 h-6 rounded-lg soft-ui flex items-center justify-center text-gray-400 hover:text-blue-500 disabled:opacity-30 transition-all"
                            title="Restart"
                          >
                            {isLoading ? (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" /></svg>
                            ) : (
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                            )}
                          </button>
                          <button
                            disabled={isLoading}
                            onClick={() => handleServiceAction(svc.name, isUp ? 'stop' : 'start')}
                            className={`w-6 h-6 rounded-lg soft-ui flex items-center justify-center disabled:opacity-30 transition-all ${
                              isUp ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-500'
                            }`}
                            title={isUp ? 'Stop' : 'Start'}
                          >
                            {isUp ? (
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                            ) : (
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21" /></svg>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* CPU bar */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-bold text-gray-400 w-6 text-right">CPU</span>
                    <div className="flex-1 h-1.5 rounded-full soft-ui-inset overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${cpuBarColor(svc.cpu)} transition-all duration-700`} style={{ width: `${Math.max(svc.cpu, 0.5)}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-gray-500 w-9 text-right">{svc.cpu > 0 ? `${svc.cpu}%` : '--'}</span>
                  </div>
                  {/* RAM bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold text-gray-400 w-6 text-right">RAM</span>
                    <div className="flex-1 h-1.5 rounded-full soft-ui-inset overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${ramBarColor(ramPct)} transition-all duration-700`} style={{ width: `${Math.max(ramPct, 0.3)}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-gray-500 w-9 text-right">{svc.ramMB > 0 ? formatRam(svc.ramMB) : '--'}</span>
                  </div>
                </div>
              );
            })}
            {sortedServices.length === 0 && (
              <div className="text-gray-400 text-sm italic text-center py-4">Loading services...</div>
            )}
          </div>
        </Card>

        {/* Agents Panel */}
        {agentsLoaded && agents.length > 0 && (
          <Card className="md:col-span-12 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Active Agents</h3>
              <div className="h-px flex-1 mx-6 soft-ui-inset opacity-30"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {agents.filter(a => a.status === 'active').length}/{agents.length} Active
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agents.map(agent => (
                <AgentCard key={agent.name} agent={agent} />
              ))}
            </div>
          </Card>
        )}

        {/* Terminal Logs */}
        <Card className="md:col-span-12 h-64 font-mono text-xs relative overflow-hidden">
          <div className="flex justify-between mb-4">
            <span className="font-bold text-gray-400 tracking-widest uppercase">Service Event Log</span>
            <span className={`flex items-center gap-2 font-bold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></span>
              {isConnected ? 'STREAMING' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="space-y-2 opacity-90 h-40 overflow-y-auto custom-scrollbar">
            {logs.length === 0 && isConnected && (
              <div className="text-gray-400 italic py-4 text-center">Monitoring services... events will appear on status changes</div>
            )}
            {logs.map((log) => {
              const classes = getLogClasses(log.type);
              return (
                <div key={log.id} className={`flex gap-4 border-l-2 pl-3 py-1.5 transition-all duration-200 group ${classes.border} ${classes.bg}`}>
                  <span className="text-gray-400 dark:text-gray-500 min-w-[80px] font-bold select-none">{log.timestamp}</span>
                  <span className={`font-semibold tracking-tight ${classes.text}`}>
                    <span className="opacity-50 mr-2 uppercase text-[9px] font-black tracking-widest">[{log.type}]</span>
                    {log.message}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[var(--bg)] to-transparent pointer-events-none"></div>
        </Card>

      </div>

      <footer className="pt-8 pb-12 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">
        Nexus System Dashboard | Real-time API Monitoring | {isConnected ? 'Link Active' : 'Link Offline'}
      </footer>
    </div>
  );
};

export default App;
