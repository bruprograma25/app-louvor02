import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from sqlalchemy import text

from models import (
    db,
    Usuario,
    Louvor,
    Culto,
    EscalaMembro,
    CultoLouvor,
)


load_dotenv()


def _texto(dados, campo):
    valor = dados.get(campo, "")
    return valor.strip() if isinstance(valor, str) else ""


# =========================================================
# CONFIGURAÇÃO DO FLASK
# =========================================================

app = Flask(__name__)

CORS(app)

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-secret-in-production"
)
JWT_EXPIRES_MINUTES = int(
    os.getenv("JWT_EXPIRES_MINUTES", "120")
)


def _criar_token(usuario):
    agora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario.id),
        "email": usuario.email,
        "tipo_usuario": usuario.tipo_usuario,
        "iat": agora,
        "exp": agora + timedelta(minutes=JWT_EXPIRES_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")


def token_required(funcao):
    @wraps(funcao)
    def protegida(*args, **kwargs):
        cabecalho = request.headers.get("Authorization", "")
        partes = cabecalho.split()

        if len(partes) != 2 or partes[0].lower() != "bearer":
            return jsonify({
                "erro": "Token de autenticação não informado."
            }), 401

        try:
            payload = jwt.decode(
                partes[1],
                JWT_SECRET_KEY,
                algorithms=["HS256"]
            )
            usuario_id = int(payload["sub"])
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, KeyError, TypeError, ValueError):
            return jsonify({
                "erro": "Token de autenticação inválido ou expirado."
            }), 401

        usuario = db.session.get(Usuario, usuario_id)

        if not usuario:
            return jsonify({
                "erro": "Usuário do token não encontrado."
            }), 401

        request.usuario_logado = usuario
        return funcao(*args, **kwargs)

    return protegida


def admin_required(funcao):
    @wraps(funcao)
    @token_required
    def protegida(*args, **kwargs):
        if request.usuario_logado.tipo_usuario.lower() != "admin":
            return jsonify({
                "erro": "Apenas administradores podem executar esta ação."
            }), 403

        return funcao(*args, **kwargs)

    return protegida


def _inteiros(valores):
    if not isinstance(valores, list):
        return []

    resultado = []
    for valor in valores:
        try:
            resultado.append(int(valor))
        except (TypeError, ValueError):
            continue

    return resultado


def _culto_dict(culto, usuario_id=None):
    membros = (
        db.session.query(EscalaMembro, Usuario)
        .join(Usuario, Usuario.id == EscalaMembro.usuario_id)
        .filter(EscalaMembro.culto_id == culto.id)
        .all()
    )
    louvores = (
        db.session.query(CultoLouvor, Louvor)
        .join(Louvor, Louvor.id == CultoLouvor.louvor_id)
        .filter(CultoLouvor.culto_id == culto.id)
        .order_by(CultoLouvor.ordem.asc())
        .all()
    )

    return {
        "id": culto.id,
        "titulo": culto.titulo,
        "data": culto.data,
        "hora": culto.hora or "",
        "local": culto.local or "",
        "descricao": culto.descricao or "",
        "observacoes": culto.descricao or "",
        "publicado": bool(culto.publicado),
        "membros": [
            {
                "id": escala.usuario_id,
                "nome": f"{usuario.nome} {usuario.sobrenome}".strip(),
                "email": usuario.email,
                "funcao": escala.funcao,
                "confirmado": bool(escala.confirmado),
            }
            for escala, usuario in membros
            if usuario_id is None or escala.usuario_id == usuario_id
        ],
        "louvores": [
            {
                "id": louvor.id,
                "titulo": louvor.titulo,
                "artista": louvor.artista or "",
                "ordem": vinculo.ordem,
            }
            for vinculo, louvor in louvores
        ],
    }


# =========================================================
# CONFIGURAÇÃO DO BANCO DE DADOS
# =========================================================

