import express from 'express';
import PocketBase from 'pocketbase';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Beszel Proxy is running' });
});

const pb = new PocketBase(process.env.VITE_PB_URL || 'http://127.0.0.1:8090');
pb.autoCancellation(false);

const sanitizeTemperature = (t) => {
  if (typeof t === 'number') return t;
  if (Array.isArray(t)) return typeof t[0] === 'number' ? t[0] : 0;
  if (typeof t === 'object' && t !== null) {
    const values = Object.values(t).filter(v => typeof v === 'number');
    return values.length > 0 ? values[0] : 0;
  }
  return 0;
};

// Aggregate helper for container stats
const aggregateContainerStats = (containerStatsRecord) => {
  if (!containerStatsRecord || !Array.isArray(containerStatsRecord.stats)) {
    return { cpu: 0, net_in: 0, net_out: 0 };
  }
  return containerStatsRecord.stats.reduce((acc, curr) => {
    acc.cpu += curr.c || 0;
    if (Array.isArray(curr.b)) {
      acc.net_in += curr.b[0] || 0;
      acc.net_out += curr.b[1] || 0;
    }
    return acc;
  }, { cpu: 0, net_in: 0, net_out: 0 });
};

async function authenticate() {
  if (process.env.VITE_PB_USER && process.env.VITE_PB_PASS && !pb.authStore.isValid) {
    try {
      await pb.collection('users').authWithPassword(process.env.VITE_PB_USER, process.env.VITE_PB_PASS);
      console.log('Successfully authenticated with Beszel');
    } catch (err) {
      console.error('Beszel Auth failed:', err.message);
    }
  }
}

authenticate();
setInterval(authenticate, 1000 * 60 * 60);

app.get('/api/systems', async (req, res) => {
  try {
    await authenticate();
    const records = await pb.collection('systems').getFullList({ sort: '-created' });
    const hideIp = process.env.VITE_HIDE_IP === 'true';
    
    const systems = await Promise.all(records.map(async (system) => {
      if (hideIp) system.host = '***.***.***.***';
      
      let stats = system.stats || null;
      let recentHistory = [];
      let details = {};
      
      try {
        try {
          details = await pb.collection('system_details').getFirstListItem(`system = "${system.id}"`);
        } catch (e) {}

        const historyRecords = await pb.collection('system_stats').getList(1, 20, {
          filter: `system = "${system.id}"`,
          sort: '-created',
        });

        let dockerCurrent = { cpu: 0, net_in: 0, net_out: 0 };
        try {
          const cStat = await pb.collection('container_stats').getFirstListItem(`system = "${system.id}"`, { sort: '-created' });
          dockerCurrent = aggregateContainerStats(cStat);
        } catch (e) {}
        
        recentHistory = historyRecords.items.map(h => ({
          cpu: h.stats?.cpu || 0,
          mem: h.stats?.mp || 0,
          temp: sanitizeTemperature(h.stats?.t || h.stats?.temp)
        })).reverse();

        if ((!stats || Object.keys(stats).length === 0) && historyRecords.items.length > 0) {
          stats = historyRecords.items[0].stats;
        }
      } catch (e) {}

      if (stats) {
        const temperature = sanitizeTemperature(system.info?.sv) || sanitizeTemperature(stats.t) || sanitizeTemperature(stats.temp);
        return {
          ...system,
          details: {
            ...details,
            os_name: details.os_name || details.os || system.info?.os || 'Linux',
            mem_total: (stats.m || details.mem_total || 0) * 1024,
            disk_total: (stats.d || details.disk_total || 0) * 1024,
          },
          history: recentHistory,
          stats: {
            ...stats,
            cpu: stats.cpu || 0,
            mem: stats.mp || 0,
            disk: stats.dp || 0,
            temp: temperature,
            load: stats.la || (system.info?.la) || [0, 0, 0],
            net_in: Array.isArray(stats.b) ? stats.b[0] : 0,
            net_out: Array.isArray(stats.b) ? stats.b[1] : 0,
          }
        };
      }
      return { ...system, details, history: recentHistory };
    }));
    res.json(systems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/systems/:id/history', async (req, res) => {
  try {
    await authenticate();
    const [systemRecords, containerRecords] = await Promise.all([
      pb.collection('system_stats').getList(1, 100, { filter: `system = "${req.params.id}"`, sort: '-created' }),
      pb.collection('container_stats').getList(1, 100, { filter: `system = "${req.params.id}"`, sort: '-created' })
    ]);

    const containerMap = new Map();
    containerRecords.items.forEach(c => containerMap.set(c.created, aggregateContainerStats(c)));

    const history = systemRecords.items.map(record => {
      const stats = record.stats || {};
      const docker = containerMap.get(record.created) || { cpu: 0, net_in: 0, net_out: 0 };
      const item = {
        time: new Date(record.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cpu: stats.cpu || 0,
        mem: stats.mp || 0,
        net_in: Array.isArray(stats.b) ? stats.b[0] : 0,
        net_out: Array.isArray(stats.b) ? stats.b[1] : 0,
        load_1m: Array.isArray(stats.la) ? stats.la[0] : 0,
        load_5m: Array.isArray(stats.la) ? stats.la[1] : 0,
        load_15m: Array.isArray(stats.la) ? stats.la[2] : 0,
        temp: sanitizeTemperature(stats.t || stats.temp),
        disk_p: stats.dp || 0,
        disk_read: Array.isArray(stats.dio) ? stats.dio[0] : 0,
        disk_write: Array.isArray(stats.dio) ? stats.dio[1] : 0,
        docker_cpu: parseFloat(docker.cpu.toFixed(2)), 
        docker_net_in: docker.net_in,
        docker_net_out: docker.net_out,
      };
      const rawTemp = stats.t || stats.temp || {};
      if (typeof rawTemp === 'object' && rawTemp !== null) {
        Object.entries(rawTemp).forEach(([key, val]) => {
          if (typeof val === 'number') item[`sensor_${key}`] = val;
        });
      }
      return item;
    });
    res.json(history.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Production static file serving ---
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));

// Handle SPA routing
app.get(/.*/, (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Beszel proxy server running at http://localhost:${port}`);
});
