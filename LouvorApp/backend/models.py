
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UniqueConstraint


db = SQLAlchemy()


def utcnow_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# =========================================================
# USUÁRIO
# =========================================================

class Usuario(db.Model):

    __tablename__ = "usuarios"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    nome = db.Column(
        db.String(100),
        nullable=False
    )

    sobrenome = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    senha = db.Column(
        db.String(255),
        nullable=False
    )

    tipo_usuario = db.Column(
        db.String(20),
        nullable=False,
        default="membro"
    )

    funcao_principal = db.Column(
        db.String(100),
        nullable=True
    )

    criado_em = db.Column(
        db.DateTime,
        nullable=False,
        default=utcnow_naive
    )

    def to_dict(self):

        return {
            "id": self.id,
            "nome": self.nome,
            "sobrenome": self.sobrenome,
            "email": self.email,
            "tipo_usuario": self.tipo_usuario,
            "funcao_principal": self.funcao_principal or "",
            "criado_em": (
                self.criado_em.isoformat()
                if self.criado_em
                else None
            )
        }


# =========================================================
# LOUVOR
# =========================================================

class Louvor(db.Model):

    __tablename__ = "louvores"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # -----------------------------------------------------
    # INFORMAÇÕES BÁSICAS
    # -----------------------------------------------------

    titulo = db.Column(
        db.String(200),
        nullable=False
    )

    artista = db.Column(
        db.String(150),
        nullable=True
    )

    local = db.Column(
        db.String(200),
        nullable=True
    )

    tom = db.Column(
        db.String(20),
        nullable=True
    )

    # -----------------------------------------------------
    # BPM
    # -----------------------------------------------------

    bpm = db.Column(
        db.Integer,
        nullable=True
    )

    # -----------------------------------------------------
    # CATEGORIA
    # -----------------------------------------------------

    categoria = db.Column(
        db.String(50),
        nullable=True
    )

    # -----------------------------------------------------
    # LETRA
    # -----------------------------------------------------

    letra = db.Column(
        db.Text,
        nullable=True
    )

    # -----------------------------------------------------
    # ESTRUTURA DA LETRA
    # -----------------------------------------------------

    estrutura_letra = db.Column(
        db.Text,
        nullable=True
    )

    # -----------------------------------------------------
    # LINK
    # -----------------------------------------------------

    link = db.Column(
        db.String(500),
        nullable=True
    )

    # -----------------------------------------------------
    # IMAGEM
    # -----------------------------------------------------

    imagem = db.Column(
        db.String(500),
        nullable=True
    )

    # -----------------------------------------------------
    # DATA DE CRIAÇÃO
    # -----------------------------------------------------

    criado_em = db.Column(
        db.DateTime,
        nullable=False,
        default=utcnow_naive
    )

    # =====================================================
    # CONVERTER PARA JSON
    # =====================================================

    def to_dict(self):

        return {

            "id": self.id,

            "titulo": self.titulo,

            "artista": self.artista,

            "local": self.local,

            "tom": self.tom,

            "bpm": self.bpm,

            "categoria": self.categoria,

            "letra": self.letra,

            "estrutura_letra":
                self.estrutura_letra,

            "link": self.link,

            "imagem": self.imagem,

            "criado_em": (
                self.criado_em.isoformat()
                if self.criado_em
                else None
            )
        }


class Culto(db.Model):

    __tablename__ = "eventos"

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    data = db.Column(db.String(10), nullable=False)
    hora = db.Column(db.String(5), nullable=True)
    local = db.Column(db.String(200), nullable=True)
    descricao = db.Column(db.Text, nullable=True)
    publicado = db.Column(db.Boolean, nullable=False, default=False)
    criado_em = db.Column(
        db.DateTime,
        nullable=False,
        default=utcnow_naive
    )


class EscalaMembro(db.Model):

    __tablename__ = "escalas"
    __table_args__ = (
        UniqueConstraint(
            "culto_id",
            "usuario_id",
            name="uq_escalas_culto_usuario",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    culto_id = db.Column(
        db.Integer,
        db.ForeignKey("eventos.id"),
        nullable=False
    )
    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=False
    )
    funcao = db.Column(db.String(100), nullable=False)
    confirmado = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(
        db.String(30),
        nullable=False,
        default="pendente",
    )
    troca_para_usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True,
    )


class Notificacao(db.Model):

    __tablename__ = "notificacoes"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=False,
        index=True,
    )
    tipo = db.Column(db.String(40), nullable=False)
    titulo = db.Column(db.String(160), nullable=False)
    mensagem = db.Column(db.Text, nullable=False)
    local = db.Column(db.String(200), nullable=True)
    evento_id = db.Column(
        db.Integer,
        db.ForeignKey("eventos.id"),
        nullable=True,
    )
    referencia = db.Column(db.String(160), nullable=True)
    lida = db.Column(db.Boolean, nullable=False, default=False)
    criada_em = db.Column(
        db.DateTime,
        nullable=False,
        default=utcnow_naive,
    )


class CultoLouvor(db.Model):

    __tablename__ = "culto_louvores"
    __table_args__ = (
        UniqueConstraint(
            "culto_id",
            "louvor_id",
            name="uq_culto_louvores_culto_louvor",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    culto_id = db.Column(
        db.Integer,
        db.ForeignKey("eventos.id"),
        nullable=False
    )
    louvor_id = db.Column(
        db.Integer,
        db.ForeignKey("louvores.id"),
        nullable=False
    )
    ordem = db.Column(db.Integer, nullable=False, default=1)
