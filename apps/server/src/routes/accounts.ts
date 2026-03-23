import { Router, type IRouter } from 'express'
import { getDb } from '../db.js'

export const accountsRouter: IRouter = Router()

accountsRouter.get('/', (_req, res) => {
    const rows = getDb().prepare('SELECT * FROM accounts ORDER BY id').all()
    return res.json(rows)
})

accountsRouter.get('/:id', (req, res) => {
    const row = getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(req.params['id'])
    if (!row) return res.status(404).json({ error: 'Account not found' })
    return res.json(row)
})

accountsRouter.post('/', (req, res) => {
    const {
        name,
        type = 'checking',
        balance = 0,
        currency = 'EUR',
    } = req.body as {
        name?: string
        type?: string
        balance?: number
        currency?: string
    }
    if (!name) return res.status(400).json({ error: 'name is required' })

    const result = getDb()
        .prepare('INSERT INTO accounts (name, type, balance, currency) VALUES (?, ?, ?, ?)')
        .run(name, type, balance, currency)

    const created = getDb()
        .prepare('SELECT * FROM accounts WHERE id = ?')
        .get(result.lastInsertRowid)
    return res.status(201).json(created)
})

accountsRouter.put('/:id', (req, res) => {
    const { name, type, balance, currency } = req.body as {
        name?: string
        type?: string
        balance?: number
        currency?: string
    }

    const existing = getDb()
        .prepare('SELECT * FROM accounts WHERE id = ?')
        .get(req.params['id']) as
        | { id: number; name: string; type: string; balance: number; currency: string }
        | undefined

    if (!existing) return res.status(404).json({ error: 'Account not found' })

    getDb()
        .prepare('UPDATE accounts SET name = ?, type = ?, balance = ?, currency = ? WHERE id = ?')
        .run(
            name ?? existing.name,
            type ?? existing.type,
            balance ?? existing.balance,
            currency ?? existing.currency,
            req.params['id'],
        )

    const updated = getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(req.params['id'])
    return res.json(updated)
})

accountsRouter.delete('/:id', (req, res) => {
    const result = getDb().prepare('DELETE FROM accounts WHERE id = ?').run(req.params['id'])
    if (result.changes === 0) return res.status(404).json({ error: 'Account not found' })
    return res.status(204).end()
})
