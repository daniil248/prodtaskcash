import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

log = logging.getLogger(__name__)
from sqlalchemy import select, and_, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Task, TaskType, UserTask, UserTaskStatus, User, Transaction, TransactionType
from app.schemas import TaskSchema, TaskListResponse, StartTaskResponse, CheckTaskResponse, TaskStatusResponse
from app.api.deps import get_current_user
from app.services.antifraid import (
    check_user_allowed,
    can_start_task,
    get_completed_today,
    update_trust_score,
    SCORE_PENALTIES,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Таймаут «проверки»: если дольше — помечаем задание expired (не более 2 минут)
CHECKING_TIMEOUT_SEC = 120

# Приоритет для выбора наиболее релевантного UserTask при нескольких записях за задание
_STATUS_PRIORITY = {
    UserTaskStatus.completed: 5,
    UserTaskStatus.checking: 4,
    UserTaskStatus.in_progress: 3,
    UserTaskStatus.failed: 2,
    UserTaskStatus.expired: 1,
}


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    sort: Literal["default", "reward_desc", "reward_asc", "newest"] = Query("default"),
    task_type: Optional[str] = Query(None, description="Filter by task type: subscribe, like"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    allowed, msg = await check_user_allowed(user, db)
    if not allowed:
        raise HTTPException(status_code=403, detail=msg)

    now = datetime.now(timezone.utc)

    base_filter = and_(
        Task.is_active == True,
        (Task.expires_at == None) | (Task.expires_at > now),
        # Budget: hide tasks where total completions >= max_completions
        (Task.max_completions == None) | (Task.total_completions < Task.max_completions),
        # Только подписка и лайк (invite, watch_ad убраны из выдачи)
        Task.task_type.in_([TaskType.subscribe, TaskType.like]),
    )

    # Optional task_type filter (только subscribe / like)
    if task_type:
        try:
            base_filter = and_(base_filter, Task.task_type == TaskType(task_type))
        except ValueError:
            pass  # ignore unknown task_type values

    # Итоговое количество
    count_result = await db.execute(select(func.count(Task.id)).where(base_filter))
    total = count_result.scalar() or 0

    # Сортировка
    if sort == "reward_desc":
        order = desc(Task.reward)
    elif sort == "reward_asc":
        order = asc(Task.reward)
    elif sort == "newest":
        order = desc(Task.created_at)
    else:
        order = (Task.sort_order, Task.id)

    q = select(Task).where(base_filter)
    if sort == "default":
        q = q.order_by(Task.sort_order, Task.id)
    else:
        q = q.order_by(order)

    q = q.offset((page - 1) * page_size).limit(page_size)

    tasks_result = await db.execute(q)
    tasks = tasks_result.scalars().all()

    # Собираем все user_tasks пользователя
    user_tasks_result = await db.execute(
        select(UserTask).where(UserTask.user_id == user.id)
    )
    all_user_tasks = user_tasks_result.scalars().all()
    # «Вечная проверка»: если статус checking дольше CHECKING_TIMEOUT_SEC — помечаем как expired
    stale_updated = False
    for ut in all_user_tasks:
        if ut.status == UserTaskStatus.checking and ut.started_at:
            started = ut.started_at.replace(tzinfo=timezone.utc) if ut.started_at.tzinfo is None else ut.started_at
            if (now - started).total_seconds() > CHECKING_TIMEOUT_SEC:
                ut.status = UserTaskStatus.expired
                ut.error_message = "Проверка не завершилась вовремя"
                stale_updated = True
    if stale_updated:
        await db.commit()

    user_tasks_by_task: dict[int, list[UserTask]] = defaultdict(list)
    for ut in all_user_tasks:
        user_tasks_by_task[ut.task_id].append(ut)

    # Для каждого задания берём UserTask с наивысшим приоритетом статуса
    user_tasks_map: dict[int, UserTask] = {
        task_id: max(uts, key=lambda ut: _STATUS_PRIORITY.get(ut.status, 0))
        for task_id, uts in user_tasks_by_task.items()
    }

    completed_today = await get_completed_today(db, user.id)

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    result = []
    for task in tasks:
        ut = user_tasks_map.get(task.id)
        schema = TaskSchema.model_validate(task)
        schema.user_status = ut.status if ut else None
        schema.user_task_id = ut.id if ut else None
        # Count how many times user completed this task today
        today_comps = sum(
            1 for u in user_tasks_by_task.get(task.id, [])
            if u.status == UserTaskStatus.completed
            and u.completed_at is not None
            and u.completed_at.replace(tzinfo=timezone.utc) >= today_start
        )
        schema.user_today_completions = today_comps
        result.append(schema)

    pages = max(1, (total + page_size - 1) // page_size)
    return TaskListResponse(
        tasks=result,
        completed_today=completed_today,
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    if not task_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Задание не найдено")
    ut_result = await db.execute(
        select(UserTask).where(
            UserTask.user_id == user.id,
            UserTask.task_id == task_id,
        )
    )
    uts = ut_result.scalars().all()
    if not uts:
        return TaskStatusResponse(user_status=None, error_message=None)
    now = datetime.now(timezone.utc)
    for ut in uts:
        if ut.status == UserTaskStatus.checking and ut.started_at:
            started = ut.started_at.replace(tzinfo=timezone.utc) if ut.started_at.tzinfo is None else ut.started_at
            if (now - started).total_seconds() > CHECKING_TIMEOUT_SEC:
                ut.status = UserTaskStatus.expired
                ut.error_message = "Проверка не завершилась вовремя"
                await db.commit()
                break
    best = max(uts, key=lambda ut: _STATUS_PRIORITY.get(ut.status, 0))
    return TaskStatusResponse(user_status=best.status, error_message=best.error_message)


@router.post("/{task_id}/start", response_model=StartTaskResponse)
async def start_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    allowed, msg = await check_user_allowed(user, db)
    if not allowed:
        raise HTTPException(status_code=403, detail=msg)

    task_result = await db.execute(select(Task).where(Task.id == task_id, Task.is_active == True))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    # Budget exhausted?
    if task.max_completions is not None and task.total_completions >= task.max_completions:
        # Auto-deactivate when budget is gone
        task.is_active = False
        await db.commit()
        raise HTTPException(status_code=400, detail="Бюджет задания исчерпан")

    can, reason = await can_start_task(db, user.id, task_id, task.daily_limit, task.total_user_limit)
    if not can:
        raise HTTPException(status_code=400, detail=reason)

    expires_at = None
    if task.task_type in (TaskType.subscribe, TaskType.like):
        # Окно на подписку/лайк + нажатие «Проверить»: 10 минут (бот успеет проверить)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    elif task.duration_seconds:
        # watch_ad: время просмотра + буфер
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=task.duration_seconds + 30)

    user_task = UserTask(
        user_id=user.id,
        task_id=task_id,
        status=UserTaskStatus.in_progress,
        expires_at=expires_at,
    )
    db.add(user_task)
    await db.commit()
    await db.refresh(user_task)

    return StartTaskResponse(
        user_task_id=user_task.id,
        status=user_task.status,
        expires_at=user_task.expires_at,
    )


@router.post("/{task_id}/check", response_model=CheckTaskResponse)
async def check_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    ut_result = await db.execute(
        select(UserTask).where(
            UserTask.user_id == user.id,
            UserTask.task_id == task_id,
            UserTask.status == UserTaskStatus.in_progress,
        )
    )
    user_task = ut_result.scalar_one_or_none()
    if not user_task:
        # Уже в проверке — возвращаем 200 с checking, чтобы фронт показал «Проверяем» без ошибки
        already = await db.execute(
            select(UserTask).where(
                UserTask.user_id == user.id,
                UserTask.task_id == task_id,
                UserTask.status == UserTaskStatus.checking,
            )
        )
        if already.scalar_one_or_none():
            return CheckTaskResponse(
                status=UserTaskStatus.checking,
                message="Проверка уже выполняется, ожидайте результат",
            )
        raise HTTPException(status_code=400, detail="Задание не начато или уже завершено")

    user_task.attempts += 1

    # Проверка TTL задания
    if user_task.expires_at:
        now = datetime.now(timezone.utc)
        expires = user_task.expires_at.replace(tzinfo=timezone.utc)
        if now > expires:
            user_task.status = UserTaskStatus.expired
            await db.commit()
            return CheckTaskResponse(status=UserTaskStatus.expired, message="Время вышло")

    # --- Серверный timing pre-check для watch_ad (до отправки в Celery) ---
    if task.task_type == TaskType.watch_ad and task.duration_seconds:
        now = datetime.now(timezone.utc)
        started = user_task.started_at.replace(tzinfo=timezone.utc)
        elapsed = (now - started).total_seconds()

        if elapsed < task.duration_seconds:
            user_task.status = UserTaskStatus.failed
            user_task.error_message = (
                f"Прошло {int(elapsed)}с, нужно не менее {task.duration_seconds}с"
            )
            await update_trust_score(db, user, SCORE_PENALTIES["fast_completion"], reason="fast_completion_check_task")
            await db.commit()
            return CheckTaskResponse(
                status=UserTaskStatus.failed,
                message=user_task.error_message,
            )

    # Подписка и лайк: проверяем сразу в запросе (без Celery), всегда возвращаем 200 с результатом
    if task.task_type in (TaskType.subscribe, TaskType.like):
        from app.services.task_verification import (
            run_verification,
            apply_verification_result,
        )
        from app.services.referral import try_give_referral_reward
        from app.workers.tasks import _send_notification_async, subscribe_timer_second_check, subscribe_timer_pay

        now = datetime.now(timezone.utc)
        started = user_task.started_at.replace(tzinfo=timezone.utc)
        elapsed_sec = (now - started).total_seconds()

        # Подписка: имитация без таймера — сразу выплата без проверки
        if task.task_type == TaskType.subscribe and getattr(task, "is_simulation", False) and not getattr(task, "has_timer", False):
            await apply_verification_result(db, task, user_task, user, True, "Имитация")
            await db.commit()
            try:
                await try_give_referral_reward(db, user)
                await _send_notification_async(
                    user.telegram_id,
                    f"✅ <b>Задание выполнено!</b>\n\n«{task.title}»\n\n💰 Начислено: <b>+{float(task.reward):.0f}₽</b>\nВаш баланс: <b>{float(user.balance):.2f}₽</b>",
                    "tasks",
                )
            except Exception as e:
                log.warning("check_task: notification/referral failed: %s", e)
            return CheckTaskResponse(status=UserTaskStatus.completed, message="Выплата начислена")

        # Подписка: имитация с таймером — отложенная выплата через timer_hours
        if task.task_type == TaskType.subscribe and getattr(task, "is_simulation", False) and getattr(task, "has_timer", False) and getattr(task, "timer_hours", None):
            delay_sec = max(1, task.timer_hours * 3600)
            user_task.first_checked_at = now
            user_task.status = UserTaskStatus.checking
            await db.commit()
            subscribe_timer_pay.apply_async((user_task.id,), countdown=delay_sec)
            return CheckTaskResponse(
                status=UserTaskStatus.checking,
                message=f"Выплата будет начислена через {task.timer_hours} ч.",
            )

        # Подписка с таймером (не имитация): первая проверка сейчас, вторая через (timer_hours - 1) ч
        if task.task_type == TaskType.subscribe and getattr(task, "has_timer", False) and getattr(task, "timer_hours", None):
            if elapsed_sec < 5:
                await update_trust_score(db, user, SCORE_PENALTIES["fast_completion"], reason="fast_completion_check_task")
                user_task.status = UserTaskStatus.failed
                user_task.error_message = "Слишком быстро. Перейдите по ссылке, подпишитесь и подождите несколько секунд."
                await db.commit()
                return CheckTaskResponse(status=UserTaskStatus.failed, message=user_task.error_message)
            try:
                success, message = await run_verification(task, user_task, user)
                if not success:
                    await apply_verification_result(db, task, user_task, user, False, message)
                    await db.commit()
                    if message and "Ошибка сервиса" not in message:
                        await _send_notification_async(
                            user.telegram_id,
                            f"❌ <b>Задание не выполнено</b>\n\n«{task.title}»\n\n{message}\n\nВы можете попробовать ещё раз.",
                            "tasks",
                        )
                    return CheckTaskResponse(status=UserTaskStatus.failed, message=message)
                user_task.first_checked_at = now
                user_task.status = UserTaskStatus.checking
                await db.commit()
                delay_sec = max(1, (task.timer_hours - 1) * 3600)
                subscribe_timer_second_check.apply_async((user_task.id,), countdown=delay_sec)
                return CheckTaskResponse(
                    status=UserTaskStatus.checking,
                    message=f"Подписка подтверждена. Повторная проверка через {task.timer_hours - 1} ч — тогда будет начислена награда.",
                )
            except Exception as e:
                log.exception("check_task: subscribe timer verification failed task_id=%s user_id=%s err=%s", task_id, user.id, e)
                try:
                    await db.rollback()
                except Exception:
                    pass
                return CheckTaskResponse(
                    status=UserTaskStatus.failed,
                    message="Временная ошибка проверки. Попробуйте нажать «Проверить» ещё раз.",
                )

        # Антинакрутка: минимум 5 сек для обычной подписки/лайка
        if elapsed_sec < 5:
            await update_trust_score(db, user, SCORE_PENALTIES["fast_completion"], reason="fast_completion_check_task")
            user_task.status = UserTaskStatus.failed
            user_task.error_message = "Слишком быстро. Перейдите по ссылке, подпишитесь и подождите несколько секунд."
            await db.commit()
            return CheckTaskResponse(
                status=UserTaskStatus.failed,
                message=user_task.error_message,
            )

        try:
            success, message = await run_verification(task, user_task, user)
            await apply_verification_result(db, task, user_task, user, success, message)
            await db.commit()
            try:
                if success:
                    await try_give_referral_reward(db, user)
                    await _send_notification_async(
                        user.telegram_id,
                        f"✅ <b>Задание выполнено!</b>\n\n"
                        f"«{task.title}»\n\n"
                        f"💰 Начислено: <b>+{float(task.reward):.0f}₽</b>\n"
                        f"Ваш баланс: <b>{float(user.balance):.2f}₽</b>",
                        "tasks",
                    )
                else:
                    if message and "Ошибка сервиса" not in message:
                        await _send_notification_async(
                            user.telegram_id,
                            f"❌ <b>Задание не выполнено</b>\n\n"
                            f"«{task.title}»\n\n{message}\n\nВы можете попробовать ещё раз.",
                            "tasks",
                        )
            except Exception as e:
                log.warning("check_task: notification/referral failed (result already saved): %s", e)
            return CheckTaskResponse(
                status=UserTaskStatus.completed if success else UserTaskStatus.failed,
                message=message or ("Подписка подтверждена" if success else user_task.error_message or message),
            )
        except Exception as e:
            log.exception("check_task: verification failed task_id=%s user_id=%s err=%s", task_id, user.id, e)
            try:
                await db.rollback()
            except Exception:
                pass
            return CheckTaskResponse(
                status=UserTaskStatus.failed,
                message=(
                    "Временная ошибка проверки. Попробуйте нажать «Проверить» ещё раз. "
                    "Если повторяется — проверьте в админке: в задании указан username канала (например gwwfwedw7777 или ссылка t.me/…), а не название; бот добавлен в канал как администратор."
                ),
            )

    # Остальные типы (watch_ad, invite) — в воркере
    from app.workers.tasks import verify_task
    verify_task.delay(user_task.id)
    user_task.status = UserTaskStatus.checking
    await db.commit()
    return CheckTaskResponse(
        status=UserTaskStatus.checking,
        message="Проверка запущена, результат будет готов через несколько секунд",
    )


@router.post("/{task_id}/cancel")
async def cancel_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Отмена задания: разрешена в статусе in_progress и checking."""
    ut_result = await db.execute(
        select(UserTask).where(
            UserTask.user_id == user.id,
            UserTask.task_id == task_id,
            UserTask.status.in_([UserTaskStatus.in_progress, UserTaskStatus.checking]),
        )
    )
    user_task = ut_result.scalar_one_or_none()
    if not user_task:
        raise HTTPException(status_code=404, detail="Активное задание не найдено")

    user_task.status = UserTaskStatus.expired
    await db.commit()
    return {"ok": True}
