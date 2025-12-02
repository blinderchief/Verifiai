"""User routes"""

from datetime import datetime
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.api.routes.auth import CurrentUser

router = APIRouter()


class UserStats(BaseModel):
    """User statistics"""
    total_proofs: int
    verified_proofs: int
    total_agents: int
    active_agents: int
    total_swarms: int
    total_settlements: int
    total_rewards_earned: float
    wallet_balance: float


class UserActivityItem(BaseModel):
    """User activity item"""
    id: str
    type: str
    title: str
    description: str
    timestamp: datetime
    metadata: Optional[dict] = None


class DashboardStats(BaseModel):
    """Dashboard statistics"""
    stats: UserStats
    recent_activity: list[UserActivityItem]
    proof_trend: list[dict]
    agent_performance: list[dict]


@router.get("/stats", response_model=UserStats)
async def get_user_stats(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get user statistics for dashboard"""
    from src.models.proof import Proof, ProofStatus
    from src.models.agent import Agent
    from src.models.swarm import Swarm
    from src.models.settlement import Settlement
    
    # Count proofs
    total_proofs = await db.scalar(
        select(func.count(Proof.id)).where(Proof.user_id == current_user.id)
    )
    verified_proofs = await db.scalar(
        select(func.count(Proof.id)).where(
            Proof.user_id == current_user.id,
            Proof.status == ProofStatus.VERIFIED
        )
    )
    
    # Count agents
    total_agents = await db.scalar(
        select(func.count(Agent.id)).where(Agent.user_id == current_user.id)
    )
    active_agents = await db.scalar(
        select(func.count(Agent.id)).where(
            Agent.user_id == current_user.id,
            Agent.is_active == True
        )
    )
    
    # Count swarms
    total_swarms = await db.scalar(
        select(func.count(Swarm.id)).where(Swarm.owner_id == current_user.id)
    )
    
    # Count settlements
    total_settlements = await db.scalar(
        select(func.count(Settlement.id)).where(Settlement.user_id == current_user.id)
    )
    
    return UserStats(
        total_proofs=total_proofs or 0,
        verified_proofs=verified_proofs or 0,
        total_agents=total_agents or 0,
        active_agents=active_agents or 0,
        total_swarms=total_swarms or 0,
        total_settlements=total_settlements or 0,
        total_rewards_earned=current_user.total_rewards_earned or 0.0,
        wallet_balance=current_user.wallet_balance or 0.0,
    )


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_data(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive dashboard data"""
    from src.models.proof import Proof, ProofStatus
    from src.models.agent import Agent
    
    # Get stats
    stats = await get_user_stats(current_user, db)
    
    # Get recent activity (last 10 items across all types)
    recent_proofs = await db.execute(
        select(Proof)
        .where(Proof.user_id == current_user.id)
        .order_by(Proof.created_at.desc())
        .limit(5)
    )
    
    activity = []
    for proof in recent_proofs.scalars():
        activity.append(UserActivityItem(
            id=str(proof.id),
            type="proof",
            title=f"{proof.proof_type.value.title()} Proof",
            description=f"Status: {proof.status.value}",
            timestamp=proof.created_at,
            metadata={"proof_type": proof.proof_type.value, "status": proof.status.value}
        ))
    
    # Get proof trend (last 7 days)
    from datetime import timedelta
    proof_trend = []
    for i in range(7):
        date = datetime.utcnow().date() - timedelta(days=6-i)
        count = await db.scalar(
            select(func.count(Proof.id)).where(
                Proof.user_id == current_user.id,
                func.date(Proof.created_at) == date
            )
        )
        proof_trend.append({
            "date": date.isoformat(),
            "count": count or 0
        })
    
    # Get agent performance
    agents = await db.execute(
        select(Agent)
        .where(Agent.user_id == current_user.id)
        .order_by(Agent.reputation_score.desc())
        .limit(5)
    )
    
    agent_performance = []
    for agent in agents.scalars():
        agent_performance.append({
            "id": str(agent.id),
            "name": agent.name,
            "reputation": agent.reputation_score,
            "tasks_completed": agent.tasks_completed,
        })
    
    return DashboardStats(
        stats=stats,
        recent_activity=sorted(activity, key=lambda x: x.timestamp, reverse=True),
        proof_trend=proof_trend,
        agent_performance=agent_performance,
    )


@router.get("/api-keys")
async def get_api_keys(current_user: CurrentUser):
    """Get user's API keys"""
    # Return masked API keys
    return {
        "keys": [
            {
                "id": "key_1",
                "name": "Production Key",
                "key_preview": "vf_****...****",
                "created_at": "2024-01-15T10:00:00Z",
                "last_used": "2024-01-20T15:30:00Z",
                "permissions": ["read", "write"],
            }
        ]
    }


@router.post("/api-keys")
async def create_api_key(
    name: str,
    permissions: list[str] = ["read"],
    current_user: CurrentUser = None,
):
    """Create a new API key"""
    import secrets
    
    # Generate API key
    key = f"vf_{secrets.token_urlsafe(32)}"
    
    # In production, store hashed key in database
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "key": key,  # Only shown once
        "key_preview": f"{key[:6]}...{key[-4:]}",
        "permissions": permissions,
        "created_at": datetime.utcnow().isoformat(),
    }


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: CurrentUser = None,
):
    """Delete an API key"""
    return {"status": "deleted", "id": key_id}
