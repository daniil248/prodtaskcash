import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote

from jose import jwt, JWTError
from app.config import get_settings

settings = get_settings()


def validate_telegram_init_data(init_data: str) -> dict | None:
    parsed: dict[str, str] = {}
    for part in init_data.split("&"):
        key, _, value = part.partition("=")
        parsed[key] = unquote(value)

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))

    secret_key = hmac.new(
        key=b"WebAppData",
        msg=settings.BOT_TOKEN.encode(),
        digestmod=hashlib.sha256,
    ).digest()
    computed = hmac.new(
        key=secret_key,
        msg=data_check_string.encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed, received_hash):
        return None

    result = dict(parsed)
    if "user" in result:
        result["user"] = json.loads(result["user"])
    return result


def create_access_token(user_id: int, telegram_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": str(user_id), "tg": telegram_id, "exp": expire},
        settings.JWT_SECRET,
        algorithm="HS256",
    )


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        return None


def create_admin_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode(
        {"sub": "admin", "exp": expire},
        settings.JWT_SECRET + settings.ADMIN_SECRET,
        algorithm="HS256",
    )


def decode_admin_token(token: str) -> bool:
    try:
        jwt.decode(token, settings.JWT_SECRET + settings.ADMIN_SECRET, algorithms=["HS256"])
        return True
    except JWTError:
        return False
