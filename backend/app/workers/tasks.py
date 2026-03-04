import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select
from app.workers.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models import UserTask, UserTaskStatus, Task, TaskType, User, Transaction, TransactionType
from app.services.verification import check_subscription, check_reaction
from app.services.antifraid import update_trust_score, SCORE_BONUSES, SCORE_PENALTIES
from app.services.referral import try_give_referral_reward
from app.config import get_settings

settings = get_settings()


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def verify_task(self, user_task_id: int):
    run_async(_verify_task_async(user_task_id))


async def _verify_task_async(user_task_id: int):
    async with AsyncSessionLocal() as db:
        ut_result = await db.execute(
            select(UserTask).where(UserTask.id == user_task_id)
        )
        user_task = ut_result.scalar_one_or_none()
        if not user_task or user_task.status != UserTaskStatus.checking:
            return

        task_result = await db.execute(select(Task).where(Task.id == user_task.task_id))
        task = task_result.scalar_one()

        user_result = await db.execute(select(User).where(User.id == user_task.user_id))
        user = user_result.scalar_one()

        success = False
        message = ""

        if task.task_type == TaskType.subscribe:
            if not task.channel_id:
                success, message = False, "Канал не настроен"
            else:
                success, message = await check_subscription(user.telegram_id, task.channel_id)

        elif task.task_type == TaskType.like:
            if not task.channel_id or not task.post_id:
                success, message = False, "Параметры задания не настроены"
            else:
                success, message = await check_reaction(user.telegram_id, task.channel_id, task.post_id)

        elif task.task_type == TaskType.watch_ad:
            # Сервер повторно проверяет минимальное время просмотра
            if task.duration_seconds:
                elapsed = (
                    datetime.now(timezone.utc)
                    - user_task.started_at.replace(tzinfo=timezone.utc)
                ).total_seconds()
                if elapsed < task.duration_seconds:
                    success = False
                    message = (
                        f"Прошло слишком мало времени ({int(elapsed)}с, "
                        f"нужно {task.duration_seconds}с)"
                    )
                    await update_trust_score(db, user, SCORE_PENALTIES["fast_completion"])
                else:
                    success, message = True, "Просмотр засчитан"
            else:
                success, message = True, "Просмотр засчитан"

        elif task.task_type == TaskType.invite:
            from sqlalchemy import func
            completed_referrals = await db.execute(
                select(func.count(User.id)).where(User.referrer_id == user.id)
            )
            count = completed_referrals.scalar() or 0
            success = count > 0
            message = "Реферал засчитан" if success else "Нет приглашённых пользователей"

        if success:
            user_task.status = UserTaskStatus.completed
            user_task.completed_at = datetime.now(timezone.utc)

            user.balance += task.reward
            user.total_earned += task.reward
            task.total_completions += 1

            db.add(Transaction(
                user_id=user.id,
                amount=task.reward,
                tx_type=TransactionType.task_reward,
                reference_id=task.id,
                description=f"Награда за задание: {task.title}",
            ))

            user.trust_score = min(100, user.trust_score + SCORE_BONUSES["task_completed"])
            await db.commit()
            await try_give_referral_reward(db, user)

            # Уведомление об успехе
            send_notification.delay(
                user.telegram_id,
                f"✅ <b>Задание выполнено!</b>\n\n"
                f"«{task.title}»\n\n"
                f"💰 Начислено: <b>+{float(task.reward):.0f}₽</b>\n"
                f"Ваш баланс: <b>{float(user.balance):.2f}₽</b>",
            )
        else:
            user_task.status = UserTaskStatus.failed
            user_task.error_message = message
            await db.commit()

            # Уведомление о неудаче (только если не технический сбой)
            if message and "Ошибка сервиса" not in message:
                send_notification.delay(
                    user.telegram_id,
                    f"❌ <b>Задание не выполнено</b>\n\n"
                    f"«{task.title}»\n\n"
                    f"{message}\n\n"
                    f"Вы можете попробовать ещё раз.",
                )


@celery_app.task(autoretry_for=(Exception,), max_retries=5, default_retry_delay=10)
def send_notification(telegram_id: int, text: str):
    run_async(_send_notification_async(telegram_id, text))


async def _send_notification_async(telegram_id: int, text: str):
    import httpx

    # Используем USER_BOT_TOKEN если доступен, иначе BOT_TOKEN
    token = getattr(settings, "USER_BOT_TOKEN", None) or settings.BOT_TOKEN
    url = f"https://api.telegram.org/bot{token}/sendMessage"

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            url,
            json={"chat_id": telegram_id, "text": text, "parse_mode": "HTML"},
        )
        # 403 = пользователь заблокировал бота — не ретраить
        if r.status_code == 403:
            return
        r.raise_for_status()
