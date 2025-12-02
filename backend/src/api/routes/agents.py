"""Agent routes for AI agent management"""

from datetime import datetime
from typing import Optional, List
import uuid
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.api.routes.auth import CurrentUser, OptionalUser
from src.models.agent import Agent, AgentCapability, AgentStatus

router = APIRouter()


class AgentCreate(BaseModel):
    """Create agent request - matches database schema"""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    capabilities: List[str] = Field(default_factory=list)
    model_id: Optional[uuid.UUID] = None
    is_public: bool = False
    config: Optional[dict] = None


class AgentUpdate(BaseModel):
    """Update agent request"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    avatar_url: Optional[str] = None
    capabilities: Optional[List[str]] = None
    status: Optional[AgentStatus] = None
    model_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    config: Optional[dict] = None


class AgentResponse(BaseModel):
    """Agent response - matches database schema"""
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: Optional[str]
    avatar_url: Optional[str]
    status: AgentStatus
    capabilities: List[str]
    model_id: Optional[uuid.UUID]
    model_hash: Optional[str]
    on_chain_id: Optional[str]
    metadata_uri: Optional[str]
    shelby_blob_id: Optional[str]
    total_tasks: int
    successful_tasks: int
    failed_tasks: int
    total_proofs: int
    verified_proofs: int
    reputation: int
    is_active: bool
    is_public: bool
    created_at: datetime
    updated_at: datetime
    
    # Computed property
    @property
    def success_rate(self) -> float:
        if self.total_tasks == 0:
            return 0.0
        return (self.successful_tasks / self.total_tasks) * 100
    
    class Config:
        from_attributes = True


class AgentListResponse(BaseModel):
    """Paginated agent list"""
    items: List[AgentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AgentStats(BaseModel):
    """Agent statistics"""
    total_agents: int
    active_agents: int
    total_tasks: int
    success_rate: float
    avg_reputation: float


@router.get("", response_model=AgentListResponse)
async def list_agents(
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = None,
    status: Optional[AgentStatus] = None,
    search: Optional[str] = None,
):
    """List user's agents with filtering"""
    
    if not current_user:
        return AgentListResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)
    
    query = select(Agent).where(Agent.owner_id == current_user.id)
    count_query = select(func.count(Agent.id)).where(Agent.owner_id == current_user.id)
    
    if status:
        query = query.where(Agent.status == status)
        count_query = count_query.where(Agent.status == status)
    
    if is_active is not None:
        query = query.where(Agent.is_active == is_active)
        count_query = count_query.where(Agent.is_active == is_active)
    
    if search:
        search_filter = or_(
            Agent.name.ilike(f"%{search}%"),
            Agent.description.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    total = await db.scalar(count_query)
    
    offset = (page - 1) * page_size
    query = query.order_by(Agent.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    agents = result.scalars().all()
    
    return AgentListResponse(
        items=[AgentResponse.model_validate(a) for a in agents],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )


@router.get("/stats", response_model=AgentStats)
async def get_agent_stats(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get agent statistics"""
    
    total = await db.scalar(
        select(func.count(Agent.id)).where(Agent.owner_id == current_user.id)
    )
    
    active = await db.scalar(
        select(func.count(Agent.id)).where(
            Agent.owner_id == current_user.id,
            Agent.is_active == True
        )
    )
    
    total_tasks = await db.scalar(
        select(func.sum(Agent.successful_tasks + Agent.failed_tasks)).where(
            Agent.owner_id == current_user.id
        )
    )
    
    total_success = await db.scalar(
        select(func.sum(Agent.successful_tasks)).where(
            Agent.owner_id == current_user.id
        )
    )
    
    avg_rep = await db.scalar(
        select(func.avg(Agent.reputation)).where(
            Agent.owner_id == current_user.id
        )
    )
    
    success_rate = 0.0
    if total_tasks and total_tasks > 0:
        success_rate = round((total_success or 0) / total_tasks * 100, 2)
    
    return AgentStats(
        total_agents=total or 0,
        active_agents=active or 0,
        total_tasks=total_tasks or 0,
        success_rate=success_rate,
        avg_reputation=round(avg_rep or 0, 2),
    )


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific agent"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    return agent


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    data: AgentCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Register a new AI agent"""
    
    # Check for duplicate name
    existing = await db.execute(
        select(Agent).where(
            Agent.owner_id == current_user.id,
            Agent.name == data.name
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An agent with this name already exists"
        )
    
    agent = Agent(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        capabilities=data.capabilities,
        model_id=data.model_id,
        is_public=data.is_public,
        config=data.config,
        status=AgentStatus.IDLE,
        is_active=True,
    )
    
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    
    return agent


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: uuid.UUID,
    data: AgentUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update an agent"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(agent, key, value)
    
    await db.commit()
    await db.refresh(agent)
    
    return agent


@router.post("/{agent_id}/status")
async def update_agent_status(
    agent_id: uuid.UUID,
    status_update: dict,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update agent status (active/inactive)"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    new_status = status_update.get("status")
    if new_status == "active":
        agent.is_active = True
        agent.status = AgentStatus.ACTIVE
    elif new_status == "inactive":
        agent.is_active = False
        agent.status = AgentStatus.OFFLINE
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be 'active' or 'inactive'"
        )
    
    await db.commit()
    await db.refresh(agent)
    
    return {"success": True}


@router.post("/{agent_id}/activate", response_model=AgentResponse)
async def activate_agent(
    agent_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Activate an agent"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    agent.is_active = True
    agent.status = AgentStatus.ACTIVE
    await db.commit()
    await db.refresh(agent)
    
    return agent


@router.post("/{agent_id}/start", response_model=AgentResponse)
async def start_agent(
    agent_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Start an agent (alias for activate)"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    agent.is_active = True
    agent.status = AgentStatus.ACTIVE
    await db.commit()
    await db.refresh(agent)
    
    return agent


@router.post("/{agent_id}/stop", response_model=AgentResponse)
async def stop_agent(
    agent_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Stop an agent (alias for deactivate)"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    agent.is_active = False
    agent.status = AgentStatus.OFFLINE
    await db.commit()
    await db.refresh(agent)
    
    return agent


@router.post("/{agent_id}/deactivate", response_model=AgentResponse)
async def deactivate_agent(
    agent_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Deactivate an agent"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    agent.is_active = False
    agent.status = AgentStatus.OFFLINE
    await db.commit()
    await db.refresh(agent)
    
    return agent


@router.post("/{agent_id}/heartbeat")
async def agent_heartbeat(
    agent_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update agent heartbeat - sets status to active and updates updated_at"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Use updated_at as heartbeat indicator (triggers on any change)
    agent.status = AgentStatus.ACTIVE
    await db.commit()
    await db.refresh(agent)
    
    return {"status": "ok", "timestamp": agent.updated_at}


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Delete an agent"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Don't allow deletion of on-chain registered agents
    if agent.on_chain_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an on-chain registered agent"
        )
    
    await db.delete(agent)
    await db.commit()
