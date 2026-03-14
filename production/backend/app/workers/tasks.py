import asyncio
import logging
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select
from app.workers.celery_app import celery_app

log = logging.getLogger(__name__)
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
                log.warning("verify_task: subscribe task_id=%s channel_id empty", task.id)
            else:
                success, message = await check_subscription(user.telegram_id, task.channel_id)
                if not success:
                    log.info("verify_task: subscribe failed task_id=%s user_id=%s channel_id=%s msg=%s", task.id, user.id, task.channel_id, message)

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
                    await update_trust_score(db, user, SCORE_PENALTIES["fast_completion"], reason="fast_completion_verify_worker")
                else:
                    success, message = True, "Просмотр засчитан"
            else:
                success, message = True, "Просмотр засчитан"

        elif task.task_type == TaskType.invite:
            from sqlalchemy import func
            from app.models import SystemSetting
            _min_row = (await db.execute(select(SystemSetting).where(SystemSetting.key == "referral_min_tasks"))).scalar_one_or_none()
            min_tasks = int(_min_row.value) if _min_row else settings.REFERRAL_MIN_TASKS
            completed_subq = (
                select(func.count(UserTask.id))
                .where(
                    UserTask.user_id == User.id,
                    UserTask.status == UserTaskStatus.completed,
                )
                .correlate(User)
                .scalar_subquery()
            )
            active_ref_result = await db.execute(
                select(func.count(User.id)).where(
                    User.referrer_id == user.id,
                    completed_subq >= min_tasks,
                )
            )
            count = active_ref_result.scalar() or 0
            success = count > 0
            message = "Реферал засчитан" if success else f"Реферал должен выполнить минимум {min_tasks} задания"

        if success:
            user_task.status = UserTaskStatus.completed
            user_task.completed_at = datetime.now(timezone.utc)

            user.balance += task.reward
            user.total_earned += task.reward
            task.total_completions += 1

            # Auto-deactivate task when budget is fully spent
            if task.max_completions is not None and task.total_completions >= task.max_completions:
                task.is_active = False

            db.add(Transaction(
                user_id=user.id,
                amount=task.reward,
                tx_type=TransactionType.task_reward,
                reference_id=task.id,
                description=f"Награда за задание: {task.title}",
            ))

            old_ts = user.trust_score
            user.trust_score = min(100, user.trust_score + SCORE_BONUSES["task_completed"])
            log.info(
                "trust_score change telegram_id=%s old=%s delta=+%s new=%s reason=task_completed",
                user.telegram_id, old_ts, SCORE_BONUSES["task_completed"], user.trust_score,
            )
            await db.commit()
            await try_give_referral_reward(db, user)

            # Уведомление об успехе
            send_notification.delay(
                user.telegram_id,
                f"✅ <b>Задание выполнено!</b>\n\n"
                f"«{task.title}»\n\n"
                f"💰 Начислено: <b>+{float(task.reward):.0f}₽</b>\n"
                f"Ваш баланс: <b>{float(user.balance):.2f}₽</b>",
                "tasks",
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
                    "tasks",
                )


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def subscribe_timer_second_check(self, user_task_id: int):
    """Через (timer_hours - 1) ч после первой проверки: повторная проверка подписки; если ок — выплата."""
    run_async(_subscribe_timer_second_check_async(user_task_id))


