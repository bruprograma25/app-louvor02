import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import "./Agenda.css";
import FormEvento from "./FormEvento";

const STATUS_ESCALA = {
  pendente: "aguardando resposta",
  confirmado: "confirmou",
  recusado: "recusou",
  troca_solicitada: "solicitou troca",
};

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
  const eventoQuery = new URLSearchParams(window.location.search).get("editar");

  function formatarData(data) {
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return data || "";
    }

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");
      const agenda = await api.get("/api/eventos");
      setCultos(agenda.data);
      if (ehAdmin && eventoQuery) {
        const eventoId = Number(eventoQuery);
        if (agenda.data.some((culto) => culto.id === eventoId)) {
          setEventoEmEdicao(eventoId);
          setMostrarFormulario(true);
        }
      }

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
  }, [ehAdmin, eventoQuery]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  function limparFormulario() {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eventoSalvo(mensagemSucesso) {
    setMensagem(mensagemSucesso);
    setErro("");
    limparFormulario();
    await carregarDados();
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
      const resposta = await api.delete(`/api/eventos/${id}`);
      setMensagem(resposta.data.mensagem);
      setErro("");
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
          {!ehAdmin && (
            <button
              type="button"
              onClick={() => { window.location.href = "/minha-agenda"; }}
            >
              Minha agenda
            </button>
          )}
          <button
            type="button"
            onClick={() => { window.location.href = "/notificacoes"; }}
          >
            🔔 Notificações
          </button>
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
        <FormEvento
          evento={cultos.find((culto) => culto.id === eventoEmEdicao)}
          membros={membros}
          louvores={louvores}
          onSaved={eventoSalvo}
          onCancel={limparFormulario}
        />
      )}

      <section className="agenda-list">
        <h2>{ehAdmin ? "Cultos e escalas" : "Minha agenda"}</h2>
        {carregando && <p>Carregando agenda...</p>}
        {!carregando && cultos.length === 0 && (
          <p>
            {ehAdmin
              ? "Nenhum evento ou culto cadastrado."
              : "Nenhuma escala publicada para você."}
          </p>
        )}
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
                  {" · "}
                  {STATUS_ESCALA[membro.status] ||
                    (membro.confirmado ? "confirmou" : "aguardando resposta")}
                  {membro.troca_para && ` com ${membro.troca_para.nome}`}
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
                <button
                  type="button"
                  onClick={() => { window.location.href = `/detalhes-evento?id=${culto.id}`; }}
                >
                  Ver detalhes
                </button>
                <button type="button" onClick={() => editarEvento(culto)}>✏️ Editar</button>
                <button
                  type="button"
                  onClick={() => { window.location.href = `/montar-escala?evento=${culto.id}`; }}
                >
                  👥 Montar escala
                </button>
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
            {!ehAdmin && (
              <button
                type="button"
                onClick={() => { window.location.href = `/detalhes-evento?id=${culto.id}`; }}
              >
                Ver detalhes do evento
              </button>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

export default Agenda;
