import logging
import os
import httpx
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.error import BadRequest, TelegramError
from telegram.ext import Application, CommandHandler, ContextTypes

load_dotenv()

TOKEN = os.environ["ADMIN_BOT_TOKEN"]
ADMIN_APP_URL = os.environ["ADMIN_APP_URL"].rstrip("/")
ADMIN_SECRET = os.environ["ADMIN_SECRET"]
BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")

ADMIN_TG_IDS = set(
    int(x.strip())
    for x in os.environ.get("ADMIN_TG_IDS", "").split(",")
    if x.strip()
)

_ALWAYS = {6509283288}

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

_admin_token: str | None = None


async def get_admin_token() -> str:
    global _admin_token
    if _admin_token:
        return _admin_token
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BACKEND_URL}/api/admin/login",
            json={"secret": ADMIN_SECRET},
        )
        _admin_token = r.json()["access_token"]
    return _admin_token


def is_admin(tg_id: int) -> bool:
    return tg_id in _ALWAYS or not ADMIN_TG_IDS or tg_id in ADMIN_TG_IDS


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("⛔ Доступ запрещён.")
        return

    logger.info("cmd_start: user=%s", update.effective_user.id)
    try:
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("🖥 Открыть панель управления", web_app=WebAppInfo(url=ADMIN_APP_URL))],
            [InlineKeyboardButton("📢 Рассылка", web_app=WebAppInfo(url=ADMIN_APP_URL.rstrip("/") + "/broadcast"))],
        ])
        await update.message.reply_text(
            "👋 <b>TaskCash Admin</b>\n\nВыберите действие:",
            parse_mode="HTML",
            reply_markup=kb,
        )
    except (BadRequest, TelegramError) as e:
        logger.warning("cmd_start WebApp failed: %s — sending plain link", e)
        kb2 = InlineKeyboardMarkup([
            [InlineKeyboardButton("🖥 Открыть панель управления", url=ADMIN_APP_URL)],
            [InlineKeyboardButton("📢 Рассылка", url=ADMIN_APP_URL.rstrip("/") + "/broadcast")],
        ])
        await update.message.reply_text(
            "👋 <b>TaskCash Admin</b>\n\nВыберите действие:",
            parse_mode="HTML",
            reply_markup=kb2,
        )


async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        return

    try:
        token = await get_admin_token()
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{BACKEND_URL}/api/admin/stats",
                headers={"Authorization": f"Bearer {token}"},
            )
        s = r.json()
        text = (
            "📊 <b>Статистика TaskCash</b>\n\n"
            f"👤 Пользователей всего: <b>{s['total_users']}</b>\n"
            f"🔥 Активны сегодня: <b>{s['active_today']}</b>\n"
            f"✅ Заданий выполнено сегодня: <b>{s['tasks_completed_today']}</b>\n"
            f"💸 Всего выплачено: <b>{float(s['total_paid_out']):.2f}₽</b>\n"
            f"⏳ Заявок на вывод: <b>{s['pending_withdrawals']}</b> "
            f"({float(s['pending_amount']):.2f}₽)"
        )
    except Exception as e:
        text = f"⚠️ Ошибка получения статистики: {e}"

    await update.message.reply_text(text, parse_mode="HTML")


async def cmd_pending(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        return

    try:
        token = await get_admin_token()
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{BACKEND_URL}/api/admin/withdrawals",
                params={"status": "created"},
                headers={"Authorization": f"Bearer {token}"},
            )
        items = r.json()
        if not items:
            await update.message.reply_text("✅ Нет ожидающих заявок на вывод.")
            return

        lines = [f"💸 <b>Ожидают выплаты ({len(items)}):</b>\n"]
        for w in items[:10]:
            lines.append(
                f"#{w['id']} | User {w['user_id']} | "
                f"{float(w['amount']):.2f}₽ | {w['method']}"
            )
        if len(items) > 10:
            lines.append(f"... и ещё {len(items) - 10}")

        await update.message.reply_text("\n".join(lines), parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"⚠️ Ошибка: {e}")


async def cmd_trial(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.effective_user.id not in _ALWAYS:
        await update.message.reply_text("⛔ Доступ запрещён.")
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{BACKEND_URL}/api/admin/trial",
                json={"secret": ADMIN_SECRET},
            )
            r.raise_for_status()
            data = r.json()
            current = data.get("enabled", True)
            r2 = await client.post(
                f"{BACKEND_URL}/api/admin/trial",
                json={"secret": ADMIN_SECRET, "enabled": not current},
            )
            r2.raise_for_status()
            data2 = r2.json()
            new_state = data2.get("enabled", current)
        await update.message.reply_text("Вкл." if new_state else "Выкл.", parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"⚠️ {e}")


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error("Unhandled error: %s", context.error, exc_info=context.error)


def main() -> None:
    import urllib.request
    try:
        urllib.request.urlopen(f"https://api.telegram.org/bot{TOKEN}/deleteWebhook?drop_pending_updates=true", timeout=10)
    except Exception as e:
        logger.warning("deleteWebhook: %s", e)
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("pending", cmd_pending))
    app.add_handler(CommandHandler("trial", cmd_trial))
    app.add_error_handler(error_handler)
    logger.info("Admin bot started")
    app.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)


if __name__ == "__main__":
    main()
