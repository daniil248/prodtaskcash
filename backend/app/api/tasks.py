from collections import defaultdict
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Task, TaskType, UserTask, UserTaskStatus, User, Transaction, TransactionType
from app.schemas import TaskSchema, TaskListResponse, StartTaskResponse, CheckTaskResponse
from app.api.deps import get_current_user
from app.services.antifraid import (
    check_user_allowed,
    can_start_task,
    get_completed_today,
    update_trust_score,
    SCORE_PENALTIES,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])

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
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    allowed, msg = await check_user_allowed(user)
    if not allowed:
        raise HTTPException(status_code=403, detail=msg)

    now = datetime.now(timezone.utc)

    base_filter = and_(
        Task.is_active == True,
        (Task.expires_at == None) | (Task.expires_at > now),
    )

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

    # Собираем все user_tasks пользователя за текущий день (+ in_progress могут быть старее)
    user_tasks_result = await db.execute(
        select(UserTask).where(UserTask.user_id == user.id)
    )
    user_tasks_by_task: dict[int, list[UserTask]] = defaultdict(list)
    for ut in user_tasks_result.scalars().all():
        user_tasks_by_task[ut.task_id].append(ut)

    # Для каждого задания берём UserTask с наивысшим приоритетом статуса
    user_tasks_map: dict[int, UserTask] = {
        task_id: max(uts, key=lambda ut: _STATUS_PRIORITY.get(ut.status, 0))
        for task_id, uts in user_tasks_by_task.items()
    }

    completed_today = await get_completed_today(db, user.id)

    result = []
    for task in tasks:
        ut = user_tasks_map.get(task.id)
        schema = TaskSchema.model_validate(task)
        schema.user_status = ut.status if ut else None
        schema.user_task_id = ut.id if ut else None
        result.append(schema)

    pages = max(1, (total + page_size - 1) // page_size)
    return TaskListResponse(
        tasks=result,
        completed_today=completed_today,
        total=total,
        page=page,
        pages=pages,
    )


@router.post("/{task_id}/start", response_model=StartTaskResponse)
async def start_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    allowed, msg = await check_user_allowed(user)
    if not allowed:
        raise HTTPException(status_code=403, detail=msg)

    task_result = await db.execute(select(Task).where(Task.id == task_id, Task.is_active == True))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    can, reason = await can_start_task(db, user.id, task_id, task.daily_limit, task.total_user_limit)
    if not can:
        raise HTTPException(status_code=400, detail=reason)

    expires_at = None
    if task.duration_seconds:
        # +30 секунд буфер на сетевые задержки
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
        raise HTTPException(status_code=400, detail="Задание не начато или уже проверяется")

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
            await update_trust_score(db, user, SCORE_PENALTIES["fast_completion"])
            await db.commit()
            return CheckTaskResponse(
                status=UserTaskStatus.failed,
                message=user_task.error_message,
            )

    from app.workers.tasks import verify_task
    verify_task.delay(user_task.id)

    user_task.status = UserTaskStatus.checking
    await db.commit()

    return CheckTaskResponse(
        status=UserTaskStatus.checking,
        message="Проверка запущена, результат будет готов через несколько секунд",
    )
