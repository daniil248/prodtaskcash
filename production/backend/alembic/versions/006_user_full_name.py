"""add full_name to users (ФИО для вывода, редактируется только админом)

Revision ID: 006
Revises: 005
Create Date: 2026-03-06

"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(256), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "full_name")