app.config["SQLALCHEMY_DATABASE_URI"] = (
    "sqlite:///louvor.db"
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


with app.app_context():
    try:
        tabelas = {
            linha[0]
            for linha in db.session.execute(
                text(
                    "SELECT name FROM sqlite_master "
                    "WHERE type = 'table'"
                )
            ).fetchall()
        }

        if "cultos" in tabelas and "eventos" not in tabelas:
            db.session.execute(text("ALTER TABLE cultos RENAME TO eventos"))

        if "escala_membros" in tabelas and "escalas" not in tabelas:
            db.session.execute(
                text("ALTER TABLE escala_membros RENAME TO escalas")
            )

        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("AVISO AO MIGRAR TABELAS DA AGENDA:", erro)


# =========================================================
# CRIAÇÃO DAS TABELAS
# =========================================================

with app.app_context():
    db.create_all()


# =========================================================
# ATUALIZAÇÃO DO BANCO
# =========================================================

with app.app_context():

    try:
        tabelas_agenda = {
            linha[0]
            for linha in db.session.execute(
                text(
                    "SELECT name FROM sqlite_master "
                    "WHERE type = 'table'"
                )
            ).fetchall()
        }

        if "cultos" in tabelas_agenda and "eventos" in tabelas_agenda:
            db.session.execute(
                text(
                    "INSERT OR IGNORE INTO eventos "
                    "(id, titulo, data, hora, local, descricao, publicado, criado_em) "
                    "SELECT id, titulo, data, hora, local, observacoes, publicado, criado_em "
                    "FROM cultos"
                )
            )

        if (
            "escala_membros" in tabelas_agenda
            and "escalas" in tabelas_agenda
        ):
            db.session.execute(
                text(
                    "INSERT OR IGNORE INTO escalas "
                    "(id, culto_id, usuario_id, funcao, confirmado) "
                    "SELECT id, culto_id, usuario_id, funcao, 0 "
                    "FROM escala_membros"
                )
            )

        db.session.commit()

        eventos_colunas = [
            coluna[1]
            for coluna in db.session.execute(
                text("PRAGMA table_info(eventos)")
            ).fetchall()
        ]

        if eventos_colunas and "descricao" not in eventos_colunas:
            db.session.execute(
                text("ALTER TABLE eventos ADD COLUMN descricao TEXT")
            )

        escalas_colunas = [
            coluna[1]
            for coluna in db.session.execute(
                text("PRAGMA table_info(escalas)")
            ).fetchall()
        ]

        if escalas_colunas and "confirmado" not in escalas_colunas:
            db.session.execute(
                text(
                    "ALTER TABLE escalas ADD COLUMN confirmado "
                    "BOOLEAN NOT NULL DEFAULT 0"
                )
            )

        db.session.commit()

        resultado_usuarios = db.session.execute(
            text("PRAGMA table_info(usuarios)")
        )

        colunas_usuarios = [
            coluna[1]
            for coluna in resultado_usuarios.fetchall()
        ]

        if "tipo_usuario" not in colunas_usuarios:

            db.session.execute(
                text(
                    "ALTER TABLE usuarios "
                    "ADD COLUMN tipo_usuario "
                    "VARCHAR(20) NOT NULL DEFAULT 'membro'"
                )
            )

            db.session.commit()

            print(
                "Coluna 'tipo_usuario' adicionada ao banco."
            )

        resultado = db.session.execute(
            text("PRAGMA table_info(louvores)")
        )

        colunas = [
            coluna[1]
            for coluna in resultado.fetchall()
        ]

        # -------------------------------------------------
        # ESTRUTURA DA LETRA
        # -------------------------------------------------

        if "estrutura_letra" not in colunas:

            db.session.execute(
                text(
                    "ALTER TABLE louvores "
                    "ADD COLUMN estrutura_letra TEXT"
                )
            )

            db.session.commit()

            print(
                "Coluna 'estrutura_letra' adicionada ao banco."
            )

        # -------------------------------------------------
        # BPM
        # -------------------------------------------------

        if "bpm" not in colunas:

            db.session.execute(
                text(
                    "ALTER TABLE louvores "
                    "ADD COLUMN bpm INTEGER"
                )
            )

            db.session.commit()

            print(
                "Coluna 'bpm' adicionada ao banco."
            )

        # -------------------------------------------------
        # CATEGORIA
        # -------------------------------------------------

        if "categoria" not in colunas:

            db.session.execute(
                text(
                    "ALTER TABLE louvores "
                    "ADD COLUMN categoria VARCHAR(50)"
                )
            )

            db.session.commit()

            print(
                "Coluna 'categoria' adicionada ao banco."
            )

    except Exception as erro:

        db.session.rollback()

        print(
            "AVISO AO ATUALIZAR BANCO:",
            erro
        )


# =========================================================
# ROTA INICIAL
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "mensagem": "API do Louvor App funcionando!"
    })


