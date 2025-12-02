"""Proof generation background tasks"""

import asyncio
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import structlog
from celery import shared_task
from sqlalchemy import select, and_

from src.workers.celery_app import celery_app
from src.core.database import async_session_factory
from src.models.proof import Proof, ProofStatus, ProofType
from src.models.user import User

logger = structlog.get_logger()


def run_async(coro):
    """Run async function in sync context for Celery"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3)
def generate_proof(self, proof_id: str, user_id: str):
    """
    Generate ZK proof asynchronously
    
    This task simulates the proof generation process which can take
    significant time depending on the proof type and complexity.
    """
    logger.info("proof_generation_started", proof_id=proof_id, user_id=user_id)
    
    async def _generate():
        async with async_session_factory() as session:
            # Get proof
            proof = await session.get(Proof, UUID(proof_id))
            if not proof:
                logger.error("proof_not_found", proof_id=proof_id)
                return {"success": False, "error": "Proof not found"}
            
            try:
                # Update status to generating
                proof.status = ProofStatus.GENERATING
                await session.commit()
                
                # Publish WebSocket update
                await publish_proof_progress(user_id, proof_id, "generating", 10)
                
                # Simulate proof generation stages
                stages = [
                    ("initializing", 20),
                    ("compiling_circuit", 35),
                    ("generating_witness", 50),
                    ("computing_proof", 75),
                    ("verifying_locally", 90),
                    ("finalizing", 100),
                ]
                
                for stage, progress in stages:
                    # Simulate computation time
                    await asyncio.sleep(2)
                    await publish_proof_progress(user_id, proof_id, stage, progress)
                
                # Generate mock proof data
                proof_data = generate_mock_proof_data(proof.proof_type)
                
                # Update proof with generated data
                proof.proof_data = proof_data
                proof.status = ProofStatus.VERIFIED
                proof.verified_at = datetime.utcnow()
                proof.proof_hash = hashlib.sha256(
                    json.dumps(proof_data, sort_keys=True).encode()
                ).hexdigest()
                
                await session.commit()
                
                # Update user stats
                user = await session.get(User, proof.user_id)
                if user:
                    user.total_proofs += 1
                    await session.commit()
                
                # Publish completion
                await publish_proof_complete(user_id, proof_id, "verified")
                
                logger.info("proof_generation_completed", proof_id=proof_id)
                return {"success": True, "proof_id": proof_id, "status": "verified"}
            
            except Exception as e:
                logger.error("proof_generation_error", proof_id=proof_id, error=str(e))
                
                proof.status = ProofStatus.FAILED
                proof.error_message = str(e)
                await session.commit()
                
                await publish_proof_error(user_id, proof_id, str(e))
                
                # Retry with exponential backoff
                raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
    
    return run_async(_generate())


@celery_app.task
def verify_proof(proof_id: str):
    """Verify an existing proof"""
    logger.info("proof_verification_started", proof_id=proof_id)
    
    async def _verify():
        async with async_session_factory() as session:
            proof = await session.get(Proof, UUID(proof_id))
            if not proof:
                return {"success": False, "error": "Proof not found"}
            
            try:
                # Simulate verification
                await asyncio.sleep(1)
                
                # Verify proof data
                if proof.proof_data and proof.proof_hash:
                    computed_hash = hashlib.sha256(
                        json.dumps(proof.proof_data, sort_keys=True).encode()
                    ).hexdigest()
                    
                    is_valid = computed_hash == proof.proof_hash
                    proof.is_valid = is_valid
                    proof.verified_at = datetime.utcnow()
                    
                    await session.commit()
                    
                    return {"success": True, "is_valid": is_valid}
                
                return {"success": False, "error": "No proof data"}
            
            except Exception as e:
                logger.error("proof_verification_error", proof_id=proof_id, error=str(e))
                return {"success": False, "error": str(e)}
    
    return run_async(_verify())


@celery_app.task
def submit_proof_to_chain(proof_id: str, user_id: str):
    """Submit verified proof to Aptos blockchain"""
    logger.info("proof_chain_submission_started", proof_id=proof_id)
    
    async def _submit():
        async with async_session_factory() as session:
            proof = await session.get(Proof, UUID(proof_id))
            if not proof:
                return {"success": False, "error": "Proof not found"}
            
            if proof.status != ProofStatus.VERIFIED:
                return {"success": False, "error": "Proof not verified"}
            
            try:
                # Simulate blockchain submission
                await asyncio.sleep(2)
                
                # Generate mock transaction hash
                tx_hash = f"0x{''.join([format(i, '02x') for i in hashlib.sha256(proof_id.encode()).digest()])}"
                
                proof.on_chain = True
                proof.transaction_hash = tx_hash
                
                await session.commit()
                
                # Notify user
                await publish_proof_complete(user_id, proof_id, "on_chain", {"tx_hash": tx_hash})
                
                logger.info("proof_submitted_to_chain", proof_id=proof_id, tx_hash=tx_hash)
                return {"success": True, "tx_hash": tx_hash}
            
            except Exception as e:
                logger.error("proof_chain_submission_error", proof_id=proof_id, error=str(e))
                return {"success": False, "error": str(e)}
    
    return run_async(_submit())


@celery_app.task
def cleanup_expired_proofs():
    """Clean up expired or stale proofs"""
    logger.info("proof_cleanup_started")
    
    async def _cleanup():
        async with async_session_factory() as session:
            # Find proofs that have been generating for too long (> 30 minutes)
            cutoff = datetime.utcnow() - timedelta(minutes=30)
            
            result = await session.execute(
                select(Proof).where(
                    and_(
                        Proof.status == ProofStatus.GENERATING,
                        Proof.created_at < cutoff,
                    )
                )
            )
            stale_proofs = result.scalars().all()
            
            count = 0
            for proof in stale_proofs:
                proof.status = ProofStatus.FAILED
                proof.error_message = "Proof generation timed out"
                count += 1
            
            await session.commit()
            
            logger.info("proof_cleanup_completed", cleaned_count=count)
            return {"success": True, "cleaned": count}
    
    return run_async(_cleanup())


# ============================================================================
# Helper Functions
# ============================================================================

def generate_mock_proof_data(proof_type: ProofType) -> dict:
    """Generate mock proof data based on proof type"""
    base_proof = {
        "protocol": "groth16",
        "curve": "bn254",
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    if proof_type == ProofType.INFERENCE:
        return {
            **base_proof,
            "proof_type": "inference",
            "pi_a": ["0x123...", "0x456..."],
            "pi_b": [["0x789...", "0xabc..."], ["0xdef...", "0x012..."]],
            "pi_c": ["0x345...", "0x678..."],
            "public_inputs": ["0x901...", "0x234..."],
        }
    
    elif proof_type == ProofType.TRAINING:
        return {
            **base_proof,
            "proof_type": "training",
            "model_hash": f"0x{'a' * 64}",
            "dataset_hash": f"0x{'b' * 64}",
            "epochs": 100,
            "final_loss": 0.0234,
        }
    
    elif proof_type == ProofType.DATA_INTEGRITY:
        return {
            **base_proof,
            "proof_type": "data_integrity",
            "merkle_root": f"0x{'c' * 64}",
            "data_hash": f"0x{'d' * 64}",
            "chunk_count": 1024,
        }
    
    else:
        return {
            **base_proof,
            "proof_type": proof_type.value if hasattr(proof_type, 'value') else str(proof_type),
            "custom_data": {},
        }


async def publish_proof_progress(user_id: str, proof_id: str, stage: str, progress: int):
    """Publish proof generation progress via WebSocket"""
    try:
        from src.api.routes.websocket import publish_via_redis
        await publish_via_redis(f"user:{user_id}", {
            "type": "proof_progress",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "proof_id": proof_id,
                "stage": stage,
                "progress": progress,
            },
        })
    except Exception as e:
        logger.debug("websocket_publish_error", error=str(e))


async def publish_proof_complete(user_id: str, proof_id: str, status: str, extra: dict = None):
    """Publish proof completion via WebSocket"""
    try:
        from src.api.routes.websocket import publish_via_redis
        await publish_via_redis(f"user:{user_id}", {
            "type": "proof_complete",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "proof_id": proof_id,
                "status": status,
                **(extra or {}),
            },
        })
    except Exception as e:
        logger.debug("websocket_publish_error", error=str(e))


async def publish_proof_error(user_id: str, proof_id: str, error: str):
    """Publish proof error via WebSocket"""
    try:
        from src.api.routes.websocket import publish_via_redis
        await publish_via_redis(f"user:{user_id}", {
            "type": "proof_error",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "proof_id": proof_id,
                "error": error,
            },
        })
    except Exception as e:
        logger.debug("websocket_publish_error", error=str(e))
