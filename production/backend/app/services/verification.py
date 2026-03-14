"""
Проверка подписки и реакций через Telegram Bot API.

Подписка (getChatMember):
  — Бот (BOT_TOKEN) обязательно должен быть администратором канала.
  — channel_id: @username канала, -100xxxxxxxxxx или ссылка t.me/channel.

Реакции (лайк и др.):
  — В Bot API нет метода «получить список пользователей, поставивших реакцию».
  — Проверяем только членство в канале; факт реакции не верифицируем без приёма
    message_reaction updates (webhook) и кэша. При желании можно требовать
    конкретную реакцию (например только 👍), если реализовать приём message_reaction.
"""
import logging
import re
import httpx
from app.config import get_settings

settings = get_settings()
log = logging.getLogger(__name__)

TELEGRAM_API = f"https://api.telegram.org/bot{settings.BOT_TOKEN}"


def _normalize_channel_id(raw: str) -> str:
    """Нормализует channel_id для getChatMember: @username или -100xxxxxxxxxx."""
    s = (raw or "").strip()
    if not s:
        return raw or ""
    s = re.sub(r"^https?://(?:www\.)?t\.me/", "", s)
    s = re.sub(r"^@", "", s)
    # Приватный канал: t.me/c/1234567890 -> -1001234567890
    if s.startswith("c/"):
        num = s[2:].split("/")[0]
        if num.isdigit():
            return f"-100{num}"
    if s.startswith("-100") or (s.lstrip("-").isdigit() and len(s) > 1 and int(s) < 0):
        return s
    return f"@{s}" if s else raw


def _validate_channel_id_for_api(channel_id: str) -> str | None:
    """
    Проверяет, что channel_id похож на username или ссылку, а не на название канала.
    Возвращает None если ок, иначе текст ошибки для пользователя.
    """
    if not (channel_id or "").strip():
        return "Канал не указан"
    raw = (channel_id or "").strip()
    # Ссылка https://t.me/... или t.me/...
    if re.match(r"^https?://(?:www\.)?t\.me/[a-zA-Z0-9_]+", raw) or re.match(r"^t\.me/[a-zA-Z0-9_]+", raw):
        return None
    # ID приватного канала -100...
    if re.match(r"^-100\d+$", raw):
        return None
    # @username или просто username (латиница, цифры, подчёркивание; 5–32 символа как в Telegram)
    s = re.sub(r"^@", "", raw)
    if re.match(r"^[a-zA-Z0-9_]{5,32}$", s):
        return None
    # Пробелы, кириллица и т.д. — скорее всего ввели название канала вместо username
    if " " in raw or re.search(r"[а-яА-ЯёЁ]", raw):
        return (
            "Указано название канала вместо username. "
            "Укажите username канала (например gwwfwedw7777) или ссылку t.me/gwwfwedw7777. "
            "Username виден в ссылке на канал в Telegram."
        )
    if len(s) < 5:
        return "Укажите @username канала или ссылку t.me/username (не название канала)."
    return "Неверный формат канала. Укажите @username или ссылку t.me/username."


