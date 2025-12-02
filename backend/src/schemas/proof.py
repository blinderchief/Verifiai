"""Proof schemas"""

from typing import Optional, Any
from datetime import datetime
from enum import Enum
import uuid

from pydantic import BaseModel, Field


class ProofType(str, Enum):
    """Proof type enum"""
    GROTH16 = "groth16"
    BULLETPROOFS = "bulletproofs"
    HYBRID = "hybrid"
    EZKL = "ezkl"


class ProofStatus(str, Enum):
    """Proof status enum"""
    PENDING = "pending"
    GENERATING = "generating"
    SUBMITTED = "submitted"
    VERIFYING = "verifying"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"
    FAILED = "failed"


class ProofCreate(BaseModel):
    """Schema for creating a proof record"""
    proof_type: ProofType = ProofType.GROTH16
    model_hash: str = Field(max_length=66)
    model_name: Optional[str] = Field(default=None, max_length=255)
    input_hash: str = Field(max_length=66)
    output_hash: str = Field(max_length=66)
    agent_id: Optional[uuid.UUID] = None
    inference_metadata: Optional[dict] = None


class ProofUpdate(BaseModel):
    """Schema for updating a proof"""
    status: Optional[ProofStatus] = None
    error_message: Optional[str] = None


class ProofGenerateRequest(BaseModel):
    """Schema for proof generation request"""
    proof_type: ProofType = ProofType.GROTH16
    model_id: uuid.UUID
    input_data: dict = Field(description="Input data for inference")
    generate_proof: bool = True
    store_on_chain: bool = False


class ProofVerifyRequest(BaseModel):
    """Schema for proof verification request"""
    proof_id: uuid.UUID
    submit_on_chain: bool = False


class ProofResponse(BaseModel):
    """Schema for proof response"""
    id: uuid.UUID
    user_id: uuid.UUID
    agent_id: Optional[uuid.UUID]
    proof_type: ProofType
    status: ProofStatus
    model_hash: str
    model_name: Optional[str]
    input_hash: str
    output_hash: str
    is_verified: bool
    verified_at: Optional[str]
    verification_tx_hash: Optional[str]
    on_chain_id: Optional[str]
    shelby_blob_id: Optional[str]
    generation_time_ms: Optional[int]
    verification_time_ms: Optional[int]
    proof_size_bytes: Optional[int]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProofListResponse(BaseModel):
    """Schema for paginated proof list"""
    items: list[ProofResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProofStats(BaseModel):
    """Schema for proof statistics"""
    total_proofs: int
    verified_proofs: int
    pending_proofs: int
    failed_proofs: int
    avg_generation_time_ms: float
    avg_verification_time_ms: float
    proofs_by_type: dict[str, int]
