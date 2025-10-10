# Social Catering UI

React frontend for Social Catering workforce scheduling application.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS v3
- React Router
- Axios
- React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+
- Rails backend running on http://localhost:3000

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```
Open http://localhost:5173

### Build for Production

```bash
npm run build
npm run preview
```

## Environment Variables

- `.env.development` - Local development (localhost:3000)
- `.env.production` - Production/staging API URL

## Test Credentials

- natalie@socialcatering.com / Password123!
- madison@socialcatering.com / Password123!
- sarah@socialcatering.com / Password123!

## Project Structure

```
src/
├── components/    # Reusable UI components
├── contexts/      # React Context providers (Auth)
├── lib/           # Utilities and API client
├── pages/         # Page components
└── types/         # TypeScript types
```

## Features Complete

- [x] Authentication (login/logout)
- [x] Session persistence
- [x] Protected routes
- [x] Form validation
- [ ] Dashboard (upcoming)
- [ ] Worker management (upcoming)
- [ ] Shift management (upcoming)
- [ ] Assignment workflow (upcoming)

## Tailwind CSS

Using Tailwind CSS v3.4.x (NOT v4). Custom theme configured in `tailwind.config.js`.

## Development Notes

- All API calls go through `src/lib/api.ts`
- Authentication state managed by `src/contexts/AuthContext.tsx`
- Protected routes use `src/components/ProtectedRoute.tsx`
- Session cookies handled automatically by axios `withCredentials: true`
