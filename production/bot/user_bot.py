"""
Пользовательский бот TaskCash.
- /start [ref_code] — приветствие + кнопка запуска мини-апки
"""
import logging
import os
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.error import BadRequest, TelegramError
from telegram.ext import Application, CommandHandler, ContextTypes

load_dotenv()

# Тот же бот, что и BOT_TOKEN в бэкенде: пользовательский бот (test_zadaniya_bot).
TOKEN = os.environ.get("BOT_TOKEN") or os.environ.get("USER_BOT_TOKEN") or ""
MINI_APP_URL = os.environ.get("MINI_APP_URL", "").rstrip("/")

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

WELCOME_NEW = (
    "👋 Добро пожаловать в <b>TaskCash</b>!\n\n"
    "💰 Выполняй задания — получай реальные рубли.\n"
    "👥 Приглашай друзей и зарабатывай на рефералах.\n"
    "💸 Выводи средства на карту или через СБП.\n\n"
    "Нажми кнопку ниже, чтобы начать 👇"
)

WELCOME_BACK = (
    "👋 С возвращением в <b>TaskCash</b>!\n\n"
    "Открой приложение, чтобы продолжить выполнять задания 🎯"
)

WELCOME_REFERRAL = (
    "👋 Тебя пригласил друг в <b>TaskCash</b>!\n\n"
    "💰 Выполняй задания — получай реальные рубли.\n"
    "👥 Пригласи своих друзей и зарабатывай ещё больше.\n\n"
    "Нажми кнопку ниже, чтобы начать 👇"
)


def make_webapp_keyboard(ref_code: str | None = None) -> InlineKeyboardMarkup:
    url = MINI_APP_URL
    if ref_code:
        url = f"{MINI_APP_URL}?startapp={ref_code}"
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("🚀 Открыть TaskCash", web_app=WebAppInfo(url=url))
    ]])


def make_link_keyboard(ref_code: str | None = None) -> InlineKeyboardMarkup:
    """Fallback: обычная ссылка вместо WebApp кнопки."""
    url = MINI_APP_URL
    if ref_code:
        url = f"{MINI_APP_URL}?startapp={ref_code}"
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("🚀 Открыть TaskCash", url=url)
    ]])


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    args = context.args
    ref_code = args[0] if args else None

    is_referral = bool(ref_code and ref_code != str(user.id))
    text = WELCOME_REFERRAL if is_referral else WELCOME_NEW

    logger.info("cmd_start: user=%s ref=%s url=%s", user.id, ref_code, MINI_APP_URL)

    try:
        await update.message.reply_text(
            text,
            parse_mode="HTML",
            reply_markup=make_webapp_keyboard(ref_code),
        )
        logger.info("cmd_start: WebApp button sent ok")
    except BadRequest as e:
        logger.warning("cmd_start: WebApp button rejected (%s), trying plain link", e)
        try:
            await update.message.reply_text(
                text,
                parse_mode="HTML",
                reply_markup=make_link_keyboard(ref_code),
            )
        except TelegramError as e2:
            logger.error("cmd_start: fallback also failed: %s", e2)
            await update.message.reply_text(
                text + f"\n\n🔗 {MINI_APP_URL}",
                parse_mode="HTML",
            )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        await update.message.reply_text(
            "❓ <b>Помощь TaskCash</b>\n\n"
            "TaskCash — платформа для выполнения микрозаданий.\n\n"
            "<b>Типы заданий:</b>\n"
            "📢 Подписка на канал\n"
            "❤️ Лайк/реакция на пост\n"
            "▶️ Просмотр рекламы\n"
            "👥 Приглашение друзей\n\n"
            "💸 Вывод: На карту / Через СБП\n\n"
            "По вопросам обращайся к администратору.",
            parse_mode="HTML",
            reply_markup=make_webapp_keyboard(),
        )
    except BadRequest:
        await update.message.reply_text(
            "❓ TaskCash — платформа для микрозаданий.\n"
            f"Открыть: {MINI_APP_URL}",
        )


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error("Unhandled error: %s", context.error, exc_info=context.error)


def main() -> None:
    if not TOKEN:
        logger.error("Set BOT_TOKEN (or USER_BOT_TOKEN) and MINI_APP_URL in .env")
        raise SystemExit(1)
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_error_handler(error_handler)
    logger.info("User bot started ✅  MINI_APP_URL=%s", MINI_APP_URL)
    app.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)


if __name__ == "__main__":
    main()
