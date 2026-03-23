import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

type TransactionType = 'expense' | 'income'
type Frequency = 'monthly' | 'yearly'
type BudgetPeriod = 'monthly' | 'yearly'

interface Account {
    id: number
    name: string
    type: string
    initialBalance: number
    balance?: number
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

interface DashboardData {
    month: { income: number; expense: number }
    accounts: Account[]
    totalBalance: number
}

interface StatsData {
    byCategory: Array<{ category: string; type: TransactionType; total: number }>
    byMonth: Array<{ month: string; income: number; expense: number }>
    budgetUsage: Array<{
        id: number
        name: string
        amount: number
        spent: number
        remaining: number
        startDate: string
        endDate: string
    }>
}

interface StatsFilters {
    startDate: string
    endDate: string
    accountId: string
    categoryId: string
}

const env = import.meta.env as ImportMetaEnv & { VITE_API_URL?: string }
const API_BASE = env.VITE_API_URL ?? 'http://localhost:3000/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        ...init,
    })

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `HTTP ${response.status}`)
    }

    if (response.status === 204) {
        return undefined as T
    }

    return (await response.json()) as T
}

function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [error, setError] = useState<string | null>(null)

    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loans, setLoans] = useState<Loan[]>([])
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [dashboard, setDashboard] = useState<DashboardData | null>(null)
    const [stats, setStats] = useState<StatsData | null>(null)
    const [jsonBackup, setJsonBackup] = useState('')
    const [statsFilters, setStatsFilters] = useState<StatsFilters>({
        startDate: '',
        endDate: '',
        accountId: '',
        categoryId: '',
    })
    const [csvImportForm, setCsvImportForm] = useState({
        accountId: '',
        defaultType: 'expense',
        delimiter: ',',
        csv: '',
    })

    const [accountForm, setAccountForm] = useState({
        name: '',
        type: 'courant',
        initialBalance: '0',
    })
    const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense', parentId: '' })
    const [transactionForm, setTransactionForm] = useState({
        amount: '0',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        type: 'expense',
        categoryId: '',
        accountId: '',
        transferAccountId: '',
        isRecurring: false,
        frequency: '',
        recurrenceAnchorDate: '',
    })
    const [loanForm, setLoanForm] = useState({
        name: '',
        totalAmount: '0',
        remainingAmount: '0',
        monthlyPayment: '0',
        nextDueDate: new Date().toISOString().slice(0, 10),
    })
    const [budgetForm, setBudgetForm] = useState({
        name: '',
        categoryId: '',
        amount: '0',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        isRecurring: false,
        period: '',
        monthOverride: '',
    })
    const [transferForm, setTransferForm] = useState({
        amount: '0',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        fromAccountId: '',
        toAccountId: '',
    })
    const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'budgety' })
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const categoryOptions = useMemo(
        () => categories.map((category) => ({ value: String(category.id), label: category.name })),
        [categories],
    )
    const accountOptions = useMemo(
        () => accounts.map((account) => ({ value: String(account.id), label: account.name })),
        [accounts],
    )
    const maxCategoryTotal = useMemo(
        () => Math.max(...(stats?.byCategory.map((item) => item.total) ?? [0]), 0),
        [stats],
    )
    const maxMonthlyValue = useMemo(
        () =>
            Math.max(...(stats?.byMonth.flatMap((item) => [item.income, item.expense]) ?? [0]), 0),
        [stats],
    )
    const maxBudgetValue = useMemo(
        () =>
            Math.max(
                ...(stats?.budgetUsage.flatMap((item) => [item.amount, item.spent]) ?? [0]),
                0,
            ),
        [stats],
    )

    function buildStatsQuery(filters: StatsFilters): string {
        const params = new URLSearchParams()
        if (filters.startDate) {
            params.set('startDate', filters.startDate)
        }
        if (filters.endDate) {
            params.set('endDate', filters.endDate)
        }
        if (filters.accountId) {
            params.set('accountId', filters.accountId)
        }
        if (filters.categoryId) {
            params.set('categoryId', filters.categoryId)
        }
        const query = params.toString()
        return query ? `?${query}` : ''
    }

    const refreshAll = useCallback(async (): Promise<void> => {
        setError(null)
        try {
            const [
                accountsData,
                categoriesData,
                transactionsData,
                loansData,
                budgetsData,
                dashboardData,
                statsData,
            ] = await Promise.all([
                request<Account[]>('/accounts'),
                request<Category[]>('/categories'),
                request<Transaction[]>('/transactions'),
                request<Loan[]>('/loans'),
                request<Budget[]>('/budgets'),
                request<DashboardData>('/dashboard'),
                request<StatsData>(`/stats${buildStatsQuery(statsFilters)}`),
            ])

            setAccounts(accountsData)
            setCategories(categoriesData)
            setTransactions(transactionsData)
            setLoans(loansData)
            setBudgets(budgetsData)
            setDashboard(dashboardData)
            setStats(statsData)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        }
    }, [statsFilters])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void refreshAll()
        }, 0)

        return () => {
            window.clearTimeout(timer)
        }
    }, [refreshAll])

    async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault()
        setError(null)
        try {
            await request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(loginForm),
            })
            setIsAuthenticated(true)
        } catch (err) {
            setIsAuthenticated(false)
            setError(err instanceof Error ? err.message : 'Unknown error')
        }
    }

    async function createAccount(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault()
        await request('/accounts', {
            method: 'POST',
            body: JSON.stringify({
                name: accountForm.name,
                type: accountForm.type,
                initialBalance: Number(accountForm.initialBalance),
            }),
        })
        setAccountForm({ name: '', type: 'courant', initialBalance: '0' })
        await refreshAll()
    }

    async function createCategory(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault()
        await request('/categories', {
            method: 'POST',
            body: JSON.stringify({
                name: categoryForm.name,
                type: categoryForm.type,
                parentId: categoryForm.parentId ? Number(categoryForm.parentId) : null,
            }),
        })
        setCategoryForm({ name: '', type: 'expense', parentId: '' })
        await refreshAll()
    }

    async function createTransaction(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault()
        await request('/transactions', {
            method: 'POST',
            body: JSON.stringify({
                amount: Number(transactionForm.amount),
                date: transactionForm.date,
                description: transactionForm.description,
                type: transactionForm.type,
                categoryId: transactionForm.categoryId ? Number(transactionForm.categoryId) : null,
                accountId: Number(transactionForm.accountId),
                transferAccountId: transactionForm.transferAccountId
                    ? Number(transactionForm.transferAccountId)
                    : null,
                isRecurring: transactionForm.isRecurring,
                frequency: transactionForm.frequency || null,
                recurrenceAnchorDate: transactionForm.recurrenceAnchorDate || null,
            }),
        })
        setTransactionForm((current) => ({ ...current, amount: '0', description: '' }))
        await refreshAll()
    }

    async function createLoan(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault()
        await request('/loans', {
            method: 'POST',
            body: JSON.stringify({
                name: loanForm.name,
                totalAmount: Number(loanForm.totalAmount),
                remainingAmount: Number(loanForm.remainingAmount),
                monthlyPayment: Number(loanForm.monthlyPayment),
                nextDueDate: loanForm.nextDueDate,
            }),
        })
        setLoanForm({
            name: '',
            totalAmount: '0',
            remainingAmount: '0',
            monthlyPayment: '0',
            nextDueDate: new Date().toISOString().slice(0, 10),
        })
        await refreshAll()
    }

    async function createBudget(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault()
        await request('/budgets', {
            method: 'POST',
            body: JSON.stringify({
                name: budgetForm.name,
                categoryId: Number(budgetForm.categoryId),
                amount: Number(budgetForm.amount),
                startDate: budgetForm.startDate,
                endDate: budgetForm.endDate,
                isRecurring: budgetForm.isRecurring,
                period: budgetForm.period || null,
                monthOverride: budgetForm.monthOverride || null,
            }),
        })
        setBudgetForm((current) => ({ ...current, name: '', amount: '0' }))
        await refreshAll()
    }

    async function createTransfer(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault()
        await request('/transfers', {
            method: 'POST',
            body: JSON.stringify({
                amount: Number(transferForm.amount),
                date: transferForm.date,
                description: transferForm.description,
                fromAccountId: Number(transferForm.fromAccountId),
                toAccountId: Number(transferForm.toAccountId),
            }),
        })
        setTransferForm((current) => ({ ...current, amount: '0', description: '' }))
        await refreshAll()
    }

    async function deleteEntity(path: string): Promise<void> {
        await request(path, { method: 'DELETE' })
        await refreshAll()
    }

    async function processRecurring(): Promise<void> {
        await request('/transactions/recurring/process', { method: 'POST' })
        await refreshAll()
    }

    async function exportJson(): Promise<void> {
        const data = await request<Record<string, unknown>>('/export/json')
        setJsonBackup(JSON.stringify(data, null, 2))
    }

    async function importJson(): Promise<void> {
        await request('/import/json', {
            method: 'POST',
            body: jsonBackup,
        })
        await refreshAll()
    }

    async function importCsv(): Promise<void> {
        await request<{ imported: number }>('/import/csv', {
            method: 'POST',
            body: JSON.stringify({
                csv: csvImportForm.csv,
                accountId: Number(csvImportForm.accountId),
                delimiter: csvImportForm.delimiter,
                defaultType: csvImportForm.defaultType,
                mapping: {
                    date: 'date',
                    description: 'description',
                    amount: 'amount',
                    category: 'category',
                    type: 'type',
                },
            }),
        })
        setCsvImportForm((current) => ({ ...current, csv: '' }))
        await refreshAll()
    }

    return (
        <main className="app">
            <header className="header">
                <h1>Budgety</h1>
                <p>Gestion complète du budget personnel (CRUD + synthèse + import/export)</p>
            </header>

            <section className="card">
                <h2>Authentification</h2>
                <form className="form-row" onSubmit={(event) => void handleLogin(event)}>
                    <input
                        placeholder="username"
                        value={loginForm.username}
                        onChange={(event) =>
                            setLoginForm((current) => ({
                                ...current,
                                username: event.target.value,
                            }))
                        }
                    />
                    <input
                        placeholder="password"
                        type="password"
                        value={loginForm.password}
                        onChange={(event) =>
                            setLoginForm((current) => ({
                                ...current,
                                password: event.target.value,
                            }))
                        }
                    />
                    <button type="submit">Se connecter</button>
                </form>
                <p>{isAuthenticated ? 'Connecté' : 'Non connecté'}</p>
                {error && <p className="error">{error}</p>}
            </section>

            <nav className="tabs">
                {[
                    'dashboard',
                    'accounts',
                    'categories',
                    'transactions',
                    'loans',
                    'budgets',
                    'stats',
                    'backup',
                ].map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={activeTab === tab ? 'active' : ''}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </nav>

            {activeTab === 'dashboard' && dashboard && (
                <section className="card" aria-label="dashboard">
                    <h2>Dashboard</h2>
                    <div className="kpis">
                        <article>
                            <h3>Solde total</h3>
                            <p>{dashboard.totalBalance.toFixed(2)} €</p>
                        </article>
                        <article>
                            <h3>Revenus du mois</h3>
                            <p>{dashboard.month.income.toFixed(2)} €</p>
                        </article>
                        <article>
                            <h3>Dépenses du mois</h3>
                            <p>{dashboard.month.expense.toFixed(2)} €</p>
                        </article>
                    </div>
                    <ul>
                        {dashboard.accounts.map((account) => (
                            <li key={account.id}>
                                {account.name} ({account.type}) — {account.balance?.toFixed(2)} €
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {activeTab === 'accounts' && (
                <section className="card" aria-label="accounts">
                    <h2>Comptes bancaires</h2>
                    <form className="form-row" onSubmit={(event) => void createAccount(event)}>
                        <input
                            required
                            placeholder="Nom du compte"
                            value={accountForm.name}
                            onChange={(event) =>
                                setAccountForm((current) => ({
                                    ...current,
                                    name: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            placeholder="Type"
                            value={accountForm.type}
                            onChange={(event) =>
                                setAccountForm((current) => ({
                                    ...current,
                                    type: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            type="number"
                            placeholder="Solde initial"
                            value={accountForm.initialBalance}
                            onChange={(event) =>
                                setAccountForm((current) => ({
                                    ...current,
                                    initialBalance: event.target.value,
                                }))
                            }
                        />
                        <button type="submit">Ajouter</button>
                    </form>
                    <ul>
                        {accounts.map((account) => (
                            <li key={account.id}>
                                {account.name} — {account.type} —{' '}
                                {account.initialBalance.toFixed(2)} €
                                <button
                                    type="button"
                                    onClick={() => void deleteEntity(`/accounts/${account.id}`)}
                                >
                                    Supprimer
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {activeTab === 'categories' && (
                <section className="card" aria-label="categories">
                    <h2>Catégories</h2>
                    <form className="form-row" onSubmit={(event) => void createCategory(event)}>
                        <input
                            required
                            placeholder="Nom"
                            value={categoryForm.name}
                            onChange={(event) =>
                                setCategoryForm((current) => ({
                                    ...current,
                                    name: event.target.value,
                                }))
                            }
                        />
                        <select
                            value={categoryForm.type}
                            onChange={(event) =>
                                setCategoryForm((current) => ({
                                    ...current,
                                    type: event.target.value as TransactionType,
                                }))
                            }
                        >
                            <option value="expense">expense</option>
                            <option value="income">income</option>
                        </select>
                        <select
                            value={categoryForm.parentId}
                            onChange={(event) =>
                                setCategoryForm((current) => ({
                                    ...current,
                                    parentId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Aucun parent</option>
                            {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button type="submit">Ajouter</button>
                    </form>
                    <ul>
                        {categories.map((category) => (
                            <li key={category.id}>
                                {category.name} — {category.type}
                                <button
                                    type="button"
                                    onClick={() => void deleteEntity(`/categories/${category.id}`)}
                                >
                                    Supprimer
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {activeTab === 'transactions' && (
                <section className="card" aria-label="transactions">
                    <h2>Transactions et virements</h2>
                    <form className="form-grid" onSubmit={(event) => void createTransaction(event)}>
                        <input
                            required
                            type="number"
                            placeholder="Montant"
                            value={transactionForm.amount}
                            onChange={(event) =>
                                setTransactionForm((current) => ({
                                    ...current,
                                    amount: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            type="date"
                            value={transactionForm.date}
                            onChange={(event) =>
                                setTransactionForm((current) => ({
                                    ...current,
                                    date: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            placeholder="Description"
                            value={transactionForm.description}
                            onChange={(event) =>
                                setTransactionForm((current) => ({
                                    ...current,
                                    description: event.target.value,
                                }))
                            }
                        />
                        <select
                            value={transactionForm.type}
                            onChange={(event) =>
                                setTransactionForm((current) => ({
                                    ...current,
                                    type: event.target.value as TransactionType,
                                }))
                            }
                        >
                            <option value="expense">expense</option>
                            <option value="income">income</option>
                        </select>
                        <select
                            required
                            value={transactionForm.accountId}
                            onChange={(event) =>
                                setTransactionForm((current) => ({
                                    ...current,
                                    accountId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Compte</option>
                            {accountOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={transactionForm.categoryId}
                            onChange={(event) =>
                                setTransactionForm((current) => ({
                                    ...current,
                                    categoryId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Catégorie</option>
                            {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <label>
                            <input
                                type="checkbox"
                                checked={transactionForm.isRecurring}
                                onChange={(event) =>
                                    setTransactionForm((current) => ({
                                        ...current,
                                        isRecurring: event.target.checked,
                                    }))
                                }
                            />
                            Récurrente
                        </label>
                        <select
                            value={transactionForm.frequency}
                            onChange={(event) =>
                                setTransactionForm((current) => ({
                                    ...current,
                                    frequency: event.target.value,
                                }))
                            }
                        >
                            <option value="">Fréquence</option>
                            <option value="monthly">monthly</option>
                            <option value="yearly">yearly</option>
                        </select>
                        <input
                            type="date"
                            value={transactionForm.recurrenceAnchorDate}
                            onChange={(event) =>
                                setTransactionForm((current) => ({
                                    ...current,
                                    recurrenceAnchorDate: event.target.value,
                                }))
                            }
                        />
                        <button type="submit">Ajouter transaction</button>
                        <button type="button" onClick={() => void processRecurring()}>
                            Générer récurrentes
                        </button>
                    </form>
                    <form className="form-grid" onSubmit={(event) => void createTransfer(event)}>
                        <h3>Virement interne</h3>
                        <input
                            required
                            type="number"
                            placeholder="Montant"
                            value={transferForm.amount}
                            onChange={(event) =>
                                setTransferForm((current) => ({
                                    ...current,
                                    amount: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            type="date"
                            value={transferForm.date}
                            onChange={(event) =>
                                setTransferForm((current) => ({
                                    ...current,
                                    date: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            placeholder="Description"
                            value={transferForm.description}
                            onChange={(event) =>
                                setTransferForm((current) => ({
                                    ...current,
                                    description: event.target.value,
                                }))
                            }
                        />
                        <select
                            required
                            value={transferForm.fromAccountId}
                            onChange={(event) =>
                                setTransferForm((current) => ({
                                    ...current,
                                    fromAccountId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Compte source</option>
                            {accountOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            required
                            value={transferForm.toAccountId}
                            onChange={(event) =>
                                setTransferForm((current) => ({
                                    ...current,
                                    toAccountId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Compte cible</option>
                            {accountOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button type="submit">Créer virement</button>
                    </form>
                    <ul>
                        {transactions.map((transaction) => (
                            <li key={transaction.id}>
                                {transaction.date} — {transaction.description} — {transaction.type}{' '}
                                — {transaction.amount.toFixed(2)} €
                                <button
                                    type="button"
                                    onClick={() =>
                                        void deleteEntity(`/transactions/${transaction.id}`)
                                    }
                                >
                                    Supprimer
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {activeTab === 'loans' && (
                <section className="card" aria-label="loans">
                    <h2>Prêts</h2>
                    <form className="form-grid" onSubmit={(event) => void createLoan(event)}>
                        <input
                            required
                            placeholder="Nom"
                            value={loanForm.name}
                            onChange={(event) =>
                                setLoanForm((current) => ({ ...current, name: event.target.value }))
                            }
                        />
                        <input
                            required
                            type="number"
                            placeholder="Montant total"
                            value={loanForm.totalAmount}
                            onChange={(event) =>
                                setLoanForm((current) => ({
                                    ...current,
                                    totalAmount: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            type="number"
                            placeholder="Capital restant"
                            value={loanForm.remainingAmount}
                            onChange={(event) =>
                                setLoanForm((current) => ({
                                    ...current,
                                    remainingAmount: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            type="number"
                            placeholder="Mensualité"
                            value={loanForm.monthlyPayment}
                            onChange={(event) =>
                                setLoanForm((current) => ({
                                    ...current,
                                    monthlyPayment: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            type="date"
                            value={loanForm.nextDueDate}
                            onChange={(event) =>
                                setLoanForm((current) => ({
                                    ...current,
                                    nextDueDate: event.target.value,
                                }))
                            }
                        />
                        <button type="submit">Ajouter</button>
                    </form>
                    <ul>
                        {loans.map((loan) => (
                            <li key={loan.id}>
                                {loan.name} — restant {loan.remainingAmount.toFixed(2)} €
                                <button
                                    type="button"
                                    onClick={() => void deleteEntity(`/loans/${loan.id}`)}
                                >
                                    Supprimer
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {activeTab === 'budgets' && (
                <section className="card" aria-label="budgets">
                    <h2>Budgets</h2>
                    <form className="form-grid" onSubmit={(event) => void createBudget(event)}>
                        <input
                            required
                            placeholder="Nom"
                            value={budgetForm.name}
                            onChange={(event) =>
                                setBudgetForm((current) => ({
                                    ...current,
                                    name: event.target.value,
                                }))
                            }
                        />
                        <select
                            required
                            value={budgetForm.categoryId}
                            onChange={(event) =>
                                setBudgetForm((current) => ({
                                    ...current,
                                    categoryId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Catégorie</option>
                            {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <input
                            required
                            type="number"
                            placeholder="Montant"
                            value={budgetForm.amount}
                            onChange={(event) =>
                                setBudgetForm((current) => ({
                                    ...current,
                                    amount: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            type="date"
                            value={budgetForm.startDate}
                            onChange={(event) =>
                                setBudgetForm((current) => ({
                                    ...current,
                                    startDate: event.target.value,
                                }))
                            }
                        />
                        <input
                            required
                            type="date"
                            value={budgetForm.endDate}
                            onChange={(event) =>
                                setBudgetForm((current) => ({
                                    ...current,
                                    endDate: event.target.value,
                                }))
                            }
                        />
                        <label>
                            <input
                                type="checkbox"
                                checked={budgetForm.isRecurring}
                                onChange={(event) =>
                                    setBudgetForm((current) => ({
                                        ...current,
                                        isRecurring: event.target.checked,
                                    }))
                                }
                            />
                            Récurrent
                        </label>
                        <select
                            value={budgetForm.period}
                            onChange={(event) =>
                                setBudgetForm((current) => ({
                                    ...current,
                                    period: event.target.value,
                                }))
                            }
                        >
                            <option value="">Période</option>
                            <option value="monthly">monthly</option>
                            <option value="yearly">yearly</option>
                        </select>
                        <input
                            placeholder="Override mois (YYYY-MM)"
                            value={budgetForm.monthOverride}
                            onChange={(event) =>
                                setBudgetForm((current) => ({
                                    ...current,
                                    monthOverride: event.target.value,
                                }))
                            }
                        />
                        <button type="submit">Ajouter</button>
                    </form>
                    <ul>
                        {budgets.map((budget) => (
                            <li key={budget.id}>
                                {budget.name} — {budget.amount.toFixed(2)} €
                                <button
                                    type="button"
                                    onClick={() => void deleteEntity(`/budgets/${budget.id}`)}
                                >
                                    Supprimer
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {activeTab === 'stats' && stats && (
                <section className="card" aria-label="stats">
                    <h2>Statistiques</h2>
                    <div className="form-grid stats-filters">
                        <input
                            type="date"
                            value={statsFilters.startDate}
                            onChange={(event) =>
                                setStatsFilters((current) => ({
                                    ...current,
                                    startDate: event.target.value,
                                }))
                            }
                        />
                        <input
                            type="date"
                            value={statsFilters.endDate}
                            onChange={(event) =>
                                setStatsFilters((current) => ({
                                    ...current,
                                    endDate: event.target.value,
                                }))
                            }
                        />
                        <select
                            value={statsFilters.accountId}
                            onChange={(event) =>
                                setStatsFilters((current) => ({
                                    ...current,
                                    accountId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Tous les comptes</option>
                            {accountOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={statsFilters.categoryId}
                            onChange={(event) =>
                                setStatsFilters((current) => ({
                                    ...current,
                                    categoryId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Toutes les catégories</option>
                            {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button type="button" onClick={() => void refreshAll()}>
                            Appliquer filtres
                        </button>
                    </div>

                    <h3>Graphiques</h3>
                    <div className="chart-grid">
                        <article className="chart-card">
                            <h4>Répartition par catégorie</h4>
                            <div className="chart-bars">
                                {stats.byCategory.slice(0, 8).map((item) => (
                                    <div
                                        className="chart-row"
                                        key={`${item.category}-${item.type}`}
                                    >
                                        <span>
                                            {item.category} ({item.type})
                                        </span>
                                        <div className="bar-track">
                                            <div
                                                className="bar-fill"
                                                style={{
                                                    width: `${maxCategoryTotal === 0 ? 0 : (item.total / maxCategoryTotal) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <strong>{item.total.toFixed(2)} €</strong>
                                    </div>
                                ))}
                            </div>
                        </article>

                        <article className="chart-card">
                            <h4>Évolution mensuelle</h4>
                            <div className="chart-bars">
                                {stats.byMonth.map((item) => (
                                    <div className="chart-row chart-row-multi" key={item.month}>
                                        <span>{item.month}</span>
                                        <div className="bar-track">
                                            <div
                                                className="bar-fill income"
                                                style={{
                                                    width: `${maxMonthlyValue === 0 ? 0 : (item.income / maxMonthlyValue) * 100}%`,
                                                }}
                                            />
                                            <div
                                                className="bar-fill expense"
                                                style={{
                                                    width: `${maxMonthlyValue === 0 ? 0 : (item.expense / maxMonthlyValue) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <strong>
                                            +{item.income.toFixed(0)} / -{item.expense.toFixed(0)}
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        </article>

                        <article className="chart-card">
                            <h4>Budgets vs dépenses</h4>
                            <div className="chart-bars">
                                {stats.budgetUsage.map((item) => {
                                    const usagePercent =
                                        item.amount > 0 ? (item.spent / item.amount) * 100 : 0
                                    const usageClass =
                                        usagePercent >= 100
                                            ? 'critical'
                                            : usagePercent >= 80
                                              ? 'warning'
                                              : 'ok'
                                    return (
                                        <div className="chart-row" key={item.id}>
                                            <span>{item.name}</span>
                                            <div className="bar-track">
                                                <div
                                                    className={`bar-fill budget ${usageClass}`}
                                                    style={{
                                                        width: `${maxBudgetValue === 0 ? 0 : (Math.min(item.spent, item.amount) / maxBudgetValue) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                            <strong>
                                                {item.spent.toFixed(0)} / {item.amount.toFixed(0)} €
                                            </strong>
                                        </div>
                                    )
                                })}
                            </div>
                        </article>
                    </div>

                    <h3>Par catégorie</h3>
                    <ul>
                        {stats.byCategory.map((item) => (
                            <li key={`${item.category}-${item.type}`}>
                                {item.category} ({item.type}) — {item.total.toFixed(2)} €
                            </li>
                        ))}
                    </ul>
                    <h3>Par mois</h3>
                    <ul>
                        {stats.byMonth.map((item) => (
                            <li key={item.month}>
                                {item.month} — revenus {item.income.toFixed(2)} € / dépenses{' '}
                                {item.expense.toFixed(2)} €
                            </li>
                        ))}
                    </ul>
                    <h3>Budgets vs dépenses</h3>
                    <ul>
                        {stats.budgetUsage.map((item) => (
                            <li key={item.id}>
                                {item.name} — dépensé {item.spent.toFixed(2)} € / restant{' '}
                                {item.remaining.toFixed(2)} €
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {activeTab === 'backup' && (
                <section className="card" aria-label="backup">
                    <h2>Import / Export JSON</h2>
                    <div className="form-row">
                        <button type="button" onClick={() => void exportJson()}>
                            Exporter
                        </button>
                        <button type="button" onClick={() => void importJson()}>
                            Importer
                        </button>
                        <button type="button" onClick={() => void refreshAll()}>
                            Rafraîchir
                        </button>
                    </div>
                    <textarea
                        rows={14}
                        value={jsonBackup}
                        onChange={(event) => setJsonBackup(event.target.value)}
                    />

                    <h2>Import CSV</h2>
                    <form
                        className="form-grid"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void importCsv()
                        }}
                    >
                        <select
                            required
                            value={csvImportForm.accountId}
                            onChange={(event) =>
                                setCsvImportForm((current) => ({
                                    ...current,
                                    accountId: event.target.value,
                                }))
                            }
                        >
                            <option value="">Compte cible</option>
                            {accountOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={csvImportForm.defaultType}
                            onChange={(event) =>
                                setCsvImportForm((current) => ({
                                    ...current,
                                    defaultType: event.target.value as TransactionType,
                                }))
                            }
                        >
                            <option value="expense">Type par défaut: expense</option>
                            <option value="income">Type par défaut: income</option>
                        </select>
                        <input
                            aria-label="Délimiteur CSV"
                            value={csvImportForm.delimiter}
                            maxLength={1}
                            onChange={(event) =>
                                setCsvImportForm((current) => ({
                                    ...current,
                                    delimiter: event.target.value,
                                }))
                            }
                        />
                        <button type="submit">Importer CSV</button>
                        <textarea
                            required
                            rows={10}
                            placeholder="date,description,amount,type,category"
                            value={csvImportForm.csv}
                            onChange={(event) =>
                                setCsvImportForm((current) => ({
                                    ...current,
                                    csv: event.target.value,
                                }))
                            }
                        />
                    </form>
                </section>
            )}
        </main>
    )
}

export default App
