from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, Transaction, TransactionType, UserTask, UserTaskStatus, SystemSetting
from app.config import get_settings

settings = get_settings()


def make_referral_link(telegram_id: int) -> str:
    return f"https://t.me/{settings.BOT_USERNAME}?startapp={telegram_id}"


async def _get_sys_value(db: AsyncSession, key: str, default: float) -> float:
    row = (await db.execute(select(SystemSetting).where(SystemSetting.key == key))).scalar_one_or_none()
    if row:
        try:
            return float(row.value)
        except Exception:
            pass
    return default


async def get_referral_stats(db: AsyncSession, user: User) -> dict:
    min_tasks = int(await _get_sys_value(db, "referral_min_tasks", settings.REFERRAL_MIN_TASKS))

    result = await db.execute(
        select(User).where(User.referrer_id == user.id)
    )
    referrals = result.scalars().all()

    total_from_referrals = Decimal("0")
    referral_data = []

    for ref in referrals:
        earned = await _referral_earnings(db, user.id, ref.id)
        total_from_referrals += earned

        completed_count = await db.execute(
            select(func.count(UserTask.id)).where(
                UserTask.user_id == ref.id,
                UserTask.status == UserTaskStatus.completed,
            )
        )
        task_count = completed_count.scalar() or 0
        if ref.is_banned:
            status = "blocked"
        elif task_count >= min_tasks:
            status = "active"
        elif task_count >= 1:
            status = "first_done"
        else:
            status = "new"

        referral_data.append({
            "telegram_id": ref.telegram_id,
            "first_name": ref.first_name,
            "username": ref.username,
            "is_active": task_count >= min_tasks and not ref.is_banned,
            "status": status,
            "tasks_completed": task_count,
            "joined_at": ref.created_at,
            "earned_from": earned,
        })

    reward_val = await _get_sys_value(db, "referral_reward", settings.REFERRAL_REWARD)
    return {
        "referral_link": make_referral_link(user.telegram_id),
        "referrals_count": len(referrals),
        "total_from_referrals": total_from_referrals,
        "referral_reward": reward_val,
        "referral_min_tasks": min_tasks,
        "referrals": referral_data,
    }


async def _referral_earnings(db: AsyncSession, referrer_id: int, referral_id: int) -> Decimal:
    result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == referrer_id,
            Transaction.tx_type == TransactionType.referral_bonus,
            Transaction.reference_id == referral_id,
        )
    )
    return result.scalar() or Decimal("0")


async def try_give_referral_reward(db: AsyncSession, referral: User) -> None:
    if not referral.referrer_id or referral.referral_reward_given:
        return

    referrer_result = await db.execute(select(User).where(User.id == referral.referrer_id))
    referrer = referrer_result.scalar_one_or_none()
    if not referrer or referrer.is_banned:
        return

    # Антинакрутка: один и тот же device = свой реферал с второго аккаунта — бонус не начисляем
    if (
        referral.device_fingerprint
        and referrer.device_fingerprint
        and referral.device_fingerprint == referrer.device_fingerprint
    ):
        return

    min_tasks = int(await _get_sys_value(db, "referral_min_tasks", settings.REFERRAL_MIN_TASKS))

    completed = await db.execute(
        select(func.count(UserTask.id)).where(
            UserTask.user_id == referral.id,
            UserTask.status == UserTaskStatus.completed,
        )
    )
    count = completed.scalar() or 0

    if count < min_tasks:
        return

    reward = Decimal(str(await _get_sys_value(db, "referral_reward", settings.REFERRAL_REWARD)))
    referrer.balance += reward
    referrer.total_earned += reward

    db.add(Transaction(
        user_id=referrer.id,
        amount=reward,
        tx_type=TransactionType.referral_bonus,
        reference_id=referral.id,
        description=f"Реферальный бонус за {referral.first_name}",
    ))

    referral.referral_reward_given = True
    await db.commit()
