"""Notification and reward background tasks"""

import asyncio
from datetime import datetime, timedelta
from uuid import UUID

import structlog
import httpx
from sqlalchemy import select, func, and_

from src.workers.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.config import settings
from src.models.user import User
from src.models.proof import Proof, ProofStatus
from src.models.agent import Agent

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
def calculate_daily_rewards():
    """Calculate and distribute daily rewards based on user activity"""
    logger.info("daily_rewards_calculation_started")
    
    async def _calculate():
        async with async_session_factory() as session:
            # Get activity from the last 24 hours
            yesterday = datetime.utcnow() - timedelta(days=1)
            
            # Get all active users with activity
            result = await session.execute(
                select(User).where(User.is_active == True)
            )
            users = result.scalars().all()
            
            rewards_distributed = 0
            
            for user in users:
                try:
                    # Count proofs generated in last 24 hours
                    proof_count = await session.scalar(
                        select(func.count(Proof.id)).where(
                            and_(
                                Proof.user_id == user.id,
                                Proof.created_at >= yesterday,
                                Proof.status == ProofStatus.VERIFIED,
                            )
                        )
                    )
                    
                    if proof_count and proof_count > 0:
                        # Calculate reward: 10 PAT per verified proof
                        reward = proof_count * 10
                        
                        # Update user rewards
                        user.total_rewards += reward
                        rewards_distributed += reward
                        
                        # Notify user
                        await send_reward_notification(
                            str(user.id),
                            reward,
                            f"Daily reward for {proof_count} verified proofs"
                        )
                        
                        logger.info("user_reward_distributed",
                                   user_id=str(user.id),
                                   amount=reward,
                                   proofs=proof_count)
                
                except Exception as e:
                    logger.error("user_reward_error", user_id=str(user.id), error=str(e))
            
            await session.commit()
            
            logger.info("daily_rewards_completed", total_distributed=rewards_distributed)
            return {"success": True, "total_distributed": rewards_distributed}
    
    return run_async(_calculate())


@celery_app.task
def update_user_streaks():
    """Update user activity streaks"""
    logger.info("streak_update_started")
    
    async def _update_streaks():
        async with async_session_factory() as session:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            yesterday_start = today_start - timedelta(days=1)
            
            result = await session.execute(
                select(User).where(User.is_active == True)
            )
            users = result.scalars().all()
            
            updated = 0
            
            for user in users:
                try:
                    # Check if user had activity yesterday
                    yesterday_proofs = await session.scalar(
                        select(func.count(Proof.id)).where(
                            and_(
                                Proof.user_id == user.id,
                                Proof.created_at >= yesterday_start,
                                Proof.created_at < today_start,
                            )
                        )
                    )
                    
                    if yesterday_proofs and yesterday_proofs > 0:
                        # Continue streak
                        user.current_streak += 1
                        if user.current_streak > user.longest_streak:
                            user.longest_streak = user.current_streak
                            
                            # Bonus for new record
                            if user.longest_streak % 7 == 0:  # Weekly milestone
                                bonus = user.longest_streak * 5  # 5 PAT per day in streak
                                user.total_rewards += bonus
                                await send_reward_notification(
                                    str(user.id),
                                    bonus,
                                    f"Streak milestone bonus! {user.longest_streak} days"
                                )
                    else:
                        # Reset streak
                        if user.current_streak > 0:
                            user.current_streak = 0
                    
                    updated += 1
                
                except Exception as e:
                    logger.error("streak_update_error", user_id=str(user.id), error=str(e))
            
            await session.commit()
            
            logger.info("streak_update_completed", updated=updated)
            return {"success": True, "updated": updated}
    
    return run_async(_update_streaks())