# =========================================================
# CADASTRO DE USUÁRIO
# =========================================================

@app.route("/api/cadastro", methods=["POST"])
def cadastrar_usuario():

    dados = request.get_json(silent=True)

    if not dados:

        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    nome = _texto(dados, "nome")

    sobrenome = _texto(dados, "sobrenome")

    email = _texto(dados, "email").lower()

    senha = _texto(dados, "senha")

    confirmar_senha = _texto(dados, "confirmarSenha")

    # -----------------------------------------------------
    # VALIDAÇÕES
    # -----------------------------------------------------

    if not nome:

        return jsonify({
            "erro": "Nome não informado."
        }), 400

    if not sobrenome:

        return jsonify({
            "erro": "Sobrenome não informado."
        }), 400

    if not email:

        return jsonify({
            "erro": "E-mail não informado."
        }), 400

    if not senha:

        return jsonify({
            "erro": "Senha não informada."
        }), 400

    if len(senha) < 6:

        return jsonify({
            "erro": (
                "A senha precisa ter pelo menos "
                "6 caracteres."
            )
        }), 400

    if confirmar_senha:

        if senha != confirmar_senha:

            return jsonify({
                "erro": "As senhas não são iguais."
            }), 400

    # -----------------------------------------------------
    # VERIFICA USUÁRIO
    # -----------------------------------------------------

    usuario_existente = Usuario.query.filter_by(
        email=email
    ).first()

    if usuario_existente:

        return jsonify({
            "erro": "Este e-mail já está cadastrado."
        }), 409

    # -----------------------------------------------------
    # CRIPTOGRAFA SENHA
    # -----------------------------------------------------

    senha_hash = generate_password_hash(senha)

    # -----------------------------------------------------
    # CRIA USUÁRIO
    # -----------------------------------------------------

    novo_usuario = Usuario()

    novo_usuario.nome = nome
    novo_usuario.sobrenome = sobrenome
    novo_usuario.email = email
    novo_usuario.senha = senha_hash
    novo_usuario.tipo_usuario = "membro"

    # -----------------------------------------------------
    # SALVA
    # -----------------------------------------------------

    try:

        db.session.add(novo_usuario)

        db.session.commit()

    except Exception as erro:

        db.session.rollback()

        print(
            "ERRO AO CADASTRAR USUÁRIO:",
            erro
        )

        return jsonify({
            "erro": "Erro ao cadastrar usuário."
        }), 500

    return jsonify({

        "mensagem":
            "Usuário cadastrado com sucesso!",

        "usuario":
            novo_usuario.to_dict()

    }), 201


# =========================================================
# LOGIN
# =========================================================

@app.route("/api/login", methods=["POST"])
def login():

    dados = request.get_json(silent=True)

    if not dados:

        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    email = _texto(dados, "email").lower()

    senha = _texto(dados, "senha")

    if not email:

        return jsonify({
            "erro": "E-mail não informado."
        }), 400

    if not senha:

        return jsonify({
            "erro": "Senha não informada."
        }), 400

    usuario = Usuario.query.filter_by(
        email=email
    ).first()

    if not usuario:

        return jsonify({
            "erro": "E-mail ou senha incorretos."
        }), 401

    senha_correta = check_password_hash(
        usuario.senha,
        senha
    )

    if not senha_correta:

        return jsonify({
            "erro": "E-mail ou senha incorretos."
        }), 401

    return jsonify({

        "mensagem":
            "Login realizado com sucesso!",

        "usuario": usuario.to_dict(),
        "token": _criar_token(usuario)

    }), 200


# =========================================================
# LISTAR LOUVORES
# =========================================================

