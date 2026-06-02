import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, Cpu, Network, Info, Server, Thermometer, Database, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import type { System, MetricData } from '../types/beszel'

const formatSpeed = (bytes: number) => {
  if (bytes === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatMemory = (megabytes: number) => {
  if (!megabytes) return 'N/A';
  if (megabytes < 1024) return `${Math.round(megabytes)} MB`;
  return `${(megabytes / 1024).toFixed(1)} GB`;
};

const formatUptime = (seconds: number, t: any) => {
  if (!seconds) return 'N/A';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}${t('day')} ${h}${t('hour')}`;
  if (h > 0) return `${h}${t('hour')} ${m}${t('min')}`;
  return `${m}${t('min')}`;
};

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-md border border-primary/20 p-3 rounded-xl shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-100">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-primary/10 pb-1">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            const isSpeed = ['net_in', 'net_out', 'docker_net_in', 'docker_net_out', 'disk_read', 'disk_write'].includes(entry.dataKey);
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: entry.color || entry.fill }} 
                  />
                  <span className="text-[11px] font-medium text-foreground/80 uppercase">
                    {entry.name}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-foreground">
                  {isSpeed ? formatSpeed(entry.value) : `${entry.value}${unit}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export function SystemPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [system, setSystem] = useState<System | null>(location.state?.system || null)
  const [history, setHistory] = useState<MetricData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCharts, setShowCharts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_URL = (window as any).__CONFIG__?.VITE_API_URL || import.meta.env.VITE_API_URL || '';

  const fetchData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
        setShowCharts(false);
      }
      
      let currentSystem = system;
      if (!currentSystem) {
        const sResp = await fetch(`${API_URL}/api/systems`);
        const sData = await sResp.json();
        currentSystem = sData.find((s: System) => s.id === id);
        if (currentSystem) setSystem(currentSystem);
        else throw new Error('System not found');
      } else if (isRefresh) {
        // Update the system object itself to get latest current stats
        const sResp = await fetch(`${API_URL}/api/systems`);
        const sData = await sResp.json();
        const updatedSystem = sData.find((s: System) => s.id === id);
        if (updatedSystem) setSystem(updatedSystem);
      }

      const hResp = await fetch(`${API_URL}/api/systems/${id}/history`);
      if (!hResp.ok) throw new Error('Failed to fetch history');
      const hData = await hResp.json();
      setHistory(hData);
      
      if (!isRefresh) {
        setTimeout(() => {
          setLoading(false);
          setTimeout(() => {
            setShowCharts(true);
          }, 100);
        }, 800);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (!isRefresh) {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [id, API_URL]);

  if (!system && loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
        <p className="text-muted-foreground animate-pulse">{t('connecting')}</p>
      </div>
    );
  }

  if (error || !system) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive font-bold">{t('no_systems')}</p>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </button>
      </div>
    );
  }

  const info = (system as any).info || {};
  const details = (system as any).details || {};

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 dark">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${system.status === 'up' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
            <h1 className="text-xl font-bold tracking-tight">{system.name}</h1>
          </div>
          <Badge variant="outline" className="hidden sm:flex ml-auto font-mono text-[10px]">
            {system.host}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="space-y-6">
            <Card className="border-primary/10 bg-muted/5 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Info className="w-4 h-4" /> {t('system_info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">{t('os')}</span>
                  <p className="text-sm font-medium">{details.os_name || details.os || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">{t('cpu')}</span>
                  <p className="text-sm font-medium leading-snug">{details.cpu || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">{t('hardware')}</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {formatMemory(details.mem_total || system.stats?.mem_total)} RAM
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatMemory(details.disk_total || system.stats?.disk_total)} Disk
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1 border-t pt-3">
                  <span className="text-xs text-muted-foreground">{t('uptime')}</span>
                  <p className="text-sm font-mono">{formatUptime(info.u, t)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">{t('agent_v')}</span>
                  <p className="text-sm font-mono text-primary">{info.v || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-muted/5 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Thermometer className="w-4 h-4" /> {t('current_status')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(history.some(h => (h as any).temp > 0 || Object.keys(h).some(k => k.startsWith('sensor_')))) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('temp')}</span>
                    <span className="font-bold text-amber-500">{(system.stats as any)?.temp || 0}°C</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('load_avg')} (1m)</span>
                  <span className="font-bold font-mono">{(system.stats as any)?.load?.[0] || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground/70 text-xs">{t('load_avg')} (5m)</span>
                  <span className="font-bold font-mono text-xs opacity-80">{(system.stats as any)?.load?.[1] || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground/70 text-xs">{t('load_avg')} (15m)</span>
                  <span className="font-bold font-mono text-xs opacity-80">{(system.stats as any)?.load?.[2] || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('inbound')}</span>
                  <span className="font-bold text-emerald-500 font-mono">{formatSpeed(system.stats?.net_in || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('outbound')}</span>
                  <span className="font-bold text-amber-500 font-mono">{formatSpeed(system.stats?.net_out || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 relative min-h-[600px]">
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/50 backdrop-blur-[2px] rounded-xl border border-dashed border-primary/20">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                <p className="text-sm text-muted-foreground animate-pulse">{t('connecting')}</p>
              </div>
            )}

            {/* Chart Grid with controlled visibility */}
            <div className={`space-y-8 transition-all duration-500 ${showCharts ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98] pointer-events-none'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CPU Chart */}
                <Card className="border-primary/5 shadow-sm overflow-hidden md:col-span-2">
                  <CardHeader className="bg-muted/5 border-b border-primary/5 py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary" /> {t('total_cpu')} (%)
                      </CardTitle>
                      <span className="text-lg font-bold font-mono text-primary">{history[history.length-1]?.cpu}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                          <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={30} domain={[0, 100]} />
                          <Tooltip content={<CustomTooltip unit="%" />} />
                          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                          <Area name={t('total_cpu')} type="monotone" dataKey="cpu" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
                          {(history[0] as any)?.docker_cpu !== undefined && (
                            <Area name={t('docker_cpu')} type="monotone" dataKey="docker_cpu" stroke="#a855f7" strokeWidth={2} fill="transparent" isAnimationActive={false} />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Memory Chart */}
                <Card className="border-primary/5 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/5 border-b border-primary/5 py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-500" /> {t('mem')} (%)
                      </CardTitle>
                      <span className="text-lg font-bold font-mono text-blue-500">{history[history.length-1]?.mem}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                          <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={30} domain={[0, 100]} />
                          <Tooltip content={<CustomTooltip unit="%" />} />
                          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                          <Area name={t('mem')} type="monotone" dataKey="mem" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMem)" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Disk Usage Chart */}
                <Card className="border-primary/5 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/5 border-b border-primary/5 py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-500" /> {t('disk')} (%)
                      </CardTitle>
                      <span className="text-lg font-bold font-mono text-amber-500">{(history[history.length-1] as any)?.disk_p}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                          <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={30} domain={[0, 100]} />
                          <Tooltip content={<CustomTooltip unit="%" />} />
                          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                          <Area name={t('disk')} type="monotone" dataKey="disk_p" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorDisk)" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* System Load Chart */}
                <Card className="border-primary/5 shadow-sm overflow-hidden md:col-span-2">
                  <CardHeader className="bg-muted/5 border-b border-primary/5 py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-500" /> {t('load_avg')}
                      </CardTitle>
                      <div className="flex gap-4 text-sm font-mono">
                        <span className="text-cyan-500 text-xs">1m: {(history[history.length-1] as any)?.load_1m}</span>
                        <span className="text-blue-500 text-xs">5m: {(history[history.length-1] as any)?.load_5m}</span>
                        <span className="text-indigo-500 text-xs">15m: {(history[history.length-1] as any)?.load_15m}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                        <AreaChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                          <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={40} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                          <Area name="1 min" type="monotone" dataKey="load_1m" stroke="#06b6d4" strokeWidth={3} fill="#06b6d4" fillOpacity={0.05} isAnimationActive={false} />
                          <Area name="5 min" type="monotone" dataKey="load_5m" stroke="#3b82f6" strokeWidth={2} fill="transparent" isAnimationActive={false} />
                          <Area name="15 min" type="monotone" dataKey="load_15m" stroke="#6366f1" strokeWidth={2} fill="transparent" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Network Chart */}
                <Card className="border-primary/5 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/5 border-b border-primary/5 py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Network className="w-4 h-4 text-emerald-500" /> {t('net_traffic')}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                        <AreaChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                          <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={40} tickFormatter={(val) => formatSpeed(val)} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                          <Area name={t('inbound')} type="monotone" dataKey="net_in" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.1} isAnimationActive={false} />
                          <Area name={t('outbound')} type="monotone" dataKey="net_out" stroke="#f59e0b" strokeWidth={3} fill="#f59e0b" fillOpacity={0.1} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Docker Network I/O Chart */}
                <Card className="border-primary/5 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/5 border-b border-primary/5 py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Network className="w-4 h-4 text-purple-500" /> {t('docker_net')}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                        <AreaChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                          <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={40} tickFormatter={(val) => formatSpeed(val)} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                          <Area name={t('inbound')} type="monotone" dataKey="docker_net_in" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.05} isAnimationActive={false} />
                          <Area name={t('outbound')} type="monotone" dataKey="docker_net_out" stroke="#d946ef" strokeWidth={2} fill="#d946ef" fillOpacity={0.05} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Disk I/O Chart */}
                <Card className="border-primary/5 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/5 border-b border-primary/5 py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Database className="w-4 h-4 text-rose-500" /> {t('disk_io')}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                        <AreaChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                          <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={40} tickFormatter={(val) => formatSpeed(val)} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                          <Area name={t('read')} type="monotone" dataKey="disk_read" stroke="#e11d48" strokeWidth={2} fill="#e11d48" fillOpacity={0.05} isAnimationActive={false} />
                          <Area name={t('write')} type="monotone" dataKey="disk_write" stroke="#4f46e5" strokeWidth={2} fill="#4f46e5" fillOpacity={0.05} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Temperature Chart */}
                {(history.some(h => (h as any).temp > 0 || Object.keys(h).some(k => k.startsWith('sensor_')))) && (
                  <Card className="border-primary/5 shadow-sm overflow-hidden md:col-span-2">
                    <CardHeader className="bg-muted/5 border-b border-primary/5 py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-orange-500" /> {t('temp')} (°C)
                        </CardTitle>
                        <span className="text-lg font-bold font-mono text-orange-500">{(history[history.length-1] as any)?.temp || 0}°C</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                          <AreaChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                            <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" minTickGap={30} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={30} />
                            <Tooltip content={<CustomTooltip unit="°C" />} />
                            {Object.keys(history[0] || {}).filter(key => key.startsWith('sensor_')).map((key, index) => {
                              const colors = ['#f97316', '#f59e0b', '#fbbf24', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'];
                              return <Area key={key} name={key.replace('sensor_', '').replace(/_/g, ' ')} type="monotone" dataKey={key} stroke={colors[index % colors.length]} strokeWidth={2} fill="transparent" isAnimationActive={false} />;
                            })}
                            {Object.keys(history[0] || {}).filter(k => k.startsWith('sensor_')).length === 0 && (
                              <Area name="Main Temp" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} fill="transparent" isAnimationActive={false} />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="border rounded-lg overflow-hidden bg-muted/5">
                        <div className="max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20">
                          <table className="w-full text-[10px] font-mono border-collapse">
                            <thead className="bg-muted/10 sticky top-0 text-left">
                              <tr className="border-b border-primary/5">
                                <th className="p-2 opacity-70 font-medium">{t('sensor')}</th>
                                <th className="p-2 opacity-70 font-medium text-right">{t('current')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-primary/5">
                              {Object.keys(history[0] || {}).filter(key => key.startsWith('sensor_')).map((key, index) => {
                                const colors = ['#f97316', '#f59e0b', '#fbbf24', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'];
                                return (
                                  <tr key={key} className="hover:bg-primary/5 transition-colors">
                                    <td className="p-2 flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                                      <span className="uppercase">{key.replace('sensor_', '').replace(/_/g, ' ')}</span>
                                    </td>
                                    <td className="p-2 text-right font-bold">{(history[history.length - 1] as any)?.[key]}°C</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
