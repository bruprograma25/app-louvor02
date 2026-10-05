"""Add private song-folder ownership."""

from alembic import op
import sqlalchemy as sa


revision = "0003_private_song_folders"
down_revision = "0002_add_locations"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("louvores") as batch:
        batch.add_column(sa.Column("dono_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_louvores_dono_id_usuarios",
            "usuarios",
            ["dono_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_index(
            "ix_louvores_dono_id",
            ["dono_id"],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table("louvores") as batch:
        batch.drop_index("ix_louvores_dono_id")
        batch.drop_constraint(
            "fk_louvores_dono_id_usuarios",
            type_="foreignkey",
        )
        batch.drop_column("dono_id")
