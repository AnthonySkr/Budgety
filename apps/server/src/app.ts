import cors from 'cors'
import express, { type Application } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import { router } from './router.js'

export function createApp(): Application {
    const app = express()

    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 300,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
    })

    // Security headers
    app.use(helmet())

    // CORS – allow Vite dev server by default
    app.use(
        cors({
            origin: process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5173',
            credentials: true,
        }),
    )

    // Body parsing
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    // Routes
    app.use('/api', apiLimiter)
    app.use('/api', router)

    return app
}
