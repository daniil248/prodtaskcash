"""add has_timer, timer_hours, is_simulation to tasks; first_checked_at to user_tasks

Revision ID: 005
Revises: 004
Create Date: 2026-03-13

"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("has_timer", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("tasks", sa.Column("timer_hours", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("is_simulation", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("user_tasks", sa.Column("first_checked_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("user_tasks", "first_checked_at")
    op.drop_column("tasks", "is_simulation")
    op.drop_column("tasks", "timer_hours")
    op.drop_column("tasks", "has_timer")
