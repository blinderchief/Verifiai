"""API Routes Package"""

from src.api.routes import (
    auth,
    users,
    proofs,
    agents,
    settlements,
    models,
    swarms,
    rewards,
    dashboard,
    websocket,
)

__all__ = [
    "auth",
    "users",
    "proofs",
    "agents",
    "settlements",
    "models",
    "swarms",
    "rewards",
    "dashboard",
    "websocket",
]
