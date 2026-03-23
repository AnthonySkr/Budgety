import { Router, type IRouter } from 'express'
import { getDb } from '../db.js'

export const transactionsRouter: IRouter = Router()

const SELECT_WITH_JOINS =
    'SELECT t.*, a.name AS account_name, c.name AS category_name FROM transactions t ' +
    'LEFT JOIN accounts a ON t.account_id = a.id ' +
    'LEFT JOIN categories c ON t.category_id = c.id'

transactionsRouter.get('/', (req, res) => {
    const { account_id, category_id, type } = req.query as {
        account_id?: string
        category_id?: string
        type?: string
    }

    let sql = SELECT_WITH_JOINS

    const conditions: string[] = []
    const params: unknown[] = []

    if (account_id) {
        conditions.push('t.account_id = ?')
        params.push(account_id)
    }
    if (category_id) {
        conditions.push('t.category_id = ?')
        params.push(category_id)
    }
    if (type) {
        conditions.push('t.type = ?')
        params.push(type)
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY t.date DESC, t.id DESC'

    const rows = getDb()
        .prepare(sql)
        .all(...params)
    return res.json(rows)
})

transactionsRouter.get('/:id', (req, res) => {
    const row = getDb().prepare(`${SELECT_WITH_JOINS} WHERE t.id = ?`).get(req.params['id'])
    if (!row) return res.status(404).json({ error: 'Transaction not found' })
    return res.json(row)
})

transactionsRouter.post('/', (req, res) => {
    const {
        amount,
        type,
        date,
        description = null,
        account_id,
        category_id = null,
    } = req.body as {
        amount?: number
        type?: string
        date?: string
        description?: string | null
        account_id?: number
        category_id?: number | null
    }

    if (amount === undefined) return res.status(400).json({ error: 'amount is required' })
    if (!type || !['income', 'expense', 'transfer'].includes(type))
        return res.status(400).json({ error: 'type must be income, expense or transfer' })
    if (!date) return res.status(400).json({ error: 'date is required' })
    if (!account_id) return res.status(400).json({ error: 'account_id is required' })

    const result = getDb()
        .prepare(
            'INSERT INTO transactions (amount, type, date, description, account_id, category_id) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(amount, type, date, description, account_id, category_id)

    const created = getDb()
        .prepare(`${SELECT_WITH_JOINS} WHERE t.id = ?`)
        .get(result.lastInsertRowid)
    return res.status(201).json(created)
})

transactionsRouter.put('/:id', (req, res) => {
    const { amount, type, date, description, account_id, category_id } = req.body as {
        amount?: number
        type?: string
        date?: string
        description?: string | null
        account_id?: number
        category_id?: number | null
    }

    const existing = getDb()
        .prepare('SELECT * FROM transactions WHERE id = ?')
        .get(req.params['id']) as
        | {
              id: number
              amount: number
              type: string
              date: string
              description: string | null
              account_id: number
              category_id: number | null
          }
        | undefined

    if (!existing) return res.status(404).json({ error: 'Transaction not found' })

    if (type && !['income', 'expense', 'transfer'].includes(type))
        return res.status(400).json({ error: 'type must be income, expense or transfer' })

    getDb()
        .prepare(
            'UPDATE transactions SET amount = ?, type = ?, date = ?, description = ?, account_id = ?, category_id = ? WHERE id = ?',
        )
        .run(
            amount ?? existing.amount,
            type ?? existing.type,
            date ?? existing.date,
            description !== undefined ? description : existing.description,
            account_id ?? existing.account_id,
            category_id !== undefined ? category_id : existing.category_id,
            req.params['id'],
        )

    const updated = getDb().prepare(`${SELECT_WITH_JOINS} WHERE t.id = ?`).get(req.params['id'])
    return res.json(updated)
})

transactionsRouter.delete('/:id', (req, res) => {
    const result = getDb().prepare('DELETE FROM transactions WHERE id = ?').run(req.params['id'])
    if (result.changes === 0) return res.status(404).json({ error: 'Transaction not found' })
    return res.status(204).end()
})