@app.route("/api/louvores", methods=["GET"])
@token_required
def listar_louvores():

    louvores = Louvor.query.order_by(
        Louvor.id.desc()
    ).all()

    return jsonify([

        louvor.to_dict()

        for louvor in louvores

    ]), 200


# =========================================================
# CADASTRAR LOUVOR
# =========================================================

@app.route("/api/louvores", methods=["POST"])
@admin_required
def cadastrar_louvor():

    dados = request.get_json(silent=True)

    if not dados:

        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    # -----------------------------------------------------
    # DADOS BÁSICOS
    # -----------------------------------------------------

    titulo = _texto(dados, "titulo")
    artista = _texto(dados, "artista")
    tom = _texto(dados, "tom")

    # -----------------------------------------------------
    # BPM
    # -----------------------------------------------------

    bpm = dados.get(
        "bpm",
        None
    )

    if bpm == "":
        bpm = None

    if bpm is not None:

        try:

            bpm = int(bpm)

        except (ValueError, TypeError):

            return jsonify({
                "erro": "O BPM precisa ser um número."
            }), 400

        if bpm < 1:

            return jsonify({
                "erro": "O BPM precisa ser maior que zero."
            }), 400

    # -----------------------------------------------------
    # CATEGORIA
    # -----------------------------------------------------

    categoria = _texto(dados, "categoria")

    # -----------------------------------------------------
    # LETRA
    # -----------------------------------------------------

    letra = _texto(dados, "letra")
    estrutura_letra = _texto(dados, "estrutura_letra")

    # -----------------------------------------------------
    # LINK E IMAGEM
    # -----------------------------------------------------

    link = _texto(dados, "link")
    imagem = _texto(dados, "imagem")

    # -----------------------------------------------------
    # VALIDAÇÃO
    # -----------------------------------------------------

    if not titulo:

        return jsonify({
            "erro": "O título do louvor é obrigatório."
        }), 400

    # -----------------------------------------------------
    # CRIA LOUVOR
    # -----------------------------------------------------

    novo_louvor = Louvor()

    novo_louvor.titulo = titulo
    novo_louvor.artista = artista
    novo_louvor.tom = tom
    novo_louvor.bpm = bpm
    novo_louvor.categoria = categoria
    novo_louvor.letra = letra
    novo_louvor.estrutura_letra = estrutura_letra
    novo_louvor.link = link
    novo_louvor.imagem = imagem

    # -----------------------------------------------------
    # SALVA
    # -----------------------------------------------------

    try:

        db.session.add(novo_louvor)

        db.session.commit()

    except Exception as erro:

        db.session.rollback()

        print(
            "ERRO AO CADASTRAR LOUVOR:",
            erro
        )

        return jsonify({
            "erro": "Erro ao cadastrar louvor."
        }), 500

    return jsonify({

        "mensagem":
            "Louvor cadastrado com sucesso!",

        "louvor":
            novo_louvor.to_dict()

    }), 201


# =========================================================
# BUSCAR LOUVOR
# =========================================================

@app.route("/api/louvores/<int:id>", methods=["GET"])
@token_required
def buscar_louvor(id):

    louvor = db.session.get(
        Louvor,
        id
    )

    if not louvor:

        return jsonify({
            "erro": "Louvor não encontrado."
        }), 404

    return jsonify(
        louvor.to_dict()
    ), 200


# =========================================================
# EDITAR LOUVOR
# =========================================================

