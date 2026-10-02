import { useState } from "react";
import "./login.css";
import { api } from "../../api";

function Cadastro() {
  const [formulario, setFormulario] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  function alterarCampo(event) {
    setFormulario({
      ...formulario,
      [event.target.name]: event.target.value,
    });
  }

  async function cadastrar(event) {
    event.preventDefault();
    setMensagem("");
    setErro("");

    const nome = formulario.nome.trim();
    const sobrenome = formulario.sobrenome.trim();
    const email = formulario.email.trim().toLowerCase();

    if (!nome || !sobrenome || !email) {
      setErro("Preencha nome, sobrenome e e-mail.");
      return;
    }

    if (formulario.senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (formulario.senha !== formulario.confirmarSenha) {
      setErro("As senhas não são iguais.");
      return;
    }

    try {
      setCarregando(true);
      const resposta = await api.post(
        "/api/cadastro",
        { nome, sobrenome, email, senha: formulario.senha }
      );

      setMensagem(resposta.data.mensagem);
      setFormulario({
        nome: "",
        sobrenome: "",
        email: "",
        senha: "",
        confirmarSenha: "",
      });
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Erro ao conectar com o servidor."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="pagina-login">
      <div className="login-card">
        <div className="login-logo">🎵</div>
        <h1>Louvor App</h1>
        <p className="login-subtitulo">Crie sua conta</p>

        <form onSubmit={cadastrar}>
          {["nome", "sobrenome", "email", "senha", "confirmarSenha"].map(
            (campo) => (
              <div className="campo" key={campo}>
                <label htmlFor={campo}>
                  {{
                    nome: "Nome",
                    sobrenome: "Sobrenome",
                    email: "E-mail",
                    senha: "Senha",
                    confirmarSenha: "Confirmar senha",
                  }[campo]}
                </label>
                <input
                  id={campo}
                  name={campo}
                  type={
                    campo === "email"
                      ? "email"
                      : campo === "senha" || campo === "confirmarSenha"
                        ? "password"
                        : "text"
                  }
                  value={formulario[campo]}
                  onChange={alterarCampo}
                  required
                  minLength={campo === "senha" || campo === "confirmarSenha" ? 6 : undefined}
                  autoComplete={{
                    nome: "given-name",
                    sobrenome: "family-name",
                    email: "email",
                    senha: "new-password",
                    confirmarSenha: "new-password",
                  }[campo]}
                  aria-invalid={Boolean(erro)}
                  aria-describedby={erro ? "cadastro-error" : undefined}
                />
              </div>
            )
          )}

          {erro && <div id="cadastro-error" className="mensagem-erro" role="alert">{erro}</div>}
          {mensagem && <div className="mensagem-sucesso" role="status">{mensagem}</div>}

          <button type="submit" className="btn-login" disabled={carregando}>
            {carregando ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <button
          type="button"
          className="link-login"
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          Já tenho uma conta
        </button>
      </div>
    </div>
  );
}

export default Cadastro;
