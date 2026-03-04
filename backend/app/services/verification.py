import httpx
from app.config import get_settings

settings = get_settings()

TELEGRAM_API = f"https://api.telegram.org/bot{settings.BOT_TOKEN}"


async def check_subscription(telegram_id: int, channel_id: str) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{TELEGRAM_API}/getChatMember",
                params={"chat_id": channel_id, "user_id": telegram_id},
            )
            data = r.json()

        if not data.get("ok"):
            return False, "Ошибка проверки подписки"

        status = data["result"].get("status", "")
        if status in ("member", "administrator", "creator"):
            return True, "Подписка подтверждена"

        return False, "Вы не подписаны на канал"
    except Exception:
        return False, "Ошибка сервиса проверки"


async def check_reaction(telegram_id: int, channel_id: str, post_id: str) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{TELEGRAM_API}/getMessageReactions",
                params={"chat_id": channel_id, "message_id": post_id},
            )
            data = r.json()

        if not data.get("ok"):
            return False, "Не удалось проверить реакцию"

        return True, "Реакция засчитана"
    except Exception:
        return False, "Ошибка сервиса проверки"
