import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import "./Agenda.css";

function Agenda() {
  const usuario = getUsuarioLogado();
  const ehAdmin = usuarioEhAdmin(usuario);
  const [cultos, setCultos] = useState([]);
  const [membros, setMembros] = useState([]);
  const [louvores, setLouvores] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [eventoEmEdicao, setEventoEmEdicao] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  function formatarData(data) {
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return data || "";
    }

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  const [formulario, setFormulario] = useState({
    titulo: "",
    data: "",
    hora: "",
    local: "",
    descricao: "",
    membros: [],
    louvor_ids: [],
  });

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");
      const agenda = await api.get("/api/eventos");
      setCultos(agenda.data);

      if (ehAdmin) {
        const [respostaMembros, respostaLouvores] = await Promise.all([
          api.get("/api/agenda/membros"),
          api.get("/api/louvores"),
        ]);
        setMembros(respostaMembros.data);
        setLouvores(respostaLouvores.data);
      }
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível carregar a agenda."
      );
    } finally {
      setCarregando(false);
    }
  }, [ehAdmin]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  function alterarCampo(event) {
    setFormulario({
      ...formulario,
      [event.target.name]: event.target.value,
    });
  }

  function adicionarMembro() {
    setFormulario({
      ...formulario,
      membros: [
        ...formulario.membros,
        { usuario_id: "", funcao: "" },
      ],
    });
  }

  function alterarMembro(index, campo, valor) {
    const novosMembros = formulario.membros.map((membro, itemIndex) =>
      itemIndex === index
        ? { ...membro, [campo]: valor }
        : membro
    );
    setFormulario({ ...formulario, membros: novosMembros });
  }

  function removerMembro(index) {
    setFormulario({
      ...formulario,
      membros: formulario.membros.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  }

  function alterarLouvor(event) {
    const valores = Array.from(
      event.target.selectedOptions,
      (option) => Number(option.value)
    );
    setFormulario({ ...formulario, louvor_ids: valores });
  }

  function limparFormulario() {
    setFormulario({
      titulo: "",
      data: "",
      hora: "",
      local: "",
      descricao: "",
      membros: [],
      louvor_ids: [],
    });
    setEventoEmEdicao(null);
    setMostrarFormulario(false);
  }

  function abrirNovoEvento() {
    limparFormulario();
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editarEvento(evento) {
    setMensagem("");
    setErro("");
    setEventoEmEdicao(evento.id);
    setMostrarFormulario(true);
    setFormulario({
      titulo: evento.titulo,
      data: evento.data,
      hora: evento.hora || "",
      local: evento.local || "",
      descricao: evento.descricao || "",
      membros: evento.membros.map((membro) => ({
        usuario_id: String(membro.id),
        funcao: membro.funcao,
      })),
      louvor_ids: evento.louvores.map((louvor) => louvor.id),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarCulto(event) {
    event.preventDefault();
    setMensagem("");
    setErro("");

    try {
      const resposta = eventoEmEdicao
        ? await api.put(`/api/eventos/${eventoEmEdicao}`, formulario)
        : await api.post("/api/eventos", formulario);
      setMensagem(resposta.data.mensagem);
      limparFormulario();
      await carregarDados();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível salvar o culto."
      );
    }
  }

  async function publicarCulto(id) {
    try {
      const resposta = await api.post(`/api/eventos/${id}/publicar`);
      setMensagem(resposta.data.mensagem);
      await carregarDados();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível publicar a escala."
      );
    }
  }

  async function excluirCulto(id) {
    if (!window.confirm("Excluir este culto e sua escala?")) {
      return;
    }

    try {
      await api.delete(`/api/eventos/${id}`);
      await carregarDados();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível excluir o culto."
      );
    }
  }

  async function confirmarEscala(id) {
    try {
      const resposta = await api.post(`/api/eventos/${id}/confirmar`);
      setMensagem(resposta.data.mensagem);
      await carregarDados();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível confirmar a escala."
      );
    }
  }

  return (
    <main className="agenda-page">
      <header className="agenda-header">
        <div>
          <span>Agenda</span>
          <h1>Agenda de cultos e eventos</h1>
          <p>
            {ehAdmin
              ? "Monte, publique e gerencie as escalas."
              : "Veja sua agenda individual publicada."}
          </p>
        </div>
        <div className="agenda-header-actions">
          {ehAdmin && (
            <button
              className="agenda-primary"
              type="button"
              onClick={abrirNovoEvento}
            >
              + Novo evento
            </button>
          )}
          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {mensagem && <p className="agenda-success">{mensagem}</p>}
      {erro && <p className="agenda-error">{erro}</p>}

      {ehAdmin && mostrarFormulario && (
        <form className="agenda-form" onSubmit={salvarCulto}>
          <h2>{eventoEmEdicao ? "Editar evento" : "Novo culto ou evento"}</h2>
          <div className="agenda-grid">
            <input name="titulo" placeholder="Nome do culto" value={formulario.titulo} onChange={alterarCampo} required />
            <input name="data" type="date" value={formulario.data} onChange={alterarCampo} required />
            <input name="hora" type="time" value={formulario.hora} onChange={alterarCampo} />
            <input name="local" placeholder="Local" value={formulario.local} onChange={alterarCampo} />
          </div>
          <textarea name="descricao" placeholder="Descrição do evento" value={formulario.descricao} onChange={alterarCampo} />

          <label htmlFor="agenda-louvores">Louvores do culto</label>
          <select id="agenda-louvores" multiple value={formulario.louvor_ids.map(String)} onChange={alterarLouvor}>
            {louvores.map((louvor) => (
              <option key={louvor.id} value={louvor.id}>
                {louvor.titulo}
              </option>
            ))}
          </select>

          <div className="agenda-members-title">
            <h3>Membros e funções</h3>
            <button type="button" onClick={adicionarMembro}>+ Adicionar membro</button>
          </div>
          {formulario.membros.map((membro, index) => (
            <div className="agenda-member-row" key={`${index}-${membro.usuario_id}`}>
              <select value={membro.usuario_id} onChange={(event) => alterarMembro(index, "usuario_id", event.target.value)} required>
                <option value="">Selecione o membro</option>
                {membros.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome} ({item.email})</option>
                ))}
              </select>
              <input placeholder="Função: vocal, guitarra..." value={membro.funcao} onChange={(event) => alterarMembro(index, "funcao", event.target.value)} required />
              <button type="button" onClick={() => removerMembro(index)}>Remover</button>
            </div>
          ))}
          <div className="agenda-form-actions">
            <button className="agenda-primary" type="submit">
              {eventoEmEdicao ? "Salvar alterações" : "Salvar evento"}
            </button>
            {eventoEmEdicao && (
              <button type="button" onClick={limparFormulario}>
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      )}

      <section className="agenda-list">
        <h2>{ehAdmin ? "Cultos e escalas" : "Minha agenda"}</h2>
        {carregando && <p>Carregando agenda...</p>}
        {!carregando && cultos.length === 0 && <p>Nenhuma escala publicada para você.</p>}
        {cultos.map((culto) => (
          <article className="agenda-card" key={culto.id}>
            <div className="agenda-card-header">
              <div>
                <h3>{culto.titulo}</h3>
                <p>{formatarData(culto.data)} {culto.hora && `às ${culto.hora}`} {culto.local && `· ${culto.local}`}</p>
              </div>
              <strong>{culto.publicado ? "Publicada" : "Rascunho"}</strong>
            </div>
            {culto.descricao && <p>{culto.descricao}</p>}
            <h4>Escala</h4>
            <ul>
              {culto.membros.map((membro) => (
                <li key={`${culto.id}-${membro.id}`}>
                  {membro.nome} — {membro.funcao}
                  {membro.confirmado ? " (confirmado)" : ""}
                </li>
              ))}
            </ul>
            <h4>Louvores</h4>
            <ul>
              {culto.louvores.map((louvor) => (
                <li key={`${culto.id}-${louvor.id}`}>{louvor.ordem}. {louvor.titulo}</li>
              ))}
            </ul>
            {ehAdmin && (
              <div className="agenda-actions">
                <button type="button" onClick={() => editarEvento(culto)}>✏️ Editar</button>
                {!culto.publicado && <button type="button" onClick={() => publicarCulto(culto.id)}>📢 Publicar escala</button>}
                <button type="button" onClick={() => excluirCulto(culto.id)}>🗑 Excluir</button>
              </div>
            )}
            {!ehAdmin &&
              culto.membros.some(
                (membro) => membro.id === usuario?.id
              ) &&
              !culto.membros.some(
                (membro) =>
                  membro.id === usuario?.id &&
                  membro.confirmado
              ) && (
                <button
                  type="button"
                  onClick={() => confirmarEscala(culto.id)}
                >
                  ✅ Confirmar minha escala
                </button>
              )}
          </article>
        ))}
      </section>
    </main>
  );
}

export default Agenda;
