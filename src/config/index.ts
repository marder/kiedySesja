import path from 'node:path';

export const config = {
  db: {
    path: process.env.DB_PATH
      ? path.resolve(process.cwd(), process.env.DB_PATH)
      : path.resolve(process.cwd(), 'meetings.db'),
  },
  ntfy: {
    enabled: process.env.NTFY_ENABLED !== 'false',
    topicUrl: process.env.NTFY_URL || 'https://ntfy.sh/kiedy-sesje-turek',
  },
  smtp: {
    enabled: process.env.SMTP_ENABLED === 'true',
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || '"Kiedy Sesja Bot" <noreply@example.com>',
    to: process.env.SMTP_TO || 'powiadomienia@example.com',
  },
  sync: {
    autoSyncEnabled: process.env.AUTO_SYNC_ENABLED !== 'false',
    intervalMinutes: Number(process.env.SYNC_INTERVAL_MINUTES) || 30,
  },
  http: {
    proxyUrl: process.env.BIP_PROXY_URL || process.env.HTTP_PROXY || '',
    timeoutMs: Number(process.env.HTTP_TIMEOUT_MS) || 15000,
    userAgent:
      process.env.HTTP_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
};
