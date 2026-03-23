import supertest from 'supertest'
import { createApp } from './app.js'
import { resetTransactionsForTests } from './router.js'

const app = createApp()
const request = supertest(app)

beforeEach(() => {
    resetTransactionsForTests()
})

describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
        const res = await request.get('/api/health')
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ status: 'ok' })
    })
})

describe('transactions API', () => {
    it('creates a transaction, lists it and computes summary', async () => {
        type CreateTransactionResponse = {
            transaction: {
                type: 'income' | 'expense'
                amount: number
                category: string
            }
        }
        type TransactionsResponse = {
            transactions: Array<{ id: string }>
        }

        const createRes: supertest.Response = await request.post('/api/transactions').send({
            type: 'expense',
            amount: 45.5,
            date: '2026-03-01',
            description: 'Courses semaine',
            category: 'Alimentation',
            account: 'Compte courant',
        })

        expect(createRes.status).toBe(201)
        const createBody = createRes.body as CreateTransactionResponse
        expect(createBody.transaction).toMatchObject({
            type: 'expense',
            amount: 45.5,
            category: 'Alimentation',
        })

        const listRes: supertest.Response = await request.get('/api/transactions')
        const listBody = listRes.body as TransactionsResponse
        expect(listRes.status).toBe(200)
        expect(listBody.transactions).toHaveLength(1)

        const summaryRes = await request.get('/api/summary')
        expect(summaryRes.status).toBe(200)
        expect(summaryRes.body).toMatchObject({
            income: 0,
            expense: 45.5,
            balance: -45.5,
            transactionsCount: 1,
            byCategory: {
                Alimentation: -45.5,
            },
        })
    })

    it('returns 400 for invalid payload', async () => {
        const res = await request.post('/api/transactions').send({
            type: 'expense',
            amount: -10,
            date: 'not-a-date',
            description: '',
            category: '',
            account: '',
        })

        expect(res.status).toBe(400)
        expect(res.body).toMatchObject({ message: 'Invalid transaction payload' })
    })
})
