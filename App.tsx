
import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useRealtimeMetrics } from './hooks/useRealtimeMetrics';
import { Card } from './components/Card';
import { Toggle } from './components/Toggle';
import { ThemeToggle } from './components/ThemeToggle';
import { InternalLink } from './components/InternalLink';
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
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [networkHistory, setNetworkHistory] = useState<{ time: string; value: number }[]>([]);
  const [cpuHistory, setCpuHistory] = useState<{ time: string; value: number }[]>([]);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

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

  useEffect(() => {
    if (isConnected) {
      setNetworkHistory(prev => {
        const newHistory = [...prev, { time: stats.time, value: stats.network }];
        return newHistory.slice(-20); // Keep last 20 points
      });
      setCpuHistory(prev => {
        const newHistory = [...prev, { time: stats.time, value: stats.cpu }];
        return newHistory.slice(-30); // Keep last 30 points
      });
    }
  }, [stats.network, stats.cpu, stats.time, isConnected]);

  const toggleService = (key: keyof ServiceState) => {
    setServices(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchAiInsight = useCallback(async () => {
    if (!isConnected || isAiLoading || isRateLimited) return;
    
    setIsAiLoading(true);
    const insight = await getSystemInsight(stats, services);
    setAiInsight(insight);
    setIsAiLoading(false);

    // If we get a quota error status, trigger a cooldown
    if (insight.status.includes("429")) {
      setIsRateLimited(true);
      setTimeout(() => setIsRateLimited(false), 30000); // 30s cooldown
    }
  }, [isConnected, isAiLoading, isRateLimited, stats, services]);

  useEffect(() => {
    if (isConnected && !isRateLimited) {
      const initialTimer = setTimeout(fetchAiInsight, 2000); // Wait for first stats
      const interval = setInterval(fetchAiInsight, 60000);
      return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
      };
    }
  }, [isConnected, isRateLimited, fetchAiInsight]);

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
            disabled={isAiLoading || !isConnected || isRateLimited}
            className={`soft-ui w-12 h-12 flex items-center justify-center text-xl transition-all rounded-full ${isRateLimited ? 'opacity-50 cursor-not-allowed' : 'hover:soft-ui-pressed cursor-pointer'}`}
            title={isRateLimited ? "API Rate Limited - Waiting for Quota Reset" : "Refresh AI Insights"}
          >
            {isAiLoading ? '⌛' : isRateLimited ? '🚫' : '🧠'}
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
               Node Uptime: {stats.uptime}
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

        {/* System Portal & Directories */}
        <Card className="md:col-span-12 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.4em]">Infrastructure Portal & Services</h3>
            <div className="h-px flex-1 mx-6 soft-ui-inset opacity-20"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <InternalLink title="Knowledge Base" description="System architecture blueprints and cluster deployment manuals." icon="📚" path="#kb" tag="DOCS" />
            <InternalLink title="Security Matrix" description="Real-time vulnerability audit and compliance firewall status." icon="🛡️" path="#security" tag="SECURE" tagType="success" />
            <InternalLink title="Topology View" description="Interactive visual routing of edge nodes and CDN distribution." icon="🗺️" path="#map" tag="LIVE" tagType="warning" />
            <InternalLink title="Identity Hub" description="User authentication layers and RBAC permission management." icon="🔑" path="#iam" tag="MANAGED" />
          </div>
        </Card>

        {/* Neural Insights */}
        <Card className="md:col-span-4 h-96 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Neural Insights</h3>
             <span className={`px-2 py-0.5 ${isRateLimited ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'} dark:bg-opacity-20 text-[10px] rounded-full font-bold tracking-tighter`}>
               {isRateLimited ? 'QUOTA LIMIT' : 'GEMINI AI'}
             </span>
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
              <div className={`p-3 rounded-xl soft-ui-inset bg-opacity-20 border ${isRateLimited ? 'border-orange-500/20' : 'border-white/5'}`}>
                <p className={`text-[10px] ${isRateLimited ? 'text-orange-500' : 'text-blue-500'} font-bold uppercase mb-1 tracking-widest`}>Status Conclusion</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">"{aiInsight?.status}"</p>
              </div>
              <div className="p-3 rounded-xl soft-ui-inset bg-opacity-20 border border-white/5">
                <p className="text-[10px] text-orange-500 font-bold uppercase mb-1 tracking-widest">AI Forecast</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-mono opacity-80">{aiInsight?.prediction}</p>
              </div>
              <div className="p-3 rounded-xl soft-ui-inset bg-opacity-20 border border-white/5">
                <p className="text-[10px] text-green-500 font-bold uppercase mb-1 tracking-widest">Primary Action</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{aiInsight?.recommendation}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Resource Graph */}
        <Card className="md:col-span-4 flex flex-col justify-between h-96">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resource Graph</h3>
          <div className="flex space-x-5 h-40 items-end justify-center py-4">
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
              <span className="text-[10px] mt-2 font-bold text-gray-400 text-green-500/80">DSK</span>
            </div>
            <div className="flex flex-col items-center h-full" title="I/O Activity">
              <div className="w-6 soft-ui-inset relative h-full rounded-full overflow-hidden">
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-full transition-all duration-700 ease-in-out opacity-60" style={{ height: `${(stats.network / 1500) * 100}%` }}></div>
              </div>
              <span className="text-[10px] mt-2 font-bold text-gray-400">IO</span>
            </div>
          </div>
          <div className="flex-1 w-full relative pt-2 border-t border-gray-300 dark:border-gray-800">
             <div className="absolute top-2 right-2 z-10 text-[10px] font-mono font-bold text-gray-400">
                NET: {Math.round(stats.network)} KB/s
             </div>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={networkHistory}>
                  <defs>
                    <linearGradient id="colorNetwork" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'transparent', fontSize: '10px' }}
                    itemStyle={{ color: '#8884d8' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorNetwork)" isAnimationActive={false} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </Card>

        {/* Process Management */}
        <Card className="md:col-span-4 h-96 flex flex-col">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Process Management</h3>
          <div className="space-y-8 flex-1 flex flex-col justify-center">
            <Toggle label="Web Server" active={services.nginx} onToggle={() => toggleService('nginx')} />
            <Toggle label="Docker Swarm" active={services.docker} onToggle={() => toggleService('docker')} />
            <Toggle label="Primary DB" active={services.postgres} onToggle={() => toggleService('postgres')} statusColor="bg-orange-400" />
            <div className="pt-4 border-t border-gray-300 dark:border-gray-800 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Auto-Scale</span>
              <span className="text-green-500 animate-pulse">ACTIVE</span>
            </div>
          </div>
        </Card>

        {/* CPU History Graph */}
        <Card className="md:col-span-12 h-64 flex flex-col relative overflow-hidden">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">CPU History (30 Ticks)</h3>
             <div className="text-[10px] font-mono font-bold text-gray-400">
                PEAK: {Math.max(...cpuHistory.map(d => d.value), 0).toFixed(1)}%
             </div>
           </div>
           <div className="flex-1 w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuHistory}>
                    <defs>
                      <linearGradient id="colorCpuHistory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'transparent', fontSize: '10px' }}
                      itemStyle={{ color: '#3b82f6' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpuHistory)" isAnimationActive={false} />
                  </AreaChart>
               </ResponsiveContainer>
           </div>
        </Card>

        {/* Terminal Logs */}
        <Card className="md:col-span-12 h-64 font-mono text-xs relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <span className="font-bold text-gray-400 tracking-widest uppercase">WS Stream: /var/log/dyai-node.log</span>
              <button
                onClick={() => setShowCriticalOnly(!showCriticalOnly)}
                className={`text-[10px] px-2 py-1 rounded border transition-colors font-bold tracking-wider ${showCriticalOnly ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-gray-500 text-gray-500 hover:text-gray-400'}`}
              >
                {showCriticalOnly ? 'CRITICAL ONLY' : 'ALL LOGS'}
              </button>
            </div>
            <span className={`flex items-center gap-2 font-bold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></span>
              {isConnected ? 'STREAMING' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="space-y-2 opacity-90 h-40 overflow-y-auto custom-scrollbar">
            {logs
              .filter(log => !showCriticalOnly || ['error', 'warn'].includes(log.type))
              .map((log) => {
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
        DYAI Augmentation Dash v3.1.2 | Reactive WebSocket Layer | {isConnected ? 'Link Active' : 'Link Offline'}
      </footer>
    </div>
  );
};

export default App;
