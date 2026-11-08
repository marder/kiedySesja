import { createRequire } from 'node:module';
import { config } from '../config/index.js';
import { Meeting } from '../types/index.js';

const nodeRequire = createRequire(import.meta.url);

interface SqliteDbAdapter {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  close(): void;
}

export class MeetingDatabase {
  private db: SqliteDbAdapter;

  constructor(dbPath: string = config.db.path) {
    this.db = this.initEngine(dbPath);
    this.initSchema();
  }

  private initEngine(dbPath: string): SqliteDbAdapter {
    // 1. Próba załadowania better-sqlite3 (zgodnie ze specyfikacją)
    try {
      const BetterSqlite3 = nodeRequire('better-sqlite3');
      const bDb = new BetterSqlite3(dbPath);
      bDb.pragma('journal_mode = WAL');
      bDb.pragma('synchronous = NORMAL');
      console.log('[MeetingDatabase] Połączono z bazą SQLite (silnik: better-sqlite3)');
      return bDb;
    } catch {
      // 2. Automatyczny fallback do natywnego modułu node:sqlite (wbudowanego w Node.js v22+)
      // Przydatne w środowiskach deweloperskich Windows bez kompilatora C++ (Visual Studio)
      try {
        const { DatabaseSync } = nodeRequire('node:sqlite');
        const nDb = new DatabaseSync(dbPath);
        nDb.exec('PRAGMA journal_mode = WAL;');
        nDb.exec('PRAGMA synchronous = NORMAL;');
        console.log('[MeetingDatabase] Połączono z bazą SQLite (silnik: natywny node:sqlite)');
        return nDb;
      } catch (innerErr) {
        throw new Error(
          `Nie udało się zainicjalizować SQLite ani przez better-sqlite3, ani przez node:sqlite: ${innerErr}`
        );
      }
    }
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        municipality TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_meetings_municipality ON meetings(municipality);
      CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
    `);
  }

  public findById(id: string): Meeting | undefined {
    const stmt = this.db.prepare('SELECT * FROM meetings WHERE id = ?');
    return stmt.get(id) as Meeting | undefined;
  }

  public insert(meeting: Meeting): void {
    const stmt = this.db.prepare(`
      INSERT INTO meetings (id, municipality, type, title, date, status, url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      meeting.id,
      meeting.municipality,
      meeting.type,
      meeting.title,
      meeting.date,
      meeting.status,
      meeting.url,
      meeting.created_at,
      meeting.updated_at
    );
  }

  public update(meeting: Meeting): void {
    const stmt = this.db.prepare(`
      UPDATE meetings
      SET
        municipality = ?,
        type = ?,
        title = ?,
        date = ?,
        status = ?,
        url = ?,
        updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      meeting.municipality,
      meeting.type,
      meeting.title,
      meeting.date,
      meeting.status,
      meeting.url,
      meeting.updated_at,
      meeting.id
    );
  }

  public getAll(): Meeting[] {
    const stmt = this.db.prepare('SELECT * FROM meetings ORDER BY date DESC');
    return stmt.all() as Meeting[];
  }

  public close(): void {
    this.db.close();
  }
}
