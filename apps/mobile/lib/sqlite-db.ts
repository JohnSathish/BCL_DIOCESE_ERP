import * as SQLite from 'expo-sqlite';

const DB_NAME = 'bcl_offline.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS portal_cache (
          key TEXT PRIMARY KEY NOT NULL,
          json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at INTEGER NOT NULL,
          error TEXT
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function cacheWrite(key: string, value: unknown) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO portal_cache (key, json, updated_at) VALUES (?, ?, ?)',
    key,
    JSON.stringify(value),
    Date.now(),
  );
}

export async function cacheRead<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ json: string }>(
    'SELECT json FROM portal_cache WHERE key = ?',
    key,
  );
  if (!row?.json) return null;
  try {
    return JSON.parse(row.json) as T;
  } catch {
    return null;
  }
}

export type SyncQueueItem = {
  id: string;
  kind: string;
  payload: string;
  status: string;
  created_at: number;
  error: string | null;
};

export async function enqueueSync(kind: string, payload: unknown, id?: string) {
  const db = await getDb();
  const syncId = id || `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_queue (id, kind, payload, status, created_at, error) VALUES (?, ?, ?, ?, ?, NULL)',
    syncId,
    kind,
    JSON.stringify(payload),
    'pending',
    Date.now(),
  );
  return syncId;
}

export async function listPendingSync() {
  const db = await getDb();
  return db.getAllAsync<SyncQueueItem>(
    "SELECT id, kind, payload, status, created_at, error FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC",
  );
}

export async function markSyncDone(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
}

export async function markSyncFailed(id: string, error: string) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'failed', error = ? WHERE id = ?",
    error.slice(0, 500),
    id,
  );
}

export async function clearPortalCache() {
  const db = await getDb();
  await db.runAsync('DELETE FROM portal_cache');
}

export const SqliteKeys = {
  portalBundle: 'occupant.portal.bundle',
} as const;
