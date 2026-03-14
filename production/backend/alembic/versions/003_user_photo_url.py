"""add photo_url to users

Revision ID: 003
Revises: 002
Create Date: 2026-03-04 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("photo_url", sa.String(512), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "photo_url")
