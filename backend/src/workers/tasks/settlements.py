"""Settlement processing background tasks"""

import asyncio
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import structlog
from celery import shared_task
from sqlalchemy import select, and_

from src.workers.celery_app import celery_app
from src.core.database import async_session_factory
from src.models.settlement import Settlement, SettlementStatus

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
def process_settlement(self, settlement_id: str, user_id: str):
    """
    Process a settlement asynchronously
    
    This includes verifying all parties, validating proofs,
    and executing the on-chain settlement transaction.
    """
    logger.info("settlement_processing_started", settlement_id=settlement_id)
    
    async def _process():
        async with async_session_factory() as session:
            settlement = await session.get(Settlement, UUID(settlement_id))
            if not settlement:
                logger.error("settlement_not_found", settlement_id=settlement_id)
                return {"success": False, "error": "Settlement not found"}
            
            try:
                # Update status to processing
                settlement.status = SettlementStatus.PROCESSING
                await session.commit()
                
                # Simulate processing stages
                await asyncio.sleep(1)
                
                # Verify all parties have signed (simulated)
                parties = settlement.parties or []
                all_signed = all(p.get("signed", False) for p in parties)
                
                if not all_signed:
                    settlement.status = SettlementStatus.PENDING
                    await session.commit()
                    return {
                        "success": False,
                        "error": "Not all parties have signed",
                        "unsigned_parties": [p["id"] for p in parties if not p.get("signed")]
                    }
                
                # Verify attached proofs (simulated)
                await asyncio.sleep(1)
                
                # Execute on-chain settlement
                tx_hash = f"0x{''.join([format(i, '02x') for i in hashlib.sha256(settlement_id.encode()).digest()])}"
                
                settlement.status = SettlementStatus.COMPLETED
                settlement.completed_at = datetime.utcnow()
                settlement.transaction_hash = tx_hash
                
                await session.commit()
                
                # Notify user
                await publish_settlement_update(user_id, settlement_id, "completed", {"tx_hash": tx_hash})
                
                logger.info("settlement_completed", settlement_id=settlement_id, tx_hash=tx_hash)
                return {"success": True, "settlement_id": settlement_id, "tx_hash": tx_hash}
            
            except Exception as e:
                logger.error("settlement_processing_error", settlement_id=settlement_id, error=str(e))
                
                settlement.status = SettlementStatus.FAILED
                settlement.error_message = str(e)
                await session.commit()
                
                raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
    
    return run_async(_process())


@celery_app.task
def execute_settlement_on_chain(settlement_id: str):
    """Execute settlement on Aptos blockchain"""
    logger.info("settlement_chain_execution_started", settlement_id=settlement_id)
    
    async def _execute():
        async with async_session_factory() as session:
            settlement = await session.get(Settlement, UUID(settlement_id))
            if not settlement:
                return {"success": False, "error": "Settlement not found"}
            
            if settlement.status != SettlementStatus.READY:
                return {"success": False, "error": f"Settlement not ready: {settlement.status.value}"}
            
            try:
                # Simulate blockchain execution
                await asyncio.sleep(3)
                
                # Generate transaction hash
                tx_hash = f"0x{''.join([format(i, '02x') for i in hashlib.sha256(f'{settlement_id}:exec'.encode()).digest()])}"
                
                settlement.status = SettlementStatus.COMPLETED
                settlement.completed_at = datetime.utcnow()
                settlement.transaction_hash = tx_hash
                
                await session.commit()
                
                logger.info("settlement_executed_on_chain", settlement_id=settlement_id, tx_hash=tx_hash)
                return {"success": True, "tx_hash": tx_hash}
            
            except Exception as e:
                logger.error("settlement_execution_error", settlement_id=settlement_id, error=str(e))
                return {"success": False, "error": str(e)}
    
    return run_async(_execute())


@celery_app.task
def process_pending_settlements():
    """Process all pending settlements that are ready"""
    logger.info("pending_settlements_processing_started")
    
    async def _process_pending():
        async with async_session_factory() as session:
            # Find settlements ready for processing
            result = await session.execute(
                select(Settlement).where(
                    and_(
                        Settlement.status == SettlementStatus.READY,
                        Settlement.scheduled_at <= datetime.utcnow(),
                    )
                ).limit(10)
            )
            settlements = result.scalars().all()
            
            processed = 0
            for settlement in settlements:
                try:
                    # Queue individual processing
                    process_settlement.delay(str(settlement.id), str(settlement.user_id))
                    processed += 1
                except Exception as e:
                    logger.error("settlement_queue_error", settlement_id=str(settlement.id), error=str(e))
            
            logger.info("pending_settlements_queued", count=processed)
            return {"success": True, "queued": processed}
    
    return run_async(_process_pending())


@celery_app.task
def send_settlement_reminders():
    """Send reminders for pending settlements awaiting signatures"""
    logger.info("settlement_reminders_started")
    
    async def _send_reminders():
        async with async_session_factory() as session:
            # Find settlements pending for more than 24 hours
            cutoff = datetime.utcnow() - timedelta(hours=24)
            
            result = await session.execute(
                select(Settlement).where(
                    and_(
                        Settlement.status == SettlementStatus.PENDING,
                        Settlement.created_at < cutoff,
                    )
                )
            )
            settlements = result.scalars().all()
            
            reminded = 0
            for settlement in settlements:
                # Find unsigned parties
                unsigned = [
                    p for p in (settlement.parties or [])
                    if not p.get("signed", False)
                ]
                
                for party in unsigned:
                    # Send reminder notification (simulated)
                    logger.info("settlement_reminder_sent",
                               settlement_id=str(settlement.id),
                               party_id=party.get("id"))
                    reminded += 1
            
            logger.info("settlement_reminders_completed", reminded=reminded)
            return {"success": True, "reminded": reminded}
    
    return run_async(_send_reminders())


async def publish_settlement_update(user_id: str, settlement_id: str, status: str, extra: dict = None):
    """Publish settlement update via WebSocket"""
    try:
        from src.api.routes.websocket import publish_via_redis
        await publish_via_redis(f"user:{user_id}", {
            "type": "settlement_update",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "settlement_id": settlement_id,
                "status": status,
                **(extra or {}),
            },
        })
    except Exception as e:
        logger.debug("websocket_publish_error", error=str(e))
