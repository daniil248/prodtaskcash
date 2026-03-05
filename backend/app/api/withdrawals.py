import re
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Withdrawal, WithdrawalStatus, Transaction, TransactionType, SystemSetting
from app.schemas import WithdrawalRequest, WithdrawalSchema
from app.api.deps import get_current_user
from app.services.antifraid import check_user_allowed
from app.config import get_settings

router = APIRouter(prefix="/withdrawals", tags=["withdrawals"])
settings = get_settings()


async def _get_sys_decimal(db: AsyncSession, key: str, default: float) -> Decimal:
    row = (await db.execute(select(SystemSetting).where(SystemSetting.key == key))).scalar_one_or_none()
    if row:
        try:
            return Decimal(row.value)
        except Exception:
            pass
    return Decimal(str(default))

ALLOWED_METHODS = {"card", "sbp"}

_CARD_RE = re.compile(r"^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$")
_PHONE_RE = re.compile(r"^[\+7|8][\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$")


def _validate_requisites(method: str, requisites: str) -> tuple[bool, str]:
    m = method.lower()
    if m not in ALLOWED_METHODS:
        return False, "Доступны только методы: На карту, Через СБП"

    val = requisites.strip()
    if not val:
        return False, "Укажите реквизиты"

    if m == "card":
        digits = re.sub(r"[\s\-]", "", val)
        if not digits.isdigit() or len(digits) != 16:
            return False, "Номер карты: 16 цифр"
    elif m == "sbp":
        if not _PHONE_RE.match(val):
            return False, "Укажите номер телефона в формате +7XXXXXXXXXX"

    return True, ""


def _trust_max_withdrawal(trust_score: int, base_max: Decimal) -> Decimal:
    if trust_score < 50:
        return (base_max * Decimal("0.25")).quantize(Decimal("0.01"))
    if trust_score < 70:
        return (base_max * Decimal("0.50")).quantize(Decimal("0.01"))
    if trust_score < 90:
        return (base_max * Decimal("0.75")).quantize(Decimal("0.01"))
    return base_max


@router.get("", response_model=list[WithdrawalSchema])
async def list_withdrawals(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.user_id == user.id)
        .order_by(Withdrawal.created_at.desc())
        .limit(50)
    )
    return [WithdrawalSchema.model_validate(w) for w in result.scalars().all()]


@router.post("", response_model=WithdrawalSchema)
async def create_withdrawal(
    body: WithdrawalRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    allowed, msg = await check_user_allowed(user, db)
    if not allowed:
        raise HTTPException(status_code=403, detail=msg)

    min_amount = await _get_sys_decimal(db, "min_withdrawal", settings.MIN_WITHDRAWAL)
    if body.amount < min_amount:
        raise HTTPException(status_code=400, detail=f"Минимальная сумма вывода: {min_amount:.0f}₽")

    base_max = await _get_sys_decimal(db, "max_withdrawal_day", settings.MAX_WITHDRAWAL_DAY)
    effective_max = _trust_max_withdrawal(user.trust_score, base_max)
    if body.amount > effective_max:
        raise HTTPException(
            status_code=400,
            detail=f"Максимальная сумма для вашего уровня: {effective_max:.0f}₽",
        )

    if body.amount > user.balance:
        raise HTTPException(status_code=400, detail="Недостаточно средств на балансе")

    today_result = await db.execute(
        select(func.sum(Withdrawal.amount)).where(
            Withdrawal.user_id == user.id,
            Withdrawal.status != WithdrawalStatus.rejected,
            func.date(Withdrawal.created_at) == func.current_date(),
        )
    )
    today_total = today_result.scalar() or Decimal("0")
    if today_total + body.amount > base_max:
        raise HTTPException(status_code=400, detail=f"Дневной лимит вывода: {base_max:.0f}₽")

    week_start = datetime.now(timezone.utc) - timedelta(days=7)
    weekly_result = await db.execute(
        select(func.sum(Withdrawal.amount)).where(
            Withdrawal.user_id == user.id,
            Withdrawal.status != WithdrawalStatus.rejected,
            Withdrawal.created_at >= week_start,
        )
    )
    weekly_total = weekly_result.scalar() or Decimal("0")
    weekly_max = await _get_sys_decimal(db, "max_withdrawal_week", settings.MAX_WITHDRAWAL_WEEK)
    if weekly_total + body.amount > weekly_max:
        raise HTTPException(
            status_code=400,
            detail=f"Недельный лимит: {weekly_max:.0f}₽. Использовано: {float(weekly_total):.0f}₽",
        )

    ok, err = _validate_requisites(body.method, body.requisites)
    if not ok:
        raise HTTPException(status_code=400, detail=err)

    active_result = await db.execute(
        select(func.count(Withdrawal.id)).where(
            Withdrawal.user_id == user.id,
            Withdrawal.status.in_([WithdrawalStatus.created, WithdrawalStatus.processing]),
        )
    )
    if (active_result.scalar() or 0) >= 3:
        raise HTTPException(status_code=400, detail="Не более 3 активных заявок одновременно")

    fee_pct = await _get_sys_decimal(db, "withdrawal_fee_percent", settings.WITHDRAWAL_FEE_PERCENT) / 100
    fee = (body.amount * fee_pct).quantize(Decimal("0.01"))

    user.balance -= body.amount
    user.balance_pending += body.amount

    method_label = "На карту" if body.method.lower() == "card" else "Через СБП"
    withdrawal = Withdrawal(
        user_id=user.id,
        amount=body.amount,
        fee=fee,
        method=body.method.lower(),
        requisites=body.requisites.strip(),
        status=WithdrawalStatus.created,
    )
    db.add(withdrawal)
    await db.flush()

    db.add(Transaction(
        user_id=user.id,
        amount=-body.amount,
        tx_type=TransactionType.withdrawal,
        reference_id=withdrawal.id,
        description=f"Вывод {float(body.amount):.0f}₽ · {method_label}",
    ))

    await db.commit()
    await db.refresh(withdrawal)
    return WithdrawalSchema.model_validate(withdrawal)
