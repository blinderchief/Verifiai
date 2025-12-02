"""Proof routes with ZK proof generation and verification"""

from datetime import datetime
from typing import Optional, List
import uuid
import hashlib
import asyncio
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.api.routes.auth import CurrentUser, OptionalUser
from src.models.proof import Proof, ProofType, ProofStatus
from src.schemas.proof import (
    ProofCreate, ProofUpdate, ProofResponse, 
    ProofListResponse, ProofGenerateRequest, ProofVerifyRequest
)

router = APIRouter()


class ProofTypeFilter(str, Enum):
    ALL = "all"
    GROTH16 = "groth16"
    BULLETPROOFS = "bulletproofs"
    HYBRID = "hybrid"
    EZKL = "ezkl"


class ProofStatusFilter(str, Enum):
    ALL = "all"
    PENDING = "pending"
    GENERATING = "generating"
    VERIFIED = "verified"
    FAILED = "failed"


class ProofGenerateResponse(BaseModel):
    """Response for proof generation"""
    id: str
    status: str
    message: str
    estimated_time_seconds: int


class ProofVerifyResponse(BaseModel):
    """Response for proof verification"""
    id: str
    is_valid: bool
    verification_time_ms: int
    tx_hash: Optional[str] = None
    on_chain_id: Optional[str] = None


def compute_hash(data: str) -> str:
    """Compute SHA256 hash of data"""
    return "0x" + hashlib.sha256(data.encode()).hexdigest()


async def generate_proof_async(
    db: AsyncSession,
    proof_id: uuid.UUID,
    proof_type: ProofType,
    input_data: dict,
    model_hash: str,
):
    """Background task to generate ZK proof"""
    import time
    
    # Simulate proof generation with different times based on type
    generation_times = {
        ProofType.GROTH16: 5,
        ProofType.BULLETPROOFS: 3,
        ProofType.HYBRID: 7,
        ProofType.EZKL: 4,
    }
    
    try:
        # Update status to generating
        result = await db.execute(select(Proof).where(Proof.id == proof_id))
        proof = result.scalar_one()
        proof.status = ProofStatus.GENERATING
        await db.commit()
        
        # Simulate proof generation
        start_time = time.time()
        await asyncio.sleep(generation_times.get(proof_type, 5))
        
        # Generate mock proof data
        proof_data = {
            "circuit": proof_type.value,
            "proof": compute_hash(str(input_data) + str(time.time())),
            "public_inputs": [compute_hash(str(v)) for v in input_data.values()],
            "verification_key": compute_hash(model_hash),
        }
        
        generation_time_ms = int((time.time() - start_time) * 1000)
        
        # Update proof record
        proof.status = ProofStatus.SUBMITTED
        proof.proof_data = str(proof_data).encode()
        proof.public_inputs = proof_data["public_inputs"]
        proof.generation_time_ms = generation_time_ms
        proof.proof_size_bytes = len(str(proof_data))
        
        await db.commit()
        
    except Exception as e:
        result = await db.execute(select(Proof).where(Proof.id == proof_id))
        proof = result.scalar_one()
        proof.status = ProofStatus.FAILED
        proof.error_message = str(e)
        await db.commit()


async def verify_proof_on_chain(
    db: AsyncSession,
    proof_id: uuid.UUID,
):
    """Background task to verify proof on Aptos blockchain"""
    import time
    
    try:
        result = await db.execute(select(Proof).where(Proof.id == proof_id))
        proof = result.scalar_one()
        proof.status = ProofStatus.VERIFYING
        await db.commit()
        
        # Simulate blockchain verification
        start_time = time.time()
        await asyncio.sleep(2)
        
        verification_time_ms = int((time.time() - start_time) * 1000)
        
        # Mock transaction hash
        tx_hash = compute_hash(str(proof.id) + str(time.time()))
        on_chain_id = compute_hash(tx_hash)
        
        proof.status = ProofStatus.VERIFIED
        proof.is_verified = True
        proof.verified_at = datetime.utcnow()
        proof.verification_time_ms = verification_time_ms
        proof.verification_tx_hash = tx_hash
        proof.on_chain_id = on_chain_id
        
        await db.commit()
        
    except Exception as e:
        result = await db.execute(select(Proof).where(Proof.id == proof_id))
        proof = result.scalar_one()
        proof.status = ProofStatus.FAILED
        proof.error_message = str(e)
        await db.commit()


