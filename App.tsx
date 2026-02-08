
import React, { useState, useEffect } from 'react';
import { useRealtimeMetrics } from './hooks/useRealtimeMetrics';
import { Card } from './components/Card';
import { Toggle } from './components/Toggle';
import { ThemeToggle } from './components/ThemeToggle';
import { ServiceState, GeminiInsight, Theme } from './types';
import { getSystemInsight } from './services/geminiService';

const App: React.FC = () => {
  const { stats, logs, isConnected } = useRealtimeMetrics();
  const [theme, setTheme] = useState<Theme>(() => 
    (localStorage.getItem('theme') as Theme) || 'light'
  );
  const [services, setServices] = useState<ServiceState>({
    nginx: true,
    docker: true,
    postgres: false
  });
  const [aiInsight, setAiInsight] = useState<GeminiInsight | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleService = (key: keyof ServiceState) => {
    setServices(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Helper to get log specific classes
  const getLogClasses = (type: string) => {
    switch (type) {
      case 'error':
        return {
          border: 'border-red-500/50',
          text: 'text-red-500 dark:text-red-400',
          bg: 'hover:bg-red-500/5'
        };
      case 'warn':
        return {
          border: 'border-orange-500/50',
          text: 'text-orange-500 dark:text-orange-400',
          bg: 'hover:bg-orange-500/5'
        };
      case 'success':
        return {
          border: 'border-green-500/50',
          text: 'text-green-600 dark:text-green-500',
          bg: 'hover:bg-green-500/5'
        };
      case 'info':
      default:
        return {
          border: 'border-blue-500/50',
          text: 'text-blue-500 dark:text-blue-400',
          bg: 'hover:bg-blue-500/5'
        };
    }
  };

  const circumference = 2 * Math.PI * 70;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8 min-h-screen">
      
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-600 dark:text-gray-300">DYAI <span className="text-blue-500">Augmentation Dash</span></h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">
              {isConnected ? 'Live WebSocket Connected' : 'Connecting to Node...'}
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
            {isAiLoading ? '⌛' : '🧠'}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Time Card */}
        <Card className="md:col-span-8 flex flex-col justify-center relative overflow-hidden h-64">
          <div className="relative z-10">
            {/* REFINED CLOCK: Using text-blue-700/text-blue-400 for a distinct digital 'Augmented' feel */}
            <div className="text-7xl md:text-8xl font-mono font-black text-blue-700 dark:text-blue-400 tracking-tight drop-shadow-sm">
              {stats.time || '00:00:00'}
            </div>
            <div className="text-xl text-gray-600 dark:text-gray-400 font-bold mt-2 tracking-wide uppercase">{stats.date}</div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 soft-ui-inset rounded-full text-[10px] font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-widest">
               Node Uptime: {stats.uptime}
            </div>
          </div>
          {/* Enhanced Deko Element */}
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-500 rounded-full blur-[100px] opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </Card>

        {/* CPU Circle - REFINED */}
        <Card className="md:col-span-4 flex flex-col items-center justify-center relative h-64 overflow-hidden">
          <h3 className="absolute top-5 left-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Real-time CPU</h3>
          
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
              <defs>
                <linearGradient id="cpuGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
              {/* Outer Glow Ring */}
              <circle cx="88" cy="88" r="76" stroke="currentColor" strokeWidth="1" fill="none" className="text-blue-500 opacity-10" />
              {/* Main Track */}
              <circle cx="88" cy="88" r="70" stroke="currentColor" strokeWidth="14" fill="none" className="text-gray-300 dark:text-gray-800 opacity-20" />
              {/* Progress Arc */}
              <circle 
                cx="88" cy="88" r="70" stroke="url(#cpuGradient)" strokeWidth="14" fill="none" 
                strokeDasharray={circumference} 
                strokeDashoffset={circumference - (stats.cpu / 100) * circumference} 
                strokeLinecap="round"
                className="transition-all duration-700 ease-out" 
              />
            </svg>
            
            <div className="absolute flex flex-col items-center select-none">
              <span className={`text-4xl font-black font-mono tracking-tighter transition-all duration-300 ${stats.cpu > 80 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                {Math.round(stats.cpu)}%
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                 <span className={`w-1.5 h-1.5 rounded-full ${stats.cpu > 80 ? 'bg-red-500 animate-ping' : 'bg-blue-500'}`}></span>
                 <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Active</span>
              </div>
            </div>
          </div>
          
          {/* Subtle Activity Pattern */}
          <div className="absolute -bottom-2 w-full h-1 flex gap-1 justify-center opacity-20">
             {[...Array(12)].map((_, i) => (
               <div key={i} className={`w-1 h-full rounded-full transition-all duration-500 ${Math.random() > 0.5 ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
             ))}
          </div>
        </Card>

        {/* Gemini AI Insight */}
        <Card className="md:col-span-5 h-80 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Neural Insights</h3>
             <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-[10px] rounded-full font-bold tracking-tighter">GEMINI AI</span>
          </div>
          {!isConnected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">Waiting for telemetry...</div>
          ) : isAiLoading && !aiInsight ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 text-xs animate-pulse font-mono">Analyzing System Modalities...</p>
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

        {/* Resource Distribution (RAM) */}
        <Card className="md:col-span-3 flex flex-col justify-between h-80">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memory Graph</h3>
          <div className="flex space-x-6 h-48 items-end justify-center py-4">
            <div className="flex flex-col items-center h-full">
               <div className="w-8 soft-ui-inset relative h-full rounded-full overflow-hidden">
                <div 
                  className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-full transition-all duration-700 ease-in-out"
                  style={{ height: `${stats.ram}%` }}
                ></div>
              </div>
              <span className="text-[10px] mt-2 font-bold text-gray-400">RAM</span>
            </div>
            <div className="flex flex-col items-center h-full">
              <div className="w-8 soft-ui-inset relative h-full rounded-full overflow-hidden">
                <div 
                  className="absolute bottom-0 w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-full transition-all duration-700 ease-in-out opacity-60"
                  style={{ height: `${stats.disk}%` }}
                ></div>
              </div>
              <span className="text-[10px] mt-2 font-bold text-gray-400">IO</span>
            </div>
          </div>
          <div className="text-center font-mono text-sm font-bold text-gray-500">
            NET IN: {Math.round(stats.network)} KB/s
          </div>
        </Card>

        {/* Services */}
        <Card className="md:col-span-4 h-80 flex flex-col">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Process Management</h3>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <Toggle label="Web Server" active={services.nginx} onToggle={() => toggleService('nginx')} />
            <Toggle label="Docker Swarm" active={services.docker} onToggle={() => toggleService('docker')} />
            <Toggle label="Primary DB" active={services.postgres} onToggle={() => toggleService('postgres')} statusColor="bg-orange-400" />
          </div>
        </Card>

        {/* Terminal Logs */}
        <Card className="md:col-span-12 h-64 font-mono text-xs relative overflow-hidden">
          <div className="flex justify-between mb-4">
            <span className="font-bold text-gray-400 tracking-widest uppercase">WS Stream: /var/log/dyai-node.log</span>
            <span className={`flex items-center gap-2 font-bold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></span>
              {isConnected ? 'STREAMING' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="space-y-2 opacity-90 h-40 overflow-y-auto custom-scrollbar">
            {logs.map((log) => {
              const classes = getLogClasses(log.type);
              return (
                <div 
                  key={log.id} 
                  className={`flex gap-4 border-l-2 pl-3 py-1.5 transition-all duration-200 group ${classes.border} ${classes.bg}`}
                >
                  <span className="text-gray-400 dark:text-gray-500 min-w-[80px] font-bold select-none">{log.timestamp}</span>
                  <span className={`font-semibold tracking-tight ${classes.text}`}>
                    <span className="opacity-50 mr-2 uppercase text-[9px] font-black tracking-widest">[{log.type}]</span>
                    {log.message}
                  </span>
                </div>
              );
            })}
            {logs.length === 0 && <div className="text-gray-400 italic py-2">Establishing buffer connection...</div>}
          </div>
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[var(--bg)] to-transparent pointer-events-none"></div>
        </Card>

      </div>

      <footer className="pt-8 pb-12 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">
        DYAI Augmentation Dash v3.1.2 | Reactive WebSocket Layer | {isConnected ? 'Link Active' : 'Link Offline'}
      </footer>
    </div>
  );
};

export default App;
