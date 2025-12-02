# VerifiAI Protocol

> Trustless AI Inference Verification on Aptos Blockchain

VerifiAI is a decentralized platform that generates **zero-knowledge proofs** for AI inference, allowing verification of AI outputs on-chain without revealing sensitive data.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Smart Contracts](#smart-contracts)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Zero-Knowledge Proofs** - Generate and verify proofs for AI inference (Groth16, Bulletproofs, EZKL)
- **AI Agent Swarms** - Coordinate multiple AI agents for distributed task execution
- **On-Chain Settlements** - Multi-party atomic settlements with proof requirements
- **Photon Rewards** - Earn PAT tokens for platform contributions
- **Decentralized Storage** - Store models and proofs via Shelby Protocol

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Installation |
|------|---------|--------------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org) |
| **pnpm** | v8+ | `npm install -g pnpm` |
| **Python** | 3.11+ | [python.org](https://python.org) |
| **PostgreSQL** | 14+ | [postgresql.org](https://postgresql.org) or use [Neon](https://neon.tech) |
| **Redis** | 7+ | [redis.io](https://redis.io) or use [Upstash](https://upstash.com) |

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/blinderchief/Verifiai.git
cd Verifiai
```

### 2. Install Dependencies

```bash
# Install frontend & packages dependencies
pnpm install

# Install backend dependencies
cd backend
pip install -e ".[dev]"
cd ..
```

### 3. Set Up Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edit both `.env` files with your credentials (see [Configuration](#configuration)).

### 4. Start the Services

**Terminal 1 - Backend API:**
```bash
cd backend
python run.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
pnpm dev
```

### 5. Open the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## Project Structure

```
verifiai-protocol/
├── backend/                 # Python FastAPI Backend
│   ├── src/
│   │   ├── api/routes/      # API endpoints
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── core/            # Config, database, security
│   │   └── workers/         # Background tasks (Celery)
│   ├── .env.example
│   └── pyproject.toml
│
├── frontend/                # Next.js Frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # API client, hooks, utils
│   │   └── hooks/           # Custom React hooks
│   ├── .env.example
│   └── package.json
│
├── contracts/               # Aptos Move Smart Contracts
│   └── sources/
│       ├── coordinator.move # Agent task coordination
│       ├── registry.move    # Model & agent registration
│       ├── settlement.move  # Multi-party settlements
│       ├── verifier.move    # On-chain proof verification
│       └── events.move      # Audit event logging
│
├── packages/                # Shared TypeScript Libraries
│   ├── core/                # Types & utilities
│   ├── proof-engine/        # ZK proof generation
│   ├── shelby-client/       # Decentralized storage
│   ├── photon-sdk/          # Rewards integration
│   └── agent-coordinator/   # Swarm management
│
├── keys/                    # ZK proving/verification keys
├── monitoring/              # Prometheus & Grafana configs
└── docker-compose.yml       # Docker services
```

---

## Configuration

### Backend (`backend/.env`)

```env
# Database (use Neon for serverless PostgreSQL)
DATABASE_URL=postgresql+asyncpg://user:password@host/database

# Redis (use Upstash or Redis Cloud)
REDIS_URL=redis://default:password@host:6379

# Security
SECRET_KEY=generate-a-secure-random-key
DEBUG=true

# Clerk Authentication (https://clerk.com)
CLERK_SECRET_KEY=sk_test_xxxxx

# Aptos Blockchain
APTOS_NETWORK=testnet
APTOS_PRIVATE_KEY=your-private-key

# Photon Rewards (optional)
PHOTON_API_KEY=your-api-key
```

### Frontend (`frontend/.env`)

```env
# API Connection
NEXT_PUBLIC_API_URL=http://localhost:8000

# Clerk Authentication (https://clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Aptos
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=0x4497111567f83f32715f45d733960c200612c92b1dd7051f3f1cd683aabaf493
```

### Getting API Keys

| Service | Sign Up | Free Tier |
|---------|---------|-----------|
| **Neon** (PostgreSQL) | [neon.tech](https://neon.tech) | ✅ Yes |
| **Upstash** (Redis) | [upstash.com](https://upstash.com) | ✅ Yes |
| **Clerk** (Auth) | [clerk.com](https://clerk.com) | ✅ Yes |
| **Aptos** | [aptoslabs.com](https://aptoslabs.com) | ✅ Testnet free |

---

## Running the Application

### Development Mode

```bash
# Start both frontend and backend
pnpm dev

# Or start individually:

# Backend only
cd backend && python run.py

# Frontend only
cd frontend && pnpm dev
```

### Using Docker

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Database Migrations

```bash
cd backend

# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## API Reference

### Authentication
All endpoints require authentication via Clerk JWT token in the `Authorization` header.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/users/me` | Get current user |

### Proofs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/proofs` | List all proofs |
| `POST` | `/api/v1/proofs` | Generate a new proof |
| `GET` | `/api/v1/proofs/{id}` | Get proof by ID |
| `POST` | `/api/v1/proofs/{id}/verify` | Verify proof on-chain |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/agents` | List all agents |
| `POST` | `/api/v1/agents` | Register new agent |
| `GET` | `/api/v1/agents/{id}` | Get agent details |
| `POST` | `/api/v1/agents/{id}/start` | Start agent |
| `POST` | `/api/v1/agents/{id}/stop` | Stop agent |

### Swarms
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/swarms` | List all swarms |
| `POST` | `/api/v1/swarms` | Create new swarm |
| `GET` | `/api/v1/swarms/{id}` | Get swarm details |

### Settlements
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/settlements` | List settlements |
| `POST` | `/api/v1/settlements` | Create settlement |
| `POST` | `/api/v1/settlements/{id}/execute` | Execute settlement |

### AI Models
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/models` | List models |
| `POST` | `/api/v1/models` | Upload model |
| `GET` | `/api/v1/models/{id}` | Get model details |

📖 **Full API documentation available at** `http://localhost:8000/docs` (Swagger UI)

---

## Smart Contracts

Deployed on Aptos Testnet at:
```
0x4497111567f83f32715f45d733960c200612c92b1dd7051f3f1cd683aabaf493
```

### Modules

| Module | Description |
|--------|-------------|
| `registry` | Register AI models and agents |
| `verifier` | Verify ZK proofs on-chain |
| `settlement` | Handle multi-party atomic settlements |
| `coordinator` | Coordinate agent task distribution |
| `events` | Emit audit events for transparency |

### Deploying Contracts

```bash
cd contracts

# Compile
aptos move compile

# Test
aptos move test

# Deploy
aptos move publish --named-addresses verifiai=default
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TailwindCSS, shadcn/ui |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic |
| **Database** | PostgreSQL (Neon), Redis (Upstash) |
| **Auth** | Clerk |
| **Blockchain** | Aptos (Move) |
| **ZK Proofs** | Groth16, Bulletproofs, EZKL |
| **Storage** | Shelby Protocol |
| **Rewards** | Photon Protocol |

---

## Troubleshooting

### Backend won't start

```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
cd backend
pip install -e ".[dev]" --force-reinstall
```

### Database connection errors

- Ensure `DATABASE_URL` is correct in `backend/.env`
- For Neon, make sure to use `postgresql+asyncpg://` prefix
- Check if database exists and migrations are applied

### Frontend authentication issues

- Verify Clerk keys match in both frontend and backend `.env` files
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
- Check browser console for CORS errors

### Redis connection errors

- Verify `REDIS_URL` format: `redis://default:password@host:port`
- For local Redis: `redis://localhost:6379`

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## Support

- 📚 **Documentation**: [DEMO_GUIDE.md](./DEMO_GUIDE.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/blinderchief/Verifiai/issues)

---

<p align="center">
  Built with ❤️ for trustless AI verification on Aptos
</p>
