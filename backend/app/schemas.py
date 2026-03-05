from datetime import datetime
from decimal import Decimal
from typing import Any
from pydantic import BaseModel, ConfigDict
from app.models import TaskType, UserTaskStatus, TransactionType, WithdrawalStatus


# ── Auth ─────────────────────────────────────────────────────────────────────

class TelegramAuthRequest(BaseModel):
    init_data: str
    referral_code: str | None = None
    device_fingerprint: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    user: "UserSchema"


# ── User ─────────────────────────────────────────────────────────────────────

class UserSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    username: str | None
    first_name: str
    last_name: str | None
    photo_url: str | None = None
    balance: Decimal
    balance_pending: Decimal
    total_earned: Decimal
    trust_score: int
    is_banned: bool
    created_at: datetime


class ProfileSchema(UserSchema):
    completed_today: int
    referrals_count: int


# ── Tasks ─────────────────────────────────────────────────────────────────────

class TaskSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    instruction: str
    task_type: TaskType
    reward: Decimal
    icon_url: str | None
    external_url: str | None
    channel_id: str | None
    post_id: str | None = None
    duration_seconds: int | None
    daily_limit: int = 1
    total_user_limit: int = 1
    max_completions: int | None = None
    total_completions: int = 0
    sort_order: int = 0
    is_active: bool = True
    is_vip: bool = False
    expires_at: datetime | None
    created_at: datetime | None = None
    # These are set per-request (not from DB directly)
    user_status: UserTaskStatus | None = None
    user_task_id: int | None = None
    error_message: str | None = None


class TaskListResponse(BaseModel):
    tasks: list[TaskSchema]
    completed_today: int
    total: int
    page: int
    pages: int


class StartTaskResponse(BaseModel):
    user_task_id: int
    status: UserTaskStatus
    expires_at: datetime | None


class CheckTaskResponse(BaseModel):
    status: UserTaskStatus
    message: str
    reward_earned: Decimal | None = None


# ── Bonuses ───────────────────────────────────────────────────────────────────

class ReferralSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    telegram_id: int
    first_name: str
    username: str | None
    is_active: bool
    joined_at: datetime
    earned_from: Decimal


class BonusesSchema(BaseModel):
    referral_link: str
    referrals_count: int
    total_from_referrals: Decimal
    referrals: list[ReferralSchema]


# ── Transactions ──────────────────────────────────────────────────────────────

class TransactionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: Decimal
    tx_type: TransactionType
    description: str
    created_at: datetime


class TransactionListResponse(BaseModel):
    items: list[TransactionSchema]
    total: int
    page: int
    pages: int


# ── Withdrawals ───────────────────────────────────────────────────────────────

class WithdrawalRequest(BaseModel):
    amount: Decimal
    method: str
    requisites: str


class WithdrawalSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: Decimal
    fee: Decimal
    method: str
    requisites: str
    status: WithdrawalStatus
    admin_note: str | None
    created_at: datetime
    processed_at: datetime | None

    @property
    def net_amount(self) -> Decimal:
        return self.amount - self.fee


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    secret: str


class AdminLoginResponse(BaseModel):
    access_token: str


class TaskCreateRequest(BaseModel):
    title: str
    description: str
    instruction: str
    task_type: TaskType
    reward: Decimal
    icon_url: str | None = None
    external_url: str | None = None
    channel_id: str | None = None
    post_id: str | None = None
    duration_seconds: int | None = None
    daily_limit: int = 1
    total_user_limit: int = 1
    max_completions: int | None = None
    sort_order: int = 0
    is_vip: bool = False
    expires_at: datetime | None = None


class TaskUpdateRequest(TaskCreateRequest):
    is_active: bool = True


class AdminUserSchema(UserSchema):
    last_ip: str | None
    device_fingerprint: str | None
    last_active_at: datetime
    ban_reason: str | None


class AdminStatsSchema(BaseModel):
    total_users: int
    active_today: int
    tasks_completed_today: int
    total_paid_out: Decimal
    pending_withdrawals: int
    pending_amount: Decimal


class AdminWithdrawalAction(BaseModel):
    note: str | None = None


class AdminBalanceAdjust(BaseModel):
    amount: Decimal
    reason: str


# ── Blacklist ─────────────────────────────────────────────────────────────────

class BlacklistEntrySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int | None
    device_fingerprint: str | None
    ip_address: str | None
    reason: str
    created_at: datetime


class BlacklistCreateRequest(BaseModel):
    telegram_id: int | None = None
    device_fingerprint: str | None = None
    ip_address: str | None = None
    reason: str


# ── System Settings ───────────────────────────────────────────────────────────

class SystemSettingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: str
    description: str
    updated_at: datetime


class SystemSettingUpdateRequest(BaseModel):
    value: str
