# Social Catering MVP - Workforce Scheduling Tool

A workforce scheduling application for managing shifts, workers, and assignments for Social Catering.

## Features

- **Worker Management**: Create, update, search workers by skills and certifications
- **Shift Management**: Create, update, filter shifts by status and timeframe
- **Assignment System**: Assign workers to shifts with conflict detection
- **Conflict Detection**: Prevents time overlaps, capacity violations, and expired certifications
- **Activity Logging**: Comprehensive audit trail of all changes
- **Dashboard**: Real-time overview of shift status and fill rates

## Tech Stack

- **Backend:** Ruby on Rails 7.x
- **Database:** PostgreSQL 14+
- **Authentication:** Devise (session-based)
- **Deployment:** Heroku
- **Testing:** Minitest (80+ tests)

## Getting Started

### Prerequisites

- Ruby 3.2+
- PostgreSQL 14+
- Rails 7.x

### Installation

```bash
# Clone the repository
git clone [your-repo-url]
cd social-catering-mvp

# Install dependencies
bundle install

# Setup database
rails db:create
rails db:migrate
rails db:seed

# Start server
rails server
```

### Seeded Users

Three admin users are seeded for testing:
- natalie@socialcatering.com / Password123!
- madison@socialcatering.com / Password123!
- sarah@socialcatering.com / Password123!

### API Documentation

See [docs/API.md](docs/API.md) for complete API documentation.

### Running Tests

```bash
# Run all tests
rails test

# Run specific test file
rails test test/models/worker_test.rb

# Run specific test
rails test test/models/worker_test.rb:10
```

### Health Check

```bash
curl http://localhost:3000/healthz
```

## Project Structure

```
app/
├── controllers/
│   └── api/v1/          # API endpoints
├── models/              # ActiveRecord models
├── services/            # Business logic (conflict checks, assignments)
└── views/

config/
├── initializers/
│   ├── cors.rb          # CORS configuration
│   ├── devise.rb        # Authentication config
│   └── session_store.rb # Session config
└── routes.rb            # API routes

db/
├── migrate/             # Database migrations
└── seeds.rb             # Seed data

docs/
├── API.md               # API documentation
├── implementation_context.md
└── workflow_state.md

test/
├── controllers/         # Controller tests
├── integration/         # Integration tests (concurrency)
├── models/              # Model tests
└── services/            # Service object tests
```
