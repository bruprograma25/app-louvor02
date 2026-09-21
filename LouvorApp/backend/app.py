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
    Notificacao,
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


FUNCOES_ESCALA = (
    "vocal",
    "violao",
    "guitarra",
    "teclado",
    "bateria",
    "baixo",
    "som",
    "direcao musical",
    "percussao",
    "projecao",
    "multimidia",
    "outro",
)


def _validar_membros_escala(dados):
    membros = dados.get("membros", [])

    if not isinstance(membros, list):
        return None, "A lista de membros da escala é inválida."

    validos = []
    ids_usados = set()

    for item in membros:
        if not isinstance(item, dict):
            return None, "Cada membro da escala precisa ser um objeto válido."

        try:
            usuario_id = int(item.get("usuario_id"))
        except (TypeError, ValueError):
            return None, "Selecione um membro válido para a escala."

        funcao = _texto(item, "funcao").lower()
        if not funcao or len(funcao) > 100:
            return None, "Informe uma função válida para cada membro."
        if funcao not in FUNCOES_ESCALA:
            return None, "Escolha uma função disponível para a escala."

        if usuario_id in ids_usados:
            return None, "O mesmo membro não pode ser repetido na escala."

        usuario = db.session.get(Usuario, usuario_id)
        if not usuario or usuario.tipo_usuario.lower() != "membro":
            return None, "Apenas membros cadastrados podem participar da escala."

        ids_usados.add(usuario_id)
        validos.append((usuario_id, funcao))

    return validos, None


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
                "status": _status_escala(escala),
                "troca_para": _troca_dict(escala),
            }
            for escala, usuario in membros
            if usuario_id is None or escala.usuario_id == usuario_id
        ],
        "louvores": [
            {
                "id": louvor.id,
                "titulo": louvor.titulo,
                "artista": louvor.artista or "",
                "tom": louvor.tom or "",
                "ordem": vinculo.ordem,
            }
            for vinculo, louvor in louvores
        ],
    }


def _escala_dict(escala):
    usuario = db.session.get(Usuario, escala.usuario_id)
    return {
        "id": escala.id,
        "evento_id": escala.culto_id,
        "usuario_id": escala.usuario_id,
        "nome": f"{usuario.nome} {usuario.sobrenome}".strip(),
        "email": usuario.email,
        "funcao": escala.funcao,
        "confirmado": bool(escala.confirmado),
        "status": _status_escala(escala),
        "troca_para": _troca_dict(escala),
    }


def _status_escala(escala):
    status = (escala.status or "").lower()
    if status in ("pendente", "confirmado", "recusado", "troca_solicitada"):
        return status
    return "confirmado" if escala.confirmado else "pendente"


def _troca_dict(escala):
    if not escala.troca_para_usuario_id:
        return None

    usuario = db.session.get(Usuario, escala.troca_para_usuario_id)
    if not usuario:
        return None

    return {
        "usuario_id": usuario.id,
        "nome": f"{usuario.nome} {usuario.sobrenome}".strip(),
        "email": usuario.email,
    }


def _notificar_usuario(
    usuario_id,
    tipo,
    titulo,
    mensagem,
    evento_id=None,
    referencia=None,
):
    if referencia and Notificacao.query.filter_by(
        usuario_id=usuario_id,
        referencia=referencia,
    ).first():
        return

    db.session.add(Notificacao(
        usuario_id=usuario_id,
        tipo=tipo,
        titulo=titulo,
        mensagem=mensagem,
        evento_id=evento_id,
        referencia=referencia,
    ))


def _notificar_membros_evento(
    evento_id,
    tipo,
    titulo,
    mensagem,
    referencia_prefixo=None,
):
    escalas = EscalaMembro.query.filter_by(culto_id=evento_id).all()
    for escala in escalas:
        referencia = (
            f"{referencia_prefixo}:{escala.usuario_id}"
            if referencia_prefixo
            else None
        )
        _notificar_usuario(
            escala.usuario_id,
            tipo,
            titulo,
            mensagem,
            evento_id,
            referencia,
        )


def _notificar_administradores(
    tipo,
    titulo,
    mensagem,
    evento_id=None,
    referencia_prefixo=None,
):
    administradores = Usuario.query.filter(
        db.func.lower(Usuario.tipo_usuario) == "admin"
    ).all()
    for administrador in administradores:
        referencia = (
            f"{referencia_prefixo}:{administrador.id}"
            if referencia_prefixo
            else None
        )
        _notificar_usuario(
            administrador.id,
            tipo,
            titulo,
            mensagem,
            evento_id,
            referencia,
        )


