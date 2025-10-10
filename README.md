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

## Deployment

### Staging
```bash
# Deploy to staging
git push staging main

# Run migrations
heroku run rails db:migrate -a sc-mvp-staging

# Check logs
heroku logs --tail -a sc-mvp-staging
```
**Staging URL:** https://sc-mvp-staging-c6ef090c6c41.herokuapp.com

### Production (when ready)
```bash
git push production main
heroku run rails db:migrate -a sc-mvp-prod
```

## Key Features Explained

### Conflict Detection (3 Rules)

When assigning a worker to a shift, the system checks:

1. **Time Overlap**: Worker doesn't have another assignment during this time
2. **Capacity**: Shift isn't already at full capacity
3. **Certifications**: Worker's certifications are valid through shift end (if required)

### Advisory Locks (Concurrency Safety)

PostgreSQL advisory locks prevent race conditions when two admins try to assign workers simultaneously:

```ruby
# Acquires lock on worker.id
pg_advisory_lock(worker.id)

# Checks conflicts
# Creates assignment

# Always releases lock (even on error)
pg_advisory_unlock(worker.id)
```

Tested with concurrent assignment tests in `test/integration/`.

### Activity Logging

All data changes are logged to `activity_logs` table:
- Who made the change (actor_user_id)
- What changed (before_json, after_json)
- When it happened (created_at_utc)

View logs via `/api/v1/activity_logs` endpoint.

## Development Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Write tests first (TDD)
3. Implement feature
4. Run tests: `rails test`
5. Commit with descriptive message
6. Push and create PR
7. Deploy to staging for testing

## Troubleshooting

### CORS Issues

If React gets CORS errors:
- Verify origin in `config/initializers/cors.rb`
- Restart Rails server after changing initializers
- Check browser console for exact origin

### Database Issues
```bash
# Reset test database
rails db:test:prepare

# Reset development database
rails db:reset
```

### Advisory Lock Stuck
```bash
# In rails console
ActiveRecord::Base.connection.execute('SELECT pg_advisory_unlock_all()')
```

## Contributing

1. Follow existing code patterns
2. Write tests for new features
3. Keep controllers thin, business logic in services
4. Use strong parameters
5. Document API changes in docs/API.md

## License

Proprietary - Social Catering

## Support

Contact: Alex (Rav/Bobby for technical questions)
# Production deployment fix
