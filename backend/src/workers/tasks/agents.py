"""Agent management background tasks"""

import asyncio
from datetime import datetime, timedelta
from uuid import UUID

import structlog
from sqlalchemy import select, and_

from src.workers.celery_app import celery_app
from src.core.database import async_session_factory
from src.models.agent import Agent, AgentStatus

logger = structlog.get_logger()


def run_async(coro):
    """Run async function in sync context for Celery"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task
def update_stale_agents():
    """Mark agents as offline if they haven't sent a heartbeat"""
    logger.info("stale_agent_check_started")
    
    async def _update_stale():
        async with async_session_factory() as session:
            # Agents are stale if no heartbeat in 5 minutes
            cutoff = datetime.utcnow() - timedelta(minutes=5)
            
            result = await session.execute(
                select(Agent).where(
                    and_(
                        Agent.status.in_([AgentStatus.ACTIVE, AgentStatus.IDLE, AgentStatus.BUSY]),
                        Agent.updated_at < cutoff,
                        Agent.is_active == True,
                    )
                )
            )
            stale_agents = result.scalars().all()
            
            count = 0
            for agent in stale_agents:
                agent.status = AgentStatus.OFFLINE
                count += 1
                
                # Notify owner
                await publish_agent_status_change(
                    str(agent.owner_id),
                    str(agent.id),
                    "offline",
                    {"reason": "No heartbeat received"}
                )
            
            await session.commit()
            
            logger.info("stale_agents_updated", count=count)
            return {"success": True, "updated": count}
    
    return run_async(_update_stale())


@celery_app.task
def calculate_agent_performance(agent_id: str):
    """Recalculate agent performance metrics"""
    logger.info("agent_performance_calculation_started", agent_id=agent_id)
    
    async def _calculate():
        async with async_session_factory() as session:
            agent = await session.get(Agent, UUID(agent_id))
            if not agent:
                return {"success": False, "error": "Agent not found"}
            
            try:
                # Calculate success rate
                if agent.total_tasks > 0:
                    success_rate = (agent.successful_tasks / agent.total_tasks) * 100
                else:
                    success_rate = 0
                
                # Calculate proof verification rate
                if agent.total_proofs > 0:
                    verification_rate = (agent.verified_proofs / agent.total_proofs) * 100
                else:
                    verification_rate = 0
                
                # Update reputation based on performance
                # Simple algorithm: weighted average of success rate and verification rate
                new_reputation = int((success_rate * 0.6 + verification_rate * 0.4) * 10)
                new_reputation = max(0, min(1000, new_reputation))  # Clamp to 0-1000
                
                agent.reputation = new_reputation
                await session.commit()
                
                logger.info("agent_performance_calculated",
                           agent_id=agent_id,
                           success_rate=success_rate,
                           reputation=new_reputation)
                
                return {
                    "success": True,
                    "agent_id": agent_id,
                    "success_rate": success_rate,
                    "verification_rate": verification_rate,
                    "reputation": new_reputation,
                }
            
            except Exception as e:
                logger.error("agent_performance_error", agent_id=agent_id, error=str(e))
                return {"success": False, "error": str(e)}
    
    return run_async(_calculate())


@celery_app.task
def sync_agent_to_chain(agent_id: str):
    """Sync agent state to Aptos blockchain"""
    logger.info("agent_chain_sync_started", agent_id=agent_id)
    
    async def _sync():
        async with async_session_factory() as session:
            agent = await session.get(Agent, UUID(agent_id))
            if not agent:
                return {"success": False, "error": "Agent not found"}
            
            if not agent.on_chain_id:
                return {"success": False, "error": "Agent not registered on-chain"}
            
            try:
                # Simulate blockchain sync
                await asyncio.sleep(1)
                
                # In production, this would call the Aptos contract
                # to update agent metrics on-chain
                
                logger.info("agent_synced_to_chain",
                           agent_id=agent_id,
                           on_chain_id=agent.on_chain_id)
                
                return {
                    "success": True,
                    "agent_id": agent_id,
                    "on_chain_id": agent.on_chain_id,
                }
            
            except Exception as e:
                logger.error("agent_chain_sync_error", agent_id=agent_id, error=str(e))
                return {"success": False, "error": str(e)}
    
    return run_async(_sync())


@celery_app.task
def batch_update_agent_metrics():
    """Batch update all agent performance metrics"""
    logger.info("batch_agent_metrics_started")
    
    async def _batch_update():
        async with async_session_factory() as session:
            result = await session.execute(
                select(Agent).where(Agent.is_active == True)
            )
            agents = result.scalars().all()
            
            updated = 0
            for agent in agents:
                try:
                    # Queue individual calculation
                    calculate_agent_performance.delay(str(agent.id))
                    updated += 1
                except Exception as e:
                    logger.error("agent_metrics_queue_error",
                               agent_id=str(agent.id),
                               error=str(e))
            
            logger.info("batch_agent_metrics_queued", count=updated)
            return {"success": True, "queued": updated}
    
    return run_async(_batch_update())


async def publish_agent_status_change(user_id: str, agent_id: str, status: str, extra: dict = None):
    """Publish agent status change via WebSocket"""
    try:
        from src.api.routes.websocket import publish_via_redis
        await publish_via_redis(f"user:{user_id}", {
            "type": "agent_update",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "agent_id": agent_id,
                "status": status,
                **(extra or {}),
            },
        })
    except Exception as e:
        logger.debug("websocket_publish_error", error=str(e))
