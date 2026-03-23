import { Router, type IRouter } from 'express'

import { getDb } from './db.js'

type TransactionType = 'expense' | 'income'
type Frequency = 'monthly' | 'yearly'
type BudgetPeriod = 'monthly' | 'yearly'

interface Account {
    id: number
    name: string
    type: string
    initialBalance: number
}

interface Category {
    id: number
    name: string
    type: TransactionType
    parentId: number | null
}

interface Transaction {
    id: number
    amount: number
    date: string
    description: string
    type: TransactionType
    categoryId: number | null
    accountId: number
    transferAccountId: number | null
    isRecurring: boolean
    frequency: Frequency | null
    recurrenceAnchorDate: string | null
}

interface Loan {
    id: number
    name: string
    totalAmount: number
    remainingAmount: number
    monthlyPayment: number
    nextDueDate: string
}

interface Budget {
    id: number
    name: string
    categoryId: number
    amount: number
    startDate: string
    endDate: string
    isRecurring: boolean
    period: BudgetPeriod | null
    monthOverride: string | null
}

interface RowBase {
    id: number
}

const transactionTypes = new Set<TransactionType>(['expense', 'income'])
const frequencies = new Set<Frequency>(['monthly', 'yearly'])
const budgetPeriods = new Set<BudgetPeriod>(['monthly', 'yearly'])
const allowedTables = new Set(['accounts', 'categories', 'transactions', 'loans', 'budgets'])

export const router: IRouter = Router()

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function getString(payload: Record<string, unknown>, key: string, required = true): string {
    const raw = payload[key]
    if (typeof raw !== 'string' || (required && raw.trim().length === 0)) {
        throw new Error(`Invalid field: ${key}`)
    }
    return raw.trim()
}

function getOptionalString(payload: Record<string, unknown>, key: string): string | null {
    const raw = payload[key]
    if (raw === undefined || raw === null || raw === '') {
        return null
    }
    if (typeof raw !== 'string') {
        throw new Error(`Invalid field: ${key}`)
    }
    return raw.trim()
}

function getNumber(payload: Record<string, unknown>, key: string): number {
    const raw = payload[key]
    const value = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid field: ${key}`)
    }
    return value
}

function getOptionalNumber(payload: Record<string, unknown>, key: string): number | null {
    const raw = payload[key]
    if (raw === undefined || raw === null || raw === '') {
        return null
    }
    const value = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid field: ${key}`)
    }
    return value
}

function getBoolean(payload: Record<string, unknown>, key: string): boolean {
    const raw = payload[key]
    if (typeof raw === 'boolean') {
        return raw
    }
    if (raw === 'true') {
        return true
    }
    if (raw === 'false') {
        return false
    }
    throw new Error(`Invalid field: ${key}`)
}

function parseId(rawId: string): number {
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Invalid id parameter')
    }
    return id
}

function assertType(value: string): TransactionType {
    if (!transactionTypes.has(value as TransactionType)) {
        throw new Error('Invalid field: type')
    }
    return value as TransactionType
}

function assertFrequency(value: string | null): Frequency | null {
    if (value === null) {
        return null
    }
    if (!frequencies.has(value as Frequency)) {
        throw new Error('Invalid field: frequency')
    }
    return value as Frequency
}

function assertBudgetPeriod(value: string | null): BudgetPeriod | null {
    if (value === null) {
        return null
    }
    if (!budgetPeriods.has(value as BudgetPeriod)) {
        throw new Error('Invalid field: period')
    }
    return value as BudgetPeriod
}

function mapAccount(row: {
    id: number
    name: string
    type: string
    initial_balance: number
}): Account {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        initialBalance: row.initial_balance,
    }
}

function mapCategory(row: {
    id: number
    name: string
    type: TransactionType
    parent_id: number | null
}): Category {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        parentId: row.parent_id,
    }
}

function mapTransaction(row: {
    id: number
    amount: number
    date: string
    description: string
    type: TransactionType
    category_id: number | null
    account_id: number
    transfer_account_id: number | null
    is_recurring: number
    frequency: Frequency | null
    recurrence_anchor_date: string | null
}): Transaction {
    return {
        id: row.id,
        amount: row.amount,
        date: row.date,
        description: row.description,
        type: row.type,
        categoryId: row.category_id,
        accountId: row.account_id,
        transferAccountId: row.transfer_account_id,
        isRecurring: row.is_recurring === 1,
        frequency: row.frequency,
        recurrenceAnchorDate: row.recurrence_anchor_date,
    }
}

