"""Rewards routes with Photon SDK integration"""

from datetime import datetime, timedelta
from typing import Optional, List
import uuid
import httpx
import hashlib

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.api.routes.auth import CurrentUser, OptionalUser

router = APIRouter()


class RewardTransaction(BaseModel):
    """Reward transaction"""
    id: str
    type: str  # earned, claimed, spent
    amount: float
    description: str
    source: str  # proof_verification, agent_task, referral, etc.
    tx_hash: Optional[str] = None
    created_at: datetime


class RewardStats(BaseModel):
    """User reward statistics"""
    total_earned: float
    total_claimed: float
    available_balance: float
    pending_rewards: float
    wallet_address: Optional[str]
    photon_user_id: Optional[str]


class ClaimRewardRequest(BaseModel):
    """Claim reward request"""
    amount: float = Field(gt=0)
    destination_address: str = Field(min_length=1)


class ClaimRewardResponse(BaseModel):
    """Claim reward response"""
    claim_id: str
    amount: float
    destination_address: str
    tx_hash: Optional[str]
    status: str
    estimated_completion: datetime


class Achievement(BaseModel):
    """User achievement"""
    id: str
    name: str
    description: str
    icon: str
    reward_amount: float
    earned_at: Optional[datetime] = None
    progress: float = 0.0  # 0 to 1
    is_claimed: bool = False


class LeaderboardEntry(BaseModel):
    """Leaderboard entry"""
    rank: int
    user_id: str
    username: Optional[str]
    avatar_url: Optional[str]
    total_rewards: float
    proofs_verified: int


async def get_photon_user(user_id: str) -> Optional[dict]:
    """Get user info from Photon"""
    if not settings.PHOTON_API_KEY:
        return None
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{settings.PHOTON_API_URL}/users/{user_id}",
                headers={"Authorization": f"Bearer {settings.PHOTON_API_KEY}"}
            )
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
    return None


async def issue_photon_reward(user_id: str, amount: float, reason: str) -> Optional[str]:
    """Issue PAT tokens via Photon"""
    if not settings.PHOTON_API_KEY:
        # Mock for development
        return f"pat_{hashlib.sha256(f'{user_id}{amount}{reason}'.encode()).hexdigest()[:16]}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{settings.PHOTON_API_URL}/rewards",
                json={
                    "campaign_id": settings.PHOTON_CAMPAIGN_ID,
                    "user_id": user_id,
                    "amount": amount,
                    "reason": reason,
                },
                headers={"Authorization": f"Bearer {settings.PHOTON_API_KEY}"}
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("transaction_id")
        except Exception:
            pass
    return None


class RewardSummary(BaseModel):
    """Reward summary for frontend dashboard"""
    totalEarnings: float
    availableToClaim: float
    pendingRewards: float
    history: List[RewardTransaction]


@router.get("", response_model=RewardSummary)
@router.get("/", response_model=RewardSummary)
async def get_rewards_summary(
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
):
    """Get user's reward summary (main endpoint for frontend)"""
    
    # If no user (in dev mode), return empty summary
    if not current_user:
        return RewardSummary(totalEarnings=0.0, availableToClaim=0.0, pendingRewards=0.0, history=[])
    
    from src.models.proof import Proof, ProofStatus
    from src.models.agent import Agent
    
    # Calculate rewards from verified proofs
    verified_proofs = await db.scalar(
        select(func.count(Proof.id)).where(
            Proof.user_id == current_user.id,
            Proof.status == ProofStatus.VERIFIED
        )
    )
    
    # Calculate rewards from agent tasks
    agent_tasks = await db.scalar(
        select(func.sum(Agent.tasks_completed)).where(
            Agent.user_id == current_user.id
        )
    )
    
    # Calculate rewards
    proof_rewards = (verified_proofs or 0) * 10.0  # 10 PAT per verified proof
    task_rewards = (agent_tasks or 0) * 5.0  # 5 PAT per task
    
    total_earned = proof_rewards + task_rewards
    # Get claimed amount from settings JSONB
    user_settings = current_user.settings or {}
    total_claimed = float(user_settings.get('total_rewards_claimed', 0))
    available = max(0, total_earned - total_claimed)
    
    # Get recent transaction history (last 10)
    history = [
        RewardTransaction(
            id=str(uuid.uuid4()),
            type="earned",
            amount=proof_rewards,
            description="Proof verifications",
            source="proof_verification",
            created_at=datetime.utcnow(),
        ),
        RewardTransaction(
            id=str(uuid.uuid4()),
            type="earned",
            amount=task_rewards,
            description="Agent task completions",
            source="agent_task",
            created_at=datetime.utcnow(),
        ),
    ] if total_earned > 0 else []
    
    return RewardSummary(
        totalEarnings=total_earned,
        availableToClaim=available,
        pendingRewards=0.0,
        history=history,
    )


