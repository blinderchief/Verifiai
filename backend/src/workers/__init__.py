"""Workers package"""

from src.workers.celery_app import celery_app, get_celery_app

__all__ = ["celery_app", "get_celery_app"]
