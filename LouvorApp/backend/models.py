from flask_sqlalchemy import SQLAlchemy
from datetime import datetime


db = SQLAlchemy()


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

    criado_em = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    def __init__(
        self,
        nome,
        sobrenome,
        email,
        senha
    ):
        self.nome = nome
        self.sobrenome = sobrenome
        self.email = email
        self.senha = senha

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "sobrenome": self.sobrenome,
            "email": self.email,
            "criado_em": self.criado_em.isoformat()
            if self.criado_em else None
        }