function mapLoan(row: {
    id: number
    name: string
    total_amount: number
    remaining_amount: number
    monthly_payment: number
    next_due_date: string
}): Loan {
    return {
        id: row.id,
        name: row.name,
        totalAmount: row.total_amount,
        remainingAmount: row.remaining_amount,
        monthlyPayment: row.monthly_payment,
        nextDueDate: row.next_due_date,
    }
}

function mapBudget(row: {
    id: number
    name: string
    category_id: number
    amount: number
    start_date: string
    end_date: string
    is_recurring: number
    period: BudgetPeriod | null
    month_override: string | null
}): Budget {
    return {
        id: row.id,
        name: row.name,
        categoryId: row.category_id,
        amount: row.amount,
        startDate: row.start_date,
        endDate: row.end_date,
        isRecurring: row.is_recurring === 1,
        period: row.period,
        monthOverride: row.month_override,
    }
}

function rowExists(table: string, id: number): boolean {
    if (!allowedTables.has(table)) {
        throw new Error('Invalid table')
    }

    const db = getDb()
    const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id) as RowBase | undefined
    return Boolean(row)
}

function monthsBetween(fromDate: Date, toDate: Date): number {
    return (
        (toDate.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 +
        (toDate.getUTCMonth() - fromDate.getUTCMonth())
    )
}

function addMonths(date: Date, months: number): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()))
}

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.post('/auth/login', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const username = getString(req.body, 'username')
        const password = getString(req.body, 'password')
        const expectedUser = process.env['APP_USERNAME'] ?? 'admin'
        const expectedPassword = process.env['APP_PASSWORD'] ?? 'budgety'

        if (username !== expectedUser || password !== expectedPassword) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        return res.json({ ok: true, user: { username } })
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Invalid payload' })
    }
})

router.get('/accounts', (_req, res) => {
    const db = getDb()
    const rows = db
        .prepare('SELECT id, name, type, initial_balance FROM accounts ORDER BY id DESC')
        .all() as Array<{ id: number; name: string; type: string; initial_balance: number }>
    res.json(rows.map(mapAccount))
})

router.post('/accounts', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const name = getString(req.body, 'name')
        const type = getString(req.body, 'type')
        const initialBalance = getNumber(req.body, 'initialBalance')

        const result = db
            .prepare('INSERT INTO accounts(name, type, initial_balance) VALUES (?, ?, ?)')
            .run(name, type, initialBalance)

        const row = db
            .prepare('SELECT id, name, type, initial_balance FROM accounts WHERE id = ?')
            .get(result.lastInsertRowid as number) as {
            id: number
            name: string
            type: string
            initial_balance: number
        }

        res.status(201).json(mapAccount(row))
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Unable to create account',
        })
    }
})

router.put('/accounts/:id', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const id = parseId(req.params['id'])
        const name = getString(req.body, 'name')
        const type = getString(req.body, 'type')
        const initialBalance = getNumber(req.body, 'initialBalance')

        const result = db
            .prepare('UPDATE accounts SET name = ?, type = ?, initial_balance = ? WHERE id = ?')
            .run(name, type, initialBalance, id)

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Account not found' })
        }

        const row = db
            .prepare('SELECT id, name, type, initial_balance FROM accounts WHERE id = ?')
            .get(id) as {
            id: number
            name: string
            type: string
            initial_balance: number
        }

        return res.json(mapAccount(row))
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to update account' })
    }
})

router.delete('/accounts/:id', (req, res) => {
    try {
        const db = getDb()
        const id = parseId(req.params['id'])
        const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id)

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Account not found' })
        }

        return res.status(204).send()
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to delete account' })
    }
})

router.get('/categories', (_req, res) => {
    const db = getDb()
    const rows = db
        .prepare('SELECT id, name, type, parent_id FROM categories ORDER BY id DESC')
        .all() as Array<{
        id: number
        name: string
        type: TransactionType
        parent_id: number | null
    }>
    res.json(rows.map(mapCategory))
})

