
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint, Index, UniqueConstraint


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

    dono_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

            "dono_id": self.dono_id,

            "criado_em": (
                self.criado_em.isoformat()
                if self.criado_em
                else None
            )
        }


class Culto(db.Model):

    __tablename__ = "eventos"
    __table_args__ = (
        Index("ix_eventos_data_hora_id", "data", "hora", "id"),
        Index(
            "ix_eventos_publicado_data_hora_id",
            "publicado",
            "data",
            "hora",
            "id",
        ),
    )

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
        Index("ix_escalas_usuario_culto", "usuario_id", "culto_id"),
        Index("ix_escalas_culto_status", "culto_id", "status"),
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
    __table_args__ = (
        Index(
            "ix_notificacoes_usuario_criada_id",
            "usuario_id",
            "criada_em",
            "id",
        ),
    )

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


class Reuniao(db.Model):

    __tablename__ = "reunioes"
    __table_args__ = (
        CheckConstraint(
            "status IN ('agendada', 'ativa', 'encerrada')",
            name="ck_reunioes_status",
        ),
        CheckConstraint(
            "termino_em > inicio_em",
            name="ck_reunioes_intervalo",
        ),
        Index("ix_reunioes_culto_status", "culto_id", "status"),
        Index("ix_reunioes_status_inicio", "status", "inicio_em"),
    )

    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(64), unique=True, nullable=False, index=True)
    titulo = db.Column(db.String(150), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    anfitriao_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False
    )
    culto_id = db.Column(
        db.Integer,
        db.ForeignKey("eventos.id", ondelete="CASCADE"),
        nullable=True
    )
    status = db.Column(
        db.String(30),
        nullable=False,
        default="agendada"
    )
    inicio_em = db.Column(db.DateTime, nullable=False)
    termino_em = db.Column(db.DateTime, nullable=False)
    permite_compartilhar_tela = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )
    sfu_provider = db.Column(
        db.String(30),
        nullable=False,
        default="livekit"
    )
    criado_em = db.Column(
        db.DateTime,
        nullable=False,
        default=utcnow_naive
    )
    encerrado_em = db.Column(db.DateTime, nullable=True)

    anfitriao = db.relationship(
        "Usuario",
        foreign_keys=[anfitriao_id],
        backref=db.backref("reunioes_criadas", passive_deletes=True),
    )
    culto = db.relationship(
        "Culto",
        foreign_keys=[culto_id],
        backref=db.backref("reunioes", passive_deletes=True),
    )
    participantes = db.relationship(
        "ReuniaoParticipante",
        back_populates="reuniao",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="select",
    )

    def pode_acessar(self, usuario):
        if not usuario:
            return False
        if usuario.tipo_usuario.lower() == "admin" or usuario.id == self.anfitriao_id:
            return True
        if ReuniaoParticipante.query.filter_by(
            reuniao_id=self.id,
            usuario_id=usuario.id,
        ).first():
            return True
        return bool(
            self.culto_id
            and self.culto.publicado
            and EscalaMembro.query.filter_by(
                culto_id=self.culto_id,
                usuario_id=usuario.id,
            ).first()
        )

    def to_dict(self):
        anfitriao_nome = ""
        if self.anfitriao:
            anfitriao_nome = f"{self.anfitriao.nome} {getattr(self.anfitriao, 'sobrenome', '')}".strip()

        culto_dados = None
        if self.culto:
            culto_dados = {
                "id": self.culto.id,
                "titulo": self.culto.titulo,
                "data": self.culto.data,
                "hora": self.culto.hora,
                "local": self.culto.local,
            }

        return {
            "id": self.id,
            "codigo": self.codigo,
            "titulo": self.titulo,
            "descricao": self.descricao,
            "anfitriao_id": self.anfitriao_id,
            "anfitriao_nome": anfitriao_nome,
            "culto_id": self.culto_id,
            "culto": culto_dados,
            "status": self.status,
            "inicio_em": self.inicio_em.isoformat() + "Z",
            "termino_em": self.termino_em.isoformat() + "Z",
            "permite_compartilhar_tela": self.permite_compartilhar_tela,
            "sfu_provider": self.sfu_provider,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "encerrado_em": self.encerrado_em.isoformat() if self.encerrado_em else None,
        }


class ReuniaoParticipante(db.Model):

    __tablename__ = "reuniao_participantes"
    __table_args__ = (
        UniqueConstraint(
            "reuniao_id",
            "usuario_id",
            name="uq_reuniao_participantes_reuniao_usuario",
        ),
        Index("ix_reuniao_participantes_usuario_reuniao", "usuario_id", "reuniao_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    reuniao_id = db.Column(
        db.Integer,
        db.ForeignKey("reunioes.id", ondelete="CASCADE"),
        nullable=False,
    )
    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    reuniao = db.relationship("Reuniao", back_populates="participantes")
    usuario = db.relationship("Usuario")
