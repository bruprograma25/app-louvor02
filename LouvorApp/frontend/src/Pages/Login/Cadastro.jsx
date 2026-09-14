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

    if (formulario.senha !== formulario.confirmarSenha) {
      setErro("As senhas não são iguais.");
      return;
    }

    try {
      setCarregando(true);
      const resposta = await api.post(
        "/api/cadastro",
        formulario
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
                  type={campo === "email" ? "email" : campo.includes("senha") ? "password" : "text"}
                  value={formulario[campo]}
                  onChange={alterarCampo}
                  required
                />
              </div>
            )
          )}

          {erro && <div className="mensagem-erro">{erro}</div>}
          {mensagem && <div className="mensagem-sucesso">{mensagem}</div>}

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