router.post('/categories', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const name = getString(req.body, 'name')
        const type = assertType(getString(req.body, 'type'))
        const parentId = getOptionalNumber(req.body, 'parentId')

        if (parentId !== null && !rowExists('categories', parentId)) {
            return res.status(400).json({ error: 'Parent category does not exist' })
        }

        const result = db
            .prepare('INSERT INTO categories(name, type, parent_id) VALUES (?, ?, ?)')
            .run(name, type, parentId)

        const row = db
            .prepare('SELECT id, name, type, parent_id FROM categories WHERE id = ?')
            .get(result.lastInsertRowid as number) as {
            id: number
            name: string
            type: TransactionType
            parent_id: number | null
        }

        return res.status(201).json(mapCategory(row))
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to create category' })
    }
})

router.put('/categories/:id', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const id = parseId(req.params['id'])
        const name = getString(req.body, 'name')
        const type = assertType(getString(req.body, 'type'))
        const parentId = getOptionalNumber(req.body, 'parentId')

        if (parentId === id) {
            return res.status(400).json({ error: 'A category cannot be its own parent' })
        }

        const result = db
            .prepare('UPDATE categories SET name = ?, type = ?, parent_id = ? WHERE id = ?')
            .run(name, type, parentId, id)

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Category not found' })
        }

        const row = db
            .prepare('SELECT id, name, type, parent_id FROM categories WHERE id = ?')
            .get(id) as {
            id: number
            name: string
            type: TransactionType
            parent_id: number | null
        }

        return res.json(mapCategory(row))
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to update category' })
    }
})

router.delete('/categories/:id', (req, res) => {
    try {
        const db = getDb()
        const id = parseId(req.params['id'])
        const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id)

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Category not found' })
        }

        return res.status(204).send()
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to delete category' })
    }
})

router.get('/transactions', (_req, res) => {
    const db = getDb()
    const rows = db
        .prepare(
            `SELECT id, amount, date, description, type, category_id, account_id, transfer_account_id,
                    is_recurring, frequency, recurrence_anchor_date
             FROM transactions
             ORDER BY date DESC, id DESC`,
        )
        .all() as Array<{
        id: number
        amount: number
        date: string
        description: string
        type: TransactionType
        category_id: number | null
        account_id: number
        transfer_account_id: number | null
        is_recurring: number
        frequency: Frequency | null
        recurrence_anchor_date: string | null
    }>
    res.json(rows.map(mapTransaction))
})

