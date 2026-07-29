from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, Usuario


# ==========================================
# CONFIGURAÇÃO DO FLASK
# ==========================================

app = Flask(__name__)

# Permite que o React acesse o Flask
CORS(app)


# ==========================================
# CONFIGURAÇÃO DO BANCO DE DADOS
# ==========================================

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///louvor.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


# ==========================================
# CRIAÇÃO DAS TABELAS
# ==========================================

with app.app_context():
    db.create_all()


# ==========================================
# ROTA INICIAL
# ==========================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "mensagem": "API do Louvor App funcionando!"
    })


# ==========================================
# CADASTRO DE USUÁRIO
# ==========================================

@app.route("/api/cadastro", methods=["POST"])
def cadastrar_usuario():

    dados = request.get_json(silent=True)

    print("\n==============================")
    print("DADOS RECEBIDOS NO CADASTRO:")
    print(dados)
    print("==============================\n")

    # Verifica se recebeu dados
    if not dados:
        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    # ==========================================
    # PEGA OS DADOS
    # ==========================================

    nome = dados.get("nome", "").strip()

    sobrenome = dados.get(
        "sobrenome",
        ""
    ).strip()

    email = dados.get(
        "email",
        ""
    ).strip().lower()

    senha = dados.get(
        "senha",
        ""
    )

    confirmar_senha = dados.get(
        "confirmarSenha",
        ""
    )

    # ==========================================
    # VALIDAÇÕES
    # ==========================================

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
            "erro": "A senha precisa ter pelo menos 6 caracteres."
        }), 400

    if not confirmar_senha:
        return jsonify({
            "erro": "Confirme sua senha."
        }), 400

    # ==========================================
    # CONFIRMA SENHA
    # ==========================================

    if senha != confirmar_senha:

        return jsonify({
            "erro": "As senhas não são iguais."
        }), 400

    # ==========================================
    # VERIFICA SE E-MAIL JÁ EXISTE
    # ==========================================

    usuario_existente = Usuario.query.filter_by(
        email=email
    ).first()

    if usuario_existente:

        return jsonify({
            "erro": "Este e-mail já está cadastrado."
        }), 409

    # ==========================================
    # CRIPTOGRAFA A SENHA
    # ==========================================

    senha_hash = generate_password_hash(senha)

    # ==========================================
    # CRIA USUÁRIO
    # ==========================================

    novo_usuario = Usuario(
        nome=nome,
        sobrenome=sobrenome,
        email=email,
        senha=senha_hash
    )

    # ==========================================
    # SALVA NO BANCO
    # ==========================================

    try:

        db.session.add(novo_usuario)

        db.session.commit()

    except Exception as erro:

        db.session.rollback()

        print(
            "ERRO AO CADASTRAR:",
            erro
        )

        return jsonify({
            "erro": "Erro ao cadastrar usuário."
        }), 500

    # ==========================================
    # RESPOSTA
    # ==========================================

    return jsonify({

        "mensagem":
            "Usuário cadastrado com sucesso!",

        "usuario": {

            "id":
                novo_usuario.id,

            "nome":
                novo_usuario.nome,

            "sobrenome":
                novo_usuario.sobrenome,

            "email":
                novo_usuario.email
        }

    }), 201


# ==========================================
# LOGIN
# ==========================================

@app.route("/api/login", methods=["POST"])
def login():

    # Recebe os dados enviados pelo React
    dados = request.get_json(silent=True)

    print("\n==============================")
    print("TENTATIVA DE LOGIN:")
    print(dados)
    print("==============================\n")

    # ==========================================
    # VERIFICA SE RECEBEU DADOS
    # ==========================================

    if not dados:

        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    # ==========================================
    # PEGA E-MAIL E SENHA
    # ==========================================

    email = dados.get(
        "email",
        ""
    ).strip().lower()

    senha = dados.get(
        "senha",
        ""
    )

    # ==========================================
    # VALIDA E-MAIL
    # ==========================================

    if not email:

        return jsonify({
            "erro": "E-mail não informado."
        }), 400

    # ==========================================
    # VALIDA SENHA
    # ==========================================

    if not senha:

        return jsonify({
            "erro": "Senha não informada."
        }), 400

    # ==========================================
    # PROCURA USUÁRIO NO BANCO
    # ==========================================

    usuario = Usuario.query.filter_by(
        email=email
    ).first()

    # ==========================================
    # USUÁRIO NÃO ENCONTRADO
    # ==========================================

    if not usuario:

        return jsonify({
            "erro": "E-mail ou senha incorretos."
        }), 401

    # ==========================================
    # CONFERE A SENHA
    # ==========================================

    senha_correta = check_password_hash(
        usuario.senha,
        senha
    )

    if not senha_correta:

        return jsonify({
            "erro": "E-mail ou senha incorretos."
        }), 401

    # ==========================================
    # LOGIN REALIZADO
    # ==========================================

    print(
        f"Login realizado: {usuario.email}"
    )

    # ==========================================
    # RETORNA OS DADOS DO USUÁRIO
    # ==========================================

    return jsonify({

        "mensagem":
            "Login realizado com sucesso!",

        "usuario": {

            "id":
                usuario.id,

            "nome":
                usuario.nome,

            "sobrenome":
                usuario.sobrenome,

            "email":
                usuario.email
        }

    }), 200


# ==========================================
# EXECUTAR SERVIDOR
# ==========================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )