import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeetingDatabase } from './db/database.js';
import { runSync } from './index.js';
import { Meeting } from './types/index.js';
import { getAllChannels } from './services/ntfyTopics.js';
import { getPolishTodayStr } from './utils/dateParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';


const db = new MeetingDatabase();
let isSyncRunning = false;


const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar; charset=utf-8',
};

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(data));
}

function sendText(res: http.ServerResponse, statusCode: number, text: string, contentType: string = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(text);
}

function parseMeetings(allMeetings: Meeting[], urlObj: URL) {
  const municipality = urlObj.searchParams.get('municipality');
  const type = urlObj.searchParams.get('type');
  const timeFilter = urlObj.searchParams.get('timeFilter') || 'all'; // 'upcoming' | 'past' | 'all'
  const q = urlObj.searchParams.get('q')?.toLowerCase().trim();
  const sort = urlObj.searchParams.get('sort') || 'date_desc';

  const todayStr = getPolishTodayStr();

  return allMeetings.filter((m) => {
    if (municipality && municipality !== 'all' && m.municipality.toLowerCase() !== municipality.toLowerCase()) {
      return false;
    }
    if (type && type !== 'all' && m.type.toLowerCase() !== type.toLowerCase()) {
      return false;
    }
    if (timeFilter === 'upcoming') {
      const mDate = m.date.slice(0, 10);
      if (mDate < todayStr) return false;
    } else if (timeFilter === 'past') {
      const mDate = m.date.slice(0, 10);
      if (mDate >= todayStr) return false;
    }
    if (q) {
      const textToSearch = `${m.title} ${m.municipality} ${m.date} ${m.type} ${m.url}`.toLowerCase();
      if (!textToSearch.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === 'date_asc') {
      return a.date.localeCompare(b.date);
    }
    return b.date.localeCompare(a.date);
  });
}


function generateIcs(meetings: Meeting[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KiedySesja//Terminarz Powiatu Tureckiego//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Sesje i Komisje Powiatu Tureckiego',
    'X-WR-TIMEZONE:Europe/Warsaw',
  ];

  for (const m of meetings) {
    const cleanDate = m.date.replace(/[-:\s]/g, '').slice(0, 12);
    if (cleanDate.length < 8) continue;
    const dtStart = cleanDate.length >= 12 ? `${cleanDate}00` : `${cleanDate.slice(0, 8)}T090000`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${m.id}@kiedysesja.powiat.turek`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`SUMMARY:[${m.municipality}] ${m.title}`);
    lines.push(`DESCRIPTION:Typ: ${m.type}\\nStatus: ${m.status}\\nLink: ${m.url}`);
    lines.push(`LOCATION:${m.municipality}`);
    lines.push(`URL:${m.url}`);
    lines.push(`STATUS:${m.status === 'Odwołane' ? 'CANCELLED' : 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

const server = http.createServer(async (req, res) => {
  const reqUrl = req.url || '/';
  const urlObj = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // Obsługa CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // --- API: Lista posiedzeń z filtrowaniem ---
  if (pathname === '/api/meetings' && req.method === 'GET') {
    const all = db.getAll();
    const filtered = parseMeetings(all, urlObj);
    sendJson(res, 200, {
      total: all.length,
      filteredCount: filtered.length,
      meetings: filtered,
    });
    return;
  }

  // --- API: Statystyki ---
  if (pathname === '/api/stats' && req.method === 'GET') {
    const all = db.getAll();
    const todayStr = getPolishTodayStr();

    const upcoming = all.filter((m) => m.date.slice(0, 10) >= todayStr).length;
    const past = all.length - upcoming;
    const sessions = all.filter((m) => m.type.toLowerCase().includes('sesja')).length;
    const commissions = all.filter((m) => m.type.toLowerCase().includes('komisj')).length;

    const municipalityCounts: Record<string, number> = {};
    let latestUpdate = '';
    for (const m of all) {
      municipalityCounts[m.municipality] = (municipalityCounts[m.municipality] || 0) + 1;
      if (!latestUpdate || (m.updated_at && m.updated_at > latestUpdate)) {
        latestUpdate = m.updated_at;
      }
    }

    sendJson(res, 200, {
      total: all.length,
      upcoming,
      past,
      sessions,
      commissions,
      municipalitiesCount: Object.keys(municipalityCounts).length,
      municipalityCounts,
      lastUpdated: latestUpdate || new Date().toISOString(),
    });
    return;
  }

  // --- API: Kanały powiadomień ntfy (zbiorczy i per gmina) ---
  if (pathname === '/api/channels' && req.method === 'GET') {
    const channels = getAllChannels();
    sendJson(res, 200, channels);
    return;
  }

  // --- API: Lista samorządów ---
  if (pathname === '/api/municipalities' && req.method === 'GET') {
    const all = db.getAll();
    const map = new Map<string, { count: number; upcoming: number }>();
    const todayStr = getPolishTodayStr();


    for (const m of all) {
      const curr = map.get(m.municipality) || { count: 0, upcoming: 0 };
      curr.count++;
      if (m.date.slice(0, 10) >= todayStr) curr.upcoming++;
      map.set(m.municipality, curr);
    }

    const result = Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
    })).sort((a, b) => b.count - a.count);

    sendJson(res, 200, result);
    return;
  }

  // --- API: Eksport do kalendarza (.ics) ---
  if (pathname === '/api/export/ics' && req.method === 'GET') {
    const all = db.getAll();
    const filtered = parseMeetings(all, urlObj);
    const icsContent = generateIcs(filtered);
    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sesje_powiat_turek.ics"',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(icsContent);
    return;
  }

  // --- API: Eksport do JSON ---
  if (pathname === '/api/export/json' && req.method === 'GET') {
    const all = db.getAll();
    const filtered = parseMeetings(all, urlObj);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sesje_powiat_turek.json"',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(filtered, null, 2));
    return;
  }

  // --- API: Ręczna synchronizacja scraperów ---
  if (pathname === '/api/sync' && req.method === 'POST') {
    if (isSyncRunning) {
      sendJson(res, 409, {
        success: false,
        message: 'Synchronizacja jest już w toku. Poczekaj na zakończenie bieżącego zadania.',
      });
      return;
    }

    isSyncRunning = true;
    try {
      console.log('[Server] Żądanie ręcznej synchronizacji scraperów z panelu WWW...');
      const syncResult = await runSync(db);
      sendJson(res, 200, {
        success: true,
        message: 'Synchronizacja zakończona pomyślnie.',
        ...syncResult,
      });
    } catch (err) {
      console.error('[Server] Błąd podczas synchronizacji:', err);
      sendJson(res, 500, {
        success: false,
        error: (err as Error).message,
      });
    } finally {
      isSyncRunning = false;
    }
    return;
  }

  // --- Statyczne pliki (Frontend) ---
  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(PUBLIC_DIR, '.' + normalizedPath);

  // Bezpieczeństwo przed Directory Traversal (wymagany separator katalogu)
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  let finalFilePath = filePath;
  // Jeśli brak rozszerzenia, spróbuj .html
  if (!path.extname(finalFilePath)) {
    finalFilePath += '.html';
  }

  try {
    const stat = await fs.promises.stat(finalFilePath);
    if (stat.isFile()) {
      const ext = path.extname(finalFilePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const content = await fs.promises.readFile(finalFilePath);
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(content);
      return;
    }
  } catch {}

  // 404 dla nieodnalezionych zasobów
  sendText(res, 404, '404 Not Found');
});


server.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log(`🌐 Serwis WWW KiedySesja działa pod adresem: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📊 API dostępne pod: http://localhost:${PORT}/api/meetings`);
  console.log('='.repeat(60));
});

export { server };