@app.route(
    "/api/louvores/<int:id>",
    methods=["PUT"]
)
@admin_required
def editar_louvor(id):

    louvor = db.session.get(
        Louvor,
        id
    )

    if not louvor:

        return jsonify({
            "erro": "Louvor não encontrado."
        }), 404

    dados = request.get_json(
        silent=True
    )

    if not dados:

        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    # -----------------------------------------------------
    # DADOS BÁSICOS
    # -----------------------------------------------------

    titulo = _texto(dados, "titulo")
    artista = _texto(dados, "artista")
    tom = _texto(dados, "tom")
    categoria = _texto(dados, "categoria")
    letra = _texto(dados, "letra")
    estrutura_letra = _texto(dados, "estrutura_letra")
    link = _texto(dados, "link")
    imagem = _texto(dados, "imagem")

    # -----------------------------------------------------
    # VALIDA TÍTULO
    # -----------------------------------------------------

    if not titulo:

        return jsonify({
            "erro": "O título do louvor é obrigatório."
        }), 400

    # -----------------------------------------------------
    # BPM
    # -----------------------------------------------------

    bpm = dados.get(
        "bpm",
        None
    )

    if bpm == "":
        bpm = None

    if bpm is not None:

        try:

            bpm = int(bpm)

        except (ValueError, TypeError):

            return jsonify({
                "erro": "O BPM precisa ser um número."
            }), 400

        if bpm < 1:

            return jsonify({
                "erro": "O BPM precisa ser maior que zero."
            }), 400

    # -----------------------------------------------------
    # ATUALIZA
    # -----------------------------------------------------

    louvor.titulo = titulo
    louvor.artista = artista
    louvor.tom = tom
    louvor.bpm = bpm
    louvor.categoria = categoria
    louvor.letra = letra
    louvor.estrutura_letra = estrutura_letra
    louvor.link = link
    louvor.imagem = imagem

    # -----------------------------------------------------
    # SALVA
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as erro:

        db.session.rollback()

        print(
            "ERRO AO EDITAR LOUVOR:",
            erro
        )

        return jsonify({
            "erro": "Erro ao atualizar louvor."
        }), 500

    return jsonify({

        "mensagem":
            "Louvor atualizado com sucesso!",

        "louvor":
            louvor.to_dict()

    }), 200


# =========================================================
# EXCLUIR LOUVOR
# =========================================================

@app.route(
    "/api/louvores/<int:id>",
    methods=["DELETE"]
)
@admin_required
def excluir_louvor(id):

    louvor = db.session.get(
        Louvor,
        id
    )

    if not louvor:

        return jsonify({
            "erro": "Louvor não encontrado."
        }), 404

    try:

        db.session.delete(louvor)

        db.session.commit()

    except Exception as erro:

        db.session.rollback()

        print(
            "ERRO AO EXCLUIR LOUVOR:",
            erro
        )

        return jsonify({
            "erro": "Erro ao excluir louvor."
        }), 500

    return jsonify({

        "mensagem":
            "Louvor excluído com sucesso!"

    }), 200


@app.route("/api/agenda/membros", methods=["GET"])
@admin_required
def listar_membros_agenda():
    membros = Usuario.query.order_by(Usuario.nome.asc()).all()
    return jsonify([
        {
            "id": membro.id,
            "nome": f"{membro.nome} {membro.sobrenome}".strip(),
            "email": membro.email,
            "tipo_usuario": membro.tipo_usuario,
        }
        for membro in membros
    ]), 200


@app.route("/api/eventos", methods=["GET"])
@app.route("/api/agenda", methods=["GET"])
@token_required
def listar_agenda():
    consulta = Culto.query.order_by(
        Culto.data.asc(),
        Culto.hora.asc(),
        Culto.id.asc()
    )

    if request.usuario_logado.tipo_usuario.lower() != "admin":
        consulta = consulta.filter_by(publicado=True)

    cultos = consulta.all()
    return jsonify([
        _culto_dict(
            culto,
            request.usuario_logado.id
            if request.usuario_logado.tipo_usuario.lower() != "admin"
            else None
        )
        for culto in cultos
    ]), 200


@app.route("/api/eventos", methods=["POST"])
@app.route("/api/agenda", methods=["POST"])
@admin_required
def criar_culto():
    dados = request.get_json(silent=True) or {}
    titulo = _texto(dados, "titulo")
    data = _texto(dados, "data")

    if not titulo or not data:
        return jsonify({
            "erro": "Título e data do culto são obrigatórios."
        }), 400

    culto = Culto(
        titulo=titulo,
        data=data,
        hora=_texto(dados, "hora"),
        local=_texto(dados, "local"),
        descricao=(
            _texto(dados, "descricao")
            or _texto(dados, "observacoes")
        ),
        publicado=False,
    )

    try:
        db.session.add(culto)
        db.session.flush()
        _atualizar_vinculos_culto(culto.id, dados)
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO CRIAR CULTO:", erro)
        return jsonify({"erro": "Erro ao criar culto."}), 500

    return jsonify({
        "mensagem": "Culto criado com sucesso.",
        "culto": _culto_dict(culto),
    }), 201


