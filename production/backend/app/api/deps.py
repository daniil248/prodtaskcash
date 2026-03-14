from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, SystemSetting
from app.services.auth import create_access_token, decode_access_token, decode_admin_token
from app.config import get_settings

bearer = HTTPBearer()
_ACTIVE_THROTTLE = timedelta(minutes=1)
_PROLONG_WHEN_LESS_THAN_HOURS = 24


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned")

    now = datetime.now(timezone.utc)
    last = user.last_active_at
    if last is None or (now - last.replace(tzinfo=timezone.utc) if last.tzinfo is None else now - last) > _ACTIVE_THROTTLE:
        await db.execute(
            update(User).where(User.id == user.id).values(last_active_at=now)
        )
        await db.commit()
        await db.refresh(user)

    exp_ts = payload.get("exp")
    if exp_ts is not None:
        exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
        if (exp_dt - now).total_seconds() < _PROLONG_WHEN_LESS_THAN_HOURS * 3600:
            new_token = create_access_token(user.id, user.telegram_id)
            setattr(request.state, "new_access_token", new_token)

    return user


ADMIN_PANEL_ENABLED_KEY = "admin_panel_enabled"


async def get_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> bool:
    if not decode_admin_token(credentials.credentials):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    row = (
        await db.execute(
            select(SystemSetting).where(SystemSetting.key == ADMIN_PANEL_ENABLED_KEY).limit(1)
        )
    ).scalar_one_or_none()
    if row and row.value.strip().lower() == "false":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access disabled")
    return True
