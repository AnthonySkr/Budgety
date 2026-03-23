import { Router, type IRouter } from 'express'
import { randomUUID } from 'node:crypto'

export const router: IRouter = Router()

type TransactionType = 'income' | 'expense'

type Transaction = {
    id: string
    type: TransactionType
    amount: number
    date: string
    description: string
    category: string
    account: string
    createdAt: string
}

const transactions: Transaction[] = []

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.get('/transactions', (_req, res) => {
    res.json({ transactions })
})

router.get('/summary', (_req, res) => {
    const income = transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((total, transaction) => total + transaction.amount, 0)
    const expense = transactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((total, transaction) => total + transaction.amount, 0)

    const byCategory = transactions.reduce<Record<string, number>>((acc, transaction) => {
        const signedAmount =
            transaction.type === 'expense' ? -transaction.amount : transaction.amount
        acc[transaction.category] = (acc[transaction.category] ?? 0) + signedAmount
        return acc
    }, {})

    res.json({
        income,
        expense,
        balance: income - expense,
        byCategory,
        transactionsCount: transactions.length,
    })
})

router.post('/transactions', (req, res) => {
    const { type, amount, date, description, category, account } = req.body as {
        type?: TransactionType
        amount?: number
        date?: string
        description?: string
        category?: string
        account?: string
    }

    const isTypeValid = type === 'income' || type === 'expense'
    const numericAmount = Number(amount)
    const isAmountValid = Number.isFinite(numericAmount) && numericAmount > 0
    const isDateValid = typeof date === 'string' && !Number.isNaN(Date.parse(date))
    const isDescriptionValid = typeof description === 'string' && description.trim().length > 0
    const isCategoryValid = typeof category === 'string' && category.trim().length > 0
    const isAccountValid = typeof account === 'string' && account.trim().length > 0

    if (
        !isTypeValid ||
        !isAmountValid ||
        !isDateValid ||
        !isDescriptionValid ||
        !isCategoryValid ||
        !isAccountValid
    ) {
        res.status(400).json({ message: 'Invalid transaction payload' })
        return
    }

    const transaction: Transaction = {
        id: randomUUID(),
        type,
        amount: numericAmount,
        date,
        description: description.trim(),
        category: category.trim(),
        account: account.trim(),
        createdAt: new Date().toISOString(),
    }

    transactions.unshift(transaction)

    res.status(201).json({ transaction })
})

export function resetTransactionsForTests(): void {
    transactions.length = 0
}
