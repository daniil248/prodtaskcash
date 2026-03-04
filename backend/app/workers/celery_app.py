from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "taskcash",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_routes={
        "app.workers.tasks.verify_task": {"queue": "verification"},
        "app.workers.tasks.send_notification": {"queue": "notifications"},
    },
)
