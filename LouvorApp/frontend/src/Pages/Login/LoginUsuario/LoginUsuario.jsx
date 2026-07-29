import { useState } from "react";
import "./LoginUsuario.css";
import logoIgreja from "../../assets/images/logo-igreja.png";

function LoginUsuario() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function entrar(event) {
    event.preventDefault();

    if (carregando) {
      return;
    }

    if (!email.trim()) {
      alert("Digite seu e-mail.");
      return;
    }

    if (!senha) {
      alert("Digite sua senha.");
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch(
        "http://127.0.0.1:5000/api/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            senha: senha,
          }),
        }
      );

      const resultado = await resposta.json();

      console.log("RESPOSTA DO LOGIN:");
      console.log(resultado);

      if (!resposta.ok) {
        alert(
          resultado.erro ||
            "Não foi possível fazer login."
        );

        return;
      }

      alert(
        `Bem-vindo, ${resultado.usuario.nome}!`
      );

      console.log(
        "USUÁRIO LOGADO:",
        resultado.usuario
      );

      // Por enquanto vamos apenas guardar
      // os dados do usuário no navegador.
      localStorage.setItem(
        "usuario",
        JSON.stringify(resultado.usuario)
      );

      // Na próxima etapa vamos levar o usuário
      // para o Dashboard.

    } catch (erro) {
      console.error(
        "ERRO AO CONECTAR COM O FLASK:"
      );

      console.error(erro);

      alert(
        "Não foi possível conectar ao servidor."
      );

    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="pagina-login">

      <section className="login-card">

        {/* LOGO */}

        <div className="logo-area">

          <div className="logo-circulo">

            <img
              src={logoIgreja}
              alt="Logo da igreja"
            />

          </div>

        </div>

        {/* CABEÇALHO */}

        <div className="cabecalho-login">

          <h1>
            Bem-vindo
            <span>de volta!</span>
          </h1>

          <p>
            Entre na sua conta e continue
            <br />
            sua missão de fé e louvor.
          </p>

        </div>

        {/* FORMULÁRIO */}

        <form onSubmit={entrar}>

          {/* E-MAIL */}

          <div className="campo-login">

            <label htmlFor="email">
              E-mail
            </label>

            <div className="input-login">

              <span>✉</span>

              <input
                id="email"
                type="email"
                placeholder="seuemail@gmail.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                required
              />

            </div>

          </div>

          {/* SENHA */}

          <div className="campo-login">

            <label htmlFor="senha">
              Senha
            </label>

            <div className="input-login">

              <span>🔒</span>

              <input
                id="senha"
                type={
                  mostrarSenha
                    ? "text"
                    : "password"
                }
                placeholder="••••••••••"
                value={senha}
                onChange={(event) =>
                  setSenha(event.target.value)
                }
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="botao-olho"
                onClick={() =>
                  setMostrarSenha(
                    (anterior) => !anterior
                  )
                }
              >
                {mostrarSenha ? "◉" : "◌"}
              </button>

            </div>

          </div>

          {/* ESQUECEU SENHA */}

          <button
            type="button"
            className="esqueceu-senha"
            onClick={() =>
              alert(
                "A recuperação de senha será criada depois."
              )
            }
          >
            Esqueceu sua senha?
          </button>

          {/* ENTRAR */}

          <button
            type="submit"
            className="botao-entrar"
            disabled={carregando}
          >

            <span>
              {carregando
                ? "Entrando..."
                : "Entrar"}
            </span>

            <span>→</span>

          </button>

        </form>

        {/* GOOGLE */}

        <div className="separador-login">

          <span></span>

          <p>OU ENTRE COM</p>

          <span></span>

        </div>

        <button
          type="button"
          className="botao-google"
          onClick={() =>
            alert(
              "O login com Google será configurado na Etapa 10."
            )
          }
        >
          <strong>G</strong>
          Continuar com Google
        </button>

        {/* CADASTRO */}

        <div className="rodape-login">

          <p>
            Ainda não tem uma conta?
          </p>

          <button
            type="button"
            onClick={() =>
              alert(
                "Depois vamos conectar este botão à tela de cadastro."
              )
            }
          >
            Criar conta
          </button>

        </div>

      </section>

    </main>
  );
}

export default LoginUsuario;