"""Settlement schemas shared between routes and external consumers."""

from typing import Optional, List
from datetime import datetime
import uuid

from pydantic import BaseModel, Field

from src.models.settlement import SettlementStatus, AssetType

SettlementType = AssetType


class PartyInfo(BaseModel):
    """Party metadata used throughout settlement APIs."""
    address: str = Field(max_length=66)
    name: Optional[str] = None
    role: str
    has_signed: bool = False


class SettlementCreate(BaseModel):
    """Schema for creating a settlement via HTTP."""
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    settlement_type: SettlementType
    amount: float = Field(gt=0)
    currency: str = Field(default="USDC", max_length=10)
    parties: List[PartyInfo]
    required_proofs: List[str] = Field(default_factory=list)
    terms: Optional[dict] = None
    metadata: Optional[dict] = None


class SettlementUpdate(BaseModel):
    """Schema for updating a settlement."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    terms: Optional[dict] = None
    metadata: Optional[dict] = None


class SettlementApproval(BaseModel):
    """Schema for approving a settlement (legacy support)."""
    wallet_address: str = Field(max_length=66)
    signature: Optional[str] = None


class SettlementDispute(BaseModel):
    """Schema for disputing a settlement."""
    reason: str = Field(min_length=10, max_length=2000)


class SettlementResponse(BaseModel):
    """Schema for settlement responses returned by the API."""
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str]
    settlement_type: SettlementType
    status: SettlementStatus
    amount: float
    currency: str
    parties: List[PartyInfo]
    required_proofs: List[str]
    submitted_proofs: List[str]
    terms: Optional[dict]
    escrow_address: Optional[str]
    on_chain_id: Optional[str]
    tx_hash: Optional[str]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SettlementListResponse(BaseModel):
    """Paginated settlements list response."""
    items: List[SettlementResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SettlementStats(BaseModel):
    """Aggregate settlement statistics."""
    total: int
    pending: int
    completed: int
    disputed: int
    total_volume: float
    avg_settlement_time_hours: Optional[float]
