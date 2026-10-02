import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import "./Notificacoes.css";

function formatarData(data) {
  if (!data) {
    return "";
  }

  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function Notificacoes() {
  const ehAdmin = usuarioEhAdmin(getUsuarioLogado());
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState({ titulo: "", mensagem: "", local: "" });
  const [publicando, setPublicando] = useState(false);
  const [mensagemPublicacao, setMensagemPublicacao] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(
    () => new URLSearchParams(window.location.search).get("novo") === "1"
  );

  const carregarNotificacoes = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");
      const resposta = await api.get("/api/notificacoes");
      setNotificacoes(resposta.data);
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível carregar suas notificações."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarNotificacoes();
  }, [carregarNotificacoes]);

  async function marcarComoLida(id) {
    try {
      await api.post(`/api/notificacoes/${id}/ler`);
      setNotificacoes((anteriores) => anteriores.map((item) =>
        item.id === id ? { ...item, lida: true } : item
      ));
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível atualizar a notificação."
      );
    }
  }

  async function marcarTodasComoLidas() {
    try {
      await api.post("/api/notificacoes/ler-todas");
      setNotificacoes((anteriores) =>
        anteriores.map((item) => ({ ...item, lida: true }))
      );
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível marcar as notificações como lidas."
      );
    }
  }

  async function publicarAviso(event) {
    event.preventDefault();
    setErro("");
    setMensagemPublicacao("");
    setPublicando(true);

    try {
      const resposta = await api.post("/api/avisos", aviso);
      setMensagemPublicacao(
        `Aviso enviado para ${resposta.data.destinatarios} usuários.`
      );
      setAviso({ titulo: "", mensagem: "", local: "" });
      await carregarNotificacoes();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível publicar o aviso."
      );
    } finally {
      setPublicando(false);
    }
  }

  const naoLidas = notificacoes.filter((item) => !item.lida).length;

  return (
    <main className="notificacoes-page">
      <header className="notificacoes-header">
        <div>
          <span>Central de avisos</span>
          <h1>Notificações</h1>
          <p>Acompanhe novas escalas, alterações, lembretes e participações.</p>
          <span className="notificacoes-count" aria-live="polite">
            {naoLidas} {naoLidas === 1 ? "aviso não lido" : "avisos não lidos"}
          </span>
        </div>
        <div className="notificacoes-header-actions">
          <button
            className="notificacoes-primary"
            type="button"
            aria-expanded={ehAdmin ? mostrarFormulario : undefined}
            aria-controls={ehAdmin ? "formulario-aviso" : undefined}
            onClick={ehAdmin
              ? () => setMostrarFormulario((mostrar) => !mostrar)
              : undefined}
            disabled={!ehAdmin}
            title={!ehAdmin ? "Somente administradores podem publicar avisos." : undefined}
          >
            {ehAdmin
              ? mostrarFormulario ? "Cancelar novo aviso" : "+ Adicionar aviso"
              : "+ Adicionar aviso"}
          </button>
          {!ehAdmin && (
            <span className="notificacoes-permission-note">
              Publicação disponível para administradores. Você está conectado como membro.
            </span>
          )}
          {naoLidas > 0 && (
            <button className="notificacoes-primary" type="button" onClick={marcarTodasComoLidas}>
              Marcar todas como lidas
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

      {erro && <p className="notificacoes-error" role="alert">{erro}</p>}

      {ehAdmin && mostrarFormulario && (
        <form
          id="formulario-aviso"
          className="notificacoes-panel aviso-form"
          onSubmit={publicarAviso}
        >
          <h2>Publicar aviso para a equipe</h2>
          <label>
            Título
            <input
              value={aviso.titulo}
              maxLength={160}
              onChange={(event) => setAviso({ ...aviso, titulo: event.target.value })}
              required
            />
          </label>
          <label>
            Mensagem
            <textarea
              value={aviso.mensagem}
              maxLength={5000}
              onChange={(event) => setAviso({ ...aviso, mensagem: event.target.value })}
              required
            />
          </label>
          <label>
            Local (opcional)
            <input
              value={aviso.local}
              maxLength={200}
              onChange={(event) => setAviso({ ...aviso, local: event.target.value })}
              placeholder="Ex.: Igreja principal"
            />
          </label>
          <button className="notificacoes-primary" type="submit" disabled={publicando}>
            {publicando ? "Publicando..." : "Publicar aviso"}
          </button>
          {mensagemPublicacao && (
            <p className="notificacoes-success" role="status">{mensagemPublicacao}</p>
          )}
        </form>
      )}

      <section className="notificacoes-panel">
        {carregando && <p>Carregando notificações...</p>}
        {!carregando && notificacoes.length === 0 && (
          <p className="notificacoes-empty">
            Você não possui notificações no momento.
          </p>
        )}
        {!carregando && notificacoes.length > 0 && (
          <div className="notificacoes-lista">
            {notificacoes.map((item) => (
              <article
                className={`notificacao-item ${item.lida ? "notificacao-lida" : ""}`}
                key={item.id}
              >
                <div className="notificacao-conteudo">
                  {!item.lida && (
                    <span className="notificacao-nao-lida">Não lida</span>
                  )}
                  <span className="notificacao-tipo">{item.tipo.replaceAll("_", " ")}</span>
                  <h2>{item.titulo}</h2>
                  <p>{item.mensagem}</p>
                  {item.local && <p className="notificacao-local">📍 {item.local}</p>}
                  <small>{formatarData(item.criada_em)}</small>
                </div>
                {!item.lida && (
                  <button
                    type="button"
                    aria-label={`Marcar como lida: ${item.titulo}`}
                    onClick={() => marcarComoLida(item.id)}
                  >
                    Marcar como lida
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Notificacoes;
