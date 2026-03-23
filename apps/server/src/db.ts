import Database from 'better-sqlite3'

let db: Database.Database | undefined

function initSchema(database: Database.Database): void {
    database.pragma('foreign_keys = ON')

    database.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            initial_balance REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
            parent_id INTEGER NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
            category_id INTEGER NULL,
            account_id INTEGER NOT NULL,
            transfer_account_id INTEGER NULL,
            is_recurring INTEGER NOT NULL DEFAULT 0,
            frequency TEXT NULL CHECK(frequency IN ('monthly', 'yearly')),
            recurrence_anchor_date TEXT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
            FOREIGN KEY (transfer_account_id) REFERENCES accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            total_amount REAL NOT NULL,
            remaining_amount REAL NOT NULL,
            monthly_payment REAL NOT NULL,
            next_due_date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            is_recurring INTEGER NOT NULL DEFAULT 0,
            period TEXT NULL CHECK(period IN ('monthly', 'yearly')),
            month_override TEXT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
    `)
}

export function getDb(): Database.Database {
    if (!db) {
        db = new Database(process.env['DB_PATH'] ?? 'budgety.db')
        initSchema(db)
    }

    return db
}

export function setDb(database: Database.Database): void {
    db = database
    initSchema(db)
}
