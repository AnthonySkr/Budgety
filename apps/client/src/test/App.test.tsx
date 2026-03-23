import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('App', () => {
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
        const method = init?.method ?? 'GET'

        if (input.endsWith('/auth/login') && method === 'POST') {
            return Promise.resolve(
                new Response(JSON.stringify({ ok: true, user: { username: 'admin' } }), {
                    status: 200,
                }),
            )
        }

        if (input.endsWith('/accounts') && method === 'GET') {
            return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
        }
        if (input.endsWith('/categories') && method === 'GET') {
            return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
        }
        if (input.endsWith('/transactions') && method === 'GET') {
            return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
        }
        if (input.endsWith('/loans') && method === 'GET') {
            return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
        }
        if (input.endsWith('/budgets') && method === 'GET') {
            return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
        }
        if (input.endsWith('/dashboard') && method === 'GET') {
            return Promise.resolve(
                new Response(
                    JSON.stringify({
                        month: { income: 0, expense: 0 },
                        accounts: [],
                        totalBalance: 0,
                    }),
                    { status: 200 },
                ),
            )
        }
        if (input.endsWith('/stats') && method === 'GET') {
            return Promise.resolve(
                new Response(
                    JSON.stringify({
                        byCategory: [],
                        byMonth: [],
                        budgetUsage: [],
                    }),
                    { status: 200 },
                ),
            )
        }

        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
    })

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock)
        fetchMock.mockClear()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('renders Budgety heading', async () => {
        render(<App />)
        expect(await screen.findByRole('heading', { name: /budgety/i })).toBeInTheDocument()
    })

    it('logs in successfully', async () => {
        const user = userEvent.setup()
        render(<App />)
        await user.click(screen.getByRole('button', { name: /se connecter/i }))
        expect(await screen.findByText(/connecté/i)).toBeInTheDocument()
    })
})