def _notificacao_dict(notificacao):
    return {
        "id": notificacao.id,
        "tipo": notificacao.tipo,
        "titulo": notificacao.titulo,
        "mensagem": notificacao.mensagem,
        "evento_id": notificacao.evento_id,
        "lida": bool(notificacao.lida),
        "criada_em": (
            notificacao.criada_em.isoformat()
            if notificacao.criada_em
            else None
        ),
    }


def _gerar_lembretes(usuario_id):
    hoje = datetime.utcnow().date()
    limite = hoje + timedelta(days=3)
    escalas = EscalaMembro.query.filter_by(usuario_id=usuario_id).all()
    for escala in escalas:
        evento = db.session.get(Culto, escala.culto_id)
        if not evento or not evento.publicado:
            continue
        try:
            data_evento = datetime.strptime(evento.data, "%Y-%m-%d").date()
        except (TypeError, ValueError):
            continue
        if hoje <= data_evento <= limite:
            referencia = f"lembrete:{evento.id}:{usuario_id}:{evento.data}"
            _notificar_usuario(
                usuario_id,
                "lembrete",
                "Lembrete de escala",
                f"Você está escalado para {evento.titulo} em "
                f"{evento.data} às {evento.hora or 'horário não informado'}.",
                evento.id,
                referencia,
            )


def _buscar_membro_escala(evento_id, usuario_id):
    return EscalaMembro.query.filter_by(
        culto_id=evento_id,
        usuario_id=usuario_id,
    ).first()


