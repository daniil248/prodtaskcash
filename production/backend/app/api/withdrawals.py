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


def _normalize_phone(val: str) -> str | None:
    """Из строки вида +7 (999) 123-45-67 или 89991234567 извлекает 11 цифр, начинающихся с 7."""
    digits = re.sub(r"\D", "", val)
    if not digits:
        return None
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    if digits.startswith("7") and len(digits) == 11:
        return digits
    if len(digits) == 10 and digits[0] in "89":
        return "7" + digits
    return None


def _luhn_checksum(digits: str) -> bool:
    if len(digits) != 16 or not digits.isdigit():
        return False
    s = 0
    for i, c in enumerate(reversed(digits)):
        n = int(c)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        s += n
    return s % 10 == 0


def _validate_requisites(method: str, requisites: str) -> tuple[bool, str, str]:
    """Проверяет реквизиты. Возвращает (ok, error_message, normalized_requisites)."""
    m = method.lower()
    if m not in ALLOWED_METHODS:
        return False, "Доступны только методы: На карту, Через СБП", ""

    val = requisites.strip()
    if not val:
        return False, "Укажите реквизиты", ""

    if m == "card":
        digits = re.sub(r"[\s\-]", "", val)
        if not digits.isdigit() or len(digits) != 16:
            return False, "Номер карты: 16 цифр", ""
        # Не требуем Luhn — приём любых 16 цифр (проверка по Лuhну отключена, чтобы не блокировать реальные карты)
        return True, "", digits
    elif m == "sbp":
        normalized = _normalize_phone(val)
        if not normalized:
            return False, "Укажите номер телефона в формате +7 (999) 123-45-67 или 89991234567", ""
        return True, "", "+7" + normalized[1:]  # +7XXXXXXXXXX

    return True, "", val


# Москва UTC+3: сутки считаются с 00:00 по МСК
MSK = timezone(timedelta(hours=3))


def _msk_day_start(dt: datetime) -> datetime:
    """Начало календарных суток по МСК для данной даты/времени (в UTC)."""
    msk = dt.astimezone(MSK)
    start_msk = msk.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_msk.astimezone(timezone.utc)


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
    if body.amount > base_max:
        raise HTTPException(
            status_code=400,
            detail=f"Максимальная сумма одной заявки: {base_max:.0f}₽",
        )

    if body.amount > user.balance:
        raise HTTPException(status_code=400, detail="Недостаточно средств на балансе")

    # Сумма выводов за текущие сутки по МСК (00:00 МСК — следующие сутки)
    now_utc = datetime.now(timezone.utc)
    day_start_utc = _msk_day_start(now_utc)
    day_end_utc = day_start_utc + timedelta(days=1)
    today_result = await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).select_from(Withdrawal).where(
            Withdrawal.user_id == user.id,
            Withdrawal.status != WithdrawalStatus.rejected,
            Withdrawal.created_at >= day_start_utc,
            Withdrawal.created_at < day_end_utc,
        )
    )
    today_total = Decimal(str(today_result.scalar() or 0))
    if today_total + body.amount > base_max:
        raise HTTPException(
            status_code=400,
            detail=f"Дневной лимит вывода: {base_max:.0f}₽ (по МСК). Уже выведено сегодня: {float(today_total):.0f}₽",
        )

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

    # ФИО обязательно при первом выводе; потом хранится в user и только админ может менять
    effective_fio = (user.full_name or "").strip() or (body.full_name or "").strip()
    if not effective_fio:
        raise HTTPException(
            status_code=400,
            detail="Введите ФИО (полностью) для получения выплаты. Изменить ФИО потом можно только через техподдержку.",
        )
    if body.full_name and body.full_name.strip() and not user.full_name:
        user.full_name = body.full_name.strip()

    ok, err, normalized_requisites = _validate_requisites(body.method, body.requisites)
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
    requisites_to_store = normalized_requisites if normalized_requisites else body.requisites.strip()
    withdrawal = Withdrawal(
        user_id=user.id,
        amount=body.amount,
        fee=fee,
        method=body.method.lower(),
        requisites=requisites_to_store,
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
