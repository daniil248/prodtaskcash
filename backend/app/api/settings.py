from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import SystemSetting

router = APIRouter(prefix="/settings", tags=["settings"])

# Keys that are safe to expose publicly
PUBLIC_KEYS = {"banner_budget", "banner_title"}


@router.get("/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(PUBLIC_KEYS))
    )
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}
