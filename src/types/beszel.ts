export interface System {
  id: string;
  name: string;
  host: string;
  status: 'up' | 'down';
  created: string;
  updated: string;
  stats?: SystemStats;
}

export interface SystemStats {
  cpu: number;
  mem: number;
  mem_total: number;
  disk: number;
  disk_total: number;
  net_in: number;
  net_out: number;
  temp?: number;
}

export interface MetricData {
  time: string;
  cpu: number;
  mem: number;
  net_in: number;
  net_out: number;
}
