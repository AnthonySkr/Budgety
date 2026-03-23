import supertest from 'supertest'
import Database from 'better-sqlite3'
import { createApp } from './app.js'
import { setDb } from './db.js'

const request = supertest(createApp())

beforeEach(() => {
    setDb(new Database(':memory:'))
})

describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
        const res = await request.get('/api/health')
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ status: 'ok' })
    })
})

describe('budgety CRUD API', () => {
    it('creates and reads account/category/transaction, then computes dashboard', async () => {
        const account = await request.post('/api/accounts').send({
            name: 'Compte courant',
            type: 'courant',
            initialBalance: 1000,
        })
        expect(account.status).toBe(201)
        const accountBody = account.body as { id: number }

        const category = await request.post('/api/categories').send({
            name: 'Courses',
            type: 'expense',
            parentId: null,
        })
        expect(category.status).toBe(201)
        const categoryBody = category.body as { id: number }

        const transaction = await request.post('/api/transactions').send({
            amount: 50,
            date: '2026-03-10',
            description: 'Supermarché',
            type: 'expense',
            categoryId: categoryBody.id,
            accountId: accountBody.id,
            isRecurring: false,
        })
        expect(transaction.status).toBe(201)

        const list = await request.get('/api/transactions')
        expect(list.status).toBe(200)
        const listBody = list.body as Array<{ description: string; amount: number; type: string }>
        expect(listBody).toHaveLength(1)
        expect(listBody[0]).toMatchObject({
            description: 'Supermarché',
            amount: 50,
            type: 'expense',
        })

        const dashboard = await request.get('/api/dashboard')
        expect(dashboard.status).toBe(200)
        expect(dashboard.body).toMatchObject({
            totalBalance: 950,
        })
    })

    it('supports JSON export and import', async () => {
        const account = await request.post('/api/accounts').send({
            name: 'Épargne',
            type: 'epargne',
            initialBalance: 200,
        })
        expect(account.status).toBe(201)

        const exportRes = await request.get('/api/export/json')
        expect(exportRes.status).toBe(200)
        const exportBody = exportRes.body as { accounts: unknown[] }
        expect(exportBody.accounts).toHaveLength(1)

        const importRes = await request.post('/api/import/json').send(exportBody)
        expect(importRes.status).toBe(201)
        expect(importRes.body).toEqual({ ok: true })
    })
})
