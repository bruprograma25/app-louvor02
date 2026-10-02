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
  const parametros = new URLSearchParams(window.location.search);
  const eventoQuery = parametros.get("editar");
  const [mostrarFormulario, setMostrarFormulario] = useState(
    () => ehAdmin && parametros.get("novo") === "1"
  );

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
          <button
            className="agenda-primary"
            type="button"
            onClick={ehAdmin ? abrirNovoEvento : undefined}
            disabled={!ehAdmin}
            title={!ehAdmin ? "Somente administradores podem criar eventos." : undefined}
          >
            + Adicionar evento
          </button>
          {!ehAdmin && (
            <span className="agenda-permission-note">
              Disponível para administradores. Você está conectado como membro.
            </span>
          )}
          {!ehAdmin && (
            <button
              className="agenda-secondary"
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
            <ul className="agenda-members">
              {culto.membros.map((membro) => (
                <li className="agenda-member" key={`${culto.id}-${membro.id}`}>
                  <span className="agenda-member-name">{membro.nome}</span>
                  <span className="agenda-member-role">
                    {membro.funcao || "Função não informada"}
                  </span>
                  {(() => {
                    const status = Object.hasOwn(STATUS_ESCALA, membro.status)
                      ? membro.status
                      : membro.confirmado
                        ? "confirmado"
                        : "pendente";
                    const confirmado = status === "confirmado";

                    return (
                      <span
                        className={`agenda-status agenda-status--${status}`}
                        aria-label={`Confirmação: ${STATUS_ESCALA[status]}`}
                      >
                        {confirmado ? "✓ " : ""}
                        {STATUS_ESCALA[status]}
                      </span>
                    );
                  })()}
                  {membro.troca_para && (
                    <span className="agenda-member-change">
                      Troca com {membro.troca_para.nome}
                    </span>
                  )}
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
                <button className="agenda-secondary" type="button" onClick={() => editarEvento(culto)}>✏️ Editar</button>
                <button
                  className="agenda-secondary"
                  type="button"
                  onClick={() => { window.location.href = `/montar-escala?evento=${culto.id}`; }}
                >
                  👥 Montar escala
                </button>
                {!culto.publicado && <button className="agenda-primary" type="button" onClick={() => publicarCulto(culto.id)}>📢 Publicar escala</button>}
                <button className="agenda-danger" type="button" onClick={() => excluirCulto(culto.id)}>🗑 Excluir</button>
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
                  className="agenda-primary"
                  type="button"
                  onClick={() => confirmarEscala(culto.id)}
                >
                  ✅ Confirmar minha escala
                </button>
              )}
            {!ehAdmin && (
              <button
                className="agenda-secondary"
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