@router.get("", response_model=ProofListResponse)
async def list_proofs(
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    proof_type: ProofTypeFilter = ProofTypeFilter.ALL,
    status: ProofStatusFilter = ProofStatusFilter.ALL,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
):
    """List user's proofs with filtering and pagination"""
    
    # If no user (shouldn't happen in dev mode but handle it)
    if not current_user:
        return ProofListResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)
    
    # Base query
    query = select(Proof).where(Proof.user_id == current_user.id)
    count_query = select(func.count(Proof.id)).where(Proof.user_id == current_user.id)
    
    # Apply filters
    if proof_type != ProofTypeFilter.ALL:
        query = query.where(Proof.proof_type == ProofType(proof_type.value))
        count_query = count_query.where(Proof.proof_type == ProofType(proof_type.value))
    
    if status != ProofStatusFilter.ALL:
        query = query.where(Proof.status == ProofStatus(status.value))
        count_query = count_query.where(Proof.status == ProofStatus(status.value))
    
    if search:
        search_filter = or_(
            Proof.model_name.ilike(f"%{search}%"),
            Proof.model_hash.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Get total count
    total = await db.scalar(count_query)
    
    # Apply sorting
    sort_column = getattr(Proof, sort_by, Proof.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    proofs = result.scalars().all()
    
    return ProofListResponse(
        items=[ProofResponse.model_validate(p) for p in proofs],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=(total or 0 + page_size - 1) // page_size,
    )


@router.get("/{proof_id}", response_model=ProofResponse)
async def get_proof(
    proof_id: uuid.UUID,
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific proof"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authentication required")
    
    result = await db.execute(
        select(Proof).where(
            Proof.id == proof_id,
            Proof.user_id == current_user.id
        )
    )
    proof = result.scalar_one_or_none()
    
    if not proof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proof not found"
        )
    
    return proof


@router.post("", response_model=ProofResponse, status_code=status.HTTP_201_CREATED)
async def create_proof(
    proof_data: ProofCreate,
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new proof record"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authentication required")
    
    proof = Proof(
        user_id=current_user.id,
        proof_type=proof_data.proof_type,
        model_hash=proof_data.model_hash,
        model_name=proof_data.model_name,
        input_hash=proof_data.input_hash,
        output_hash=proof_data.output_hash,
        agent_id=proof_data.agent_id,
        inference_metadata=proof_data.inference_metadata,
        status=ProofStatus.PENDING,
    )
    
    db.add(proof)
    await db.commit()
    await db.refresh(proof)
    
    return proof


@router.post("/generate", response_model=ProofGenerateResponse)
async def generate_proof(
    request: ProofGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
):
    """Generate a ZK proof for AI inference"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authentication required")
    
    # Compute hashes
    input_hash = compute_hash(str(request.input_data))
    output_hash = compute_hash(str(request.input_data) + "inference_output")
    model_hash = compute_hash(str(request.model_id))
    
    # Create proof record
    proof = Proof(
        user_id=current_user.id,
        proof_type=request.proof_type,
        model_hash=model_hash,
        input_hash=input_hash,
        output_hash=output_hash,
        status=ProofStatus.PENDING,
        inference_metadata=request.input_data,
    )
    
    db.add(proof)
    await db.commit()
    await db.refresh(proof)
    
    # Estimate generation time
    generation_times = {
        ProofType.GROTH16: 5,
        ProofType.BULLETPROOFS: 3,
        ProofType.HYBRID: 7,
        ProofType.EZKL: 4,
    }
    
    if request.generate_proof:
        # Queue background proof generation
        background_tasks.add_task(
            generate_proof_async,
            db,
            proof.id,
            request.proof_type,
            request.input_data,
            model_hash,
        )
    
    return ProofGenerateResponse(
        id=str(proof.id),
        status="queued",
        message="Proof generation started",
        estimated_time_seconds=generation_times.get(request.proof_type, 5),
    )


@router.post("/{proof_id}/verify", response_model=ProofVerifyResponse)
async def verify_proof(
    proof_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
    submit_on_chain: bool = False,
):
    """Verify a proof and optionally submit to blockchain"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authentication required")
    
    result = await db.execute(
        select(Proof).where(
            Proof.id == proof_id,
            Proof.user_id == current_user.id
        )
    )
    proof = result.scalar_one_or_none()
    
    if not proof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proof not found"
        )
    
    if proof.status not in [ProofStatus.SUBMITTED, ProofStatus.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Proof cannot be verified in status: {proof.status.value}"
        )
    
    if submit_on_chain:
        background_tasks.add_task(verify_proof_on_chain, db, proof.id)
        
        return ProofVerifyResponse(
            id=str(proof.id),
            is_valid=True,
            verification_time_ms=0,
            tx_hash=None,
            on_chain_id=None,
        )
    
    # Quick local verification
    import time
    start = time.time()
    await asyncio.sleep(0.1)  # Simulate verification
    verification_time_ms = int((time.time() - start) * 1000)
    
    return ProofVerifyResponse(
        id=str(proof.id),
        is_valid=True,
        verification_time_ms=verification_time_ms,
    )


