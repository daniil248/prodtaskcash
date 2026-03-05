import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, BlacklistEntry
from app.schemas import TelegramAuthRequest, AuthResponse, UserSchema
from app.services.auth import validate_telegram_init_data, create_access_token
from app.services.antifraid import check_device_duplicate, update_trust_score, SCORE_PENALTIES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


async def _check_blacklist(db: AsyncSession, telegram_id: int, fp: str | None, ip: str | None):
    """Проверяет, заблокирован ли telegram_id, fingerprint или IP в чёрном списке."""
    conditions = [BlacklistEntry.telegram_id == telegram_id]
    if fp:
        conditions.append(BlacklistEntry.device_fingerprint == fp)
    if ip:
        conditions.append(BlacklistEntry.ip_address == ip)

    result = await db.execute(
        select(BlacklistEntry).where(or_(*conditions)).limit(1)
    )
    return result.scalar_one_or_none()


@router.post("/telegram", response_model=AuthResponse)
async def telegram_auth(
    body: TelegramAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    data = validate_telegram_init_data(body.init_data)
    if not data:
        raise HTTPException(status_code=401, detail="Invalid Telegram data")

    tg_user = data.get("user", {})
    telegram_id = tg_user.get("id")
    if not telegram_id:
        raise HTTPException(status_code=400, detail="Missing user data")

    client_ip = request.client.host if request.client else None
    fp = body.device_fingerprint or None

    # Проверка чёрного списка (до создания или обновления пользователя)
    blocked = await _check_blacklist(db, telegram_id, fp, client_ip)
    if blocked:
        logger.warning(
            "Blacklist hit: telegram_id=%s fp=%s ip=%s reason=%s",
            telegram_id, fp, client_ip, blocked.reason,
        )
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        # --- Новый пользователь ---
        referrer = None
        if body.referral_code:
            try:
                ref_tg_id = int(body.referral_code)
                if ref_tg_id != telegram_id:
                    ref_result = await db.execute(
                        select(User).where(User.telegram_id == ref_tg_id)
                    )
                    referrer = ref_result.scalar_one_or_none()
            except ValueError:
                pass

        initial_trust = 50

        # Дубль fingerprint → автоматически снижаем начальный trust score
        if fp:
            is_dup = await check_device_duplicate(db, fp, telegram_id)
            if is_dup:
                logger.warning(
                    "Duplicate fingerprint at registration: telegram_id=%s fp=%s",
                    telegram_id, fp,
                )
                initial_trust = max(10, initial_trust + SCORE_PENALTIES["device_duplicate"])

        user = User(
            telegram_id=telegram_id,
            first_name=tg_user.get("first_name", ""),
            last_name=tg_user.get("last_name"),
            username=tg_user.get("username"),
            language_code=tg_user.get("language_code"),
            photo_url=tg_user.get("photo_url"),
            referrer_id=referrer.id if referrer else None,
            last_ip=client_ip,
            device_fingerprint=fp,
            trust_score=initial_trust,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    else:
        # --- Существующий пользователь ---
        if user.is_banned:
            raise HTTPException(status_code=403, detail="Аккаунт заблокирован")

        user.first_name = tg_user.get("first_name", user.first_name)
        user.last_name = tg_user.get("last_name", user.last_name)
        user.username = tg_user.get("username", user.username)
        user.last_ip = client_ip or user.last_ip
        if tg_user.get("photo_url"):
            user.photo_url = tg_user.get("photo_url")

        # Обновляем fingerprint если появился новый, или проверяем на дубль
        if fp:
            if not user.device_fingerprint:
                # Первый раз появился fingerprint — проверяем
                is_dup = await check_device_duplicate(db, fp, telegram_id)
                if is_dup:
                    logger.warning(
                        "Duplicate fingerprint on existing user: telegram_id=%s fp=%s",
                        telegram_id, fp,
                    )
                    await update_trust_score(db, user, SCORE_PENALTIES["device_duplicate"])
                user.device_fingerprint = fp
            elif user.device_fingerprint != fp:
                # Fingerprint сменился — подозрительно
                logger.warning(
                    "Fingerprint changed: telegram_id=%s old=%s new=%s",
                    telegram_id, user.device_fingerprint, fp,
                )
                await update_trust_score(db, user, SCORE_PENALTIES["device_duplicate"] // 2)
                user.device_fingerprint = fp

        await db.commit()

    token = create_access_token(user.id, user.telegram_id)
    return AuthResponse(access_token=token, user=UserSchema.model_validate(user))
