# VerifiAI Backend

Production-ready FastAPI backend for the VerifiAI Protocol - Zero-Knowledge AI Verification Platform.

## Tech Stack

- **Framework**: FastAPI with async SQLAlchemy
- **Database**: Neon PostgreSQL with connection pooling
- **Cache**: Redis for caching and pub/sub
- **Workers**: Celery for background task processing
- **Auth**: Clerk JWT verification
- **Monitoring**: Prometheus + Sentry
- **Blockchain**: Aptos SDK integration
- **Storage**: Shelby Protocol for decentralized model storage
- **Rewards**: Photon SDK for token rewards

## Quick Start

### Prerequisites

- Python 3.11+
- uv package manager
- Redis
- PostgreSQL (or Neon)

### Installation

```bash
# Install dependencies
uv sync

# Copy environment variables
cp .env.example .env

# Run database migrations
uv run alembic upgrade head

# Start development server
uv run python run.py
```

### Start Celery Worker

```bash
uv run python run_worker.py
```

### Start Celery Beat Scheduler

```bash
uv run celery -A src.workers.celery_app beat --loglevel=info
```

## API Documentation

Once running, visit:
- OpenAPI docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

## Project Structure

```
backend/
├── src/
│   ├── api/              # API routes and dependencies
│   │   ├── routes/       # Route handlers
│   │   │   ├── proofs.py
│   │   │   ├── agents.py
│   │   │   ├── swarms.py
│   │   │   ├── settlements.py
│   │   │   ├── models.py
│   │   │   ├── rewards.py
│   │   │   ├── dashboard.py
│   │   │   └── websocket.py
│   │   └── deps.py       # Auth dependencies
│   ├── core/             # Core utilities
│   │   ├── config.py     # Settings
│   │   ├── database.py   # DB connection
│   │   └── redis.py      # Redis client
│   ├── models/           # SQLAlchemy models
│   ├── migrations/       # Alembic migrations
│   ├── workers/          # Celery workers
│   │   └── tasks/        # Background tasks
│   ├── main.py           # FastAPI app
│   └── config.py         # Configuration
├── alembic.ini           # Alembic config
├── pyproject.toml        # Dependencies
├── run.py                # Dev server script
├── run_worker.py         # Worker script
└── Dockerfile            # Production container
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host/db

# Redis
REDIS_URL=redis://localhost:6379

# Auth (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Aptos
APTOS_NETWORK=testnet
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
CONTRACT_ADDRESS=0x...

# Shelby
SHELBY_API_URL=https://api.shelby.dev
SHELBY_API_KEY=...

# Photon
PHOTON_API_KEY=...
PHOTON_JWT_SECRET=...

# Monitoring
SENTRY_DSN=...
```

## API Endpoints

### Proofs
- `POST /proofs` - Submit new proof
- `GET /proofs` - List proofs
- `GET /proofs/{id}` - Get proof details
- `POST /proofs/{id}/verify` - Verify proof
- `POST /proofs/{id}/publish` - Publish to chain

### Agents
- `POST /agents/register` - Register agent
- `GET /agents` - List agents
- `GET /agents/{id}` - Get agent details
- `POST /agents/{id}/join-swarm` - Join swarm
- `POST /agents/{id}/heartbeat` - Agent heartbeat

### Swarms
- `POST /swarms` - Create swarm
- `GET /swarms` - List swarms
- `GET /swarms/{id}` - Get swarm details

### Settlements
- `GET /settlements` - List settlements
- `GET /settlements/{id}` - Get settlement details
- `POST /settlements/{id}/finalize` - Finalize settlement

### Dashboard
- `GET /dashboard/stats` - Platform statistics
- `GET /dashboard/activity` - Recent activity
- `GET /dashboard/notifications` - User notifications
- `GET /dashboard/insights` - AI-powered insights

### WebSocket
- `WS /ws` - Real-time updates
- `WS /ws/proofs/{id}` - Proof status updates
- `WS /ws/settlements/{id}` - Settlement updates

## License

MIT