@router.delete("/{proof_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proof(
    proof_id: uuid.UUID,
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
):
    """Delete a proof"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authentication required")
    
    result = await db.execute(
        select(Proof).where(
            Proof.id == proof_id,
            Proof.user_id == current_user.id
        )
    )
    proof = result.scalar_one_or_none()
    
    if not proof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proof not found"
        )
    
    if proof.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a verified proof"
        )
    
    await db.delete(proof)
    await db.commit()


@router.get("/stats/summary")
async def get_proof_stats(
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
):
    """Get proof statistics summary"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authentication required")
    
    total = await db.scalar(
        select(func.count(Proof.id)).where(Proof.user_id == current_user.id)
    )
    
    verified = await db.scalar(
        select(func.count(Proof.id)).where(
            Proof.user_id == current_user.id,
            Proof.status == ProofStatus.VERIFIED
        )
    )
    
    pending = await db.scalar(
        select(func.count(Proof.id)).where(
            Proof.user_id == current_user.id,
            Proof.status.in_([ProofStatus.PENDING, ProofStatus.GENERATING, ProofStatus.SUBMITTED])
        )
    )
    
    failed = await db.scalar(
        select(func.count(Proof.id)).where(
            Proof.user_id == current_user.id,
            Proof.status == ProofStatus.FAILED
        )
    )
    
    # Count by type
    type_counts = {}
    for pt in ProofType:
        count = await db.scalar(
            select(func.count(Proof.id)).where(
                Proof.user_id == current_user.id,
                Proof.proof_type == pt
            )
        )
        type_counts[pt.value] = count or 0
    
    # Average generation time
    avg_gen_time = await db.scalar(
        select(func.avg(Proof.generation_time_ms)).where(
            Proof.user_id == current_user.id,
            Proof.generation_time_ms.isnot(None)
        )
    )
    
    return {
        "total": total or 0,
        "verified": verified or 0,
        "pending": pending or 0,
        "failed": failed or 0,
        "by_type": type_counts,
        "avg_generation_time_ms": int(avg_gen_time or 0),
        "verification_rate": round((verified or 0) / (total or 1) * 100, 2),
    }
