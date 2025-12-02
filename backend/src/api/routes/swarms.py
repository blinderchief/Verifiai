"""Swarm routes for multi-agent coordination"""

from datetime import datetime
from typing import Optional, List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.api.routes.auth import CurrentUser, OptionalUser
from src.models.swarm import Swarm, SwarmStatus
from src.models.agent import Agent

router = APIRouter()


# --- Schemas ---

class SwarmAgentInfo(BaseModel):
    """Thin agent representation embedded in swarm API responses."""
    id: uuid.UUID
    name: str
    status: str
    reputation_score: float


class SwarmCreate(BaseModel):
    """Schema for creating a swarm."""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    agent_ids: List[uuid.UUID] = Field(min_length=1)
    coordinator_type: str = "consensus"
    task_type: str = "inference"
    min_consensus: float = Field(default=0.67, ge=0.5, le=1.0)
    config: Optional[dict] = None


class SwarmUpdate(BaseModel):
    """Schema for updating a swarm."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    coordinator_type: Optional[str] = None
    min_consensus: Optional[float] = Field(default=None, ge=0.5, le=1.0)
    config: Optional[dict] = None


class SwarmResponse(BaseModel):
    """Schema for swarm responses returned by the API."""
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: Optional[str]
    status: SwarmStatus
    coordinator_type: str
    task_type: str
    min_consensus: float
    agent_count: int
    tasks_completed: int
    current_task_id: Optional[str]
    on_chain_id: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    agents: Optional[List[SwarmAgentInfo]] = None

    class Config:
        from_attributes = True


class SwarmListResponse(BaseModel):
    """Paginated swarm list response."""
    items: List[SwarmResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SwarmTaskRequest(BaseModel):
    """Schema for submitting a task to a swarm."""
    task_type: str
    input_data: dict
    require_proof: bool = True
    timeout_seconds: int = Field(default=300, ge=10, le=3600)


class SwarmTaskResponse(BaseModel):
    """Schema returned when tracking swarm task execution."""
    task_id: str
    swarm_id: uuid.UUID
    status: str
    participating_agents: int
    created_at: datetime


# --- Helper functions ---

async def get_agents_for_swarm(db: AsyncSession, agent_ids: List[uuid.UUID]) -> List[Agent]:
    """Fetch agents by IDs"""
    if not agent_ids:
        return []
    result = await db.execute(
        select(Agent).where(Agent.id.in_(agent_ids))
    )
    return list(result.scalars().all())


def build_swarm_response(swarm: Swarm, agents: Optional[List[Agent]] = None) -> SwarmResponse:
    """Build SwarmResponse from model and optional agents list"""
    agent_infos = None
    if agents is not None:
        agent_infos = [
            SwarmAgentInfo(
                id=a.id,
                name=a.name,
                status=a.status.value,
                reputation_score=a.reputation_score
            ) for a in agents
        ]
    
    return SwarmResponse(
        id=swarm.id,
        owner_id=swarm.owner_id,
        name=swarm.name,
        description=swarm.description,
        status=swarm.status,
        coordinator_type=swarm.coordinator_type,
        task_type=swarm.task_type,
        min_consensus=swarm.min_consensus,
        agent_count=swarm.agent_count,
        tasks_completed=swarm.completed_tasks,
        current_task_id=swarm.current_task_id,
        on_chain_id=swarm.on_chain_id,
        is_active=swarm.is_active,
        created_at=swarm.created_at,
        updated_at=swarm.updated_at,
        agents=agent_infos,
    )


# --- Routes ---

@router.get("", response_model=SwarmListResponse)
async def list_swarms(
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[SwarmStatus] = None,
    search: Optional[str] = None,
):
    """List user's swarms"""
    
    # If no user (in dev mode), return empty list
    if not current_user:
        return SwarmListResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)
    
    query = select(Swarm).where(Swarm.owner_id == current_user.id)
    count_query = select(func.count(Swarm.id)).where(Swarm.owner_id == current_user.id)
    
    if status:
        query = query.where(Swarm.status == status)
        count_query = count_query.where(Swarm.status == status)
    
    if search:
        query = query.where(Swarm.name.ilike(f"%{search}%"))
        count_query = count_query.where(Swarm.name.ilike(f"%{search}%"))
    
    total = await db.scalar(count_query)
    
    offset = (page - 1) * page_size
    query = query.order_by(Swarm.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    swarms = result.scalars().all()
    
    # Fetch agents for all swarms
    all_agent_ids = set()
    for swarm in swarms:
        if swarm.agent_ids:
            all_agent_ids.update(swarm.agent_ids)
    
    agents_by_id = {}
    if all_agent_ids:
        agents = await get_agents_for_swarm(db, list(all_agent_ids))
        agents_by_id = {a.id: a for a in agents}
    
    items = []
    for swarm in swarms:
        swarm_agents = [agents_by_id[aid] for aid in (swarm.agent_ids or []) if aid in agents_by_id]
        items.append(build_swarm_response(swarm, swarm_agents))
    
    return SwarmListResponse(
        items=items,
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )


@router.get("/{swarm_id}", response_model=SwarmResponse)
async def get_swarm(
    swarm_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific swarm"""
    result = await db.execute(
        select(Swarm).where(
            Swarm.id == swarm_id,
            Swarm.owner_id == current_user.id
        )
    )
    swarm = result.scalar_one_or_none()
    
    if not swarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swarm not found"
        )
    
    agents = await get_agents_for_swarm(db, swarm.agent_ids or [])
    return build_swarm_response(swarm, agents)


@router.post("", response_model=SwarmResponse, status_code=status.HTTP_201_CREATED)
async def create_swarm(
    data: SwarmCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new swarm"""
    
    # Verify all agents belong to user and are active
    result = await db.execute(
        select(Agent).where(
            Agent.id.in_(data.agent_ids),
            Agent.owner_id == current_user.id
        )
    )
    agents = list(result.scalars().all())
    
    if len(agents) != len(data.agent_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more agents not found or not owned by user"
        )
    
    inactive_agents = [a for a in agents if not a.is_active]
    if inactive_agents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agents must be active: {[a.name for a in inactive_agents]}"
        )
    
    # Build config with task_type and min_consensus
    config = data.config or {}
    config["task_type"] = data.task_type
    config["min_consensus"] = data.min_consensus
    
    swarm = Swarm(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        coordinator_type=data.coordinator_type,
        agent_ids=list(data.agent_ids),
        config=config,
        status=SwarmStatus.IDLE,
        is_active=True,
    )
    
    db.add(swarm)
    await db.commit()
    await db.refresh(swarm)
    
    return build_swarm_response(swarm, agents)


@router.put("/{swarm_id}", response_model=SwarmResponse)
async def update_swarm(
    swarm_id: uuid.UUID,
    data: SwarmUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update a swarm"""
    result = await db.execute(
        select(Swarm).where(
            Swarm.id == swarm_id,
            Swarm.owner_id == current_user.id
        )
    )
    swarm = result.scalar_one_or_none()
    
    if not swarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swarm not found"
        )
    
    if swarm.status == SwarmStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update swarm while it's processing"
        )
    
    # Update direct fields
    if data.name is not None:
        swarm.name = data.name
    if data.description is not None:
        swarm.description = data.description
    if data.coordinator_type is not None:
        swarm.coordinator_type = data.coordinator_type
    
    # Update config-based fields
    if data.min_consensus is not None:
        swarm.min_consensus = data.min_consensus
    if data.config is not None:
        existing_config = swarm.config or {}
        existing_config.update(data.config)
        swarm.config = existing_config
    
    await db.commit()
    await db.refresh(swarm)
    
    agents = await get_agents_for_swarm(db, swarm.agent_ids or [])
    return build_swarm_response(swarm, agents)


@router.post("/{swarm_id}/agents/{agent_id}")
async def add_agent_to_swarm(
    swarm_id: uuid.UUID,
    agent_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Add an agent to a swarm"""
    result = await db.execute(
        select(Swarm).where(
            Swarm.id == swarm_id,
            Swarm.owner_id == current_user.id
        )
    )
    swarm = result.scalar_one_or_none()
    
    if not swarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swarm not found"
        )
    
    agent_result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == current_user.id
        )
    )
    agent = agent_result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    current_ids = swarm.agent_ids or []
    if agent_id in current_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent already in swarm"
        )
    
    swarm.agent_ids = current_ids + [agent_id]
    await db.commit()
    
    return {"status": "ok", "agent_count": len(swarm.agent_ids)}


