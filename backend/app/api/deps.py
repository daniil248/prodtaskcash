from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.services.auth import decode_access_token, decode_admin_token

bearer = HTTPBearer()

# Throttle: update last_active_at at most once per minute
_ACTIVE_THROTTLE = timedelta(minutes=1)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned")

    # Update last_active_at at most once per minute to track online status
    now = datetime.now(timezone.utc)
    last = user.last_active_at
    if last is None or (now - last.replace(tzinfo=timezone.utc) if last.tzinfo is None else now - last) > _ACTIVE_THROTTLE:
        await db.execute(
            update(User).where(User.id == user.id).values(last_active_at=now)
        )
        await db.commit()

    return user


async def get_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> bool:
    if not decode_admin_token(credentials.credentials):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return True
