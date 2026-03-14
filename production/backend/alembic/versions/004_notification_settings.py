"""add notification_settings to users

Revision ID: 004
Revises: 003
Create Date: 2026-03-05 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("notification_settings", sa.Text(), nullable=True, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("users", "notification_settings")
