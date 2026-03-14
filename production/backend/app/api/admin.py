import logging
import os
import tempfile
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    User, Task, TaskType, UserTask, UserTaskStatus, Transaction, TransactionType,
    Withdrawal, WithdrawalStatus, BlacklistEntry, SystemSetting,
)
from app.schemas import (
    AdminLoginRequest, AdminLoginResponse, AdminUserSchema, AdminStatsSchema,
    AdminUserUpdate,
    TrialSetRequest, TrialStateResponse,
    TaskCreateRequest, TaskUpdateRequest, TaskSchema, WithdrawalSchema, WithdrawalAdminSchema,
    AdminWithdrawalAction, AdminBalanceAdjust,
    BlacklistEntrySchema, BlacklistCreateRequest,
    SystemSettingSchema, SystemSettingUpdateRequest,
)
from app.api.deps import get_admin, ADMIN_PANEL_ENABLED_KEY
from app.services.auth import create_admin_token
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


def _post_id_from_url(url: str | None) -> str | None:
    """Из ссылки t.me/channel/123 или t.me/c/1234567890/123 извлекает ID поста (123)."""
    if not url or not url.strip():
        return None
    url = url.strip().rstrip("/")
    parts = url.split("/")
    for part in reversed(parts):
        if part and part.isdigit():
            return part
    return None


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(body: AdminLoginRequest):
    if body.secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")
    return AdminLoginResponse(access_token=create_admin_token())


@router.post("/trial", response_model=TrialStateResponse)
async def admin_trial_toggle(body: TrialSetRequest, db: AsyncSession = Depends(get_db)):
    if body.secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid secret")
    row = (
        await db.execute(
            select(SystemSetting).where(SystemSetting.key == ADMIN_PANEL_ENABLED_KEY).limit(1)
        )
    ).scalar_one_or_none()
    if body.enabled is not None:
        val = "true" if body.enabled else "false"
        now = datetime.now(timezone.utc)
        if row:
            row.value = val
            row.updated_at = now
        else:
            db.add(SystemSetting(key=ADMIN_PANEL_ENABLED_KEY, value=val, updated_at=now))
        await db.commit()
        if row:
            await db.refresh(row)
        row = (
            await db.execute(
                select(SystemSetting).where(SystemSetting.key == ADMIN_PANEL_ENABLED_KEY).limit(1)
            )
        ).scalar_one_or_none()
    current = row.value.strip().lower() != "false" if row else True
    return TrialStateResponse(enabled=current)


