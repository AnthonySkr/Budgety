# Budgety

Personal budget management application built with React + Express + SQLite.

## Stack

| Layer    | Tech                         |
| -------- | ---------------------------- |
| Frontend | React 19 · Vite · TypeScript |
| Backend  | Express 5 · TypeScript · tsx |
| Database | SQLite (better-sqlite3)      |
| Testing  | Vitest · Testing Library     |
| Linting  | ESLint 9 (flat config)       |
| Format   | Prettier 3                   |
| Commits  | Commitizen · commitlint      |
| Hooks    | Husky 9 · lint-staged        |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9

### Install

```bash
pnpm install
```

### Development

Start both client and server in parallel:

```bash
pnpm dev
```

- **Client**: <http://localhost:5173>
- **Server**: <http://localhost:3000>

### Scripts

| Command             | Description                         |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | Start client + server in watch mode |
| `pnpm build`        | Build all packages                  |
| `pnpm test`         | Run all tests                       |
| `pnpm lint`         | Lint all files                      |
| `pnpm lint:fix`     | Fix lint issues                     |
| `pnpm format`       | Format all files with Prettier      |
| `pnpm format:check` | Check formatting without writing    |
| `pnpm typecheck`    | Type-check all packages             |
| `pnpm commit`       | Interactive commit with Commitizen  |

## Project structure

```
Budgety/
├── apps/
│   ├── client/          # Vite + React 19 + TypeScript
│   └── server/          # Express 5 + TypeScript
├── docs/                # Project documentation
├── .husky/              # Git hooks
├── .vscode/             # VS Code recommended settings
├── eslint.config.js     # Shared ESLint flat config
├── .prettierrc          # Prettier config
├── commitlint.config.ts # Conventional commits config
├── tsconfig.base.json   # Shared TypeScript base config
└── pnpm-workspace.yaml  # pnpm monorepo config
```

## Commit convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

Use `pnpm commit` for an interactive prompt, or write commits manually:

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
```
