from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Transaction, UserTask, UserTaskStatus, TransactionType
from app.schemas import ProfileSchema, TransactionSchema, TransactionListResponse
from app.api.deps import get_current_user
from app.services.antifraid import get_completed_today

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileSchema)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    completed_today = await get_completed_today(db, user.id)

    referrals_result = await db.execute(
        select(func.count(User.id)).where(User.referrer_id == user.id)
    )
    referrals_count = referrals_result.scalar() or 0

    schema = ProfileSchema.model_validate(user)
    schema.completed_today = completed_today
    schema.referrals_count = referrals_count
    return schema


@router.get("/transactions", response_model=TransactionListResponse)
async def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tx_type: TransactionType | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    filters = [Transaction.user_id == user.id]

    if tx_type:
        filters.append(Transaction.tx_type == tx_type)
    if date_from:
        filters.append(Transaction.created_at >= date_from)
    if date_to:
        filters.append(Transaction.created_at <= date_to)

    where_clause = and_(*filters)
    offset = (page - 1) * page_size

    total = (await db.execute(
        select(func.count(Transaction.id)).where(where_clause)
    )).scalar() or 0

    items_result = await db.execute(
        select(Transaction)
        .where(where_clause)
        .order_by(desc(Transaction.created_at))
        .offset(offset)
        .limit(page_size)
    )
    items = items_result.scalars().all()

    return TransactionListResponse(
        items=[TransactionSchema.model_validate(t) for t in items],
        total=total,
        page=page,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.delete("", status_code=204)
async def delete_account(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.balance = 0
    user.balance_pending = 0
    user.first_name = "Deleted"
    user.username = None
    user.telegram_id = -user.id
    user.is_banned = True
    user.ban_reason = "Account deleted by user"
    await db.commit()
