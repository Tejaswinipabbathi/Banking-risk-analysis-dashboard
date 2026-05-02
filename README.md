# Banking Risk Analysis Dashboard

A full-stack interactive dashboard for loan approval decision support, built with React, TypeScript, and Node.js. Designed to simulate real-world banking risk analysis workflows used by financial institutions.

**Live Demo:** [View Dashboard](https://banking-risk-analysis-dashboard.replit.app)

---

## Features

### Portfolio Overview
- 7 real-time KPI cards — Total Customers, Approval Rate, Default Rate, Avg Loan Amount, Avg Credit Score, Avg Income, Avg DTI Ratio
- 6 interactive charts — Default Rate by Age Group, Loan Purpose Breakdown, Income Distribution, Credit Score Distribution, Approval Rate by Income Level, Loan Amount vs Credit Score
- Global filters by Gender, Income Level, and Loan Status
- CSV export per chart, PDF/print export for full dashboard

### Key Risk Insights Panel
- Automatically highlights the highest-risk demographic segment
- Flags income groups with elevated default rates
- Surfaces top loan purpose by volume

### Loan Applicant Risk Scorer
- Score individual applicants using a weighted multi-factor model
- Factors: Credit Score, Annual Income, Debt-to-Income Ratio, Employment Status, Loan Amount
- Visual gauge with Approved / Review / Rejected verdict
- Per-factor risk breakdown with colour-coded indicators
- Session scoring log with CSV export for comparison

### Role-Based Access Control (RBAC)
Three roles with distinct permission levels:

| Feature | Viewer | Analyst | Manager |
|---|:---:|:---:|:---:|
| KPIs & Charts | Yes | Yes | Yes |
| Filters & Refresh | | Yes | Yes |
| Key Risk Insights | | Yes | Yes |
| Loan Applicant Scorer | | Yes | Yes |
| Customer Intelligence Table | | Yes | Yes |
| CSV Export | | Yes | Yes |
| PDF / Print Export | | | Yes |

### Customer Intelligence Table
- Paginated table with sorting on all columns
- Fields: Name, Age, Gender, Income, Credit Score, Loan Amount, DTI, Employment, Purpose, Status

---

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Recharts (data visualisation)
- TanStack Query (server state)
- TanStack Table (data grid)

**Backend**
- Node.js + Express
- TypeScript
- Zod (schema validation)
- OpenAPI contract-first design with codegen

**Architecture**
- pnpm monorepo with workspace packages
- Shared API client library with auto-generated React Query hooks
- Path-based routing via reverse proxy
- Role-based access control with permission flags

---

## Project Structure

```
├── artifacts/
│   ├── banking-dashboard/     # React + Vite frontend
│   │   └── src/
│   │       ├── pages/         # Dashboard, LoanScorer, RolePicker
│   │       ├── components/    # KPICard, ChartCard, RiskInsights
│   │       └── contexts/      # RoleContext (RBAC)
│   └── api-server/            # Express REST API
│       └── src/
│           └── routes/        # banking.ts, scoring.ts
├── lib/
│   └── api-client-react/      # Generated hooks + Zod schemas
├── pnpm-workspace.yaml
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend (separate terminal)
pnpm --filter @workspace/banking-dashboard run dev
```

The dashboard runs on `http://localhost:5173` and the API on `http://localhost:8080`.

---

## Real-World Relevance

This dashboard addresses genuine banking risk analysis needs:

- **Portfolio monitoring** — KPIs and charts mirror what risk managers track daily
- **Credit scoring** — the applicant scorer replicates weighted credit risk model logic (similar to FICO-based internal models)
- **Fair lending compliance** — demographic filters allow analysts to detect approval rate disparities across gender and income groups, as required by regulations like the Equal Credit Opportunity Act
- **Role separation** — the RBAC model reflects real compliance requirements where junior analysts cannot access raw customer data or trigger bulk exports

---

## Author

**Tejaswini Pabbathi**  
Final Year Student | [GitHub](https://github.com/Tejaswinipabbathi)
