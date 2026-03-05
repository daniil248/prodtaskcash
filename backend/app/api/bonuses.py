from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, Transaction, TransactionType
from app.schemas import BonusesSchema, ReferralSchema
from app.api.deps import get_current_user
from app.services.referral import get_referral_stats

router = APIRouter(prefix="/bonuses", tags=["bonuses"])


@router.get("", response_model=BonusesSchema)
async def get_bonuses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stats = await get_referral_stats(db, user)
    return BonusesSchema(
        referral_link=stats["referral_link"],
        referrals_count=stats["referrals_count"],
        total_from_referrals=stats["total_from_referrals"],
        referrals=[ReferralSchema(**r) for r in stats["referrals"]],
    )


@router.get("/income-history")
async def get_referral_income_history(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Returns referral income grouped by day for the last 14 days."""
    since = datetime.now(timezone.utc) - timedelta(days=13)

    result = await db.execute(
        select(
            func.date(Transaction.created_at).label("day"),
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.tx_type == TransactionType.referral_bonus,
            Transaction.created_at >= since,
        )
        .group_by(func.date(Transaction.created_at))
        .order_by(func.date(Transaction.created_at))
    )
    rows = result.all()

    # Build full 14-day range filling zeros
    data = {}
    for row in rows:
        data[str(row.day)] = float(row.total or 0)

    days = []
    for i in range(13, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        days.append({"date": str(d), "amount": data.get(str(d), 0.0)})

    return days
