import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Transaction, UserTask, UserTaskStatus, TransactionType
from app.schemas import (
    ProfileSchema,
    TransactionSchema,
    TransactionListResponse,
    NotificationSettingsSchema,
    NotificationSettingsUpdate,
)
from app.api.deps import get_current_user
from app.services.antifraid import get_completed_today

router = APIRouter(prefix="/profile", tags=["profile"])

_DEFAULT_NOTIFY = {"notify_tasks": True, "notify_withdrawals": True, "notify_referrals": True}


def _parse_notify(user: User) -> dict:
    if not user.notification_settings:
        return _DEFAULT_NOTIFY.copy()
    try:
        data = json.loads(user.notification_settings)
        return {**_DEFAULT_NOTIFY, **{k: v for k, v in data.items() if k in _DEFAULT_NOTIFY}}
    except Exception:
        return _DEFAULT_NOTIFY.copy()


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


@router.get("/transactions/export")
async def export_transactions(
    format: str = Query("csv", regex="^csv$"),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    tx_type: TransactionType | None = Query(None),
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
    where = and_(*filters)
    result = await db.execute(
        select(Transaction).where(where).order_by(desc(Transaction.created_at)).limit(5000)
    )
    items = result.scalars().all()
    lines = ["Дата;Тип;Сумма;Описание"]
    type_labels = {
        "task_reward": "Награда за задание",
        "referral_bonus": "Реферальный бонус",
        "withdrawal": "Вывод",
        "withdrawal_fee": "Комиссия вывода",
        "adjustment": "Корректировка",
        "penalty": "Штраф",
    }
    for t in items:
        dt = t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else ""
        label = type_labels.get(t.tx_type.value if hasattr(t.tx_type, "value") else str(t.tx_type), str(t.tx_type))
        amount = str(t.amount).replace(".", ",")
        desc = (t.description or "").replace(";", ",")
        lines.append(f"{dt};{label};{amount};{desc}")
    from fastapi.responses import Response
    body = "\n".join(lines).encode("utf-8-sig")
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="transactions.csv"'},
    )


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


@router.get("/notifications", response_model=NotificationSettingsSchema)
async def get_notifications(user: User = Depends(get_current_user)):
    data = _parse_notify(user)
    return NotificationSettingsSchema(**data)


@router.patch("/notifications", response_model=NotificationSettingsSchema)
async def update_notifications(
    body: NotificationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = _parse_notify(user)
    if body.notify_tasks is not None:
        data["notify_tasks"] = body.notify_tasks
    if body.notify_withdrawals is not None:
        data["notify_withdrawals"] = body.notify_withdrawals
    if body.notify_referrals is not None:
        data["notify_referrals"] = body.notify_referrals
    user.notification_settings = json.dumps(data)
    await db.commit()
    return NotificationSettingsSchema(**data)


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
