import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = process.env['DB_PATH'] ?? path.join(process.cwd(), 'budgety.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
    if (!_db) {
        _db = new Database(DB_PATH)
        _db.pragma('journal_mode = WAL')
        _db.pragma('foreign_keys = ON')
        initSchema(_db)
    }
    return _db
}

/** Exposed only for tests – swap the underlying instance. */
export function setDb(db: Database.Database): void {
    _db = db
}

function initSchema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            type        TEXT    NOT NULL DEFAULT 'checking',
            balance     REAL    NOT NULL DEFAULT 0,
            currency    TEXT    NOT NULL DEFAULT 'EUR',
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS categories (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            color       TEXT,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            amount      REAL    NOT NULL,
            type        TEXT    NOT NULL CHECK(type IN ('income','expense','transfer')),
            date        TEXT    NOT NULL,
            description TEXT,
            account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );
    `)
}
