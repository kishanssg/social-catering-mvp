# Social Catering UI

React frontend for Social Catering workforce scheduling application.

**⚠️ Note:** This is the frontend subdirectory. For complete project documentation, see the [main README](../README.md) and [documentation directory](../docs/).

---

## Tech Stack

- React 18
- TypeScript
- Vite 7.1.7
- Tailwind CSS v4
- React Router 7.9.3
- Axios
- React Hook Form + Zod

---

## Quick Start

### Prerequisites

- Node.js 18+
- Rails backend running on `http://localhost:3001` (or configured via `VITE_API_URL`)

### Installation

```bash
npm install
# or
pnpm install
```

### Development

```bash
npm run dev
# or
pnpm dev
```

Open http://localhost:5173

**Note:** During development, Vite proxies API requests to the Rails backend automatically.

### Build for Production

```bash
npm run build
# or
pnpm build
```

The build output goes to `dist/` directory, which is then copied to Rails `public/` for deployment.

---

## Environment Variables

- `VITE_API_URL` - API base URL (defaults to proxying to localhost:3001 in dev)

For production/staging, set:
```bash
VITE_API_URL=https://sc-mvp-production-6b7a268cc8ad.herokuapp.com/api/v1
```

---

## Project Structure

```
src/
├── components/    # Reusable UI components
├── contexts/      # React Context providers (Auth)
├── lib/           # Utilities and API client
├── pages/         # Page components
└── types/         # TypeScript types
```

---

## Features

✅ **Complete Features:**
- Authentication (login/logout)
- Session persistence
- Protected routes
- Dashboard with metrics
- Worker management (CRUD, search, skills, certifications)
- Event management (create, edit, publish)
- Shift assignment with conflict detection
- Bulk assignment (Quick Fill)
- Activity logs
- Reports (Timesheet, Payroll, Worker Hours, Event Summary)

---

## Documentation

- **Main Project README:** [../README.md](../README.md)
- **API Documentation:** [../docs/API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md)
- **User Guide:** [../docs/USER_GUIDE.md](../docs/USER_GUIDE.md)
- **Deployment Guide:** [../docs/RUNBOOK.md](../docs/RUNBOOK.md)

---

## Development Notes

- All API calls go through `src/lib/api.ts`
- Authentication state managed by `src/contexts/AuthContext.tsx`
- Protected routes use `src/components/ProtectedRoute.tsx`
- Session cookies handled automatically by axios `withCredentials: true`
- Vite build outputs to `dist/`, then synced to Rails `public/` for deployment

---

**Last Updated:** November 2025
