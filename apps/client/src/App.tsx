import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

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

type Summary = {
    income: number
    expense: number
    balance: number
    byCategory: Record<string, number>
    transactionsCount: number
}

const initialSummary: Summary = {
    income: 0,
    expense: 0,
    balance: 0,
    byCategory: {},
    transactionsCount: 0,
}

function App() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [summary, setSummary] = useState<Summary>(initialSummary)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [type, setType] = useState<TransactionType>('expense')
    const [amount, setAmount] = useState('0')
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [account, setAccount] = useState('')

    const fetchData = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [transactionsRes, summaryRes] = await Promise.all([
                fetch('/api/transactions'),
                fetch('/api/summary'),
            ])

            if (!transactionsRes.ok || !summaryRes.ok) {
                throw new Error('Impossible de charger les données')
            }

            const transactionsData = (await transactionsRes.json()) as {
                transactions: Transaction[]
            }
            const summaryData = (await summaryRes.json()) as Summary
            setTransactions(transactionsData.transactions)
            setSummary(summaryData)
        } catch {
            setError('Erreur de chargement des données')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void fetchData()
    }, [])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        const parsedAmount = Number(amount)

        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type,
                amount: parsedAmount,
                date,
                description,
                category,
                account,
            }),
        })

        if (!response.ok) {
            setError('Impossible d’enregistrer la transaction')
            return
        }

        setDescription('')
        setCategory('')
        setAccount('')
        setAmount('0')
        await fetchData()
    }

    return (
        <main className="app">
            <header>
                <h1>Budgety</h1>
                <p>Version simple du suivi de budget personnel</p>
            </header>

            {error ? (
                <p role="alert" className="error">
                    {error}
                </p>
            ) : null}

            <section className="cards" aria-label="Résumé financier">
                <article className="card">
                    <h2>Revenus</h2>
                    <p>{summary.income.toFixed(2)} €</p>
                </article>
                <article className="card">
                    <h2>Dépenses</h2>
                    <p>{summary.expense.toFixed(2)} €</p>
                </article>
                <article className="card">
                    <h2>Solde</h2>
                    <p>{summary.balance.toFixed(2)} €</p>
                </article>
                <article className="card">
                    <h2>Transactions</h2>
                    <p>{summary.transactionsCount}</p>
                </article>
            </section>

            <section className="panel">
                <h2>Ajouter une transaction</h2>
                <form
                    onSubmit={(event) => {
                        void handleSubmit(event)
                    }}
                    className="form"
                >
                    <label>
                        Type
                        <select
                            value={type}
                            onChange={(event) => setType(event.target.value as TransactionType)}
                        >
                            <option value="expense">Dépense</option>
                            <option value="income">Revenu</option>
                        </select>
                    </label>
                    <label>
                        Montant
                        <input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                        />
                    </label>
                    <label>
                        Date
                        <input
                            required
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                        />
                    </label>
                    <label>
                        Description
                        <input
                            required
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />
                    </label>
                    <label>
                        Catégorie
                        <input
                            required
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                        />
                    </label>
                    <label>
                        Compte
                        <input
                            required
                            value={account}
                            onChange={(event) => setAccount(event.target.value)}
                        />
                    </label>
                    <button type="submit">Enregistrer</button>
                </form>
            </section>

            <section className="panel">
                <h2>Dernières transactions</h2>
                {isLoading ? <p>Chargement...</p> : null}
                <ul className="transactions" aria-label="Liste des transactions">
                    {transactions.map((transaction) => (
                        <li key={transaction.id}>
                            <span>{transaction.description}</span>
                            <span>{transaction.category}</span>
                            <span>{transaction.account}</span>
                            <span>{transaction.amount.toFixed(2)} €</span>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    )
}

export default App
