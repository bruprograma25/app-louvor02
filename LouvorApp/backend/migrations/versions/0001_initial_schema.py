"""Create the LouvorApp production schema."""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "eventos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("titulo", sa.String(length=150), nullable=False),
        sa.Column("data", sa.String(length=10), nullable=False),
        sa.Column("hora", sa.String(length=5), nullable=True),
        sa.Column("local", sa.String(length=200), nullable=True),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("publicado", sa.Boolean(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "louvores",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("titulo", sa.String(length=200), nullable=False),
        sa.Column("artista", sa.String(length=150), nullable=True),
        sa.Column("tom", sa.String(length=20), nullable=True),
        sa.Column("bpm", sa.Integer(), nullable=True),
        sa.Column("categoria", sa.String(length=50), nullable=True),
        sa.Column("letra", sa.Text(), nullable=True),
        sa.Column("estrutura_letra", sa.Text(), nullable=True),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("imagem", sa.String(length=500), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(length=100), nullable=False),
        sa.Column("sobrenome", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=120), nullable=False),
        sa.Column("senha", sa.String(length=255), nullable=False),
        sa.Column("tipo_usuario", sa.String(length=20), nullable=False),
        sa.Column("funcao_principal", sa.String(length=100), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "culto_louvores",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("culto_id", sa.Integer(), nullable=False),
        sa.Column("louvor_id", sa.Integer(), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["culto_id"], ["eventos.id"]),
        sa.ForeignKeyConstraint(["louvor_id"], ["louvores.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "culto_id",
            "louvor_id",
            name="uq_culto_louvores_culto_louvor",
        ),
    )
    op.create_table(
        "escalas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("culto_id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("funcao", sa.String(length=100), nullable=False),
        sa.Column("confirmado", sa.Boolean(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="pendente",
        ),
        sa.Column("troca_para_usuario_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["culto_id"], ["eventos.id"]),
        sa.ForeignKeyConstraint(
            ["troca_para_usuario_id"],
            ["usuarios.id"],
        ),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "culto_id",
            "usuario_id",
            name="uq_escalas_culto_usuario",
        ),
    )
    op.create_table(
        "notificacoes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=40), nullable=False),
        sa.Column("titulo", sa.String(length=160), nullable=False),
        sa.Column("mensagem", sa.Text(), nullable=False),
        sa.Column("evento_id", sa.Integer(), nullable=True),
        sa.Column("referencia", sa.String(length=160), nullable=True),
        sa.Column("lida", sa.Boolean(), nullable=False),
        sa.Column("criada_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["evento_id"], ["eventos.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notificacoes_usuario_id",
        "notificacoes",
        ["usuario_id"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_notificacoes_usuario_id", table_name="notificacoes")
    op.drop_table("notificacoes")
    op.drop_table("escalas")
    op.drop_table("culto_louvores")
    op.drop_table("usuarios")
    op.drop_table("louvores")
    op.drop_table("eventos")
