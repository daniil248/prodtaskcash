"""blacklist and system_settings tables

Revision ID: 002
Revises: 001
Create Date: 2026-03-04 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "blacklist",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("device_fingerprint", sa.String(256), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("reason", sa.String(256), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_blacklist_telegram_id", "blacklist", ["telegram_id"])
    op.create_index("ix_blacklist_device_fingerprint", "blacklist", ["device_fingerprint"])
    op.create_index("ix_blacklist_ip_address", "blacklist", ["ip_address"])

    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("description", sa.String(256), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Заполняем дефолтные настройки
    op.execute("""
        INSERT INTO system_settings (key, value, description) VALUES
        ('min_withdrawal', '10.0', 'Минимальная сумма вывода ($)'),
        ('max_withdrawal_day', '1000.0', 'Максимальный дневной вывод ($)'),
        ('max_withdrawal_week', '3000.0', 'Максимальный недельный вывод ($)'),
        ('withdrawal_fee_percent', '5.0', 'Комиссия за вывод (%)'),
        ('referral_reward', '0.50', 'Награда за реферала ($)'),
        ('referral_min_tasks', '3', 'Минимум заданий реферала для выплаты бонуса'),
        ('trust_soft_block', '20', 'Порог trust score для мягкой блокировки'),
        ('welcome_message',
         'Добро пожаловать в TaskCash! Выполняйте задания и получайте деньги.',
         'Приветственное сообщение бота')
    """)


def downgrade() -> None:
    op.drop_table("system_settings")
    op.drop_table("blacklist")
