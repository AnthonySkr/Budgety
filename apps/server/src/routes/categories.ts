import { Router, type IRouter } from 'express'
import { getDb } from '../db.js'

export const categoriesRouter: IRouter = Router()

categoriesRouter.get('/', (_req, res) => {
    const rows = getDb().prepare('SELECT * FROM categories ORDER BY id').all()
    return res.json(rows)
})

categoriesRouter.get('/:id', (req, res) => {
    const row = getDb().prepare('SELECT * FROM categories WHERE id = ?').get(req.params['id'])
    if (!row) return res.status(404).json({ error: 'Category not found' })
    return res.json(row)
})

categoriesRouter.post('/', (req, res) => {
    const {
        name,
        parent_id = null,
        color = null,
    } = req.body as {
        name?: string
        parent_id?: number | null
        color?: string | null
    }
    if (!name) return res.status(400).json({ error: 'name is required' })

    const result = getDb()
        .prepare('INSERT INTO categories (name, parent_id, color) VALUES (?, ?, ?)')
        .run(name, parent_id, color)

    const created = getDb()
        .prepare('SELECT * FROM categories WHERE id = ?')
        .get(result.lastInsertRowid)
    return res.status(201).json(created)
})

categoriesRouter.put('/:id', (req, res) => {
    const { name, parent_id, color } = req.body as {
        name?: string
        parent_id?: number | null
        color?: string | null
    }

    const existing = getDb()
        .prepare('SELECT * FROM categories WHERE id = ?')
        .get(req.params['id']) as
        | { id: number; name: string; parent_id: number | null; color: string | null }
        | undefined

    if (!existing) return res.status(404).json({ error: 'Category not found' })

    getDb()
        .prepare('UPDATE categories SET name = ?, parent_id = ?, color = ? WHERE id = ?')
        .run(
            name ?? existing.name,
            parent_id !== undefined ? parent_id : existing.parent_id,
            color !== undefined ? color : existing.color,
            req.params['id'],
        )

    const updated = getDb().prepare('SELECT * FROM categories WHERE id = ?').get(req.params['id'])
    return res.json(updated)
})

categoriesRouter.delete('/:id', (req, res) => {
    const result = getDb().prepare('DELETE FROM categories WHERE id = ?').run(req.params['id'])
    if (result.changes === 0) return res.status(404).json({ error: 'Category not found' })
    return res.status(204).end()
})