@router.delete("/{swarm_id}/agents/{agent_id}")
async def remove_agent_from_swarm(
    swarm_id: uuid.UUID,
    agent_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Remove an agent from a swarm"""
    result = await db.execute(
        select(Swarm).where(
            Swarm.id == swarm_id,
            Swarm.owner_id == current_user.id
        )
    )
    swarm = result.scalar_one_or_none()
    
    if not swarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swarm not found"
        )
    
    current_ids = swarm.agent_ids or []
    if agent_id not in current_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not in swarm"
        )
    
    if len(current_ids) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Swarm must have at least one agent"
        )
    
    swarm.agent_ids = [aid for aid in current_ids if aid != agent_id]
    await db.commit()
    
    return {"status": "ok", "agent_count": len(swarm.agent_ids)}


@router.post("/{swarm_id}/tasks", response_model=SwarmTaskResponse)
async def submit_task_to_swarm(
    swarm_id: uuid.UUID,
    task: SwarmTaskRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Submit a task to a swarm for execution"""
    result = await db.execute(
        select(Swarm).where(
            Swarm.id == swarm_id,
            Swarm.owner_id == current_user.id
        )
    )
    swarm = result.scalar_one_or_none()
    
    if not swarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swarm not found"
        )
    
    if swarm.status == SwarmStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Swarm is already processing a task"
        )
    
    # Get active agents
    agents = await get_agents_for_swarm(db, swarm.agent_ids or [])
    active_agents = [a for a in agents if a.is_active]
    
    if not active_agents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active agents in swarm"
        )
    
    # Create task
    task_id = str(uuid.uuid4())
    swarm.status = SwarmStatus.PROCESSING
    swarm.current_task_id = task_id
    await db.commit()
    
    return SwarmTaskResponse(
        task_id=task_id,
        swarm_id=swarm.id,
        status="submitted",
        participating_agents=len(active_agents),
        created_at=datetime.utcnow(),
    )


@router.delete("/{swarm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_swarm(
    swarm_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Delete a swarm"""
    result = await db.execute(
        select(Swarm).where(
            Swarm.id == swarm_id,
            Swarm.owner_id == current_user.id
        )
    )
    swarm = result.scalar_one_or_none()
    
    if not swarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swarm not found"
        )
    
    if swarm.status == SwarmStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete swarm while it's processing"
        )
    
    await db.delete(swarm)
    await db.commit()
