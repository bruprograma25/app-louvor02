import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import "./Equipe.css";

function Equipe() {
  const usuario = getUsuarioLogado();
  const ehAdmin = usuarioEhAdmin(usuario);
  const [membros, setMembros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [membroEmEdicao, setMembroEmEdicao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [formulario, setFormulario] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    senha: "",
    funcao_principal: "",
  });
  const membrosFiltrados = membros.filter((membro) =>
    [
      membro.nome,
      membro.email,
      membro.funcao_principal,
    ].some((valor) =>
      valor?.toLocaleLowerCase("pt-BR").includes(
        termoPesquisa.trim().toLocaleLowerCase("pt-BR")
      )
    )
  );

  const carregarMembros = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");
      const resposta = await api.get("/api/agenda/membros");
      setMembros(resposta.data);
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível carregar os membros da equipe."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (ehAdmin) {
      carregarMembros();
    } else {
      setCarregando(false);
    }
  }, [carregarMembros, ehAdmin]);

  function abrirCadastro() {
    setMembroEmEdicao(null);
    setFormulario({
      nome: "",
      sobrenome: "",
      email: "",
      senha: "",
      funcao_principal: "",
    });
    setMensagem("");
    setErro("");
    setMostrarFormulario(true);
  }

  function editarMembro(membro) {
    setMembroEmEdicao(membro);
    setFormulario({
      nome: membro.nome_primeiro || membro.nome || "",
      sobrenome: membro.sobrenome || "",
      email: membro.email || "",
      senha: "",
      funcao_principal: membro.funcao_principal || "",
    });
    setMensagem("");
    setErro("");
    setMostrarFormulario(true);
  }

  function alterarCampo(event) {
    setFormulario((anterior) => ({
      ...anterior,
      [event.target.name]: event.target.value,
    }));
  }

  async function salvarMembro(event) {
    event.preventDefault();
    setSalvando(true);
    setErro("");
    setMensagem("");

    const nome = formulario.nome.trim();
    const sobrenome = formulario.sobrenome.trim();
    const email = formulario.email.trim();
    const senha = formulario.senha.trim();

    if (!nome || !sobrenome || !email) {
      setErro("Preencha nome, sobrenome e e-mail antes de salvar.");
      setSalvando(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErro("Informe um endereço de e-mail válido.");
      setSalvando(false);
      return;
    }

    if ((!membroEmEdicao || formulario.senha) && senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      setSalvando(false);
      return;
    }

    try {
      const dados = {
        ...formulario,
        nome,
        sobrenome,
        email,
        senha,
        funcao_principal: formulario.funcao_principal.trim(),
      };
      if (membroEmEdicao && !dados.senha) {
        delete dados.senha;
      }
      const resposta = membroEmEdicao
        ? await api.put(`/api/membros/${membroEmEdicao.id}`, dados)
        : await api.post("/api/membros", dados);
      setMensagem(resposta.data.mensagem);
      setMostrarFormulario(false);
      await carregarMembros();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível salvar o membro."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerMembro(membro) {
    if (!window.confirm(`Remover ${membro.nome} da equipe?`)) {
      return;
    }

    setErro("");
    setMensagem("");
    try {
      const resposta = await api.delete(`/api/membros/${membro.id}`);
      setMensagem(resposta.data.mensagem);
      await carregarMembros();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível remover o membro."
      );
    }
  }

  if (!ehAdmin) {
    return (
      <main className="equipe-page">
        <section className="equipe-panel equipe-acesso">
          <h1>Acesso restrito</h1>
          <p>A lista completa da equipe está disponível somente para administradores.</p>
          <button type="button" onClick={() => { window.location.href = "/"; }}>
            ← Dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="equipe-page">
      <header className="equipe-header">
        <div>
          <span>Equipe</span>
          <h1>Membros cadastrados</h1>
          <p>Consulte os membros disponíveis para as escalas dos eventos.</p>
        </div>
        <div className="equipe-header-actions">
          <button className="equipe-primary" type="button" onClick={abrirCadastro}>
            + Adicionar membro
          </button>
          <button type="button" onClick={() => { window.location.href = "/agenda"; }}>
            ← Agenda
          </button>
          <button type="button" onClick={() => { window.location.href = "/"; }}>
            Dashboard
          </button>
        </div>
      </header>

      {erro && !mostrarFormulario && <p className="equipe-error" role="alert">{erro}</p>}
      {mensagem && <p className="equipe-success">{mensagem}</p>}

      {mostrarFormulario && (
        <section className="equipe-panel equipe-form-panel">
          <div className="equipe-section-title">
            <div>
              <span>Cadastro</span>
              <h2>{membroEmEdicao ? "Editar membro" : "Novo membro"}</h2>
            </div>
            <button type="button" onClick={() => setMostrarFormulario(false)}>
              Cancelar
            </button>
          </div>
          <form className="equipe-form" onSubmit={salvarMembro} noValidate>
            {erro && <p id="equipe-form-error" className="equipe-error" role="alert">{erro}</p>}
            <label>
              Nome
              <input name="nome" value={formulario.nome} onChange={alterarCampo} required aria-describedby={erro ? "equipe-form-error" : undefined} />
            </label>
            <label>
              Sobrenome
              <input name="sobrenome" value={formulario.sobrenome} onChange={alterarCampo} required aria-describedby={erro ? "equipe-form-error" : undefined} />
            </label>
            <label>
              E-mail
              <input name="email" type="email" value={formulario.email} onChange={alterarCampo} required aria-describedby={erro ? "equipe-form-error" : undefined} />
            </label>
            <label>
              Função principal
              <input
                name="funcao_principal"
                placeholder="Ex.: Vocal, Violão, Som..."
                value={formulario.funcao_principal}
                onChange={alterarCampo}
              />
            </label>
            <label>
              {membroEmEdicao ? "Nova senha (opcional)" : "Senha"}
              <input
                name="senha"
                type="password"
                minLength="6"
                value={formulario.senha}
                onChange={alterarCampo}
                required={!membroEmEdicao}
                aria-describedby={erro ? "equipe-form-error" : undefined}
              />
            </label>
            <button className="equipe-primary" type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar membro"}
            </button>
          </form>
        </section>
      )}

      <section className="equipe-panel">
        <div className="equipe-section-title">
          <div>
            <span>Cadastro</span>
            <h2>Equipe de louvor</h2>
          </div>
          {!carregando && (
            <strong aria-live="polite">
              {membrosFiltrados.length} de {membros.length} membro{membros.length === 1 ? "" : "s"}
            </strong>
          )}
        </div>

        <label className="equipe-pesquisa">
          <span>Pesquisar equipe</span>
          <input
            type="search"
            value={termoPesquisa}
            onChange={(event) => setTermoPesquisa(event.target.value)}
            placeholder="Nome, e-mail ou função"
          />
        </label>

        {carregando && <p>Carregando membros...</p>}
        {!carregando && !erro && membros.length === 0 && (
          <p className="equipe-empty">Nenhum membro cadastrado.</p>
        )}
        {!carregando && membros.length > 0 && membrosFiltrados.length === 0 && (
          <p className="equipe-empty">Nenhum membro corresponde à pesquisa.</p>
        )}
        {!carregando && membrosFiltrados.length > 0 && (
          <div className="equipe-lista">
            {membrosFiltrados.map((membro) => (
              <article className="equipe-card" key={membro.id}>
                <div className="equipe-avatar">
                  {(membro.nome || "M").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{membro.nome}</h3>
                  <p>{membro.email}</p>
                  {membro.funcao_principal && (
                    <span className="equipe-funcao">
                      Função: {membro.funcao_principal}
                    </span>
                  )}
                </div>
                <span className="equipe-status">
                  {membro.tipo_usuario?.toLowerCase() === "admin"
                    ? "Administrador"
                    : "Membro"}
                </span>
                <div className="equipe-card-actions">
                  <button type="button" onClick={() => editarMembro(membro)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => removerMembro(membro)}>
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Equipe;
