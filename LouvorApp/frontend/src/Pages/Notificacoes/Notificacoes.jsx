import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
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
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

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

  const naoLidas = notificacoes.filter((item) => !item.lida).length;

  return (
    <main className="notificacoes-page">
      <header className="notificacoes-header">
        <div>
          <span>Central de avisos</span>
          <h1>Notificações</h1>
          <p>Acompanhe novas escalas, alterações, lembretes e participações.</p>
        </div>
        <div className="notificacoes-header-actions">
          {naoLidas > 0 && (
            <button type="button" onClick={marcarTodasComoLidas}>
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

      {erro && <p className="notificacoes-error">{erro}</p>}

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
                <div>
                  <span className="notificacao-tipo">{item.tipo.replaceAll("_", " ")}</span>
                  <h2>{item.titulo}</h2>
                  <p>{item.mensagem}</p>
                  <small>{formatarData(item.criada_em)}</small>
                </div>
                {!item.lida && (
                  <button type="button" onClick={() => marcarComoLida(item.id)}>
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