router.post('/transactions', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const amount = getNumber(req.body, 'amount')
        const date = getString(req.body, 'date')
        const description = getString(req.body, 'description')
        const type = assertType(getString(req.body, 'type'))
        const categoryId = getOptionalNumber(req.body, 'categoryId')
        const accountId = getNumber(req.body, 'accountId')
        const transferAccountId = getOptionalNumber(req.body, 'transferAccountId')
        const isRecurring = req.body['isRecurring'] ? getBoolean(req.body, 'isRecurring') : false
        const frequency = assertFrequency(getOptionalString(req.body, 'frequency'))
        const recurrenceAnchorDate = getOptionalString(req.body, 'recurrenceAnchorDate')

        if (!rowExists('accounts', accountId)) {
            return res.status(400).json({ error: 'Account does not exist' })
        }

        if (categoryId !== null && !rowExists('categories', categoryId)) {
            return res.status(400).json({ error: 'Category does not exist' })
        }

        if (transferAccountId !== null && !rowExists('accounts', transferAccountId)) {
            return res.status(400).json({ error: 'Transfer account does not exist' })
        }

        if (isRecurring && frequency === null) {
            return res.status(400).json({ error: 'Recurring transaction requires frequency' })
        }

        const result = db
            .prepare(
                `INSERT INTO transactions(
                    amount, date, description, type, category_id, account_id, transfer_account_id,
                    is_recurring, frequency, recurrence_anchor_date
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                amount,
                date,
                description,
                type,
                categoryId,
                accountId,
                transferAccountId,
                isRecurring ? 1 : 0,
                frequency,
                recurrenceAnchorDate,
            )

        const row = db
            .prepare(
                `SELECT id, amount, date, description, type, category_id, account_id, transfer_account_id,
                        is_recurring, frequency, recurrence_anchor_date
                 FROM transactions
                 WHERE id = ?`,
            )
            .get(result.lastInsertRowid as number) as {
            id: number
            amount: number
            date: string
            description: string
            type: TransactionType
            category_id: number | null
            account_id: number
            transfer_account_id: number | null
            is_recurring: number
            frequency: Frequency | null
            recurrence_anchor_date: string | null
        }

        return res.status(201).json(mapTransaction(row))
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : 'Unable to create transaction',
        })
    }
})

router.put('/transactions/:id', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const id = parseId(req.params['id'])
        const amount = getNumber(req.body, 'amount')
        const date = getString(req.body, 'date')
        const description = getString(req.body, 'description')
        const type = assertType(getString(req.body, 'type'))
        const categoryId = getOptionalNumber(req.body, 'categoryId')
        const accountId = getNumber(req.body, 'accountId')
        const transferAccountId = getOptionalNumber(req.body, 'transferAccountId')
        const isRecurring = req.body['isRecurring'] ? getBoolean(req.body, 'isRecurring') : false
        const frequency = assertFrequency(getOptionalString(req.body, 'frequency'))
        const recurrenceAnchorDate = getOptionalString(req.body, 'recurrenceAnchorDate')

        const result = db
            .prepare(
                `UPDATE transactions
                 SET amount = ?, date = ?, description = ?, type = ?, category_id = ?, account_id = ?,
                     transfer_account_id = ?, is_recurring = ?, frequency = ?, recurrence_anchor_date = ?
                 WHERE id = ?`,
            )
            .run(
                amount,
                date,
                description,
                type,
                categoryId,
                accountId,
                transferAccountId,
                isRecurring ? 1 : 0,
                frequency,
                recurrenceAnchorDate,
                id,
            )

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Transaction not found' })
        }

        const row = db
            .prepare(
                `SELECT id, amount, date, description, type, category_id, account_id, transfer_account_id,
                        is_recurring, frequency, recurrence_anchor_date
                 FROM transactions
                 WHERE id = ?`,
            )
            .get(id) as {
            id: number
            amount: number
            date: string
            description: string
            type: TransactionType
            category_id: number | null
            account_id: number
            transfer_account_id: number | null
            is_recurring: number
            frequency: Frequency | null
            recurrence_anchor_date: string | null
        }

        return res.json(mapTransaction(row))
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : 'Unable to update transaction',
        })
    }
})

router.delete('/transactions/:id', (req, res) => {
    try {
        const db = getDb()
        const id = parseId(req.params['id'])
        const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Transaction not found' })
        }
        return res.status(204).send()
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : 'Unable to delete transaction',
        })
    }
})

router.post('/transfers', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const amount = getNumber(req.body, 'amount')
        const date = getString(req.body, 'date')
        const description = getString(req.body, 'description')
        const fromAccountId = getNumber(req.body, 'fromAccountId')
        const toAccountId = getNumber(req.body, 'toAccountId')

        if (fromAccountId === toAccountId) {
            return res.status(400).json({ error: 'Source and target account must be different' })
        }

        if (!rowExists('accounts', fromAccountId) || !rowExists('accounts', toAccountId)) {
            return res.status(400).json({ error: 'One or both accounts do not exist' })
        }

        const insert = db.prepare(
            `INSERT INTO transactions(amount, date, description, type, account_id, transfer_account_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
        )

        const out = insert.run(amount, date, description, 'expense', fromAccountId, toAccountId)
        const incoming = insert.run(amount, date, description, 'income', toAccountId, fromAccountId)

        return res.status(201).json({
            outgoingTransactionId: Number(out.lastInsertRowid),
            incomingTransactionId: Number(incoming.lastInsertRowid),
        })
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to transfer funds' })
    }
})