@celery_app.task
def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send push notification to user (placeholder for actual implementation)"""
    logger.info("push_notification_sent",
               user_id=user_id,
               title=title)
    
    # In production, this would integrate with a push notification service
    # like Firebase Cloud Messaging, OneSignal, etc.
    
    return {
        "success": True,
        "user_id": user_id,
        "title": title,
    }


@celery_app.task
def send_email_notification(user_id: str, subject: str, body: str, template: str = None):
    """Send email notification to user (placeholder for actual implementation)"""
    logger.info("email_notification_queued",
               user_id=user_id,
               subject=subject)
    
    # In production, this would integrate with an email service
    # like SendGrid, Postmark, AWS SES, etc.
    
    return {
        "success": True,
        "user_id": user_id,
        "subject": subject,
    }


@celery_app.task
def sync_rewards_with_photon(user_id: str):
    """Sync user rewards with Photon API"""
    logger.info("photon_sync_started", user_id=user_id)
    
    async def _sync():
        async with async_session_factory() as session:
            user = await session.get(User, UUID(user_id))
            if not user:
                return {"success": False, "error": "User not found"}
            
            if not user.wallet_address:
                return {"success": False, "error": "No wallet address"}
            
            try:
                # Call Photon API to get actual balance
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{settings.PHOTON_API_URL}/v1/wallets/{user.wallet_address}/balance",
                        headers={"x-api-key": settings.PHOTON_API_KEY},
                        timeout=10.0,
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        photon_balance = data.get("balance", 0)
                        
                        # Update local record if different
                        if photon_balance != user.total_rewards:
                            logger.info("reward_balance_synced",
                                       user_id=user_id,
                                       local=user.total_rewards,
                                       photon=photon_balance)
                            user.total_rewards = photon_balance
                            await session.commit()
                        
                        return {
                            "success": True,
                            "balance": photon_balance,
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Photon API error: {response.status_code}",
                        }
            
            except Exception as e:
                logger.error("photon_sync_error", user_id=user_id, error=str(e))
                return {"success": False, "error": str(e)}
    
    return run_async(_sync())


@celery_app.task
def generate_weekly_report():
    """Generate and send weekly activity reports to users"""
    logger.info("weekly_report_generation_started")
    
    async def _generate():
        async with async_session_factory() as session:
            week_ago = datetime.utcnow() - timedelta(days=7)
            
            result = await session.execute(
                select(User).where(User.is_active == True)
            )
            users = result.scalars().all()
            
            reports_sent = 0
            
            for user in users:
                try:
                    # Gather weekly stats
                    proofs_count = await session.scalar(
                        select(func.count(Proof.id)).where(
                            and_(
                                Proof.user_id == user.id,
                                Proof.created_at >= week_ago,
                            )
                        )
                    )
                    
                    # Skip if no activity
                    if not proofs_count or proofs_count == 0:
                        continue
                    
                    # Generate report (simplified)
                    report = {
                        "period": "weekly",
                        "proofs_generated": proofs_count,
                        "current_streak": user.current_streak,
                        "total_rewards": user.total_rewards,
                        "reputation": user.reputation_score,
                    }
                    
                    # Queue email notification
                    send_email_notification.delay(
                        str(user.id),
                        "Your Weekly VerifiAI Activity Report",
                        f"You generated {proofs_count} proofs this week!",
                        "weekly_report",
                    )
                    
                    reports_sent += 1
                
                except Exception as e:
                    logger.error("report_generation_error", user_id=str(user.id), error=str(e))
            
            logger.info("weekly_reports_completed", reports_sent=reports_sent)
            return {"success": True, "reports_sent": reports_sent}
    
    return run_async(_generate())


async def send_reward_notification(user_id: str, amount: int, reason: str):
    """Send reward notification via WebSocket"""
    try:
        from src.api.routes.websocket import publish_via_redis
        await publish_via_redis(f"user:{user_id}", {
            "type": "reward_notification",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "amount": amount,
                "reason": reason,
            },
        })
    except Exception as e:
        logger.debug("websocket_publish_error", error=str(e))
