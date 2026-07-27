import { useState } from "react";
import "./login.css";
import logoIgreja from "../../assets/images/logo-igreja.png";

function Login() {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

  const [formulario, setFormulario] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormulario({
      ...formulario,
      [name]: value,
    });
  }

  function cadastrar(event) {
    event.preventDefault();

    if (formulario.senha !== formulario.confirmarSenha) {
      alert("As senhas não são iguais!");
      return;
    }

    alert("Cadastro preenchido corretamente!");
  }

  return (
    <main className="pagina-cadastro">

      <div className="fundo-vermelho"></div>

      <section className="cadastro">

        <div className="logo-area">
          <div className="logo-circulo">
  <img src={logoIgreja} alt="Logo da igreja" />
</div>
        </div>

        <div className="cabecalho">
          <h1>
            Seja
            <span>bem-vindo!</span>
          </h1>

          <p>
            Crie sua conta e faça parte
            <br />
            desta missão de fé e louvor.
          </p>
        </div>

        <form onSubmit={cadastrar}>

          <div className="linha-nomes">

            <div className="campo">
              <label>Nome</label>

              <div className="input-container">
                <span>♙</span>

                <input
                  type="text"
                  name="nome"
                  placeholder="Digite seu nome"
                  value={formulario.nome}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="campo">
              <label>Sobrenome</label>

              <div className="input-container">
                <span>♙</span>

                <input
                  type="text"
                  name="sobrenome"
                  placeholder="Digite seu sobrenome"
                  value={formulario.sobrenome}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

          </div>

          <div className="campo">
            <label>E-mail</label>

            <div className="input-container">
              <span>✉</span>

              <input
                type="email"
                name="email"
                placeholder="seuemail@gmail.com"
                value={formulario.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="campo">
            <label>Senha</label>

            <div className="input-container">
              <span>🔒</span>

              <input
                type={mostrarSenha ? "text" : "password"}
                name="senha"
                placeholder="••••••••••"
                value={formulario.senha}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setMostrarSenha(!mostrarSenha)
                }
              >
                {mostrarSenha ? "◉" : "◌"}
              </button>
            </div>
          </div>

          <div className="campo">
            <label>Confirmar senha</label>

            <div className="input-container">
              <span>🔒</span>

              <input
                type={
                  mostrarConfirmacao
                    ? "text"
                    : "password"
                }
                name="confirmarSenha"
                placeholder="••••••••••"
                value={formulario.confirmarSenha}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setMostrarConfirmacao(
                    !mostrarConfirmacao
                  )
                }
              >
                {mostrarConfirmacao ? "◉" : "◌"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="botao-cadastrar"
          >
            <span>Cadastrar</span>
            <span>→</span>
          </button>

        </form>

        <div className="separador">
          <span></span>
          <p>OU CADASTRE-SE COM</p>
          <span></span>
        </div>

        <div className="botoes-social">

          <button
            type="button"
            onClick={() =>
              alert("Vamos configurar o Google depois!")
            }
          >
            <strong>G</strong>
            Google
          </button>

          <button
            type="button"
            onClick={() =>
              alert("Cadastro por e-mail será conectado ao Flask!")
            }
          >
            ✉
            E-mail
          </button>

        </div>

        <div className="rodape">
          <p>Já tem uma conta?</p>

          <button
            type="button"
            onClick={() =>
              alert("Tela de recuperação será criada depois.")
            }
          >
            Esqueceu sua senha?
          </button>
        </div>

      </section>

    </main>
  );
}

export default Login;