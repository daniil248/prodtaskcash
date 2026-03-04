"""initial

Revision ID: 001
Revises:
Create Date: 2026-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False, unique=True),
        sa.Column("username", sa.String(128), nullable=True),
        sa.Column("first_name", sa.String(128), nullable=False),
        sa.Column("last_name", sa.String(128), nullable=True),
        sa.Column("language_code", sa.String(8), nullable=True),
        sa.Column("balance", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("balance_pending", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("total_earned", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("trust_score", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("is_banned", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("ban_reason", sa.Text(), nullable=True),
        sa.Column("referrer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("referral_reward_given", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("device_fingerprint", sa.String(256), nullable=True),
        sa.Column("last_ip", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_active_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"])

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("task_type", sa.Enum("subscribe", "like", "watch_ad", "invite", name="tasktype"), nullable=False),
        sa.Column("reward", sa.Numeric(18, 4), nullable=False),
        sa.Column("icon_url", sa.String(512), nullable=True),
        sa.Column("external_url", sa.String(512), nullable=True),
        sa.Column("channel_id", sa.String(128), nullable=True),
        sa.Column("post_id", sa.String(64), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("daily_limit", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("total_user_limit", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("total_completions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_completions", sa.Integer(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_tasks_is_active", "tasks", ["is_active"])

    op.create_table(
        "user_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("status", sa.Enum("in_progress", "checking", "completed", "failed", "expired", name="usertaskstatus"), nullable=False, server_default="in_progress"),
        sa.Column("day", sa.Date(), server_default=sa.func.current_date()),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("ix_user_tasks_user_id", "user_tasks", ["user_id"])
    op.create_index("ix_user_tasks_task_id", "user_tasks", ["task_id"])

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("tx_type", sa.Enum("task_reward", "referral_bonus", "withdrawal", "withdrawal_fee", "adjustment", "penalty", name="transactiontype"), nullable=False),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.String(512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])

    op.create_table(
        "withdrawals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("fee", sa.Numeric(18, 4), nullable=False),
        sa.Column("method", sa.String(64), nullable=False),
        sa.Column("requisites", sa.String(512), nullable=False),
        sa.Column("status", sa.Enum("created", "processing", "security_check", "paid", "rejected", name="withdrawalstatus"), nullable=False, server_default="created"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_withdrawals_user_id", "withdrawals", ["user_id"])
    op.create_index("ix_withdrawals_status", "withdrawals", ["status"])


def downgrade() -> None:
    op.drop_table("withdrawals")
    op.drop_table("transactions")
    op.drop_table("user_tasks")
    op.drop_table("tasks")
    op.drop_table("users")
