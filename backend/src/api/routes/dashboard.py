"""Dashboard statistics and analytics endpoints"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.api.dependencies import get_current_user
from src.models.user import User
from src.models.proof import Proof, ProofStatus
from src.models.agent import Agent, AgentStatus
from src.models.settlement import Settlement, SettlementStatus
from src.models.swarm import Swarm

router = APIRouter()


# ============================================================================
# Response Schemas
# ============================================================================

class StatsOverview(BaseModel):
    """Overall platform statistics"""
    total_proofs: int
    verified_proofs: int
    total_agents: int
    active_agents: int
    total_settlements: int
    pending_settlements: int
    total_rewards_distributed: int
    total_users: int
    
class TrendData(BaseModel):
    """Trend data point"""
    date: str
    value: int

class UserStats(BaseModel):
    """User-specific statistics"""
    proofs_generated: int
    proofs_verified: int
    agents_registered: int
    agents_active: int
    rewards_earned: int
    reputation: int
    rank: int
    total_users: int
    current_streak: int
    proof_trend: list[TrendData]
    reward_trend: list[TrendData]

class ActivityItem(BaseModel):
    """Recent activity item"""
    id: str
    type: str  # proof_created, proof_verified, agent_registered, settlement_created, reward_claimed
    title: str
    description: str
    timestamp: datetime
    metadata: Optional[dict] = None

class DashboardResponse(BaseModel):
    """Complete dashboard data"""
    overview: StatsOverview
    user_stats: UserStats
    recent_activity: list[ActivityItem]
    quick_actions: list[dict]


# ============================================================================
# Dashboard Endpoints
# ============================================================================

@router.get("/stats", response_model=DashboardResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    days: int = Query(default=30, ge=1, le=365, description="Number of days for trend data"),
):
    """Get comprehensive dashboard statistics for the current user"""
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Platform-wide stats
    total_proofs = await session.scalar(select(func.count(Proof.id)))
    verified_proofs = await session.scalar(
        select(func.count(Proof.id)).where(Proof.status == ProofStatus.VERIFIED)
    )
    total_agents = await session.scalar(select(func.count(Agent.id)))
    active_agents = await session.scalar(
        select(func.count(Agent.id)).where(Agent.status == AgentStatus.ACTIVE)
    )
    total_settlements = await session.scalar(select(func.count(Settlement.id)))
    pending_settlements = await session.scalar(
        select(func.count(Settlement.id)).where(Settlement.status == SettlementStatus.PENDING)
    )
    total_users = await session.scalar(select(func.count(User.id)))
    
    # Calculate total rewards (sum of all user rewards)
    total_rewards = await session.scalar(
        select(func.coalesce(func.sum(User.total_rewards), 0))
    ) or 0
    
    overview = StatsOverview(
        total_proofs=total_proofs or 0,
        verified_proofs=verified_proofs or 0,
        total_agents=total_agents or 0,
        active_agents=active_agents or 0,
        total_settlements=total_settlements or 0,
        pending_settlements=pending_settlements or 0,
        total_rewards_distributed=total_rewards,
        total_users=total_users or 0,
    )
    
    # User-specific stats
    user_proofs = await session.scalar(
        select(func.count(Proof.id)).where(Proof.user_id == current_user.id)
    )
    user_verified = await session.scalar(
        select(func.count(Proof.id)).where(
            and_(Proof.user_id == current_user.id, Proof.status == ProofStatus.VERIFIED)
        )
    )
    user_agents = await session.scalar(
        select(func.count(Agent.id)).where(Agent.owner_id == current_user.id)
    )
    user_active_agents = await session.scalar(
        select(func.count(Agent.id)).where(
            and_(Agent.owner_id == current_user.id, Agent.status == AgentStatus.ACTIVE)
        )
    )
    
    # Calculate user rank by reputation
    users_above = await session.scalar(
        select(func.count(User.id)).where(User.reputation_score > current_user.reputation_score)
    )
    user_rank = (users_above or 0) + 1
    
    # Generate trend data for proofs
    proof_trend = []
    for i in range(min(days, 14)):  # Last 14 days max
        day = end_date - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        count = await session.scalar(
            select(func.count(Proof.id)).where(
                and_(
                    Proof.user_id == current_user.id,
                    Proof.created_at >= day_start,
                    Proof.created_at < day_end,
                )
            )
        )
        proof_trend.append(TrendData(date=day_start.strftime("%Y-%m-%d"), value=count or 0))
    
    proof_trend.reverse()  # Oldest to newest
    
    # Generate reward trend (mock for now, would need transaction history)
    reward_trend = []
    for i in range(min(days, 14)):
        day = end_date - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        # Placeholder - in production, this would query actual reward history
        reward_trend.append(TrendData(date=day_start.strftime("%Y-%m-%d"), value=0))
    
    reward_trend.reverse()
    
    user_stats = UserStats(
        proofs_generated=user_proofs or 0,
        proofs_verified=user_verified or 0,
        agents_registered=user_agents or 0,
        agents_active=user_active_agents or 0,
        rewards_earned=current_user.total_rewards,
        reputation=current_user.reputation_score,
        rank=user_rank,
        total_users=total_users or 0,
        current_streak=current_user.current_streak,
        proof_trend=proof_trend,
        reward_trend=reward_trend,
    )
    
    # Recent activity
    recent_activity = []
    
    # Get recent proofs
    recent_proofs = await session.execute(
        select(Proof)
        .where(Proof.user_id == current_user.id)
        .order_by(Proof.created_at.desc())
        .limit(5)
    )
    for proof in recent_proofs.scalars():
        activity_type = "proof_verified" if proof.status == ProofStatus.VERIFIED else "proof_created"
        recent_activity.append(ActivityItem(
            id=str(proof.id),
            type=activity_type,
            title=f"Proof {proof.status.value}",
            description=f"{proof.proof_type.value} proof for model",
            timestamp=proof.created_at,
            metadata={"proof_id": str(proof.id), "status": proof.status.value},
        ))
    
    # Get recent agents
    recent_agents = await session.execute(
        select(Agent)
        .where(Agent.owner_id == current_user.id)
        .order_by(Agent.created_at.desc())
        .limit(3)
    )
    for agent in recent_agents.scalars():
        recent_activity.append(ActivityItem(
            id=str(agent.id),
            type="agent_registered",
            title="Agent registered",
            description=f"Registered agent: {agent.name}",
            timestamp=agent.created_at,
            metadata={"agent_id": str(agent.id), "name": agent.name},
        ))
    
    # Sort by timestamp
    recent_activity.sort(key=lambda x: x.timestamp, reverse=True)
    recent_activity = recent_activity[:10]  # Limit to 10
    
    # Quick actions based on user state
    quick_actions = [
        {
            "id": "generate_proof",
            "title": "Generate Proof",
            "description": "Create a new ZK proof for your model",
            "icon": "shield-check",
            "href": "/dashboard/proofs/new",
        },
        {
            "id": "register_agent",
            "title": "Register Agent",
            "description": "Register a new AI agent",
            "icon": "cpu",
            "href": "/dashboard/agents/new",
        },
        {
            "id": "view_rewards",
            "title": "Claim Rewards",
            "description": f"You have {current_user.total_rewards} PAT available",
            "icon": "gift",
            "href": "/dashboard/rewards",
        },
    ]
    
    # Add conditional actions
    if user_agents and user_agents > 0:
        quick_actions.append({
            "id": "create_swarm",
            "title": "Create Swarm",
            "description": "Coordinate your agents in a swarm",
            "icon": "users",
            "href": "/dashboard/swarms/new",
        })
    
    return DashboardResponse(
        overview=overview,
        user_stats=user_stats,
        recent_activity=recent_activity,
        quick_actions=quick_actions,
    )


@router.get("/overview", response_model=StatsOverview)
async def get_platform_overview(
    session: AsyncSession = Depends(get_session),
):
    """Get platform-wide statistics (public endpoint)"""
    
    total_proofs = await session.scalar(select(func.count(Proof.id)))
    verified_proofs = await session.scalar(
        select(func.count(Proof.id)).where(Proof.status == ProofStatus.VERIFIED)
    )
    total_agents = await session.scalar(select(func.count(Agent.id)))
    active_agents = await session.scalar(
        select(func.count(Agent.id)).where(Agent.status == AgentStatus.ACTIVE)
    )
    total_settlements = await session.scalar(select(func.count(Settlement.id)))
    pending_settlements = await session.scalar(
        select(func.count(Settlement.id)).where(Settlement.status == SettlementStatus.PENDING)
    )
    total_users = await session.scalar(select(func.count(User.id)))
    total_rewards = await session.scalar(
        select(func.coalesce(func.sum(User.total_rewards), 0))
    ) or 0
    
    return StatsOverview(
        total_proofs=total_proofs or 0,
        verified_proofs=verified_proofs or 0,
        total_agents=total_agents or 0,
        active_agents=active_agents or 0,
        total_settlements=total_settlements or 0,
        pending_settlements=pending_settlements or 0,
        total_rewards_distributed=total_rewards,
        total_users=total_users or 0,
    )


@router.get("/leaderboard")
async def get_leaderboard(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=10, ge=1, le=100),
    metric: str = Query(default="reputation", regex="^(reputation|proofs|rewards)$"),
):
    """Get user leaderboard by different metrics"""
    
    if metric == "reputation":
        order_col = User.reputation_score.desc()
    elif metric == "proofs":
        order_col = User.total_proofs.desc()
    else:  # rewards
        order_col = User.total_rewards.desc()
    
    result = await session.execute(
        select(User)
        .order_by(order_col)
        .limit(limit)
    )
    users = result.scalars().all()
    
    leaderboard = []
    for rank, user in enumerate(users, 1):
        leaderboard.append({
            "rank": rank,
            "user_id": str(user.id),
            "username": user.username,
            "avatar_url": user.avatar_url,
            "reputation": user.reputation_score,
            "proofs": user.total_proofs,
            "rewards": user.total_rewards,
        })
    
    return {
        "metric": metric,
        "leaderboard": leaderboard,
        "total_users": await session.scalar(select(func.count(User.id))),
    }
