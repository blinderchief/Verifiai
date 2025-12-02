"""Celery application and task configuration"""

import os
from celery import Celery

from src.core.config import settings

# Create Celery application
celery_app = Celery(
    "verifiai",
    broker=settings.REDIS_URL or "redis://localhost:6379/0",
    backend=settings.REDIS_URL or "redis://localhost:6379/0",
    include=[
        "src.workers.tasks.proofs",
        "src.workers.tasks.settlements",
        "src.workers.tasks.agents",
        "src.workers.tasks.notifications",
    ],
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Result backend settings
    result_expires=3600,  # 1 hour
    result_backend_transport_options={
        "retry_on_timeout": True,
    },
    
    # Task execution settings
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_time_limit=600,  # 10 minutes max
    task_soft_time_limit=540,  # 9 minutes soft limit
    
    # Worker settings
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Rate limiting
    task_annotations={
        "src.workers.tasks.proofs.generate_proof": {"rate_limit": "10/m"},
        "src.workers.tasks.settlements.process_settlement": {"rate_limit": "5/m"},
    },
    
    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-expired-proofs": {
            "task": "src.workers.tasks.proofs.cleanup_expired_proofs",
            "schedule": 3600.0,  # Every hour
        },
        "update-agent-status": {
            "task": "src.workers.tasks.agents.update_stale_agents",
            "schedule": 300.0,  # Every 5 minutes
        },
        "process-pending-settlements": {
            "task": "src.workers.tasks.settlements.process_pending_settlements",
            "schedule": 60.0,  # Every minute
        },
        "calculate-rewards": {
            "task": "src.workers.tasks.notifications.calculate_daily_rewards",
            "schedule": 86400.0,  # Daily
        },
    },
)


# Task routing
celery_app.conf.task_routes = {
    "src.workers.tasks.proofs.*": {"queue": "proofs"},
    "src.workers.tasks.settlements.*": {"queue": "settlements"},
    "src.workers.tasks.agents.*": {"queue": "agents"},
    "src.workers.tasks.notifications.*": {"queue": "notifications"},
}


def get_celery_app() -> Celery:
    """Get Celery application instance"""
    return celery_app
