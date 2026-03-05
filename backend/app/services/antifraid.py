import logging
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, UserTask, UserTaskStatus, Transaction, TransactionType

logger = logging.getLogger(__name__)

TRUST_THRESHOLDS = {
    # Auto-ban only when clearly fraudulent (multiple confirmed violations)
    "soft_block": 10,
    "warn": 25,
}

SCORE_PENALTIES = {
    "fast_completion": -5,
    "vpn_proxy": -10,
    "suspicious_pattern": -15,
    # Fingerprint of another account — significant but not instant ban
    "device_duplicate": -20,
}

SCORE_BONUSES = {
    "task_completed": 1,
    "referral_active": 2,
}


async def check_user_allowed(user: User) -> tuple[bool, str | None]:
    if user.is_banned:
        return False, "Аккаунт заблокирован"
    if user.trust_score < TRUST_THRESHOLDS["soft_block"]:
        return False, "Аккаунт временно ограничен"
    return True, None


async def analyze_task_timing(
    db: AsyncSession,
    user: User,
    user_task_id: int,
    min_seconds: int,
) -> tuple[bool, int]:
    """
    Проверяет, прошло ли достаточно времени с начала задания.
    Возвращает (passed, penalty). penalty < 0 если слишком быстро.
    """
    result = await db.execute(select(UserTask).where(UserTask.id == user_task_id))
    user_task = result.scalar_one_or_none()
    if not user_task:
        return False, 0

    elapsed = (
        datetime.now(timezone.utc)
        - user_task.started_at.replace(tzinfo=timezone.utc)
    ).total_seconds()

    penalty = 0
    if elapsed < min_seconds * 0.5:
        # Критически быстро — двойной штраф
        penalty = SCORE_PENALTIES["fast_completion"] * 2
    elif elapsed < min_seconds:
        penalty = SCORE_PENALTIES["fast_completion"]

    return elapsed >= min_seconds, penalty


async def check_device_duplicate(db: AsyncSession, fingerprint: str, telegram_id: int) -> bool:
    """True если такой fingerprint уже есть у другого пользователя."""
    if not fingerprint:
        return False
    result = await db.execute(
        select(User).where(
            User.device_fingerprint == fingerprint,
            User.telegram_id != telegram_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def check_ip_reputation(ip: str) -> tuple[bool, int]:
    """
    Проверяет IP через ip-api.com (free tier, 45 req/min).
    Возвращает (is_suspicious, trust_penalty).
    Никогда не блокирует — только логирует и снижает трест.
    """
    if not ip or ip in ("127.0.0.1", "::1", "localhost"):
        return False, 0
    try:
        import httpx
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,proxy,hosting,countryCode"},
            )
            data = r.json()
        if data.get("status") == "success":
            if data.get("proxy") or data.get("hosting"):
                logger.info("Suspicious IP detected: %s (proxy=%s hosting=%s)",
                            ip, data.get("proxy"), data.get("hosting"))
                return True, SCORE_PENALTIES["vpn_proxy"]
    except Exception as e:
        logger.debug("IP reputation check failed for %s: %s", ip, e)
    return False, 0


async def update_trust_score(db: AsyncSession, user: User, delta: int) -> None:
    """Изменяет trust_score, при падении ниже порога — автобан."""
    new_score = max(0, min(100, user.trust_score + delta))
    user.trust_score = new_score
    if new_score < TRUST_THRESHOLDS["soft_block"] and not user.is_banned:
        user.is_banned = True
        user.ban_reason = "Автоматическая блокировка: низкий рейтинг доверия"
        logger.warning(
            "Auto-banned user telegram_id=%s trust_score=%s",
            user.telegram_id, new_score,
        )
        # Уведомляем пользователя
        try:
            from app.workers.tasks import send_notification
            send_notification.delay(
                user.telegram_id,
                "⛔ Ваш аккаунт заблокирован за нарушение правил сервиса TaskCash.\n"
                "Если вы считаете это ошибкой, обратитесь в поддержку.",
            )
        except Exception:
            pass
    await db.commit()


async def get_completed_today(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count(UserTask.id)).where(
            UserTask.user_id == user_id,
            UserTask.status == UserTaskStatus.completed,
            UserTask.day == date.today(),
        )
    )
    return result.scalar() or 0


async def can_start_task(
    db: AsyncSession,
    user_id: int,
    task_id: int,
    daily_limit: int,
    total_limit: int,
) -> tuple[bool, str]:
    if daily_limit > 0:
        daily_done = (await db.execute(
            select(func.count(UserTask.id)).where(
                UserTask.user_id == user_id,
                UserTask.task_id == task_id,
                UserTask.status == UserTaskStatus.completed,
                UserTask.day == date.today(),
            )
        )).scalar() or 0
        if daily_done >= daily_limit:
            return False, "Задание уже выполнено сегодня"

    if total_limit > 0:
        total_done = (await db.execute(
            select(func.count(UserTask.id)).where(
                UserTask.user_id == user_id,
                UserTask.task_id == task_id,
                UserTask.status == UserTaskStatus.completed,
            )
        )).scalar() or 0
        if total_done >= total_limit:
            return False, "Задание уже выполнено (достигнут лимит)"

    in_progress = await db.execute(
        select(UserTask).where(
            UserTask.user_id == user_id,
            UserTask.task_id == task_id,
            UserTask.status == UserTaskStatus.in_progress,
        )
    )
    if in_progress.scalar_one_or_none():
        return False, "Задание уже выполняется"

    return True, ""
