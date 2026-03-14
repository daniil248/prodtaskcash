import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    BigInteger, Boolean, Date, DateTime, Enum as SAEnum,
    ForeignKey, Integer, Numeric, String, Text, func, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class TaskType(str, enum.Enum):
    subscribe = "subscribe"
    like = "like"
    watch_ad = "watch_ad"
    invite = "invite"


class UserTaskStatus(str, enum.Enum):
    in_progress = "in_progress"
    checking = "checking"
    completed = "completed"
    failed = "failed"
    expired = "expired"


class TransactionType(str, enum.Enum):
    task_reward = "task_reward"
    referral_bonus = "referral_bonus"
    withdrawal = "withdrawal"
    withdrawal_fee = "withdrawal_fee"
    adjustment = "adjustment"
    penalty = "penalty"


class WithdrawalStatus(str, enum.Enum):
    created = "created"
    processing = "processing"
    security_check = "security_check"
    paid = "paid"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(128))
    first_name: Mapped[str] = mapped_column(String(128))
    last_name: Mapped[str | None] = mapped_column(String(128))
    full_name: Mapped[str | None] = mapped_column(String(256))  # ФИО для вывода; только админ может менять
    language_code: Mapped[str | None] = mapped_column(String(8))
    photo_url: Mapped[str | None] = mapped_column(String(512))

    balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0"))
    balance_pending: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0"))
    total_earned: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0"))

    trust_score: Mapped[int] = mapped_column(Integer, default=50)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    ban_reason: Mapped[str | None] = mapped_column(Text)

    referrer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    referral_reward_given: Mapped[bool] = mapped_column(Boolean, default=False)

    device_fingerprint: Mapped[str | None] = mapped_column(String(256))
    last_ip: Mapped[str | None] = mapped_column(String(64))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_active_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    notification_settings: Mapped[str] = mapped_column(Text, default="{}", nullable=False)

    referrer: Mapped["User | None"] = relationship(
        "User", remote_side="User.id", foreign_keys="User.referrer_id", back_populates="referrals"
    )
    referrals: Mapped[list["User"]] = relationship(
        "User", foreign_keys="User.referrer_id", back_populates="referrer"
    )
    user_tasks: Mapped[list["UserTask"]] = relationship("UserTask", back_populates="user")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="user")
    withdrawals: Mapped[list["Withdrawal"]] = relationship("Withdrawal", back_populates="user")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[str] = mapped_column(Text)
    instruction: Mapped[str] = mapped_column(Text)
    task_type: Mapped[TaskType] = mapped_column(SAEnum(TaskType), index=True)

    reward: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    icon_url: Mapped[str | None] = mapped_column(String(512))
    external_url: Mapped[str | None] = mapped_column(String(512))

    channel_id: Mapped[str | None] = mapped_column(String(128))
    post_id: Mapped[str | None] = mapped_column(String(64))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)

    daily_limit: Mapped[int] = mapped_column(Integer, default=1)
    total_user_limit: Mapped[int] = mapped_column(Integer, default=1)
    total_completions: Mapped[int] = mapped_column(Integer, default=0)
    max_completions: Mapped[int | None] = mapped_column(Integer)

    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_vip: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Подписка: таймер (вторая проверка через timer_hours - 1 ч)
    has_timer: Mapped[bool] = mapped_column(Boolean, default=False)
    timer_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Имитация: бот не проверяет, только выплата (если бота нет в админах канала и т.п.)
    is_simulation: Mapped[bool] = mapped_column(Boolean, default=False)

    user_tasks: Mapped[list["UserTask"]] = relationship("UserTask", back_populates="task")


class UserTask(Base):
    __tablename__ = "user_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    status: Mapped[UserTaskStatus] = mapped_column(
        SAEnum(UserTaskStatus), default=UserTaskStatus.in_progress, index=True
    )
    day: Mapped[date] = mapped_column(Date, server_default=func.current_date())

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    # Для подписки с таймером: когда пользователь прошёл первую проверку ("Проверить")
    first_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="user_tasks")
    task: Mapped["Task"] = relationship("Task", back_populates="user_tasks")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    tx_type: Mapped[TransactionType] = mapped_column(SAEnum(TransactionType), index=True)
    reference_id: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="transactions")


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    fee: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    method: Mapped[str] = mapped_column(String(64))
    requisites: Mapped[str] = mapped_column(String(512))
    status: Mapped[WithdrawalStatus] = mapped_column(
        SAEnum(WithdrawalStatus), default=WithdrawalStatus.created, index=True
    )
    admin_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship("User", back_populates="withdrawals")


class BlacklistEntry(Base):
    """Чёрный список: telegram_id, fingerprint, IP. Проверяется при каждой авторизации."""
    __tablename__ = "blacklist"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    device_fingerprint: Mapped[str | None] = mapped_column(String(256), nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SystemSetting(Base):
    """Настройки системы, управляемые через админку (без перезапуска)."""
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(String(256), default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
