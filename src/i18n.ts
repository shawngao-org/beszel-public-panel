import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "public_view": "Public View",
      "connecting": "Loading...",
      "no_systems": "No systems found.",
      "retry": "Retry Connection",
      "uptime": "Uptime",
      "day": "d",
      "hour": "h",
      "min": "m",
      "cpu": "CPU",
      "mem": "MEM",
      "disk": "DISK",
      "inbound": "Inbound",
      "outbound": "Outbound",
      "total_cpu": "Total CPU",
      "docker_cpu": "Docker CPU",
      "load_avg": "Load Average",
      "temp": "Temperature",
      "net_traffic": "Net Traffic",
      "docker_net": "Docker Net I/O",
      "disk_io": "Disk I/O",
      "read": "Read",
      "write": "Write",
      "system_info": "System Info",
      "current_status": "Current Status",
      "os": "OS",
      "version": "Version",
      "agent_v": "Agent Version",
      "hardware": "Hardware",
      "back": "Back",
      "error_proxy": "Failed to connect to proxy server",
      "sensor": "Sensor",
      "current": "Current",
      "usage_history": "Usage History"
    }
  },
  zh: {
    translation: {
      "public_view": "公开展示",
      "connecting": "正在加载中...",
      "no_systems": "未找到服务器。",
      "retry": "重试连接",
      "uptime": "运行时间",
      "day": "天",
      "hour": "时",
      "min": "分",
      "cpu": "CPU",
      "mem": "内存",
      "disk": "磁盘",
      "inbound": "入站",
      "outbound": "出站",
      "total_cpu": "总 CPU",
      "docker_cpu": "容器 CPU",
      "load_avg": "负载",
      "temp": "温度",
      "net_traffic": "网络流量",
      "docker_net": "容器网络 I/O",
      "disk_io": "磁盘 I/O",
      "read": "读取",
      "write": "写入",
      "system_info": "系统信息",
      "current_status": "当前状态",
      "os": "操作系统",
      "version": "版本",
      "agent_v": "Agent 版本",
      "hardware": "硬件配置",
      "back": "返回",
      "error_proxy": "无法连接到代理服务器",
      "sensor": "传感器",
      "current": "当前值",
      "usage_history": "历史趋势"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;
