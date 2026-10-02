"""Add locations to songs and notifications."""

from alembic import op
import sqlalchemy as sa


revision = "0002_add_locations"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("louvores", sa.Column("local", sa.String(length=200), nullable=True))
    op.add_column("notificacoes", sa.Column("local", sa.String(length=200), nullable=True))


def downgrade():
    op.drop_column("notificacoes", "local")
    op.drop_column("louvores", "local")
