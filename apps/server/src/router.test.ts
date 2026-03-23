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

    it('filters stats by account and category', async () => {
        const accountA = await request.post('/api/accounts').send({
            name: 'Compte A',
            type: 'courant',
            initialBalance: 1000,
        })
        const accountB = await request.post('/api/accounts').send({
            name: 'Compte B',
            type: 'courant',
            initialBalance: 1000,
        })
        const categoryA = await request.post('/api/categories').send({
            name: 'Courses',
            type: 'expense',
            parentId: null,
        })
        const categoryB = await request.post('/api/categories').send({
            name: 'Transport',
            type: 'expense',
            parentId: null,
        })

        await request.post('/api/transactions').send({
            amount: 50,
            date: '2026-03-10',
            description: 'A',
            type: 'expense',
            categoryId: (categoryA.body as { id: number }).id,
            accountId: (accountA.body as { id: number }).id,
            isRecurring: false,
        })
        await request.post('/api/transactions').send({
            amount: 20,
            date: '2026-03-11',
            description: 'B',
            type: 'expense',
            categoryId: (categoryB.body as { id: number }).id,
            accountId: (accountB.body as { id: number }).id,
            isRecurring: false,
        })

        const filtered = await request.get('/api/stats').query({
            accountId: (accountA.body as { id: number }).id,
            categoryId: (categoryA.body as { id: number }).id,
        })

        expect(filtered.status).toBe(200)
        const filteredBody = filtered.body as {
            byCategory: Array<{ category: string; total: number }>
        }
        expect(filteredBody.byCategory).toHaveLength(1)
        expect(filteredBody.byCategory[0]).toMatchObject({
            category: 'Courses',
            total: 50,
        })
    })

    it('imports transactions from CSV payload', async () => {
        const account = await request.post('/api/accounts').send({
            name: 'Compte CSV',
            type: 'courant',
            initialBalance: 0,
        })
        const accountId = (account.body as { id: number }).id

        const csvImport = await request.post('/api/import/csv').send({
            accountId,
            csv: [
                'date,description,amount,type,category',
                '2026-03-10,Supermarché,100.5,expense,Alimentation',
                '2026-03-15,Salaire,2000,income,Revenus',
            ].join('\n'),
            mapping: {
                date: 'date',
                description: 'description',
                amount: 'amount',
                type: 'type',
                category: 'category',
            },
        })

        expect(csvImport.status).toBe(201)
        expect(csvImport.body).toEqual({ imported: 2 })

        const transactions = await request.get('/api/transactions')
        expect(transactions.status).toBe(200)
        const transactionsBody = transactions.body as Array<{ description: string }>
        expect(transactionsBody).toHaveLength(2)
        expect(transactionsBody.map((item) => item.description)).toEqual(
            expect.arrayContaining(['Supermarché', 'Salaire']),
        )
    })
})
