import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Activity, Globe, Loader2, Thermometer } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import type { System } from '../types/beszel'

const formatSpeed = (bytes: number) => {
  if (bytes === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

const formatMemory = (megabytes: number) => {
  if (!megabytes) return 'N/A';
  if (megabytes < 1024) return `${Math.round(megabytes)} MB`;
  return `${(megabytes / 1024).toFixed(1)} GB`;
};

export function Dashboard() {
  const { t } = useTranslation()
  const [systems, setSystems] = useState<System[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchSystems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/systems`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy error: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Proxy returned invalid data format (expected array)');
      }
      setSystems(data);
      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to connect to proxy server');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystems();
    const interval = setInterval(fetchSystems, 5000);
    return () => clearInterval(interval);
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 dark">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Beszel Public</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-[10px] uppercase tracking-tighter">
              <Globe className="w-3 h-3" />
              {t('public_view')}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('connecting')}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
            <p className="text-destructive font-medium text-lg">{t('error_proxy')}</p>
            <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            <button 
              onClick={() => { setLoading(true); fetchSystems(); }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        ) : systems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
            <p className="text-muted-foreground text-lg">{t('no_systems')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systems.map((system) => (
              <Card 
                key={system.id} 
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-primary/5 hover:border-primary/20"
                onClick={() => navigate(`/system/${system.id}`, { state: { system } })}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b bg-muted/5">
                  <div className="flex flex-col">
                    <CardTitle className="text-lg font-bold">{system.name || 'Unknown'}</CardTitle>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {(system as any).details?.os_name || (system as any).details?.os || 'Linux'}
                    </span>
                  </div>
                  <Badge variant={system.status === 'up' ? 'success' : 'destructive'}>
                    {(system.status || 'unknown').toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground font-mono">
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[150px] font-bold">{system.host || 'No host'}</span>
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {formatUptime((system as any).info?.u, t)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-1.5">
                      <div className="flex items-center gap-3">
                        {((system as any).history?.some((h: any) => h.temp > 0 || Object.keys(h).some(k => k.startsWith('sensor_')))) && (
                          <span className="flex items-center gap-0.5 text-amber-500">
                            <Thermometer className="w-3 h-3" />
                            {(system.stats as any)?.temp || 0}°C
                          </span>
                        )}
                        {(system.stats as any)?.load && (
                          <span className="flex items-center gap-0.5 text-blue-500">
                            <Activity className="w-3 h-3" />
                            L: {(system.stats as any).load[0]}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-foreground/70">
                        {formatMemory((system as any).details?.mem_total || (system.stats as any)?.mem_total)}
                      </span>
                    </div>
                  </div>

                  <div className="h-10 w-full -mx-1 opacity-50">
                    {(system as any).history?.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={(system as any).history}>
                          <Area type="monotone" dataKey="cpu" stroke="hsl(var(--primary))" strokeWidth={1} fill="hsl(var(--primary))" fillOpacity={0.05} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  
                  {system.stats ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1 font-medium opacity-70">{t('cpu')}</span>
                          <span className="font-bold font-mono">{system.stats.cpu || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${system.stats.cpu || 0}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1 font-medium opacity-70">{t('mem')}</span>
                          <span className="font-bold font-mono">{system.stats.mem || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${system.stats.mem || 0}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1 font-medium opacity-70">{t('disk')}</span>
                          <span className="font-bold font-mono">{system.stats.disk || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${system.stats.disk || 0}%` }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t text-[10px] font-mono">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground uppercase text-[8px] tracking-tight">{t('inbound')}</span>
                          <span className="text-emerald-500 font-bold">{formatSpeed(system.stats.net_in || 0)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-muted-foreground uppercase text-[8px] tracking-tight">{t('outbound')}</span>
                          <span className="text-amber-500 font-bold">{formatSpeed(system.stats.net_out || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[100px] flex items-center justify-center text-muted-foreground italic text-center text-xs">{t('no_systems')}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t py-8 mt-12 bg-muted/5">
        <div className="container mx-auto px-4 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
          Data provider: <a href="https://github.com/henrygd/beszel" className="underline hover:text-primary transition-colors">Beszel Monitoring Hub</a>
        </div>
      </footer>
    </div>
  )
}