router.post('/transactions/recurring/process', (_req, res) => {
    const db = getDb()

    const rows = db
        .prepare(
            `SELECT id, amount, date, description, type, category_id, account_id, transfer_account_id,
                    frequency, recurrence_anchor_date
             FROM transactions
             WHERE is_recurring = 1 AND frequency IS NOT NULL`,
        )
        .all() as Array<{
        id: number
        amount: number
        date: string
        description: string
        type: TransactionType
        category_id: number | null
        account_id: number
        transfer_account_id: number | null
        frequency: Frequency
        recurrence_anchor_date: string | null
    }>

    const today = new Date()
    const insert = db.prepare(
        `INSERT INTO transactions(
            amount, date, description, type, category_id, account_id, transfer_account_id,
            is_recurring, frequency, recurrence_anchor_date
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL)`,
    )

    let created = 0

    for (const recurring of rows) {
        const anchor = recurring.recurrence_anchor_date ?? recurring.date
        const fromDate = new Date(anchor)

        if (Number.isNaN(fromDate.getTime())) {
            continue
        }

        const monthStep = recurring.frequency === 'monthly' ? 1 : 12
        const diff = monthsBetween(fromDate, today)

        if (diff < monthStep) {
            continue
        }

        const cycles = Math.floor(diff / monthStep)
        const nextDate = addMonths(fromDate, cycles * monthStep)
        const normalizedNext = nextDate.toISOString().slice(0, 10)

        const existing = db
            .prepare(
                `SELECT id FROM transactions
                 WHERE is_recurring = 0 AND description = ? AND date = ? AND account_id = ? AND amount = ?
                 LIMIT 1`,
            )
            .get(recurring.description, normalizedNext, recurring.account_id, recurring.amount) as
            | { id: number }
            | undefined

        if (existing) {
            continue
        }

        insert.run(
            recurring.amount,
            normalizedNext,
            recurring.description,
            recurring.type,
            recurring.category_id,
            recurring.account_id,
            recurring.transfer_account_id,
        )
        created += 1
    }

    res.json({ created })
})

router.get('/loans', (_req, res) => {
    const db = getDb()
    const rows = db
        .prepare(
            'SELECT id, name, total_amount, remaining_amount, monthly_payment, next_due_date FROM loans ORDER BY id DESC',
        )
        .all() as Array<{
        id: number
        name: string
        total_amount: number
        remaining_amount: number
        monthly_payment: number
        next_due_date: string
    }>
    res.json(rows.map(mapLoan))
})

router.post('/loans', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const name = getString(req.body, 'name')
        const totalAmount = getNumber(req.body, 'totalAmount')
        const remainingAmount = getNumber(req.body, 'remainingAmount')
        const monthlyPayment = getNumber(req.body, 'monthlyPayment')
        const nextDueDate = getString(req.body, 'nextDueDate')

        const result = db
            .prepare(
                'INSERT INTO loans(name, total_amount, remaining_amount, monthly_payment, next_due_date) VALUES (?, ?, ?, ?, ?)',
            )
            .run(name, totalAmount, remainingAmount, monthlyPayment, nextDueDate)

        const row = db
            .prepare(
                'SELECT id, name, total_amount, remaining_amount, monthly_payment, next_due_date FROM loans WHERE id = ?',
            )
            .get(result.lastInsertRowid as number) as {
            id: number
            name: string
            total_amount: number
            remaining_amount: number
            monthly_payment: number
            next_due_date: string
        }

        res.status(201).json(mapLoan(row))
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Unable to create loan',
        })
    }
})

router.put('/loans/:id', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const id = parseId(req.params['id'])
        const name = getString(req.body, 'name')
        const totalAmount = getNumber(req.body, 'totalAmount')
        const remainingAmount = getNumber(req.body, 'remainingAmount')
        const monthlyPayment = getNumber(req.body, 'monthlyPayment')
        const nextDueDate = getString(req.body, 'nextDueDate')

        const result = db
            .prepare(
                `UPDATE loans
                 SET name = ?, total_amount = ?, remaining_amount = ?, monthly_payment = ?, next_due_date = ?
                 WHERE id = ?`,
            )
            .run(name, totalAmount, remainingAmount, monthlyPayment, nextDueDate, id)

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Loan not found' })
        }

        const row = db
            .prepare(
                'SELECT id, name, total_amount, remaining_amount, monthly_payment, next_due_date FROM loans WHERE id = ?',
            )
            .get(id) as {
            id: number
            name: string
            total_amount: number
            remaining_amount: number
            monthly_payment: number
            next_due_date: string
        }

        return res.json(mapLoan(row))
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to update loan' })
    }
})

