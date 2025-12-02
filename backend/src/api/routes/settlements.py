"""Settlement routes for RWA transactions"""

from datetime import datetime
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.api.routes.auth import CurrentUser, OptionalUser
from src.models.settlement import Settlement, SettlementStatus, AssetType
from src.schemas.settlement import (
    SettlementCreate,
    SettlementUpdate,
    SettlementResponse,
    SettlementListResponse,
    SettlementStats,
    PartyInfo,
)

router = APIRouter()


# Alias for API compatibility
SettlementType = AssetType


@router.get("", response_model=SettlementListResponse)
async def list_settlements(
    current_user: OptionalUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    settlement_type: Optional[SettlementType] = None,
    status: Optional[SettlementStatus] = None,
    search: Optional[str] = None,
):
    """List user's settlements"""
    
    # If no user (in dev mode), return empty list
    if not current_user:
        return SettlementListResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)
    
    query = select(Settlement).where(Settlement.user_id == current_user.id)
    count_query = select(func.count(Settlement.id)).where(Settlement.user_id == current_user.id)
    
    if settlement_type:
        query = query.where(Settlement.settlement_type == settlement_type)
        count_query = count_query.where(Settlement.settlement_type == settlement_type)
    
    if status:
        query = query.where(Settlement.status == status)
        count_query = count_query.where(Settlement.status == status)
    
    if search:
        query = query.where(Settlement.title.ilike(f"%{search}%"))
        count_query = count_query.where(Settlement.title.ilike(f"%{search}%"))
    
    total = await db.scalar(count_query)
    
    offset = (page - 1) * page_size
    query = query.order_by(Settlement.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    settlements = result.scalars().all()
    
    items = []
    for s in settlements:
        items.append(SettlementResponse(
            id=s.id,
            user_id=s.user_id,
            title=s.title,
            description=s.description,
            settlement_type=s.settlement_type,
            status=s.status,
            amount=s.amount,
            currency=s.currency,
            parties=[PartyInfo(**p) for p in (s.parties or [])],
            required_proofs=s.required_proofs or [],
            submitted_proofs=s.submitted_proofs or [],
            terms=s.terms,
            escrow_address=s.escrow_address,
            on_chain_id=s.on_chain_id,
            tx_hash=s.tx_hash,
            completed_at=s.completed_at,
            created_at=s.created_at,
            updated_at=s.updated_at,
        ))
    
    return SettlementListResponse(
        items=items,
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )


@router.get("/stats", response_model=SettlementStats)
async def get_settlement_stats(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get settlement statistics"""
    
    total = await db.scalar(
        select(func.count(Settlement.id)).where(Settlement.user_id == current_user.id)
    )
    
    pending = await db.scalar(
        select(func.count(Settlement.id)).where(
            Settlement.user_id == current_user.id,
            Settlement.status.in_([
                SettlementStatus.PENDING,
                SettlementStatus.PROCESSING,
                SettlementStatus.READY,
            ])
        )
    )
    
    completed = await db.scalar(
        select(func.count(Settlement.id)).where(
            Settlement.user_id == current_user.id,
            Settlement.status == SettlementStatus.COMPLETED
        )
    )
    
    disputed = await db.scalar(
        select(func.count(Settlement.id)).where(
            Settlement.user_id == current_user.id,
            Settlement.status == SettlementStatus.FAILED
        )
    )
    
    total_volume = await db.scalar(
        select(func.sum(Settlement.amount)).where(
            Settlement.user_id == current_user.id,
            Settlement.status == SettlementStatus.COMPLETED
        )
    )
    
    return SettlementStats(
        total=total or 0,
        pending=pending or 0,
        completed=completed or 0,
        disputed=disputed or 0,
        total_volume=total_volume or 0.0,
        avg_settlement_time_hours=None,  # TODO: Calculate from completed settlements
    )


@router.get("/{settlement_id}", response_model=SettlementResponse)
async def get_settlement(
    settlement_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific settlement"""
    result = await db.execute(
        select(Settlement).where(
            Settlement.id == settlement_id,
            Settlement.user_id == current_user.id
        )
    )
    settlement = result.scalar_one_or_none()
    
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settlement not found"
        )
    
    return SettlementResponse(
        id=settlement.id,
        user_id=settlement.user_id,
        title=settlement.title,
        description=settlement.description,
        settlement_type=settlement.settlement_type,
        status=settlement.status,
        amount=settlement.amount,
        currency=settlement.currency,
        parties=[PartyInfo(**p) for p in (settlement.parties or [])],
        required_proofs=settlement.required_proofs or [],
        submitted_proofs=settlement.submitted_proofs or [],
        terms=settlement.terms,
        escrow_address=settlement.escrow_address,
        on_chain_id=settlement.on_chain_id,
        tx_hash=settlement.tx_hash,
        completed_at=settlement.completed_at,
        created_at=settlement.created_at,
        updated_at=settlement.updated_at,
    )


@router.post("", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
async def create_settlement(
    data: SettlementCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new settlement"""
    
    if len(data.parties) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settlement requires at least 2 parties"
        )
    
    settlement = Settlement(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        settlement_type=data.settlement_type,
        amount=data.amount,
        currency=data.currency,
        parties=[p.model_dump() for p in data.parties],
        required_proofs=data.required_proofs,
        terms=data.terms,
        metadata=data.metadata,
        status=SettlementStatus.PENDING,
    )
    
    db.add(settlement)
    await db.commit()
    await db.refresh(settlement)
    
    return SettlementResponse(
        id=settlement.id,
        user_id=settlement.user_id,
        title=settlement.title,
        description=settlement.description,
        settlement_type=settlement.settlement_type,
        status=settlement.status,
        amount=settlement.amount,
        currency=settlement.currency,
        parties=[PartyInfo(**p) for p in (settlement.parties or [])],
        required_proofs=settlement.required_proofs or [],
        submitted_proofs=[],
        terms=settlement.terms,
        escrow_address=None,
        on_chain_id=None,
        tx_hash=None,
        completed_at=None,
        created_at=settlement.created_at,
        updated_at=settlement.updated_at,
    )


@router.put("/{settlement_id}", response_model=SettlementResponse)
async def update_settlement(
    settlement_id: uuid.UUID,
    data: SettlementUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update a settlement"""
    result = await db.execute(
        select(Settlement).where(
            Settlement.id == settlement_id,
            Settlement.user_id == current_user.id
        )
    )
    settlement = result.scalar_one_or_none()
    
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settlement not found"
        )
    
    if settlement.status not in [SettlementStatus.PENDING, SettlementStatus.DRAFT]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update settlement in current status"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settlement, key, value)
    
    await db.commit()
    await db.refresh(settlement)
    
    return settlement


@router.post("/{settlement_id}/submit-proof")
async def submit_proof_to_settlement(
    settlement_id: uuid.UUID,
    proof_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Submit a proof to a settlement"""
    from src.models.proof import Proof, ProofStatus
    
    result = await db.execute(
        select(Settlement).where(
            Settlement.id == settlement_id,
            Settlement.user_id == current_user.id
        )
    )
    settlement = result.scalar_one_or_none()
    
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settlement not found"
        )
    
    # Verify proof exists and is verified
    proof_result = await db.execute(
        select(Proof).where(
            Proof.id == proof_id,
            Proof.user_id == current_user.id
        )
    )
    proof = proof_result.scalar_one_or_none()
    
    if not proof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proof not found"
        )
    
    if proof.status != ProofStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Proof must be verified before submitting to settlement"
        )
    
    # Add proof to settlement
    if not settlement.submitted_proofs:
        settlement.submitted_proofs = []
    
    if str(proof_id) not in settlement.submitted_proofs:
        settlement.submitted_proofs.append(str(proof_id))
    
    # Check if all required proofs are submitted
    if set(settlement.required_proofs or []).issubset(set(settlement.submitted_proofs)):
        settlement.status = SettlementStatus.READY
    else:
        settlement.status = SettlementStatus.PROCESSING
    
    await db.commit()
    
    return {
        "status": "ok",
        "submitted_proofs": len(settlement.submitted_proofs),
        "required_proofs": len(settlement.required_proofs or []),
    }


@router.post("/{settlement_id}/execute")
async def execute_settlement(
    settlement_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Execute a settlement on-chain"""
    result = await db.execute(
        select(Settlement).where(
            Settlement.id == settlement_id,
            Settlement.user_id == current_user.id
        )
    )
    settlement = result.scalar_one_or_none()
    
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settlement not found"
        )
    
    if settlement.status != SettlementStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settlement must have all proofs submitted before execution"
        )
    
    # TODO: Execute on Aptos blockchain
    import hashlib
    tx_hash = "0x" + hashlib.sha256(str(settlement.id).encode()).hexdigest()
    on_chain_id = "0x" + hashlib.sha256(tx_hash.encode()).hexdigest()[:40]
    
    settlement.status = SettlementStatus.COMPLETED
    settlement.tx_hash = tx_hash
    settlement.on_chain_id = on_chain_id
    settlement.completed_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "status": "completed",
        "tx_hash": tx_hash,
        "on_chain_id": on_chain_id,
    }