def _dados_nova_escala(dados):
    membros, erro = _validar_membros_escala({
        "membros": [dados],
    })
    if erro:
        return None, erro
    return membros[0], None


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

        if escalas_colunas and "status" not in escalas_colunas:
            db.session.execute(
                text(
                    "ALTER TABLE escalas ADD COLUMN status "
                    "VARCHAR(30) NOT NULL DEFAULT 'pendente'"
                )
            )

        if escalas_colunas and "troca_para_usuario_id" not in escalas_colunas:
            db.session.execute(
                text(
                    "ALTER TABLE escalas ADD COLUMN troca_para_usuario_id "
                    "INTEGER"
                )
            )

        db.session.execute(
            text(
                "UPDATE escalas SET status = 'confirmado' "
                "WHERE confirmado = 1 AND (status IS NULL OR status = 'pendente')"
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

        if "funcao_principal" not in colunas_usuarios:
            db.session.execute(
                text(
                    "ALTER TABLE usuarios ADD COLUMN funcao_principal "
                    "VARCHAR(100)"
                )
            )
            db.session.commit()

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
    membros = Usuario.query.filter(
        db.func.lower(Usuario.tipo_usuario) == "membro"
    ).order_by(Usuario.nome.asc()).all()
    return jsonify([
        {
            "id": membro.id,
            "nome": f"{membro.nome} {membro.sobrenome}".strip(),
            "nome_completo": f"{membro.nome} {membro.sobrenome}".strip(),
            "nome_primeiro": membro.nome,
            "sobrenome": membro.sobrenome,
            "email": membro.email,
            "tipo_usuario": membro.tipo_usuario,
            "funcao_principal": membro.funcao_principal or "",
        }
        for membro in membros
    ]), 200


def _membro_dict(membro):
    return {
        "id": membro.id,
        "nome": membro.nome,
        "sobrenome": membro.sobrenome,
        "nome_completo": f"{membro.nome} {membro.sobrenome}".strip(),
        "email": membro.email,
        "tipo_usuario": membro.tipo_usuario,
        "funcao_principal": membro.funcao_principal or "",
    }


@app.route("/api/membros", methods=["POST"])
@admin_required
def cadastrar_membro():
    dados = request.get_json(silent=True) or {}
    nome = _texto(dados, "nome")
    sobrenome = _texto(dados, "sobrenome")
    email = _texto(dados, "email").lower()
    senha = _texto(dados, "senha")
    funcao = _texto(dados, "funcao_principal")

    if not nome or not sobrenome or not email or not senha:
        return jsonify({
            "erro": "Nome, sobrenome, e-mail e senha são obrigatórios."
        }), 400
    if len(senha) < 6:
        return jsonify({
            "erro": "A senha precisa ter pelo menos 6 caracteres."
        }), 400
    if Usuario.query.filter_by(email=email).first():
        return jsonify({"erro": "Este e-mail já está cadastrado."}), 409

    membro = Usuario(
        nome=nome,
        sobrenome=sobrenome,
        email=email,
        senha=generate_password_hash(senha),
        tipo_usuario="membro",
        funcao_principal=funcao or None,
    )
    try:
        db.session.add(membro)
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO CADASTRAR MEMBRO:", erro)
        return jsonify({"erro": "Erro ao cadastrar membro."}), 500

    return jsonify({
        "mensagem": "Membro cadastrado com sucesso.",
        "membro": _membro_dict(membro),
    }), 201


@app.route("/api/membros/<int:id>", methods=["PUT"])
@admin_required
def editar_membro(id):
    membro = db.session.get(Usuario, id)
    if not membro or membro.tipo_usuario.lower() != "membro":
        return jsonify({"erro": "Membro não encontrado."}), 404

    dados = request.get_json(silent=True) or {}
    nome = _texto(dados, "nome")
    sobrenome = _texto(dados, "sobrenome")
    email = _texto(dados, "email").lower()
    funcao = _texto(dados, "funcao_principal")
    senha = _texto(dados, "senha")

    if not nome or not sobrenome or not email:
        return jsonify({
            "erro": "Nome, sobrenome e e-mail são obrigatórios."
        }), 400
    if senha and len(senha) < 6:
        return jsonify({
            "erro": "A senha precisa ter pelo menos 6 caracteres."
        }), 400
    outro = Usuario.query.filter(
        Usuario.email == email,
        Usuario.id != id,
    ).first()
    if outro:
        return jsonify({"erro": "Este e-mail já está cadastrado."}), 409

    membro.nome = nome
    membro.sobrenome = sobrenome
    membro.email = email
    membro.funcao_principal = funcao or None
    if senha:
        membro.senha = generate_password_hash(senha)

    try:
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO EDITAR MEMBRO:", erro)
        return jsonify({"erro": "Erro ao editar membro."}), 500

    return jsonify({
        "mensagem": "Membro atualizado com sucesso.",
        "membro": _membro_dict(membro),
    }), 200


@app.route("/api/membros/<int:id>", methods=["DELETE"])
@admin_required
def remover_membro(id):
    membro = db.session.get(Usuario, id)
    if not membro or membro.tipo_usuario.lower() != "membro":
        return jsonify({"erro": "Membro não encontrado."}), 404

    try:
        EscalaMembro.query.filter(
            db.or_(
                EscalaMembro.usuario_id == id,
                EscalaMembro.troca_para_usuario_id == id,
            )
        ).delete(synchronize_session=False)
        Notificacao.query.filter_by(usuario_id=id).delete(
            synchronize_session=False
        )
        db.session.delete(membro)
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO REMOVER MEMBRO:", erro)
        return jsonify({"erro": "Erro ao remover membro."}), 500

    return jsonify({"mensagem": "Membro removido com sucesso."}), 200


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


@app.route("/api/eventos/<int:id>", methods=["GET"])
@app.route("/api/agenda/<int:id>", methods=["GET"])
@token_required
def detalhar_evento(id):
    culto = db.session.get(Culto, id)
    if not culto:
        return jsonify({"erro": "Culto ou evento não encontrado."}), 404

    eh_admin = request.usuario_logado.tipo_usuario.lower() == "admin"
    if not eh_admin and not culto.publicado:
        return jsonify({
            "erro": "Este evento ainda não foi publicado."
        }), 403

    return jsonify(_culto_dict(
        culto,
        None if eh_admin else request.usuario_logado.id,
    )), 200


@app.route("/api/notificacoes", methods=["GET"])
@token_required
def listar_notificacoes():
    _gerar_lembretes(request.usuario_logado.id)
    db.session.commit()
    notificacoes = Notificacao.query.filter_by(
        usuario_id=request.usuario_logado.id
    ).order_by(
        Notificacao.criada_em.desc(),
        Notificacao.id.desc(),
    ).limit(100).all()
    return jsonify([_notificacao_dict(item) for item in notificacoes]), 200


@app.route("/api/notificacoes/<int:id>/ler", methods=["POST"])
@token_required
def marcar_notificacao_lida(id):
    notificacao = db.session.get(Notificacao, id)
    if not notificacao or notificacao.usuario_id != request.usuario_logado.id:
        return jsonify({"erro": "Notificação não encontrada."}), 404

    notificacao.lida = True
    db.session.commit()
    return jsonify({"mensagem": "Notificação marcada como lida."}), 200


@app.route("/api/notificacoes/ler-todas", methods=["POST"])
@token_required
def marcar_notificacoes_lidas():
    Notificacao.query.filter_by(
        usuario_id=request.usuario_logado.id,
        lida=False,
    ).update({"lida": True})
    db.session.commit()
    return jsonify({"mensagem": "Notificações marcadas como lidas."}), 200


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

    membros, erro_membros = _validar_membros_escala(dados)
    if erro_membros:
        return jsonify({"erro": erro_membros}), 400

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
        _atualizar_vinculos_culto(culto.id, dados, membros)
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO CRIAR CULTO:", erro)
        return jsonify({"erro": "Erro ao criar culto."}), 500

    return jsonify({
        "mensagem": "Culto criado com sucesso.",
        "culto": _culto_dict(culto),
    }), 201


def _atualizar_vinculos_culto(culto_id, dados, membros=None):
    EscalaMembro.query.filter_by(culto_id=culto_id).delete()
    CultoLouvor.query.filter_by(culto_id=culto_id).delete()

    for usuario_id, funcao in membros or []:
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

    membros, erro_membros = _validar_membros_escala(dados)
    if erro_membros:
        return jsonify({"erro": erro_membros}), 400

    membros_anteriores = {
        escala.usuario_id for escala in
        EscalaMembro.query.filter_by(culto_id=id).all()
    }
    houve_alteracao = any([
        culto.titulo != titulo,
        culto.data != data,
        (culto.hora or "") != _texto(dados, "hora"),
        (culto.local or "") != _texto(dados, "local"),
        (culto.descricao or "") != (
            _texto(dados, "descricao")
            or _texto(dados, "observacoes")
        ),
    ])

    culto.titulo = titulo
    culto.data = data
    culto.hora = _texto(dados, "hora")
    culto.local = _texto(dados, "local")
    culto.descricao = (
        _texto(dados, "descricao")
        or _texto(dados, "observacoes")
    )

    try:
        _atualizar_vinculos_culto(culto.id, dados, membros)
        if houve_alteracao and culto.publicado:
            _notificar_membros_evento(
                culto.id,
                "evento_alterado",
                "Evento alterado",
                f"As informações de {culto.titulo} foram atualizadas.",
                f"evento-alterado:{culto.id}:{culto.data}:{culto.hora}:{culto.local}",
            )
        membros_atuais = {usuario_id for usuario_id, _ in membros}
        for usuario_id in membros_anteriores - membros_atuais:
            if culto.publicado:
                _notificar_usuario(
                    usuario_id,
                    "participacao_alterada",
                    "Você foi removido da escala",
                    f"Você não está mais escalado para {culto.titulo}.",
                    culto.id,
                    f"removido:{culto.id}:{usuario_id}:{culto.data}",
                )
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO EDITAR CULTO:", erro)
        return jsonify({"erro": "Erro ao editar culto."}), 500

    return jsonify({
        "mensagem": "Culto atualizado com sucesso.",
        "culto": _culto_dict(culto),
    }), 200


@app.route("/api/eventos/<int:id>/escala", methods=["GET"])
@app.route("/api/agenda/<int:id>/escala", methods=["GET"])
@token_required
def listar_escala_evento(id):
    culto = db.session.get(Culto, id)
    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404

    escalas = EscalaMembro.query.filter_by(culto_id=id).order_by(
        EscalaMembro.id.asc()
    ).all()
    if request.usuario_logado.tipo_usuario.lower() != "admin":
        if not culto.publicado:
            return jsonify({"erro": "Esta escala ainda não foi publicada."}), 403
        escalas = [
            escala for escala in escalas
            if escala.usuario_id == request.usuario_logado.id
        ]

    return jsonify([_escala_dict(escala) for escala in escalas]), 200


def _louvor_evento_dict(vinculo, louvor):
    return {
        "id": vinculo.id,
        "evento_id": vinculo.culto_id,
        "louvor_id": louvor.id,
        "titulo": louvor.titulo,
        "artista": louvor.artista or "",
        "tom": louvor.tom or "",
        "ordem": vinculo.ordem,
    }


@app.route("/api/eventos/<int:id>/louvores", methods=["GET"])
@app.route("/api/agenda/<int:id>/louvores", methods=["GET"])
@token_required
def listar_louvores_evento(id):
    culto = db.session.get(Culto, id)
    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404
    if (
        request.usuario_logado.tipo_usuario.lower() != "admin"
        and not culto.publicado
    ):
        return jsonify({"erro": "Este evento ainda não foi publicado."}), 403

    registros = db.session.query(CultoLouvor, Louvor).join(
        Louvor,
        Louvor.id == CultoLouvor.louvor_id,
    ).filter(
        CultoLouvor.culto_id == id,
    ).order_by(CultoLouvor.ordem.asc()).all()
    return jsonify([
        _louvor_evento_dict(vinculo, louvor)
        for vinculo, louvor in registros
    ]), 200


@app.route("/api/eventos/<int:id>/louvores", methods=["POST"])
@app.route("/api/agenda/<int:id>/louvores", methods=["POST"])
@admin_required
def adicionar_louvor_evento(id):
    culto = db.session.get(Culto, id)
    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404

    dados = request.get_json(silent=True) or {}
    try:
        louvor_id = int(dados.get("louvor_id"))
    except (TypeError, ValueError):
        return jsonify({"erro": "Selecione um louvor válido."}), 400

    louvor = db.session.get(Louvor, louvor_id)
    if not louvor:
        return jsonify({"erro": "Louvor não encontrado."}), 404
    if CultoLouvor.query.filter_by(
        culto_id=id,
        louvor_id=louvor_id,
    ).first():
        return jsonify({"erro": "Este louvor já está vinculado ao evento."}), 409

    try:
        ordem = int(dados.get("ordem", 0))
    except (TypeError, ValueError):
        ordem = 0
    total = CultoLouvor.query.filter_by(culto_id=id).count()
    ordem = ordem if 1 <= ordem <= total + 1 else total + 1
    vinculo = CultoLouvor(culto_id=id, louvor_id=louvor_id, ordem=ordem)

    try:
        db.session.add(vinculo)
        db.session.flush()
        vinculos = CultoLouvor.query.filter_by(culto_id=id).order_by(
            CultoLouvor.ordem.asc(),
            CultoLouvor.id.asc(),
        ).all()
        for indice, item in enumerate(vinculos, start=1):
            item.ordem = indice
        _notificar_membros_evento(
            id,
            "evento_alterado",
            "Louvor adicionado ao evento",
            f'O louvor "{louvor.titulo}" foi adicionado a {culto.titulo}.',
            f"louvor-adicionado:{id}:{louvor_id}",
        )
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO ADICIONAR LOUVOR AO EVENTO:", erro)
        return jsonify({"erro": "Erro ao vincular louvor ao evento."}), 500

    return jsonify({
        "mensagem": "Louvor vinculado ao evento.",
        "louvor": _louvor_evento_dict(vinculo, louvor),
    }), 201


@app.route("/api/eventos/<int:evento_id>/louvores/<int:louvor_id>", methods=["PUT"])
@app.route("/api/agenda/<int:evento_id>/louvores/<int:louvor_id>", methods=["PUT"])
@admin_required
def editar_louvor_evento(evento_id, louvor_id):
    culto = db.session.get(Culto, evento_id)
    vinculo = CultoLouvor.query.filter_by(
        culto_id=evento_id,
        louvor_id=louvor_id,
    ).first()
    louvor = db.session.get(Louvor, louvor_id)
    if not culto or not vinculo or not louvor:
        return jsonify({"erro": "Louvor não encontrado neste evento."}), 404

    dados = request.get_json(silent=True) or {}
    try:
        ordem = int(dados.get("ordem"))
    except (TypeError, ValueError):
        return jsonify({"erro": "Informe uma ordem válida."}), 400

    total = CultoLouvor.query.filter_by(culto_id=evento_id).count()
    if ordem < 1 or ordem > total:
        return jsonify({"erro": f"A ordem deve estar entre 1 e {total}."}), 400

    vinculo.ordem = ordem
    try:
        vinculos = CultoLouvor.query.filter_by(culto_id=evento_id).order_by(
            CultoLouvor.ordem.asc(),
            CultoLouvor.id.asc(),
        ).all()
        for indice, item in enumerate(vinculos, start=1):
            if item.id != vinculo.id and item.ordem >= ordem:
                item.ordem += 1
        vinculos = CultoLouvor.query.filter_by(culto_id=evento_id).order_by(
            CultoLouvor.ordem.asc(),
            CultoLouvor.id.asc(),
        ).all()
        for indice, item in enumerate(vinculos, start=1):
            item.ordem = indice
        _notificar_membros_evento(
            evento_id,
            "evento_alterado",
            "Ordem dos louvores alterada",
            f'A ordem do louvor "{louvor.titulo}" foi atualizada em {culto.titulo}.',
            f"louvor-ordem:{evento_id}:{louvor_id}:{ordem}",
        )
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO EDITAR LOUVOR DO EVENTO:", erro)
        return jsonify({"erro": "Erro ao editar louvor do evento."}), 500

    return jsonify({
        "mensagem": "Ordem do louvor atualizada.",
        "louvor": _louvor_evento_dict(vinculo, louvor),
    }), 200


@app.route("/api/eventos/<int:evento_id>/louvores/<int:louvor_id>", methods=["DELETE"])
@app.route("/api/agenda/<int:evento_id>/louvores/<int:louvor_id>", methods=["DELETE"])
@admin_required
def remover_louvor_evento(evento_id, louvor_id):
    culto = db.session.get(Culto, evento_id)
    vinculo = CultoLouvor.query.filter_by(
        culto_id=evento_id,
        louvor_id=louvor_id,
    ).first()
    louvor = db.session.get(Louvor, louvor_id)
    if not culto or not vinculo or not louvor:
        return jsonify({"erro": "Louvor não encontrado neste evento."}), 404

    try:
        db.session.delete(vinculo)
        db.session.flush()
        vinculos = CultoLouvor.query.filter_by(culto_id=evento_id).order_by(
            CultoLouvor.ordem.asc(),
            CultoLouvor.id.asc(),
        ).all()
        for indice, item in enumerate(vinculos, start=1):
            item.ordem = indice
        _notificar_membros_evento(
            evento_id,
            "evento_alterado",
            "Louvor removido do evento",
            f'O louvor "{louvor.titulo}" foi removido de {culto.titulo}.',
            f"louvor-removido:{evento_id}:{louvor_id}",
        )
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO REMOVER LOUVOR DO EVENTO:", erro)
        return jsonify({"erro": "Erro ao remover louvor do evento."}), 500

    return jsonify({"mensagem": "Louvor removido do evento."}), 200


@app.route("/api/membros/<int:usuario_id>/escalas", methods=["GET"])
@token_required
def listar_escalas_membro(usuario_id):
    if (
        request.usuario_logado.tipo_usuario.lower() != "admin"
        and request.usuario_logado.id != usuario_id
    ):
        return jsonify({"erro": "Você não pode consultar a escala de outro membro."}), 403

    usuario = db.session.get(Usuario, usuario_id)
    if not usuario or usuario.tipo_usuario.lower() != "membro":
        return jsonify({"erro": "Membro não encontrado."}), 404

    escalas = EscalaMembro.query.filter_by(
        usuario_id=usuario_id
    ).order_by(EscalaMembro.culto_id.asc()).all()
    return jsonify([
        {
            "escala": _escala_dict(escala),
            "evento": {
                "id": culto.id,
                "titulo": culto.titulo,
                "data": culto.data,
                "hora": culto.hora or "",
                "local": culto.local or "",
                "publicado": bool(culto.publicado),
            },
        }
        for escala in escalas
        if (culto := db.session.get(Culto, escala.culto_id)) is not None
        and (
            request.usuario_logado.tipo_usuario.lower() == "admin"
            or culto.publicado
        )
    ]), 200


@app.route("/api/eventos/<int:id>/escala", methods=["POST"])
@app.route("/api/agenda/<int:id>/escala", methods=["POST"])
@admin_required
def cadastrar_membro_escala(id):
    culto = db.session.get(Culto, id)
    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404

    dados = request.get_json(silent=True) or {}
    membro, erro = _dados_nova_escala(dados)
    if erro:
        return jsonify({"erro": erro}), 400

    usuario_id, funcao = membro
    if _buscar_membro_escala(id, usuario_id):
        return jsonify({"erro": "Este membro já está na escala."}), 409

    escala = EscalaMembro(
        culto_id=id,
        usuario_id=usuario_id,
        funcao=funcao,
    )
    try:
        db.session.add(escala)
        if culto.publicado:
            _notificar_usuario(
                usuario_id,
                "nova_escala",
                "Nova escala disponível",
                f"Você foi escalado para {culto.titulo} na função {funcao}.",
                culto.id,
                f"nova-escala:{culto.id}:{usuario_id}:{funcao}",
            )
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO CADASTRAR MEMBRO NA ESCALA:", erro)
        return jsonify({"erro": "Erro ao cadastrar membro na escala."}), 500

    return jsonify({
        "mensagem": "Membro adicionado à escala.",
        "escala": _escala_dict(escala),
    }), 201


@app.route(
    "/api/eventos/<int:evento_id>/escala/<int:usuario_id>",
    methods=["PUT"],
)
@app.route(
    "/api/agenda/<int:evento_id>/escala/<int:usuario_id>",
    methods=["PUT"],
)
@admin_required
def editar_funcao_escala(evento_id, usuario_id):
    culto = db.session.get(Culto, evento_id)
    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404

    escala = _buscar_membro_escala(evento_id, usuario_id)
    if not escala:
        return jsonify({"erro": "Membro não encontrado nesta escala."}), 404

    dados = request.get_json(silent=True) or {}
    _, erro = _dados_nova_escala({
        "usuario_id": usuario_id,
        "funcao": dados.get("funcao"),
    })
    if erro:
        return jsonify({"erro": erro}), 400

    try:
        funcao_anterior = escala.funcao
        escala.funcao = _texto(dados, "funcao").lower()
        if culto.publicado and funcao_anterior != escala.funcao:
            _notificar_usuario(
                usuario_id,
                "escala_alterada",
                "Função da escala alterada",
                f"Sua função em {culto.titulo} mudou para {escala.funcao}.",
                culto.id,
                f"funcao-alterada:{culto.id}:{usuario_id}:{escala.funcao}",
            )
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO EDITAR FUNÇÃO DA ESCALA:", erro)
        return jsonify({"erro": "Erro ao editar função da escala."}), 500

    return jsonify({
        "mensagem": "Função da escala atualizada.",
        "escala": _escala_dict(escala),
    }), 200


@app.route(
    "/api/eventos/<int:evento_id>/escala/<int:usuario_id>",
    methods=["DELETE"],
)
@app.route(
    "/api/agenda/<int:evento_id>/escala/<int:usuario_id>",
    methods=["DELETE"],
)
@admin_required
def remover_membro_escala(evento_id, usuario_id):
    culto = db.session.get(Culto, evento_id)
    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404

    escala = _buscar_membro_escala(evento_id, usuario_id)
    if not escala:
        return jsonify({"erro": "Membro não encontrado nesta escala."}), 404

    try:
        if culto.publicado:
            _notificar_usuario(
                usuario_id,
                "participacao_alterada",
                "Você foi removido da escala",
                f"Você não está mais escalado para {culto.titulo}.",
                culto.id,
                f"removido-manual:{culto.id}:{usuario_id}:{culto.data}",
            )
        db.session.delete(escala)
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO REMOVER MEMBRO DA ESCALA:", erro)
        return jsonify({"erro": "Erro ao remover membro da escala."}), 500

    return jsonify({"mensagem": "Membro removido da escala."}), 200


@app.route("/api/eventos/<int:id>/publicar", methods=["POST"])
@app.route("/api/agenda/<int:id>/publicar", methods=["POST"])
@admin_required
def publicar_culto(id):
    culto = db.session.get(Culto, id)
    if not culto:
        return jsonify({"erro": "Culto não encontrado."}), 404

    culto.publicado = True
    try:
        _notificar_membros_evento(
            culto.id,
            "nova_escala",
            "Nova escala publicada",
            f"A escala de {culto.titulo} foi publicada. Confira sua participação.",
            f"escala-publicada:{culto.id}:{culto.data}",
        )
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO PUBLICAR CULTO:", erro)
        return jsonify({"erro": "Erro ao publicar escala."}), 500

    return jsonify({
        "mensagem": "Escala publicada com sucesso.",
        "culto": _culto_dict(culto),
    }), 200


def _escala_do_usuario_evento(id):
    escala = EscalaMembro.query.filter_by(
        culto_id=id,
        usuario_id=request.usuario_logado.id,
    ).first()

    if not escala:
        return None, jsonify({
            "erro": "Você não está incluído nesta escala."
        }), 403

    culto = db.session.get(Culto, id)
    if not culto:
        return None, jsonify({"erro": "Culto não encontrado."}), 404
    if (
        request.usuario_logado.tipo_usuario.lower() != "admin"
        and not culto.publicado
    ):
        return None, jsonify({
            "erro": "Esta escala ainda não foi publicada."
        }), 403

    return escala, None, None


@app.route("/api/eventos/<int:id>/responder", methods=["POST"])
@app.route("/api/agenda/<int:id>/responder", methods=["POST"])
@token_required
def responder_escala(id):
    escala, resposta_erro, codigo = _escala_do_usuario_evento(id)
    if resposta_erro:
        return resposta_erro, codigo

    dados = request.get_json(silent=True) or {}
    status = str(dados.get("status", "confirmado")).strip().lower()
    if status not in ("confirmado", "recusado"):
        return jsonify({
            "erro": "Informe uma resposta válida: confirmado ou recusado."
        }), 400

    escala.status = status
    escala.confirmado = status == "confirmado"
    escala.troca_para_usuario_id = None
    try:
        culto = db.session.get(Culto, id)
        _notificar_administradores(
            "participacao_atualizada",
            "Resposta de participação atualizada",
            f"{request.usuario_logado.nome} "
            f"{'confirmou' if status == 'confirmado' else 'recusou'} "
            f"a escala de {culto.titulo}.",
            id,
            f"resposta:{id}:{request.usuario_logado.id}:{status}",
        )
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO ATUALIZAR RESPOSTA DA ESCALA:", erro)
        return jsonify({
            "erro": "Erro ao atualizar sua resposta da escala."
        }), 500

    return jsonify({
        "mensagem": (
            "Presença confirmada."
            if status == "confirmado"
            else "Participação recusada."
        ),
        "escala": _escala_dict(escala),
    }), 200


@app.route("/api/eventos/<int:id>/confirmar", methods=["POST"])
@app.route("/api/agenda/<int:id>/confirmar", methods=["POST"])
@token_required
def confirmar_escala(id):
    return responder_escala(id)


@app.route("/api/eventos/<int:id>/troca", methods=["POST"])
@app.route("/api/agenda/<int:id>/troca", methods=["POST"])
@token_required
def solicitar_troca_escala(id):
    escala, resposta_erro, codigo = _escala_do_usuario_evento(id)
    if resposta_erro:
        return resposta_erro, codigo

    dados = request.get_json(silent=True) or {}
    try:
        usuario_destino_id = int(dados.get("usuario_id"))
    except (TypeError, ValueError):
        return jsonify({
            "erro": "Selecione um membro válido para solicitar a troca."
        }), 400

    if usuario_destino_id == request.usuario_logado.id:
        return jsonify({
            "erro": "Você não pode solicitar troca consigo mesmo."
        }), 400

    destino = db.session.get(Usuario, usuario_destino_id)
    if not destino or destino.tipo_usuario.lower() != "membro":
        return jsonify({"erro": "Membro de destino não encontrado."}), 404

    escala_destino = EscalaMembro.query.filter_by(
        culto_id=id,
        usuario_id=usuario_destino_id,
    ).first()
    if not escala_destino or escala_destino.funcao != escala.funcao:
        return jsonify({
            "erro": "A troca só pode ser solicitada com membro da mesma função neste evento."
        }), 400

    escala.status = "troca_solicitada"
    escala.confirmado = False
    escala.troca_para_usuario_id = usuario_destino_id
    try:
        culto = db.session.get(Culto, id)
        _notificar_usuario(
            usuario_destino_id,
            "troca_solicitada",
            "Solicitação de troca de escala",
            f"{request.usuario_logado.nome} solicitou trocar com você "
            f"na escala de {culto.titulo}.",
            id,
            f"troca-destino:{id}:{request.usuario_logado.id}:{usuario_destino_id}",
        )
        _notificar_administradores(
            "troca_solicitada",
            "Solicitação de troca de escala",
            f"{request.usuario_logado.nome} solicitou uma troca na escala "
            f"de {culto.titulo}.",
            id,
            f"troca-admin:{id}:{request.usuario_logado.id}:{usuario_destino_id}",
        )
        db.session.commit()
    except Exception as erro:
        db.session.rollback()
        print("ERRO AO SOLICITAR TROCA DE ESCALA:", erro)
        return jsonify({
            "erro": "Erro ao solicitar a troca de escala."
        }), 500

    return jsonify({
        "mensagem": "Solicitação de troca registrada.",
        "escala": _escala_dict(escala),
    }), 200


@app.route("/api/eventos/<int:id>/troca-opcoes", methods=["GET"])
@app.route("/api/agenda/<int:id>/troca-opcoes", methods=["GET"])
@token_required
def listar_opcoes_troca(id):
    escala, resposta_erro, codigo = _escala_do_usuario_evento(id)
    if resposta_erro:
        return resposta_erro, codigo

    opcoes = EscalaMembro.query.filter(
        EscalaMembro.culto_id == id,
        EscalaMembro.funcao == escala.funcao,
        EscalaMembro.usuario_id != request.usuario_logado.id,
    ).all()
    return jsonify([_escala_dict(item) for item in opcoes]), 200


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