async def check_subscription(telegram_id: int, channel_id: str) -> tuple[bool, str]:
    """Проверяет подписку через getChatMember. Бот должен быть админом канала."""
    err = _validate_channel_id_for_api(channel_id)
    if err:
        log.warning("check_subscription: invalid channel_id telegram_id=%s channel_id=%s", telegram_id, channel_id)
        return False, err
    chat_id = _normalize_channel_id(channel_id)
    if not chat_id:
        log.warning("check_subscription: empty channel_id")
        return False, "Канал не указан"
    log.info("check_subscription: telegram_id=%s channel_raw=%s chat_id=%s", telegram_id, channel_id, chat_id)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{TELEGRAM_API}/getChatMember",
                params={"chat_id": chat_id, "user_id": telegram_id},
            )
            data = r.json()

        if not data.get("ok"):
            desc = (data.get("description") or "").lower()
            err_code = data.get("error_code", 0)
            log.warning(
                "check_subscription: api error telegram_id=%s channel=%s code=%s desc=%s",
                telegram_id, chat_id, err_code, data.get("description"),
            )
            if "chat not found" in desc or err_code == 400:
                return False, "Ошибка проверки подписки. Убедитесь, что бот добавлен в канал как администратор."
            if "user not found" in desc or "not found" in desc:
                return False, "Вы не подписаны на канал"
            if "not enough rights" in desc or "administrator" in desc:
                return False, "Ошибка проверки подписки. Бот должен быть администратором канала."
            return False, "Ошибка проверки подписки. Попробуйте позже."

        status = data["result"].get("status", "")
        if status in ("member", "administrator", "creator", "restricted"):
            log.info("check_subscription: ok telegram_id=%s channel=%s status=%s", telegram_id, chat_id, status)
            return True, "Подписка подтверждена"

        log.info("check_subscription: not member telegram_id=%s channel=%s status=%s", telegram_id, chat_id, status)
        return False, "Вы не подписаны на канал"
    except httpx.TimeoutException:
        log.warning("check_subscription: timeout telegram_id=%s channel=%s", telegram_id, chat_id)
        return False, "Ошибка сервиса проверки (таймаут)"
    except Exception as e:
        log.exception("check_subscription: exception telegram_id=%s channel=%s err=%s", telegram_id, chat_id, e)
        return False, "Ошибка сервиса проверки"


async def check_reaction(telegram_id: int, channel_id: str, post_id: str) -> tuple[bool, str]:
    """
    Проверка «лайка»/реакции. В Bot API нет метода «кто поставил реакцию»,
    поэтому проверяем только членство в канале. Конкретный тип реакции (👍 и т.д.)
    можно будет проверять после реализации приёма message_reaction updates.
    """
    chat_id = _normalize_channel_id(channel_id)
    if not chat_id:
        log.warning("check_reaction: empty channel_id")
        return False, "Канал не указан"
    log.info("check_reaction: telegram_id=%s channel_raw=%s chat_id=%s message_id=%s", telegram_id, channel_id, chat_id, post_id)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            member_r = await client.get(
                f"{TELEGRAM_API}/getChatMember",
                params={"chat_id": chat_id, "user_id": telegram_id},
            )
            member_data = member_r.json()
            if not member_data.get("ok"):
                desc = (member_data.get("description") or "").lower()
                log.warning(
                    "check_reaction: getChatMember failed telegram_id=%s channel=%s desc=%s",
                    telegram_id, chat_id, member_data.get("description"),
                )
                if "chat not found" in desc or "not enough rights" in desc:
                    return False, "Ошибка проверки. Бот должен быть администратором канала."
                return False, "Ошибка проверки членства в канале"
            member_status = member_data["result"].get("status", "")
            if member_status not in ("member", "administrator", "creator", "restricted"):
                return False, "Вы не подписаны на канал — подпишитесь и поставьте реакцию на пост"

            # В Bot API нет getMessageReactions (есть только в MTProto). Проверяем только членство.
            # При желании можно добавить webhook на message_reaction и кэш (chat_id, message_id -> user_ids).
            log.info(
                "check_reaction: membership ok (reaction not verifiable via Bot API) telegram_id=%s channel=%s message_id=%s",
                telegram_id, chat_id, post_id,
            )
            return True, "Реакция засчитана (подтверждено членство в канале)"
    except httpx.TimeoutException:
        log.warning("check_reaction: timeout telegram_id=%s channel=%s", telegram_id, chat_id)
        return False, "Ошибка сервиса проверки (таймаут)"
    except Exception as e:
        log.exception("check_reaction: exception telegram_id=%s channel=%s err=%s", telegram_id, chat_id, e)
        return False, "Ошибка сервиса проверки"