@router.get("/stats", response_model=RewardStats)
async def get_reward_stats(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get user's reward statistics"""
    from src.models.proof import Proof, ProofStatus
    from src.models.agent import Agent
    
    # Calculate rewards from verified proofs
    verified_proofs = await db.scalar(
        select(func.count(Proof.id)).where(
            Proof.user_id == current_user.id,
            Proof.status == ProofStatus.VERIFIED
        )
    )
    
    # Calculate rewards from agent tasks
    agent_tasks = await db.scalar(
        select(func.sum(Agent.tasks_completed)).where(
            Agent.user_id == current_user.id
        )
    )
    
    # Mock reward calculation (in production, query actual reward ledger)
    proof_rewards = (verified_proofs or 0) * 10.0  # 10 PAT per verified proof
    task_rewards = (agent_tasks or 0) * 5.0  # 5 PAT per task
    
    total_earned = proof_rewards + task_rewards
    # Get claimed amount from settings JSONB
    user_settings = current_user.settings or {}
    total_claimed = float(user_settings.get('total_rewards_claimed', 0))
    available = total_earned - total_claimed
    
    return RewardStats(
        total_earned=total_earned,
        total_claimed=total_claimed,
        available_balance=max(0, available),
        pending_rewards=0.0,  # Rewards that are earned but not yet finalized
        wallet_address=current_user.wallet_address,
        photon_user_id=user_settings.get('photon_user_id'),
    )


@router.get("/transactions", response_model=List[RewardTransaction])
async def get_reward_transactions(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,  # earned, claimed, spent
):
    """Get reward transaction history"""
    # In production, query actual reward transaction table
    # For now, generate mock transactions based on proofs
    from src.models.proof import Proof, ProofStatus
    
    result = await db.execute(
        select(Proof).where(
            Proof.user_id == current_user.id,
            Proof.status == ProofStatus.VERIFIED
        ).order_by(Proof.verified_at.desc()).limit(page_size)
    )
    proofs = result.scalars().all()
    
    transactions = []
    for proof in proofs:
        transactions.append(RewardTransaction(
            id=str(proof.id),
            type="earned",
            amount=10.0,
            description=f"Proof verification reward ({proof.proof_type.value})",
            source="proof_verification",
            tx_hash=proof.verification_tx_hash,
            created_at=proof.verified_at or proof.created_at,
        ))
    
    if type:
        transactions = [t for t in transactions if t.type == type]
    
    return transactions


@router.post("/claim", response_model=ClaimRewardResponse)
async def claim_rewards(
    request: ClaimRewardRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Claim available rewards"""
    
    # Get current stats
    stats = await get_reward_stats(current_user, db)
    
    if request.amount > stats.available_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Available: {stats.available_balance} PAT"
        )
    
    # Issue rewards via Photon
    tx_id = await issue_photon_reward(
        str(current_user.id),
        request.amount,
        "User claim request"
    )
    
    if not tx_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process reward claim"
        )
    
    # Update user's claimed amount in settings JSONB
    if current_user.settings is None:
        current_user.settings = {}
    current_claimed = float(current_user.settings.get('total_rewards_claimed', 0))
    current_user.settings['total_rewards_claimed'] = current_claimed + request.amount
    await db.commit()
    
    return ClaimRewardResponse(
        claim_id=tx_id,
        amount=request.amount,
        destination_address=request.destination_address,
        tx_hash=tx_id,
        status="completed",
        estimated_completion=datetime.utcnow(),
    )


@router.get("/achievements", response_model=List[Achievement])
async def get_achievements(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get user's achievements"""
    from src.models.proof import Proof, ProofStatus
    from src.models.agent import Agent
    
    # Get user's stats for achievement calculation
    verified_proofs = await db.scalar(
        select(func.count(Proof.id)).where(
            Proof.user_id == current_user.id,
            Proof.status == ProofStatus.VERIFIED
        )
    ) or 0
    
    total_agents = await db.scalar(
        select(func.count(Agent.id)).where(Agent.user_id == current_user.id)
    ) or 0
    
    achievements = [
        Achievement(
            id="first_proof",
            name="First Verification",
            description="Generate and verify your first ZK proof",
            icon="🎯",
            reward_amount=50.0,
            earned_at=datetime.utcnow() if verified_proofs >= 1 else None,
            progress=min(1.0, verified_proofs / 1),
            is_claimed=verified_proofs >= 1,
        ),
        Achievement(
            id="proof_master_10",
            name="Proof Master",
            description="Verify 10 proofs successfully",
            icon="🏆",
            reward_amount=200.0,
            earned_at=datetime.utcnow() if verified_proofs >= 10 else None,
            progress=min(1.0, verified_proofs / 10),
            is_claimed=verified_proofs >= 10,
        ),
        Achievement(
            id="proof_legend_100",
            name="Proof Legend",
            description="Verify 100 proofs successfully",
            icon="👑",
            reward_amount=1000.0,
            earned_at=datetime.utcnow() if verified_proofs >= 100 else None,
            progress=min(1.0, verified_proofs / 100),
            is_claimed=verified_proofs >= 100,
        ),
        Achievement(
            id="first_agent",
            name="Agent Creator",
            description="Register your first AI agent",
            icon="🤖",
            reward_amount=100.0,
            earned_at=datetime.utcnow() if total_agents >= 1 else None,
            progress=min(1.0, total_agents / 1),
            is_claimed=total_agents >= 1,
        ),
        Achievement(
            id="agent_squad",
            name="Agent Squad",
            description="Register 5 AI agents",
            icon="🦾",
            reward_amount=500.0,
            earned_at=datetime.utcnow() if total_agents >= 5 else None,
            progress=min(1.0, total_agents / 5),
            is_claimed=total_agents >= 5,
        ),
        Achievement(
            id="early_adopter",
            name="Early Adopter",
            description="Join VerifiAI in the early days",
            icon="⭐",
            reward_amount=100.0,
            earned_at=current_user.created_at,
            progress=1.0,
            is_claimed=True,
        ),
    ]
    
    return achievements


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    period: str = Query("all", regex="^(daily|weekly|monthly|all)$"),
    limit: int = Query(10, ge=1, le=100),
):
    """Get rewards leaderboard"""
    from src.models.proof import Proof, ProofStatus
    from src.models.user import User
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "daily":
        start_date = now - timedelta(days=1)
    elif period == "weekly":
        start_date = now - timedelta(days=7)
    elif period == "monthly":
        start_date = now - timedelta(days=30)
    else:
        start_date = None
    
    # Query top users by verified proofs
    query = (
        select(
            Proof.user_id,
            func.count(Proof.id).label("proofs_verified"),
        )
        .where(Proof.status == ProofStatus.VERIFIED)
        .group_by(Proof.user_id)
        .order_by(func.count(Proof.id).desc())
        .limit(limit)
    )
    
    if start_date:
        query = query.where(Proof.verified_at >= start_date)
    
    result = await db.execute(query)
    leaders = result.all()
    
    leaderboard = []
    for rank, (user_id, proofs_verified) in enumerate(leaders, 1):
        # Get user info
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        
        leaderboard.append(LeaderboardEntry(
            rank=rank,
            user_id=str(user_id),
            username=user.name if user else None,
            avatar_url=user.avatar_url if user else None,
            total_rewards=proofs_verified * 10.0,  # 10 PAT per proof
            proofs_verified=proofs_verified,
        ))
    
    return leaderboard


@router.post("/connect-wallet")
async def connect_wallet(
    wallet_address: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Connect a wallet for receiving rewards"""
    
    # Validate wallet address format (basic check)
    if not wallet_address.startswith("0x") or len(wallet_address) != 66:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Aptos wallet address"
        )
    
    current_user.wallet_address = wallet_address
    await db.commit()
    
    return {
        "status": "ok",
        "wallet_address": wallet_address,
    }


@router.post("/connect-photon")
async def connect_photon(
    photon_token: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Connect Photon account for embedded wallet"""
    
    # In production, verify token with Photon and get user ID
    photon_user = await get_photon_user(photon_token)
    
    if not photon_user:
        # For development, create mock connection
        photon_user_id = f"photon_{hashlib.sha256(str(current_user.id).encode()).hexdigest()[:16]}"
    else:
        photon_user_id = photon_user.get("id")
    
    # Store photon_user_id in settings JSONB
    if current_user.settings is None:
        current_user.settings = {}
    current_user.settings['photon_user_id'] = photon_user_id
    await db.commit()
    
    return {
        "status": "ok",
        "photon_user_id": photon_user_id,
    }
