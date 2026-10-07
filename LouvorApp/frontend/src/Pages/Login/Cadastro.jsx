import { useState } from "react";
import "./login.css";
import { api } from "../../api";

function Cadastro() {
  const [formulario, setFormulario] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    funcao_principal: "",
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
    const funcaoPrincipal = formulario.funcao_principal.trim();

    if (!nome || !sobrenome || !email) {
      setErro("Preencha nome, sobrenome e e-mail.");
      return;
    }

    if (!funcaoPrincipal || funcaoPrincipal.toLowerCase() === "administrador") {
      setErro("Selecione uma função válida para a sua participação. A função de administrador não é permitida.");
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
        {
          nome,
          sobrenome,
          email,
          funcao_principal: funcaoPrincipal,
          senha: formulario.senha,
        }
      );

      setMensagem(resposta.data.mensagem);
      setFormulario({
        nome: "",
        sobrenome: "",
        email: "",
        funcao_principal: "",
        senha: "",
        confirmarSenha: "",
      });

      window.location.href = "/login";
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
        <div className="login-logo"><img src="/church-brand.svg" alt="Logo da igreja" /></div>
        <h1>Louvor App</h1>
        <p className="login-subtitulo">Crie sua conta</p>

        <form onSubmit={cadastrar}>
          {[
            "nome",
            "sobrenome",
            "email",
          ].map((campo) => (
            <div className="campo" key={campo}>
              <label htmlFor={campo}>
                {{
                  nome: "Nome",
                  sobrenome: "Sobrenome",
                  email: "E-mail",
                }[campo]}
              </label>
              <input
                id={campo}
                name={campo}
                type={campo === "email" ? "email" : "text"}
                value={formulario[campo]}
                onChange={alterarCampo}
                required
                autoComplete={{
                  nome: "given-name",
                  sobrenome: "family-name",
                  email: "email",
                }[campo]}
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? "cadastro-error" : undefined}
              />
            </div>
          ))}

          <div className="campo">
            <label htmlFor="funcao_principal">Função</label>
            <select
              id="funcao_principal"
              name="funcao_principal"
              value={formulario.funcao_principal}
              onChange={alterarCampo}
              required
              aria-invalid={Boolean(erro)}
              aria-describedby={erro ? "cadastro-error" : undefined}
            >
              <option value="">Selecione sua função</option>
              <option value="Ministro">Ministro</option>
              <option value="Back vocal">Back vocal</option>
              <option value="Instrumentista">Instrumentista</option>
              <option value="Teclado">Teclado</option>
              <option value="Bateria">Bateria</option>
              <option value="Guitarra">Guitarra</option>
              <option value="Baixo">Baixo</option>
              <option value="Violão">Violão</option>
              <option value="Cantor">Cantor</option>
              <option value="Líder">Líder</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {[
            "senha",
            "confirmarSenha",
          ].map((campo) => (
            <div className="campo" key={campo}>
              <label htmlFor={campo}>
                {{
                  senha: "Senha",
                  confirmarSenha: "Confirmar senha",
                }[campo]}
              </label>
              <input
                id={campo}
                name={campo}
                type="password"
                value={formulario[campo]}
                onChange={alterarCampo}
                required
                minLength={6}
                autoComplete={{
                  senha: "new-password",
                  confirmarSenha: "new-password",
                }[campo]}
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? "cadastro-error" : undefined}
              />
            </div>
          ))}

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
