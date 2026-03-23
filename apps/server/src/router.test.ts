import Database from 'better-sqlite3'
import supertest from 'supertest'
import { beforeEach, describe, it } from 'vitest'
import { createApp } from './app.js'
import { setDb } from './db.js'

function createTestDb(): Database.Database {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    db.exec(`
        CREATE TABLE accounts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            type        TEXT    NOT NULL DEFAULT 'checking',
            balance     REAL    NOT NULL DEFAULT 0,
            currency    TEXT    NOT NULL DEFAULT 'EUR',
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE categories (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            color       TEXT,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE transactions (
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
    return db
}

const app = createApp()
const request = supertest(app)

beforeEach(() => {
    setDb(createTestDb())
})

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
        const res = await request.get('/api/health')
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ status: 'ok' })
    })
})

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
describe('Accounts API', () => {
    it('GET /api/accounts – returns empty list initially', async () => {
        const res = await request.get('/api/accounts')
        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it('POST /api/accounts – creates an account', async () => {
        const res = await request
            .post('/api/accounts')
            .send({ name: 'Compte Courant', type: 'checking', balance: 1000, currency: 'EUR' })
        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({
            name: 'Compte Courant',
            type: 'checking',
            balance: 1000,
            currency: 'EUR',
        })
        expect(res.body.id).toBeDefined()
    })

    it('POST /api/accounts – 400 when name is missing', async () => {
        const res = await request.post('/api/accounts').send({ balance: 100 })
        expect(res.status).toBe(400)
        expect(res.body.error).toBeDefined()
    })

    it('GET /api/accounts/:id – returns the account', async () => {
        const created = await request
            .post('/api/accounts')
            .send({ name: 'Épargne', type: 'savings', balance: 5000 })
        const res = await request.get(`/api/accounts/${created.body.id}`)
        expect(res.status).toBe(200)
        expect(res.body.name).toBe('Épargne')
    })

    it('GET /api/accounts/:id – 404 for unknown id', async () => {
        const res = await request.get('/api/accounts/9999')
        expect(res.status).toBe(404)
    })

    it('PUT /api/accounts/:id – updates an account', async () => {
        const created = await request.post('/api/accounts').send({ name: 'Old Name', balance: 0 })
        const res = await request
            .put(`/api/accounts/${created.body.id}`)
            .send({ name: 'New Name', balance: 200 })
        expect(res.status).toBe(200)
        expect(res.body.name).toBe('New Name')
        expect(res.body.balance).toBe(200)
    })

    it('PUT /api/accounts/:id – 404 for unknown id', async () => {
        const res = await request.put('/api/accounts/9999').send({ name: 'X' })
        expect(res.status).toBe(404)
    })

    it('DELETE /api/accounts/:id – deletes an account', async () => {
        const created = await request.post('/api/accounts').send({ name: 'To Delete' })
        const del = await request.delete(`/api/accounts/${created.body.id}`)
        expect(del.status).toBe(204)
        const get = await request.get(`/api/accounts/${created.body.id}`)
        expect(get.status).toBe(404)
    })

    it('DELETE /api/accounts/:id – 404 for unknown id', async () => {
        const res = await request.delete('/api/accounts/9999')
        expect(res.status).toBe(404)
    })
})

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
describe('Categories API', () => {
    it('GET /api/categories – returns empty list initially', async () => {
        const res = await request.get('/api/categories')
        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it('POST /api/categories – creates a category', async () => {
        const res = await request
            .post('/api/categories')
            .send({ name: 'Alimentation', color: '#ff0000' })
        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({ name: 'Alimentation', color: '#ff0000' })
    })

    it('POST /api/categories – creates a sub-category', async () => {
        const parent = await request.post('/api/categories').send({ name: 'Alimentation' })
        const res = await request
            .post('/api/categories')
            .send({ name: 'Courses', parent_id: parent.body.id })
        expect(res.status).toBe(201)
        expect(res.body.parent_id).toBe(parent.body.id)
    })

    it('POST /api/categories – 400 when name is missing', async () => {
        const res = await request.post('/api/categories').send({})
        expect(res.status).toBe(400)
    })

    it('GET /api/categories/:id – returns the category', async () => {
        const created = await request.post('/api/categories').send({ name: 'Loisirs' })
        const res = await request.get(`/api/categories/${created.body.id}`)
        expect(res.status).toBe(200)
        expect(res.body.name).toBe('Loisirs')
    })

    it('GET /api/categories/:id – 404 for unknown id', async () => {
        const res = await request.get('/api/categories/9999')
        expect(res.status).toBe(404)
    })

    it('PUT /api/categories/:id – updates a category', async () => {
        const created = await request.post('/api/categories').send({ name: 'Old' })
        const res = await request
            .put(`/api/categories/${created.body.id}`)
            .send({ name: 'New', color: '#00ff00' })
        expect(res.status).toBe(200)
        expect(res.body.name).toBe('New')
        expect(res.body.color).toBe('#00ff00')
    })

    it('DELETE /api/categories/:id – deletes a category', async () => {
        const created = await request.post('/api/categories').send({ name: 'To Delete' })
        const del = await request.delete(`/api/categories/${created.body.id}`)
        expect(del.status).toBe(204)
    })

    it('DELETE /api/categories/:id – 404 for unknown id', async () => {
        const res = await request.delete('/api/categories/9999')
        expect(res.status).toBe(404)
    })
})

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
describe('Transactions API', () => {
    async function createAccount(name = 'Test Account') {
        const res = await request.post('/api/accounts').send({ name, balance: 0 })
        return res.body as { id: number }
    }

    it('GET /api/transactions – returns empty list initially', async () => {
        const res = await request.get('/api/transactions')
        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })

    it('POST /api/transactions – creates a transaction', async () => {
        const account = await createAccount()
        const res = await request.post('/api/transactions').send({
            amount: 50.5,
            type: 'expense',
            date: '2024-01-15',
            description: 'Courses',
            account_id: account.id,
        })
        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({
            amount: 50.5,
            type: 'expense',
            date: '2024-01-15',
            description: 'Courses',
            account_id: account.id,
            account_name: 'Test Account',
        })
    })

    it('POST /api/transactions – 400 when amount is missing', async () => {
        const account = await createAccount()
        const res = await request
            .post('/api/transactions')
            .send({ type: 'expense', date: '2024-01-01', account_id: account.id })
        expect(res.status).toBe(400)
    })

    it('POST /api/transactions – 400 for invalid type', async () => {
        const account = await createAccount()
        const res = await request
            .post('/api/transactions')
            .send({ amount: 10, type: 'invalid', date: '2024-01-01', account_id: account.id })
        expect(res.status).toBe(400)
    })

    it('POST /api/transactions – 400 when account_id is missing', async () => {
        const res = await request
            .post('/api/transactions')
            .send({ amount: 10, type: 'income', date: '2024-01-01' })
        expect(res.status).toBe(400)
    })

    it('GET /api/transactions/:id – returns the transaction', async () => {
        const account = await createAccount()
        const created = await request.post('/api/transactions').send({
            amount: 100,
            type: 'income',
            date: '2024-02-01',
            account_id: account.id,
        })
        const res = await request.get(`/api/transactions/${created.body.id}`)
        expect(res.status).toBe(200)
        expect(res.body.amount).toBe(100)
    })

    it('GET /api/transactions – filters by account_id', async () => {
        const acc1 = await createAccount('Acc1')
        const acc2 = await createAccount('Acc2')
        await request
            .post('/api/transactions')
            .send({ amount: 10, type: 'expense', date: '2024-01-01', account_id: acc1.id })
        await request
            .post('/api/transactions')
            .send({ amount: 20, type: 'expense', date: '2024-01-02', account_id: acc2.id })

        const res = await request.get(`/api/transactions?account_id=${acc1.id}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].account_id).toBe(acc1.id)
    })

    it('PUT /api/transactions/:id – updates a transaction', async () => {
        const account = await createAccount()
        const created = await request.post('/api/transactions').send({
            amount: 50,
            type: 'expense',
            date: '2024-01-01',
            account_id: account.id,
        })
        const res = await request
            .put(`/api/transactions/${created.body.id}`)
            .send({ amount: 75, description: 'Updated' })
        expect(res.status).toBe(200)
        expect(res.body.amount).toBe(75)
        expect(res.body.description).toBe('Updated')
    })

    it('DELETE /api/transactions/:id – deletes a transaction', async () => {
        const account = await createAccount()
        const created = await request.post('/api/transactions').send({
            amount: 30,
            type: 'expense',
            date: '2024-01-01',
            account_id: account.id,
        })
        const del = await request.delete(`/api/transactions/${created.body.id}`)
        expect(del.status).toBe(204)
        const get = await request.get(`/api/transactions/${created.body.id}`)
        expect(get.status).toBe(404)
    })

    it('DELETE /api/transactions/:id – 404 for unknown id', async () => {
        const res = await request.delete('/api/transactions/9999')
        expect(res.status).toBe(404)
    })
})
