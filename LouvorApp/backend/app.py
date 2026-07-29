from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash

from models import db, Usuario


app = Flask(__name__)

CORS(app)


app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///louvor.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


# Cria as tabelas
with app.app_context():
    db.create_all()



@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "mensagem": "API do Louvor App funcionando!"
    })



@app.route("/api/cadastro", methods=["POST"])
def cadastrar_usuario():

    # Recebe JSON do React
    dados = request.get_json(silent=True)

    print("\n==============================")
    print("DADOS RECEBIDOS:")
    print(dados)
    print("==============================\n")

    # Verifica se recebeu dados
    if not dados:
        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400


    nome = dados.get("nome", "").strip()
    sobrenome = dados.get("sobrenome", "").strip()
    email = dados.get("email", "").strip().lower()
    senha = dados.get("senha", "")
    confirmar_senha = dados.get("confirmarSenha", "")


    print("Nome:", nome)
    print("Sobrenome:", sobrenome)
    print("Email:", email)
    print("Senha recebida:", bool(senha))
    print("Confirmar senha:", bool(confirmar_senha))




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

    if not confirmar_senha:
        return jsonify({
            "erro": "Confirme sua senha."
        }), 400



    if senha != confirmar_senha:

        return jsonify({
            "erro": "As senhas não são iguais."
        }), 400



    usuario_existente = Usuario.query.filter_by(
        email=email
    ).first()

    if usuario_existente:

        return jsonify({
            "erro": "Este e-mail já está cadastrado."
        }), 409


   

    senha_hash = generate_password_hash(senha)


   
    novo_usuario = Usuario(
        nome=nome,
        sobrenome=sobrenome,
        email=email,
        senha=senha_hash
    )


    try:

        db.session.add(novo_usuario)

        db.session.commit()

    except Exception as erro:

        db.session.rollback()

        print("ERRO:", erro)

        return jsonify({
            "erro": str(erro)
        }), 500



    return jsonify({

        "mensagem": "Usuário cadastrado com sucesso!",

        "usuario": {

            "id": novo_usuario.id,

            "nome": novo_usuario.nome,

            "sobrenome": novo_usuario.sobrenome,

            "email": novo_usuario.email

        }

    }), 201




if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )