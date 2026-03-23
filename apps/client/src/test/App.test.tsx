import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('App', () => {
    beforeEach(() => {
        const fetchMock = vi.fn((input: string | URL | Request) => {
            const url =
                typeof input === 'string'
                    ? input
                    : input instanceof URL
                      ? input.pathname
                      : input.url

            if (url.toString().includes('/api/transactions')) {
                return new Response(JSON.stringify({ transactions: [] }), { status: 200 })
            }

            if (url.toString().includes('/api/summary')) {
                return new Response(
                    JSON.stringify({
                        income: 0,
                        expense: 0,
                        balance: 0,
                        byCategory: {},
                        transactionsCount: 0,
                    }),
                    { status: 200 },
                )
            }

            return new Response('{}', { status: 404 })
        })

        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('renders the budgety heading', async () => {
        render(<App />)
        expect(await screen.findByRole('heading', { name: /budgety/i })).toBeInTheDocument()
    })

    it('submits transaction form', async () => {
        const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
            const url =
                typeof input === 'string'
                    ? input
                    : input instanceof URL
                      ? input.pathname
                      : input.url
            const method = init?.method ?? 'GET'

            if (url.toString().includes('/api/transactions') && method === 'POST') {
                return new Response(
                    JSON.stringify({
                        transaction: {
                            id: '1',
                            type: 'expense',
                            amount: 25,
                            date: '2026-03-01',
                            description: 'Test',
                            category: 'Alimentation',
                            account: 'Compte courant',
                            createdAt: new Date().toISOString(),
                        },
                    }),
                    { status: 201 },
                )
            }

            if (url.toString().includes('/api/transactions') && method === 'GET') {
                return new Response(
                    JSON.stringify({
                        transactions: [
                            {
                                id: '1',
                                type: 'expense',
                                amount: 25,
                                date: '2026-03-01',
                                description: 'Test',
                                category: 'Alimentation',
                                account: 'Compte courant',
                                createdAt: new Date().toISOString(),
                            },
                        ],
                    }),
                    { status: 200 },
                )
            }

            if (url.toString().includes('/api/summary')) {
                return new Response(
                    JSON.stringify({
                        income: 0,
                        expense: 25,
                        balance: -25,
                        byCategory: { Alimentation: -25 },
                        transactionsCount: 1,
                    }),
                    { status: 200 },
                )
            }

            return new Response('{}', { status: 404 })
        })

        vi.stubGlobal('fetch', fetchMock)

        const user = userEvent.setup()
        render(<App />)

        await user.type(screen.getByLabelText(/description/i), 'Test')
        await user.type(screen.getByLabelText(/catégorie/i), 'Alimentation')
        await user.type(screen.getByLabelText(/compte/i), 'Compte courant')
        await user.clear(screen.getByLabelText(/montant/i))
        await user.type(screen.getByLabelText(/montant/i), '25')
        await user.click(screen.getByRole('button', { name: /enregistrer/i }))

        expect(await screen.findByText('Test')).toBeInTheDocument()
        expect(fetchMock).toHaveBeenCalled()
    })
})