@router.post("/{settlement_id}/dispute")
async def dispute_settlement(
    settlement_id: uuid.UUID,
    reason: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Dispute a settlement"""
    result = await db.execute(
        select(Settlement).where(
            Settlement.id == settlement_id,
            Settlement.user_id == current_user.id
        )
    )
    settlement = result.scalar_one_or_none()
    
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settlement not found"
        )
    
    if settlement.status == SettlementStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot dispute a completed settlement"
        )
    
    settlement.status = SettlementStatus.FAILED
    if not settlement.metadata:
        settlement.metadata = {}
    settlement.metadata["dispute_reason"] = reason
    settlement.metadata["disputed_at"] = datetime.utcnow().isoformat()
    
    await db.commit()
    
    return {"status": "disputed", "reason": reason}


@router.delete("/{settlement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_settlement(
    settlement_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Delete/cancel a settlement"""
    result = await db.execute(
        select(Settlement).where(
            Settlement.id == settlement_id,
            Settlement.user_id == current_user.id
        )
    )
    settlement = result.scalar_one_or_none()
    
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settlement not found"
        )
    
    if settlement.status in [SettlementStatus.COMPLETED, SettlementStatus.PROCESSING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a completed or processing settlement"
        )
    
    await db.delete(settlement)
    await db.commit()