async def _subscribe_timer_second_check_async(user_task_id: int):
    from app.services.task_verification import apply_verification_result
    from app.services.referral import try_give_referral_reward
    async with AsyncSessionLocal() as db:
        ut_result = await db.execute(select(UserTask).where(UserTask.id == user_task_id))
        user_task = ut_result.scalar_one_or_none()
        if not user_task or user_task.status != UserTaskStatus.checking:
            return
        task_result = await db.execute(select(Task).where(Task.id == user_task.task_id))
        task = task_result.scalar_one()
        user_result = await db.execute(select(User).where(User.id == user_task.user_id))
        user = user_result.scalar_one()
        if task.task_type != TaskType.subscribe:
            return
        # Имитация с таймером: просто выплатить
        if getattr(task, "is_simulation", False):
            await apply_verification_result(db, task, user_task, user, True, "Имитация (таймер)")
            await db.commit()
            await try_give_referral_reward(db, user)
            send_notification.delay(
                user.telegram_id,
                f"✅ <b>Задание выполнено!</b>\n\n«{task.title}»\n\n💰 Начислено: <b>+{float(task.reward):.0f}₽</b>\nВаш баланс: <b>{float(user.balance):.2f}₽</b>",
                "tasks",
            )
            return
        success, message = await check_subscription(user.telegram_id, task.channel_id or "")
        await apply_verification_result(db, task, user_task, user, success, message or "Повторная проверка")
        await db.commit()
        if success:
            await try_give_referral_reward(db, user)
            send_notification.delay(
                user.telegram_id,
                f"✅ <b>Задание выполнено!</b>\n\n«{task.title}»\n\n💰 Начислено: <b>+{float(task.reward):.0f}₽</b>\nВаш баланс: <b>{float(user.balance):.2f}₽</b>",
                "tasks",
            )
        else:
            if message and "Ошибка сервиса" not in message:
                send_notification.delay(
                    user.telegram_id,
                    f"❌ <b>Задание не выполнено</b>\n\n«{task.title}»\n\n{message}\n\nВы больше не в канале — награда не начислена.",
                    "tasks",
                )


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def subscribe_timer_pay(self, user_task_id: int):
    """Имитация с таймером: через timer_hours ч — выплата без проверки."""
    run_async(_subscribe_timer_pay_async(user_task_id))


async def _subscribe_timer_pay_async(user_task_id: int):
    from app.services.task_verification import apply_verification_result
    from app.services.referral import try_give_referral_reward
    async with AsyncSessionLocal() as db:
        ut_result = await db.execute(select(UserTask).where(UserTask.id == user_task_id))
        user_task = ut_result.scalar_one_or_none()
        if not user_task or user_task.status != UserTaskStatus.checking:
            return
        task_result = await db.execute(select(Task).where(Task.id == user_task.task_id))
        task = task_result.scalar_one()
        user_result = await db.execute(select(User).where(User.id == user_task.user_id))
        user = user_result.scalar_one()
        await apply_verification_result(db, task, user_task, user, True, "Имитация (таймер)")
        await db.commit()
        await try_give_referral_reward(db, user)
        send_notification.delay(
            user.telegram_id,
            f"✅ <b>Задание выполнено!</b>\n\n«{task.title}»\n\n💰 Начислено: <b>+{float(task.reward):.0f}₽</b>\nВаш баланс: <b>{float(user.balance):.2f}₽</b>",
            "tasks",
        )


@celery_app.task(autoretry_for=(Exception,), max_retries=5, default_retry_delay=10)
def send_notification(telegram_id: int, text: str, notification_type: str | None = None):
    run_async(_send_notification_async(telegram_id, text, notification_type))


async def _send_notification_async(telegram_id: int, text: str, notification_type: str | None = None):
    import json
    from app.database import AsyncSessionLocal
    from app.models import User

    if notification_type:
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(User).where(User.telegram_id == telegram_id))
            u = res.scalar_one_or_none()
            if u and u.notification_settings:
                try:
                    data = json.loads(u.notification_settings)
                    if notification_type == "tasks" and not data.get("notify_tasks", True):
                        return
                    if notification_type == "withdrawals" and not data.get("notify_withdrawals", True):
                        return
                    if notification_type == "referrals" and not data.get("notify_referrals", True):
                        return
                except Exception:
                    pass

    import httpx
    # Уведомления пользователям — только от того же бота, через который открыт мини-апп (BOT_TOKEN).
    # USER_BOT_TOKEN не используется: два бота — BOT_TOKEN (пользовательский) и ADMIN_BOT_TOKEN (админский).
    if getattr(settings, "USER_BOT_TOKEN", None):
        log.warning(
            "send_notification: USER_BOT_TOKEN задан — игнорируем; уведомления шлём через BOT_TOKEN (бот мини-аппа)"
        )
    token = settings.BOT_TOKEN
    if not token:
        log.warning("send_notification: BOT_TOKEN не задан")
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            url,
            json={"chat_id": telegram_id, "text": text, "parse_mode": "HTML"},
        )
        if r.status_code == 403:
            log.warning(
                "send_notification: Telegram 403 (bot cannot message user) telegram_id=%s — "
                "BOT_TOKEN должен быть токеном пользовательского бота (test_zadaniya_bot), через который открывают мини-апп",
                telegram_id,
            )
            return
        if r.status_code >= 400:
            log.warning("send_notification: Telegram API error telegram_id=%s status=%s body=%s", telegram_id, r.status_code, r.text[:200])
            return