def _atualizar_vinculos_culto(culto_id, dados):
    EscalaMembro.query.filter_by(culto_id=culto_id).delete()
    CultoLouvor.query.filter_by(culto_id=culto_id).delete()

    membros = dados.get("membros", [])
    if isinstance(membros, list):
        for item in membros:
            if not isinstance(item, dict):
                continue
            try:
                usuario_id = int(item.get("usuario_id"))
            except (TypeError, ValueError):
                continue
            funcao = _texto(item, "funcao")
            if not funcao or not db.session.get(Usuario, usuario_id):
                continue
            db.session.add(EscalaMembro(
                culto_id=culto_id,
                usuario_id=usuario_id,
                funcao=funcao,
            ))

    for ordem, louvor_id in enumerate(
        _inteiros(dados.get("louvor_ids", [])),
        start=1
    ):
        if db.session.get(Louvor, louvor_id):
            db.session.add(CultoLouvor(
                culto_id=culto_id,
                louvor_id=louvor_id,
                ordem=ordem,
            ))


@app.route("/api/eventos/<int:id>", methods=["PUT"])
@app.route("/api/agenda/<int:id>", methods=["PUT"])
@admin_required
def editar_culto(id):
    culto = db.session.get(Culto, id)
    dados = request.get_json(silent=True) or {}

    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404

    titulo = _texto(dados, "titulo")
    data = _texto(dados, "data")
    if not titulo or not data:
        return jsonify({
            "erro": "Título e data do culto são obrigatórios."
        }), 400

    culto.titulo = titulo
    culto.data = data
    culto.hora = _texto(dados, "hora")
    culto.local = _texto(dados, "local")
    culto.descricao = (
        _texto(dados, "descricao")
        or _texto(dados, "observacoes")
    )

    try:
        _atualizar_vinculos_culto(culto.id, dados)
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO EDITAR CULTO:", erro)
        return jsonify({"erro": "Erro ao editar culto."}), 500

    return jsonify({
        "mensagem": "Culto atualizado com sucesso.",
        "culto": _culto_dict(culto),
    }), 200


@app.route("/api/eventos/<int:id>/publicar", methods=["POST"])
@app.route("/api/agenda/<int:id>/publicar", methods=["POST"])
@admin_required
def publicar_culto(id):
    culto = db.session.get(Culto, id)
    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404

    culto.publicado = True
    try:
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO PUBLICAR CULTO:", erro)
        return jsonify({"erro": "Erro ao publicar escala."}), 500

    return jsonify({
        "mensagem": "Escala publicada com sucesso.",
        "culto": _culto_dict(culto),
    }), 200


@app.route("/api/eventos/<int:id>/confirmar", methods=["POST"])
@app.route("/api/agenda/<int:id>/confirmar", methods=["POST"])
@token_required
def confirmar_escala(id):
    escala = EscalaMembro.query.filter_by(
        culto_id=id,
        usuario_id=request.usuario_logado.id,
    ).first()

    if not escala:
        return jsonify({
            "erro": "Você não está incluído nesta escala."
        }), 403

    escala.confirmado = True
    try:
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO CONFIRMAR ESCALA:", erro)
        return jsonify({
            "erro": "Erro ao confirmar a escala."
        }), 500

    return jsonify({
        "mensagem": "Escala confirmada com sucesso."
    }), 200


@app.route("/api/eventos/<int:id>", methods=["DELETE"])
@app.route("/api/agenda/<int:id>", methods=["DELETE"])
@admin_required
def excluir_culto(id):
    culto = db.session.get(Culto, id)
    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404

    try:
        EscalaMembro.query.filter_by(culto_id=id).delete()
        CultoLouvor.query.filter_by(culto_id=id).delete()
        db.session.delete(culto)
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO EXCLUIR CULTO:", erro)
        return jsonify({"erro": "Erro ao excluir culto."}), 500

    return jsonify({"mensagem": "Culto excluído com sucesso."}), 200


# =========================================================
# EXECUTAR SERVIDOR
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )