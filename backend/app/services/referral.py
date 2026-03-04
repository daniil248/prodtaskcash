from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, Transaction, TransactionType, UserTask, UserTaskStatus
from app.config import get_settings

settings = get_settings()


def make_referral_link(telegram_id: int) -> str:
    return f"https://t.me/{settings.BOT_USERNAME}?start={telegram_id}"


async def get_referral_stats(db: AsyncSession, user: User) -> dict:
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

        referral_data.append({
            "telegram_id": ref.telegram_id,
            "first_name": ref.first_name,
            "username": ref.username,
            "is_active": task_count >= settings.REFERRAL_MIN_TASKS,
            "joined_at": ref.created_at,
            "earned_from": earned,
        })

    return {
        "referral_link": make_referral_link(user.telegram_id),
        "referrals_count": len(referrals),
        "total_from_referrals": total_from_referrals,
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

    completed = await db.execute(
        select(func.count(UserTask.id)).where(
            UserTask.user_id == referral.id,
            UserTask.status == UserTaskStatus.completed,
        )
    )
    count = completed.scalar() or 0

    if count < settings.REFERRAL_MIN_TASKS:
        return

    referrer_result = await db.execute(select(User).where(User.id == referral.referrer_id))
    referrer = referrer_result.scalar_one_or_none()
    if not referrer or referrer.is_banned:
        return

    reward = Decimal(str(settings.REFERRAL_REWARD))
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