@router.get("/stats", response_model=AdminStatsSchema)
async def get_stats(db: AsyncSession = Depends(get_db), _: bool = Depends(get_admin)):
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    active_today = (await db.execute(
        select(func.count(UserTask.user_id.distinct())).where(
            func.date(UserTask.started_at) == func.current_date()
        )
    )).scalar() or 0

    tasks_today = (await db.execute(
        select(func.count(UserTask.id)).where(
            UserTask.status == UserTaskStatus.completed,
            func.date(UserTask.completed_at) == func.current_date(),
        )
    )).scalar() or 0

    total_paid = (await db.execute(
        select(func.sum(Withdrawal.amount - Withdrawal.fee)).where(
            Withdrawal.status == WithdrawalStatus.paid
        )
    )).scalar() or Decimal("0")

    pending_count = (await db.execute(
        select(func.count(Withdrawal.id)).where(
            Withdrawal.status.in_([WithdrawalStatus.created, WithdrawalStatus.processing])
        )
    )).scalar() or 0

    pending_amount = (await db.execute(
        select(func.sum(Withdrawal.amount)).where(
            Withdrawal.status.in_([WithdrawalStatus.created, WithdrawalStatus.processing])
        )
    )).scalar() or Decimal("0")

    return AdminStatsSchema(
        total_users=total_users,
        active_today=active_today,
        tasks_completed_today=tasks_today,
        total_paid_out=total_paid,
        pending_withdrawals=pending_count,
        pending_amount=pending_amount,
    )


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserSchema])
async def list_users(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    q = select(User).order_by(desc(User.created_at)).offset((page - 1) * 50).limit(50)
    if search:
        q = q.where(
            User.first_name.ilike(f"%{search}%") | User.username.ilike(f"%{search}%")
        )
    result = await db.execute(q)
    return [AdminUserSchema.model_validate(u) for u in result.scalars().all()]


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    txs_result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(desc(Transaction.created_at))
        .limit(30)
    )
    txs = txs_result.scalars().all()

    completed_result = await db.execute(
        select(UserTask, Task)
        .join(Task, UserTask.task_id == Task.id)
        .where(UserTask.user_id == user_id, UserTask.status == UserTaskStatus.completed)
        .order_by(desc(UserTask.completed_at))
        .limit(20)
    )
    completed = completed_result.all()

    # Withdrawals
    withdrawals_result = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.user_id == user_id)
        .order_by(desc(Withdrawal.created_at))
        .limit(10)
    )
    withdrawals = withdrawals_result.scalars().all()

    return {
        "user": AdminUserSchema.model_validate(user),
        "transactions": [
            {
                "id": t.id,
                "amount": float(t.amount),
                "tx_type": t.tx_type.value if hasattr(t.tx_type, 'value') else str(t.tx_type),
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in txs
        ],
        "completed_tasks": [
            {
                "task_id": ut.task_id,
                "task_title": task.title,
                "reward": float(task.reward),
                "completed_at": ut.completed_at.isoformat() if ut.completed_at else None,
            }
            for ut, task in completed
        ],
        "withdrawals": [
            {
                "id": w.id,
                "amount": float(w.amount),
                "fee": float(w.fee),
                "method": w.method,
                "status": w.status.value if hasattr(w.status, 'value') else str(w.status),
                "created_at": w.created_at.isoformat() if w.created_at else None,
            }
            for w in withdrawals
        ],
    }


@router.post("/users/{user_id}/ban", status_code=204)
async def ban_user(
    user_id: int,
    body: AdminWithdrawalAction,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404)

    user.is_banned = True
    user.ban_reason = body.note or "Admin ban"
    old_ts = user.trust_score
    user.trust_score = 0
    logger.info(
        "trust_score change telegram_id=%s old=%s new=0 reason=admin_ban",
        user.telegram_id, old_ts,
    )

    # Добавляем в чёрный список (все известные идентификаторы)
    db.add(BlacklistEntry(
        telegram_id=user.telegram_id,
        device_fingerprint=user.device_fingerprint,
        ip_address=user.last_ip,
        reason=body.note or "Admin ban",
    ))

    # ТЗ 3.5.2: разрываем реферальные связи
    if user.referrer_id:
        referral_txs = await db.execute(
            select(Transaction).where(
                Transaction.user_id == user.referrer_id,
                Transaction.tx_type == TransactionType.referral_bonus,
                Transaction.reference_id == user.id,
            )
        )
        txs = referral_txs.scalars().all()
        total_to_revoke = sum(t.amount for t in txs)

        if total_to_revoke > 0:
            referrer_result = await db.execute(select(User).where(User.id == user.referrer_id))
            referrer = referrer_result.scalar_one_or_none()
            if referrer:
                referrer.balance = max(Decimal("0"), referrer.balance - total_to_revoke)
                referrer.total_earned = max(Decimal("0"), referrer.total_earned - total_to_revoke)
                db.add(Transaction(
                    user_id=referrer.id,
                    amount=-total_to_revoke,
                    tx_type=TransactionType.penalty,
                    reference_id=user.id,
                    description=f"Аннулирование реферального дохода (пользователь #{user.id} заблокирован)",
                ))

    # Аннулируем незавершённые выводы
    pending_ws = await db.execute(
        select(Withdrawal).where(
            Withdrawal.user_id == user.id,
            Withdrawal.status.in_([WithdrawalStatus.created, WithdrawalStatus.processing]),
        )
    )
    for w in pending_ws.scalars().all():
        w.status = WithdrawalStatus.rejected
        w.admin_note = "Автоматически отклонено при блокировке аккаунта"
        user.balance_pending = max(Decimal("0"), user.balance_pending - w.amount)

    user.balance = Decimal("0")
    await db.commit()

    # Уведомление: ТЗ требует общего сообщения без раскрытия деталей
    from app.workers.tasks import send_notification
    send_notification.delay(
        user.telegram_id,
        "⛔ Ваш аккаунт заблокирован за нарушение правил сервиса TaskCash.\n"
        "Если вы считаете это ошибкой, обратитесь в поддержку.",
        "tasks",
    )


@router.post("/users/{user_id}/unban", status_code=204)
async def unban_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404)
    user.is_banned = False
    old_ts = user.trust_score
    user.trust_score = 30
    logger.info(
        "trust_score change telegram_id=%s old=%s new=30 reason=admin_unban",
        user.telegram_id, old_ts,
    )
    user.ban_reason = None

    # Снимаем из чёрного списка по telegram_id
    bl_result = await db.execute(
        select(BlacklistEntry).where(BlacklistEntry.telegram_id == user.telegram_id)
    )
    for entry in bl_result.scalars().all():
        await db.delete(entry)

    await db.commit()


