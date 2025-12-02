"""Swarm schemas shared between FastAPI routes and clients."""

from typing import Optional, List
from datetime import datetime
import uuid

from pydantic import BaseModel, Field

from src.models.swarm import SwarmStatus


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
