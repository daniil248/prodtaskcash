from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import SystemSetting, User

router = APIRouter(prefix="/settings", tags=["settings"])

# Keys that are safe to expose publicly
PUBLIC_KEYS = {
    "banner_budget",
    "banner_title",
    "min_withdrawal",
    "withdrawal_fee_percent",
}

# Consider "online" = active in the last 5 minutes
ONLINE_WINDOW = timedelta(minutes=5)


@router.get("/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(PUBLIC_KEYS))
    )
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}


@router.get("/online")
async def get_online_count(db: AsyncSession = Depends(get_db)):
    since = datetime.now(timezone.utc) - ONLINE_WINDOW
    count = (await db.execute(
        select(func.count(User.id)).where(
            User.last_active_at >= since,
            User.is_banned == False,
        )
    )).scalar() or 0
    return {"online": count}
