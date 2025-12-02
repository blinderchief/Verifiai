"""API router package"""

from fastapi import APIRouter

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

router = APIRouter()

# Include all route modules
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(proofs.router, prefix="/proofs", tags=["Proofs"])
router.include_router(agents.router, prefix="/agents", tags=["Agents"])
router.include_router(settlements.router, prefix="/settlements", tags=["Settlements"])
router.include_router(models.router, prefix="/models", tags=["AI Models"])
router.include_router(swarms.router, prefix="/swarms", tags=["Swarms"])
router.include_router(rewards.router, prefix="/rewards", tags=["Rewards"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
router.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
