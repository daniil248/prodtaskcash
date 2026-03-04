from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
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