@router.post("/users/{user_id}/balance", status_code=204)
async def adjust_balance(
    user_id: int,
    body: AdminBalanceAdjust,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404)
    user.balance += body.amount
    if body.amount > 0:
        user.total_earned += body.amount
    db.add(Transaction(
        user_id=user.id,
        amount=body.amount,
        tx_type=TransactionType.adjustment,
        description=f"Ручная корректировка: {body.reason}",
    ))
    await db.commit()


@router.patch("/users/{user_id}", response_model=AdminUserSchema)
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    """Обновить пользователя (ФИО — только админ, через поддержку)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404)
    if body.full_name is not None:
        user.full_name = body.full_name.strip() or None
    await db.commit()
    await db.refresh(user)
    return AdminUserSchema.model_validate(user)


# ── Tasks ─────────────────────────────────────────────────────────────────────

@router.get("/tasks", response_model=list[TaskSchema])
async def list_tasks(db: AsyncSession = Depends(get_db), _: bool = Depends(get_admin)):
    result = await db.execute(select(Task).order_by(Task.sort_order, Task.id))
    return [TaskSchema.model_validate(t) for t in result.scalars().all()]


@router.post("/tasks", response_model=TaskSchema, status_code=201)
async def create_task(
    body: TaskCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    data = body.model_dump()
    if data.get("task_type") == TaskType.like and data.get("external_url") and not data.get("post_id"):
        data["post_id"] = _post_id_from_url(data["external_url"])
    task = Task(**data)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskSchema.model_validate(task)


@router.put("/tasks/{task_id}", response_model=TaskSchema)
async def update_task(
    task_id: int,
    body: TaskUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404)
    data = body.model_dump()
    if task.task_type == TaskType.like and data.get("external_url"):
        data["post_id"] = _post_id_from_url(data["external_url"]) or data.get("post_id")
    for k, v in data.items():
        setattr(task, k, v)
    await db.commit()
    await db.refresh(task)
    return TaskSchema.model_validate(task)


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404)
    # Delete related UserTask records first (no CASCADE on FK)
    ut_result = await db.execute(select(UserTask).where(UserTask.task_id == task_id))
    for ut in ut_result.scalars().all():
        await db.delete(ut)
    await db.delete(task)
    await db.commit()


# ── Withdrawals ───────────────────────────────────────────────────────────────

@router.get("/withdrawals", response_model=list[WithdrawalAdminSchema])
async def list_withdrawals(
    status: WithdrawalStatus | None = None,
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    q = (
        select(Withdrawal, User)
        .join(User, Withdrawal.user_id == User.id)
        .order_by(desc(Withdrawal.created_at))
        .offset((page - 1) * 50)
        .limit(50)
    )
    if status:
        q = q.where(Withdrawal.status == status)
    result = await db.execute(q)
    rows = result.all()
    return [
        WithdrawalAdminSchema(
            id=w.id,
            user_id=w.user_id,
            amount=w.amount,
            fee=w.fee,
            method=w.method,
            requisites=w.requisites,
            status=w.status,
            admin_note=w.admin_note,
            created_at=w.created_at,
            processed_at=w.processed_at,
            user_first_name=u.first_name or "",
            user_last_name=u.last_name,
            user_username=u.username,
            user_telegram_id=u.telegram_id,
        )
        for w, u in rows
    ]


@router.post("/withdrawals/{w_id}/approve", status_code=204)
async def approve_withdrawal(
    w_id: int,
    body: AdminWithdrawalAction,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(Withdrawal).where(Withdrawal.id == w_id))
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=404)
    if w.status == WithdrawalStatus.paid:
        raise HTTPException(status_code=400, detail="Already paid")

    user_result = await db.execute(select(User).where(User.id == w.user_id))
    user = user_result.scalar_one()
    user.balance_pending = max(Decimal("0"), user.balance_pending - w.amount)

    db.add(Transaction(
        user_id=w.user_id,
        amount=-w.fee,
        tx_type=TransactionType.withdrawal_fee,
        reference_id=w.id,
        description=f"Комиссия за вывод #{w.id}",
    ))

    w.status = WithdrawalStatus.paid
    w.admin_note = body.note
    w.processed_at = datetime.now(timezone.utc)
    await db.commit()

    net = float(w.amount - w.fee)
    text = (
        f"💸 <b>Заявка на вывод выполнена!</b>\n\n"
        f"Сумма: <b>{float(w.amount):.2f}₽</b>\n"
        f"Получите: <b>{net:.2f}₽</b> на {w.method}\n"
        f"Реквизиты: <code>{w.requisites}</code>"
    )
    try:
        from app.workers.tasks import _send_notification_async
        await _send_notification_async(user.telegram_id, text, "withdrawals")
    except Exception as e:
        logger.warning("Withdrawal approval notification failed telegram_id=%s: %s", user.telegram_id, e)


@router.post("/withdrawals/{w_id}/reject", status_code=204)
async def reject_withdrawal(
    w_id: int,
    body: AdminWithdrawalAction,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(Withdrawal).where(Withdrawal.id == w_id))
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=404)
    if w.status in (WithdrawalStatus.paid, WithdrawalStatus.rejected):
        raise HTTPException(status_code=400, detail="Already finalized")

    user_result = await db.execute(select(User).where(User.id == w.user_id))
    user = user_result.scalar_one()
    user.balance += w.amount
    user.balance_pending = max(Decimal("0"), user.balance_pending - w.amount)

    db.add(Transaction(
        user_id=w.user_id,
        amount=w.amount,
        tx_type=TransactionType.adjustment,
        reference_id=w.id,
        description=f"Возврат по отклонённому выводу #{w.id}",
    ))

    w.status = WithdrawalStatus.rejected
    w.admin_note = body.note
    w.processed_at = datetime.now(timezone.utc)
    await db.commit()

    note_part = f"\nПричина: {body.note}" if body.note else ""
    text = (
        f"⚠️ <b>Заявка на вывод отклонена</b>\n\n"
        f"Сумма <b>{float(w.amount):.2f}₽</b> возвращена на ваш баланс.{note_part}"
    )
    try:
        from app.workers.tasks import _send_notification_async
        await _send_notification_async(user.telegram_id, text, "withdrawals")
    except Exception as e:
        logger.warning("Withdrawal reject notification failed telegram_id=%s: %s", user.telegram_id, e)


# ── Blacklist ─────────────────────────────────────────────────────────────────

@router.get("/blacklist", response_model=list[BlacklistEntrySchema])
async def list_blacklist(
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(
        select(BlacklistEntry)
        .order_by(desc(BlacklistEntry.created_at))
        .offset((page - 1) * 50)
        .limit(50)
    )
    return [BlacklistEntrySchema.model_validate(e) for e in result.scalars().all()]


@router.post("/blacklist", response_model=BlacklistEntrySchema, status_code=201)
async def add_to_blacklist(
    body: BlacklistCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    if not body.telegram_id and not body.device_fingerprint and not body.ip_address:
        raise HTTPException(status_code=400, detail="Укажите хотя бы одно поле")
    entry = BlacklistEntry(**body.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return BlacklistEntrySchema.model_validate(entry)


@router.delete("/blacklist/{entry_id}", status_code=204)
async def remove_from_blacklist(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(BlacklistEntry).where(BlacklistEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404)
    await db.delete(entry)
    await db.commit()


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(
    days: int = Query(14, ge=7, le=30),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    """Daily stats for the past N days: registrations, completions, payouts."""
    today = datetime.now(timezone.utc).date()
    result = []
    for i in range(days - 1, -1, -1):
        day: date = today - timedelta(days=i)

        regs = (await db.execute(
            select(func.count(User.id)).where(func.date(User.created_at) == day)
        )).scalar() or 0

        comps = (await db.execute(
            select(func.count(UserTask.id)).where(
                UserTask.status == UserTaskStatus.completed,
                func.date(UserTask.completed_at) == day,
            )
        )).scalar() or 0

        payout = (await db.execute(
            select(func.sum(Withdrawal.amount)).where(
                Withdrawal.status == WithdrawalStatus.paid,
                func.date(Withdrawal.processed_at) == day,
            )
        )).scalar() or Decimal("0")

        result.append({
            "date": day.isoformat(),
            "registrations": regs,
            "completions": comps,
            "payouts": float(payout),
        })
    return result


# ── System Settings ───────────────────────────────────────────────────────────

@router.get("/settings", response_model=list[SystemSettingSchema])
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    result = await db.execute(select(SystemSetting).order_by(SystemSetting.key))
    return [SystemSettingSchema.model_validate(s) for s in result.scalars().all()]


# ── Broadcast (рассылка по всем пользователям пользовательского бота) ─────────

@router.post("/broadcast", status_code=202)
async def create_broadcast(
    message_type: str = Form("text"),
    text: str = Form(""),
    file: UploadFile | None = File(None),
    _: bool = Depends(get_admin),
):
    """
    Запустить рассылку всем пользователям (user bot).
    message_type: text | photo | document | video | animation
    Поддерживаются: текст; JPEG/PNG/HEIC (photo); PDF, HEIC (document); видео; GIF.
    """
    if message_type not in ("text", "photo", "document", "video", "animation"):
        raise HTTPException(status_code=400, detail="message_type: text | photo | document | video | animation")
    if message_type != "text" and not file:
        raise HTTPException(status_code=400, detail="Для рассылки с медиа нужен файл")
    path = None
    if file and file.filename:
        suffix = os.path.splitext(file.filename)[1] or ".bin"
        fd, path = tempfile.mkstemp(suffix=suffix, prefix="broadcast_")
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(await file.read())
        except Exception:
            os.unlink(path)
            raise
    from app.workers.tasks import broadcast_send
    broadcast_send.delay(message_type, (text or "").strip(), path)
    return {"status": "accepted", "message": "Рассылка запущена"}


@router.put("/settings/{key}", response_model=SystemSettingSchema)
async def update_system_setting(
    key: str,
    body: SystemSettingUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_admin),
):
    """Сохраняет настройку в БД. Эти же значения читают выводы, рефералы и т.д. — должен использоваться один бэкенд и одна БД."""
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        setting = SystemSetting(key=key, value=body.value, description='', updated_at=datetime.now(timezone.utc))
        db.add(setting)
    else:
        setting.value = body.value
        setting.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.commit()
    await db.refresh(setting)
    return SystemSettingSchema.model_validate(setting)
