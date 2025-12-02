"""Agent schemas"""

from typing import Optional
from datetime import datetime
from enum import Enum
import uuid

from pydantic import BaseModel, Field


class AgentStatus(str, Enum):
    """Agent status enum"""
    ACTIVE = "active"
    IDLE = "idle"
    BUSY = "busy"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class AgentCapability(str, Enum):
    """Agent capability enum"""
    INFERENCE = "inference"
    RWA_SETTLEMENT = "rwa_settlement"
    CONTENT_VERIFICATION = "content_verification"
    ROYALTY_PROCESSING = "royalty_processing"
    DATA_ANALYSIS = "data_analysis"
    SWARM_COORDINATION = "swarm_coordination"
    IMAGE_CLASSIFICATION = "image_classification"
    TEXT_GENERATION = "text_generation"
    SENTIMENT_ANALYSIS = "sentiment_analysis"


class AgentCreate(BaseModel):
    """Schema for creating an agent"""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    capabilities: list[AgentCapability] = Field(default_factory=list)
    model_id: Optional[uuid.UUID] = None
    is_public: bool = False
    config: Optional[dict] = None


class AgentUpdate(BaseModel):
    """Schema for updating an agent"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    avatar_url: Optional[str] = None
    capabilities: Optional[list[AgentCapability]] = None
    status: Optional[AgentStatus] = None
    model_id: Optional[uuid.UUID] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None
    config: Optional[dict] = None


class AgentResponse(BaseModel):
    """Schema for agent response"""
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: Optional[str]
    avatar_url: Optional[str]
    status: AgentStatus
    capabilities: list[str]
    model_id: Optional[uuid.UUID]
    model_hash: Optional[str]
    on_chain_id: Optional[str]
    metadata_uri: Optional[str]
    total_tasks: int
    successful_tasks: int
    failed_tasks: int
    total_proofs: int
    verified_proofs: int
    reputation: int
    success_rate: float
    is_active: bool
    is_public: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AgentListResponse(BaseModel):
    """Schema for paginated agent list"""
    items: list[AgentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AgentStats(BaseModel):
    """Schema for agent statistics"""
    total_agents: int
    active_agents: int
    total_tasks_completed: int
    avg_success_rate: float
    agents_by_status: dict[str, int]
