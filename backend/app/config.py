from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"

    BOT_TOKEN: str
    BOT_USERNAME: str = "TaskCashBot"

    JWT_SECRET: str
    JWT_EXPIRE_HOURS: int = 168

    ADMIN_SECRET: str

    USER_BOT_TOKEN: str = ""
    ADMIN_BOT_TOKEN: str = ""

    MIN_WITHDRAWAL: float = 10.0
    MAX_WITHDRAWAL_DAY: float = 1000.0
    MAX_WITHDRAWAL_WEEK: float = 3000.0
    WITHDRAWAL_FEE_PERCENT: float = 5.0

    REFERRAL_REWARD: float = 0.50
    REFERRAL_MIN_TASKS: int = 3

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