def _get_all_user_telegram_ids():
    """Список telegram_id всех пользователей (не забаненных) для рассылки."""
    async def _():
        async with AsyncSessionLocal() as db:
            r = await db.execute(
                select(User.telegram_id).where(User.is_banned == False)
            )
            return [row[0] for row in r.all()]
    return run_async(_())


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def broadcast_send(self, message_type: str, text: str, file_path: str | None = None):
    """
    Рассылка всем пользователям пользовательского бота.
    message_type: text | photo | document | video | animation
    file_path: путь к временному файлу (для photo/document/video/animation).
    """
    import httpx
    import os
    token = get_settings().BOT_TOKEN
    if not token:
        log.warning("broadcast_send: BOT_TOKEN не задан")
        return
    ids = _get_all_user_telegram_ids()
    if not ids:
        log.info("broadcast_send: нет пользователей")
        return
    file_bytes = None
    content_type = None
    if file_path and os.path.isfile(file_path):
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        try:
            os.unlink(file_path)
        except Exception:
            pass
        ext = (os.path.splitext(file_path)[1] or "").lower()
        content_type = (
            "image/jpeg" if ext in (".jpg", ".jpeg") else
            "image/heic" if ext == ".heic" else
            "image/png" if ext == ".png" else
            "application/pdf" if ext == ".pdf" else
            "video/mp4" if ext == ".mp4" else
            "image/gif" if ext == ".gif" else
            "application/octet-stream"
        )
    base = f"https://api.telegram.org/bot{token}"
    sent, failed = 0, 0
    for telegram_id in ids:
        try:
            if message_type == "text" or not file_bytes:
                r = httpx.post(
                    f"{base}/sendMessage",
                    json={"chat_id": telegram_id, "text": text or "(пусто)", "parse_mode": "HTML"},
                    timeout=15,
                )
            elif message_type == "photo":
                # HEIC (iPhone) Telegram не принимает в sendPhoto — отправляем как document
                if content_type == "image/heic":
                    r = httpx.post(
                        f"{base}/sendDocument",
                        data={"chat_id": telegram_id, "caption": text or "", "parse_mode": "HTML"},
                        files={"document": ("image.heic", file_bytes, content_type)},
                        timeout=20,
                    )
                else:
                    r = httpx.post(
                        f"{base}/sendPhoto",
                        data={"chat_id": telegram_id, "caption": text or "", "parse_mode": "HTML"},
                        files={"photo": ("file.jpg", file_bytes, content_type or "image/jpeg")},
                        timeout=20,
                    )
            elif message_type == "document":
                r = httpx.post(
                    f"{base}/sendDocument",
                    data={"chat_id": telegram_id, "caption": text or "", "parse_mode": "HTML"},
                    files={"document": ("file.pdf", file_bytes, content_type or "application/octet-stream")},
                    timeout=20,
                )
            elif message_type == "video":
                r = httpx.post(
                    f"{base}/sendVideo",
                    data={"chat_id": telegram_id, "caption": text or "", "parse_mode": "HTML"},
                    files={"video": ("file.mp4", file_bytes, content_type or "video/mp4")},
                    timeout=30,
                )
            elif message_type == "animation":
                r = httpx.post(
                    f"{base}/sendAnimation",
                    data={"chat_id": telegram_id, "caption": text or "", "parse_mode": "HTML"},
                    files={"animation": ("file.gif", file_bytes, content_type or "image/gif")},
                    timeout=20,
                )
            else:
                r = httpx.post(
                    f"{base}/sendMessage",
                    json={"chat_id": telegram_id, "text": text or "(пусто)", "parse_mode": "HTML"},
                    timeout=15,
                )
            if r.status_code == 200:
                sent += 1
            else:
                failed += 1
                if r.status_code != 403:
                    log.warning("broadcast_send telegram_id=%s status=%s %s", telegram_id, r.status_code, r.text[:150])
        except Exception as e:
            failed += 1
            log.warning("broadcast_send telegram_id=%s error=%s", telegram_id, e)
    log.info("broadcast_send done: sent=%s failed=%s total=%s", sent, failed, len(ids))
