# 🏆 VerifiAI Protocol - Hackathon MVP

> **Trustless AI Inference Verification on Aptos Blockchain**

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start API server (Terminal 1)
cd apps/api && pnpm run dev

# 3. Start Dashboard (Terminal 2)  
cd apps/dashboard && pnpm run dev

# 4. Open browser
# Homepage: http://localhost:3000
# Dashboard: http://localhost:3000/dashboard
```

## 🎯 What We Built

VerifiAI Protocol is a **decentralized AI verification platform** that:

1. **Generates Zero-Knowledge Proofs** for AI inference (Groth16, Bulletproofs, Hybrid)
2. **Verifies AI outputs** on-chain without revealing sensitive data
3. **Manages AI Agent Swarms** for distributed task execution
4. **Settles AI transactions** with cryptographic proof requirements
5. **Rewards users** with PAT tokens via Photon integration

## ✨ Key Features

### 🔐 Zero-Knowledge Proofs
- **Groth16**: Fast verification, trusted setup
- **Bulletproofs**: No trusted setup, range proofs
- **Hybrid**: Best of both worlds
- **EZKL**: ML-specific ZK proofs

### 🤖 AI Agent Swarms
- Multi-agent coordination
- Task distribution & load balancing
- Capability-based routing
- Real-time status tracking

### 💰 Settlements
- Multi-party atomic settlements
- Proof-required transactions
- On-chain verification
- Aptos Move smart contracts

### 🎮 Photon Rewards (Gamification)
- Earn PAT tokens for contributions
- Daily check-in streaks
- Achievement tracking
- Embedded wallet creation

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Aptos (Move contracts) |
| **Frontend** | React 18 + Vite + Tailwind |
| **Backend** | Express.js + TypeScript |
| **Auth** | Clerk (enterprise-grade) |
| **Database** | Neon (serverless Postgres) |
| **ORM** | Drizzle |
| **Storage** | Shelby (decentralized) |
| **Rewards** | Photon Protocol |
| **ZK Proofs** | Custom proof engine |

## 📁 Project Structure

```
verifiai-protocol/
├── apps/
│   ├── api/              # Express API server
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   └── db/       # Neon + Drizzle
│   │   └── package.json
│   └── dashboard/        # React frontend
│       ├── src/
│       │   ├── pages/    # Route components
│       │   ├── components/
│       │   └── lib/      # Hooks, utils, API
│       └── package.json
├── contracts/            # Aptos Move contracts
│   └── sources/
│       ├── coordinator.move
│       ├── registry.move
│       ├── settlement.move
│       └── verifier.move
└── packages/             # Shared libraries
    ├── core/             # Types, utils
    ├── proof-engine/     # ZK proof generation
    ├── shelby-client/    # Storage client
    ├── photon-sdk/       # Rewards integration
    └── agent-coordinator/# Swarm management
```

## 🔗 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/v1/proofs` | List all proofs |
| `POST /api/v1/proofs/generate` | Generate ZK proof |
| `POST /api/v1/proofs/verify` | Verify proof on-chain |
| `GET /api/v1/agents` | List agents |
| `GET /api/v1/agents/swarms` | List swarms |
| `POST /api/v1/agents/swarms` | Create swarm |
| `GET /api/v1/settlements` | List settlements |
| `POST /api/v1/settlements` | Create settlement |
| `GET /api/v1/models` | List AI models |
| `POST /api/v1/models/upload` | Upload model |
| `GET /api/v1/users/me` | Get current user |

## 🔑 Environment Setup

### Dashboard (.env)
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_APTOS_API_KEY=your_aptos_api_key
```

### API (.env)
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host/db
APTOS_PRIVATE_KEY=your_key
PHOTON_API_KEY=your_photon_key
```

## 🎨 Dashboard Pages

| Page | Features |
|------|----------|
| **Home** | Landing page, hero, features |
| **Dashboard** | Live stats, charts, activity |
| **Proofs** | Generate, verify, filter proofs |
| **Agents** | View agent status & tasks |
| **Swarms** | Create & manage agent swarms |
| **Settlements** | Initiate & track settlements |
| **Models** | Upload & manage AI models |
| **Rewards** | Photon rewards & achievements |
| **Settings** | User preferences |

## 🏗 Smart Contracts (Aptos Move)

- **Registry**: Model & agent registration
- **Verifier**: On-chain proof verification
- **Settlement**: Multi-party transactions
- **Coordinator**: Agent task coordination
- **Events**: Audit logging

**Deployed to**: `0x4497111567f83f32715f45d733960c200612c92b1dd7051f3f1cd683aabaf493`

## 🚀 What Makes This Special

1. **No Mock Data**: Every button works - real API calls
2. **Production Architecture**: Monorepo with proper separation
3. **Enterprise Auth**: Clerk integration for secure access
4. **Database Ready**: Neon Postgres with Drizzle ORM
5. **Gamification**: Photon rewards for user engagement
6. **Beautiful UI**: Tailwind + Radix UI components
7. **Type Safety**: Full TypeScript coverage

## 👥 Team

Built with ❤️ for the hackathon

## 📜 License

MIT License - See [LICENSE](./LICENSE)

---

**🏆 Vote for VerifiAI Protocol!**

*Bringing trustless verification to AI inference on Aptos blockchain.*
