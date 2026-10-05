"""Create scheduled LiveKit meetings and performance indexes."""

from alembic import op
import sqlalchemy as sa


revision = "0004_scheduled_meetings"
down_revision = "0003_private_song_folders"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "ix_eventos_data_hora_id",
        "eventos",
        ["data", "hora", "id"],
        unique=False,
    )
    op.create_index(
        "ix_eventos_publicado_data_hora_id",
        "eventos",
        ["publicado", "data", "hora", "id"],
        unique=False,
    )
    op.create_index(
        "ix_escalas_usuario_culto",
        "escalas",
        ["usuario_id", "culto_id"],
        unique=False,
    )
    op.create_index(
        "ix_escalas_culto_status",
        "escalas",
        ["culto_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_notificacoes_usuario_criada_id",
        "notificacoes",
        ["usuario_id", "criada_em", "id"],
        unique=False,
    )
    op.create_table(
        "reunioes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("codigo", sa.String(length=64), nullable=False),
        sa.Column("titulo", sa.String(length=150), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("anfitriao_id", sa.Integer(), nullable=False),
        sa.Column("culto_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("inicio_em", sa.DateTime(), nullable=False),
        sa.Column("termino_em", sa.DateTime(), nullable=False),
        sa.Column("permite_compartilhar_tela", sa.Boolean(), nullable=False),
        sa.Column("sfu_provider", sa.String(length=30), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("encerrado_em", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "status IN ('agendada', 'ativa', 'encerrada')",
            name="ck_reunioes_status",
        ),
        sa.CheckConstraint(
            "termino_em > inicio_em",
            name="ck_reunioes_intervalo",
        ),
        sa.ForeignKeyConstraint(
            ["anfitriao_id"],
            ["usuarios.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["culto_id"],
            ["eventos.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo"),
    )
    op.create_index("ix_reunioes_codigo", "reunioes", ["codigo"], unique=True)
    op.create_index(
        "ix_reunioes_culto_status",
        "reunioes",
        ["culto_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_reunioes_status_inicio",
        "reunioes",
        ["status", "inicio_em"],
        unique=False,
    )
    op.create_table(
        "reuniao_participantes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("reuniao_id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["reuniao_id"],
            ["reunioes.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "reuniao_id",
            "usuario_id",
            name="uq_reuniao_participantes_reuniao_usuario",
        ),
    )
    op.create_index(
        "ix_reuniao_participantes_usuario_reuniao",
        "reuniao_participantes",
        ["usuario_id", "reuniao_id"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_reuniao_participantes_usuario_reuniao",
        table_name="reuniao_participantes",
    )
    op.drop_table("reuniao_participantes")
    op.drop_index("ix_reunioes_status_inicio", table_name="reunioes")
    op.drop_index("ix_reunioes_culto_status", table_name="reunioes")
    op.drop_index("ix_reunioes_codigo", table_name="reunioes")
    op.drop_table("reunioes")
    op.drop_index(
        "ix_notificacoes_usuario_criada_id",
        table_name="notificacoes",
    )
    op.drop_index("ix_escalas_culto_status", table_name="escalas")
    op.drop_index("ix_escalas_usuario_culto", table_name="escalas")
    op.drop_index(
        "ix_eventos_publicado_data_hora_id",
        table_name="eventos",
    )
    op.drop_index("ix_eventos_data_hora_id", table_name="eventos")