router.delete('/loans/:id', (req, res) => {
    try {
        const db = getDb()
        const id = parseId(req.params['id'])
        const result = db.prepare('DELETE FROM loans WHERE id = ?').run(id)
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Loan not found' })
        }
        return res.status(204).send()
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to delete loan' })
    }
})

router.get('/budgets', (_req, res) => {
    const db = getDb()
    const rows = db
        .prepare(
            'SELECT id, name, category_id, amount, start_date, end_date, is_recurring, period, month_override FROM budgets ORDER BY id DESC',
        )
        .all() as Array<{
        id: number
        name: string
        category_id: number
        amount: number
        start_date: string
        end_date: string
        is_recurring: number
        period: BudgetPeriod | null
        month_override: string | null
    }>
    res.json(rows.map(mapBudget))
})

router.post('/budgets', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const name = getString(req.body, 'name')
        const categoryId = getNumber(req.body, 'categoryId')
        const amount = getNumber(req.body, 'amount')
        const startDate = getString(req.body, 'startDate')
        const endDate = getString(req.body, 'endDate')
        const isRecurring = req.body['isRecurring'] ? getBoolean(req.body, 'isRecurring') : false
        const period = assertBudgetPeriod(getOptionalString(req.body, 'period'))
        const monthOverride = getOptionalString(req.body, 'monthOverride')

        if (!rowExists('categories', categoryId)) {
            return res.status(400).json({ error: 'Category does not exist' })
        }

        if (isRecurring && period === null) {
            return res.status(400).json({ error: 'Recurring budget requires period' })
        }

        const result = db
            .prepare(
                `INSERT INTO budgets(name, category_id, amount, start_date, end_date, is_recurring, period, month_override)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                name,
                categoryId,
                amount,
                startDate,
                endDate,
                isRecurring ? 1 : 0,
                period,
                monthOverride,
            )

        const row = db
            .prepare(
                'SELECT id, name, category_id, amount, start_date, end_date, is_recurring, period, month_override FROM budgets WHERE id = ?',
            )
            .get(result.lastInsertRowid as number) as {
            id: number
            name: string
            category_id: number
            amount: number
            start_date: string
            end_date: string
            is_recurring: number
            period: BudgetPeriod | null
            month_override: string | null
        }

        return res.status(201).json(mapBudget(row))
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to create budget' })
    }
})

router.put('/budgets/:id', (req, res) => {
    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const db = getDb()
        const id = parseId(req.params['id'])
        const name = getString(req.body, 'name')
        const categoryId = getNumber(req.body, 'categoryId')
        const amount = getNumber(req.body, 'amount')
        const startDate = getString(req.body, 'startDate')
        const endDate = getString(req.body, 'endDate')
        const isRecurring = req.body['isRecurring'] ? getBoolean(req.body, 'isRecurring') : false
        const period = assertBudgetPeriod(getOptionalString(req.body, 'period'))
        const monthOverride = getOptionalString(req.body, 'monthOverride')

        const result = db
            .prepare(
                `UPDATE budgets
                 SET name = ?, category_id = ?, amount = ?, start_date = ?, end_date = ?, is_recurring = ?,
                     period = ?, month_override = ?
                 WHERE id = ?`,
            )
            .run(
                name,
                categoryId,
                amount,
                startDate,
                endDate,
                isRecurring ? 1 : 0,
                period,
                monthOverride,
                id,
            )

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Budget not found' })
        }

        const row = db
            .prepare(
                'SELECT id, name, category_id, amount, start_date, end_date, is_recurring, period, month_override FROM budgets WHERE id = ?',
            )
            .get(id) as {
            id: number
            name: string
            category_id: number
            amount: number
            start_date: string
            end_date: string
            is_recurring: number
            period: BudgetPeriod | null
            month_override: string | null
        }

        return res.json(mapBudget(row))
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to update budget' })
    }
})

router.delete('/budgets/:id', (req, res) => {
    try {
        const db = getDb()
        const id = parseId(req.params['id'])
        const result = db.prepare('DELETE FROM budgets WHERE id = ?').run(id)
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Budget not found' })
        }
        return res.status(204).send()
    } catch (error) {
        return res
            .status(400)
            .json({ error: error instanceof Error ? error.message : 'Unable to delete budget' })
    }
})

router.get('/dashboard', (_req, res) => {
    const db = getDb()

    const accounts = db
        .prepare('SELECT id, name, type, initial_balance FROM accounts ORDER BY id DESC')
        .all() as Array<{ id: number; name: string; type: string; initial_balance: number }>

    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10)
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
        .toISOString()
        .slice(0, 10)

    const monthly = db
        .prepare(
            `SELECT
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
             FROM transactions
             WHERE date BETWEEN ? AND ?`,
        )
        .get(monthStart, monthEnd) as { income: number | null; expense: number | null }

    const accountBalances = accounts.map((account) => {
        const flow = db
            .prepare(
                `SELECT
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
                 FROM transactions
                 WHERE account_id = ?`,
            )
            .get(account.id) as { income: number | null; expense: number | null }

        const balance = account.initial_balance + (flow.income ?? 0) - (flow.expense ?? 0)

        return {
            ...mapAccount(account),
            balance,
        }
    })

    const totalBalance = accountBalances.reduce((sum, account) => sum + account.balance, 0)

    res.json({
        month: {
            income: monthly.income ?? 0,
            expense: monthly.expense ?? 0,
        },
        accounts: accountBalances,
        totalBalance,
    })
})

router.get('/stats', (_req, res) => {
    const db = getDb()

    const byCategory = db
        .prepare(
            `SELECT
                c.name as category,
                c.type as type,
                SUM(t.amount) as total
             FROM transactions t
             LEFT JOIN categories c ON c.id = t.category_id
             GROUP BY c.id, c.name, c.type
             ORDER BY total DESC`,
        )
        .all() as Array<{ category: string | null; type: TransactionType | null; total: number }>

    const byMonth = db
        .prepare(
            `SELECT
                substr(date, 1, 7) as month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
             FROM transactions
             GROUP BY substr(date, 1, 7)
             ORDER BY month ASC`,
        )
        .all() as Array<{ month: string; income: number | null; expense: number | null }>

    const budgetUsage = db
        .prepare(
            `SELECT
                b.id,
                b.name,
                b.amount,
                b.start_date,
                b.end_date,
                COALESCE(SUM(t.amount), 0) as spent
             FROM budgets b
             LEFT JOIN transactions t
                ON t.category_id = b.category_id
               AND t.type = 'expense'
               AND t.date BETWEEN b.start_date AND b.end_date
             GROUP BY b.id, b.name, b.amount, b.start_date, b.end_date
             ORDER BY b.id DESC`,
        )
        .all() as Array<{
        id: number
        name: string
        amount: number
        start_date: string
        end_date: string
        spent: number
    }>

    res.json({
        byCategory: byCategory.map((item) => ({
            category: item.category ?? 'Uncategorized',
            type: item.type ?? 'expense',
            total: item.total,
        })),
        byMonth: byMonth.map((item) => ({
            month: item.month,
            income: item.income ?? 0,
            expense: item.expense ?? 0,
        })),
        budgetUsage: budgetUsage.map((item) => ({
            id: item.id,
            name: item.name,
            amount: item.amount,
            spent: item.spent,
            remaining: item.amount - item.spent,
            startDate: item.start_date,
            endDate: item.end_date,
        })),
    })
})

router.get('/export/json', (_req, res) => {
    const db = getDb()

    const payload = {
        accounts: db
            .prepare('SELECT id, name, type, initial_balance FROM accounts ORDER BY id')
            .all(),
        categories: db
            .prepare('SELECT id, name, type, parent_id FROM categories ORDER BY id')
            .all(),
        transactions: db
            .prepare(
                `SELECT id, amount, date, description, type, category_id, account_id, transfer_account_id,
                        is_recurring, frequency, recurrence_anchor_date
                 FROM transactions
                 ORDER BY id`,
            )
            .all(),
        loans: db
            .prepare(
                'SELECT id, name, total_amount, remaining_amount, monthly_payment, next_due_date FROM loans ORDER BY id',
            )
            .all(),
        budgets: db
            .prepare(
                'SELECT id, name, category_id, amount, start_date, end_date, is_recurring, period, month_override FROM budgets ORDER BY id',
            )
            .all(),
    }

    res.json(payload)
})

router.post('/import/json', (req, res) => {
    const db = getDb()

    try {
        if (!isRecord(req.body)) {
            throw new Error('Invalid payload')
        }

        const tables = ['transactions', 'budgets', 'loans', 'categories', 'accounts']

        db.exec('BEGIN')

        for (const table of tables) {
            if (!allowedTables.has(table)) {
                throw new Error('Invalid table')
            }
            db.prepare(`DELETE FROM ${table}`).run()
        }

        const accountsRaw = req.body['accounts']
        if (Array.isArray(accountsRaw)) {
            const insertAccount = db.prepare(
                'INSERT INTO accounts(name, type, initial_balance) VALUES (?, ?, ?)',
            )
            for (const item of accountsRaw) {
                if (!isRecord(item)) {
                    continue
                }
                insertAccount.run(
                    getString(item, 'name'),
                    getString(item, 'type'),
                    getNumber(item, 'initial_balance'),
                )
            }
        }

        const categoriesRaw = req.body['categories']
        if (Array.isArray(categoriesRaw)) {
            const insertCategory = db.prepare(
                'INSERT INTO categories(name, type, parent_id) VALUES (?, ?, ?)',
            )
            for (const item of categoriesRaw) {
                if (!isRecord(item)) {
                    continue
                }
                insertCategory.run(
                    getString(item, 'name'),
                    assertType(getString(item, 'type')),
                    getOptionalNumber(item, 'parent_id'),
                )
            }
        }

        const transactionsRaw = req.body['transactions']
        if (Array.isArray(transactionsRaw)) {
            const insertTransaction = db.prepare(
                `INSERT INTO transactions(
                    amount, date, description, type, category_id, account_id, transfer_account_id,
                    is_recurring, frequency, recurrence_anchor_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            for (const item of transactionsRaw) {
                if (!isRecord(item)) {
                    continue
                }
                insertTransaction.run(
                    getNumber(item, 'amount'),
                    getString(item, 'date'),
                    getString(item, 'description'),
                    assertType(getString(item, 'type')),
                    getOptionalNumber(item, 'category_id'),
                    getNumber(item, 'account_id'),
                    getOptionalNumber(item, 'transfer_account_id'),
                    getOptionalNumber(item, 'is_recurring') ?? 0,
                    assertFrequency(getOptionalString(item, 'frequency')),
                    getOptionalString(item, 'recurrence_anchor_date'),
                )
            }
        }

        const loansRaw = req.body['loans']
        if (Array.isArray(loansRaw)) {
            const insertLoan = db.prepare(
                'INSERT INTO loans(name, total_amount, remaining_amount, monthly_payment, next_due_date) VALUES (?, ?, ?, ?, ?)',
            )
            for (const item of loansRaw) {
                if (!isRecord(item)) {
                    continue
                }
                insertLoan.run(
                    getString(item, 'name'),
                    getNumber(item, 'total_amount'),
                    getNumber(item, 'remaining_amount'),
                    getNumber(item, 'monthly_payment'),
                    getString(item, 'next_due_date'),
                )
            }
        }

        const budgetsRaw = req.body['budgets']
        if (Array.isArray(budgetsRaw)) {
            const insertBudget = db.prepare(
                `INSERT INTO budgets(name, category_id, amount, start_date, end_date, is_recurring, period, month_override)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            for (const item of budgetsRaw) {
                if (!isRecord(item)) {
                    continue
                }
                insertBudget.run(
                    getString(item, 'name'),
                    getNumber(item, 'category_id'),
                    getNumber(item, 'amount'),
                    getString(item, 'start_date'),
                    getString(item, 'end_date'),
                    getOptionalNumber(item, 'is_recurring') ?? 0,
                    assertBudgetPeriod(getOptionalString(item, 'period')),
                    getOptionalString(item, 'month_override'),
                )
            }
        }

        db.exec('COMMIT')

        res.status(201).json({ ok: true })
    } catch (error) {
        try {
            db.exec('ROLLBACK')
        } catch {
            // do nothing
        }
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Unable to import JSON',
        })
    }
})
