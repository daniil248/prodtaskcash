"""
Запуск проверки задания (подписка/лайк) и применение результата к БД.
Используется из API (check_task) и при необходимости из Celery-воркера.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Task,
    TaskType,
    UserTask,
    UserTaskStatus,
    User,
    Transaction,
    TransactionType,
)
from app.services.verification import check_subscription, check_reaction
from app.services.referral import try_give_referral_reward

log = logging.getLogger(__name__)


async def run_verification(
    task: Task,
    user_task: UserTask,
    user: User,
) -> tuple[bool, str]:
    """Выполняет проверку (getChatMember и т.д.), не меняет БД. Возвращает (success, message)."""
    success = False
    message = ""

    if task.task_type == TaskType.subscribe:
        if not task.channel_id:
            success, message = False, "Канал не настроен"
            log.warning("run_verification: subscribe task_id=%s channel_id empty", task.id)
        else:
            success, message = await check_subscription(user.telegram_id, task.channel_id)
            if not success:
                log.info(
                    "run_verification: subscribe failed task_id=%s user_id=%s channel_id=%s msg=%s",
                    task.id, user.id, task.channel_id, message,
                )

    elif task.task_type == TaskType.like:
        if not task.channel_id or not task.post_id:
            success, message = False, "Параметры задания не настроены"
        else:
            success, message = await check_reaction(
                user.telegram_id, task.channel_id, task.post_id
            )

    else:
        # watch_ad, invite — не поддерживаем проверку в API, только в воркере
        return False, "Тип задания не поддерживает проверку здесь"

    return success, message


async def apply_verification_result(
    db: AsyncSession,
    task: Task,
    user_task: UserTask,
    user: User,
    success: bool,
    message: str,
) -> None:
    """Обновляет user_task, баланс, транзакцию, реферала. Не коммитит и не шлёт уведомления."""
    if success:
        user_task.status = UserTaskStatus.completed
        user_task.completed_at = datetime.now(timezone.utc)

        user.balance += task.reward
        user.total_earned += task.reward
        task.total_completions += 1

        if task.max_completions is not None and task.total_completions >= task.max_completions:
            task.is_active = False

        db.add(
            Transaction(
                user_id=user.id,
                amount=task.reward,
                tx_type=TransactionType.task_reward,
                reference_id=task.id,
                description=f"Награда за задание: {task.title}",
            )
        )
        from app.services.antifraid import update_trust_score, SCORE_BONUSES
        old_ts = user.trust_score
        user.trust_score = min(100, user.trust_score + SCORE_BONUSES["task_completed"])
        log.info(
            "trust_score change telegram_id=%s old=%s delta=+%s new=%s reason=task_completed",
            user.telegram_id, old_ts, SCORE_BONUSES["task_completed"], user.trust_score,
        )
    else:
        user_task.status = UserTaskStatus.failed
        user_task.error_message = message
