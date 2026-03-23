import { Router, type IRouter } from 'express'

import { accountsRouter } from './routes/accounts.js'
import { categoriesRouter } from './routes/categories.js'
import { transactionsRouter } from './routes/transactions.js'

export const router: IRouter = Router()

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.use('/accounts', accountsRouter)
router.use('/categories', categoriesRouter)
router.use('/transactions', transactionsRouter)
