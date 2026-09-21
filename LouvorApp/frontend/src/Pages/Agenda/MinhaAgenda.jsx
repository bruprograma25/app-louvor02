import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import "./MinhaAgenda.css";

const STATUS_ESCALA = {
  pendente: "Aguardando resposta",
  confirmado: "Presença confirmada",
  recusado: "Participação recusada",
  troca_solicitada: "Troca solicitada",
};

const FUNCOES_ESCALA = {
  vocal: "Vocal",
  violao: "Violão",
  guitarra: "Guitarra",
  teclado: "Teclado",
  bateria: "Bateria",
  baixo: "Baixo",
  som: "Som",
  "direcao musical": "Direção musical",
  percussao: "Percussão",
  projecao: "Projeção",
  multimidia: "Multimídia",
  outro: "Outro",
};

function formatarData(data) {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data || "";
  }

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function MinhaAgenda() {
  const usuario = getUsuarioLogado();
  const ehAdmin = usuarioEhAdmin(usuario);
  const [escalas, setEscalas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [processandoId, setProcessandoId] = useState(null);
  const [opcoesTroca, setOpcoesTroca] = useState({});
  const [trocaAbertaId, setTrocaAbertaId] = useState(null);
  const [destinoTroca, setDestinoTroca] = useState({});

  const carregarAgenda = useCallback(async () => {
    if (ehAdmin || !usuario?.id) {
      setErro("Não foi possível identificar o usuário logado.");
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro("");

      const [respostaEscalas, respostaEventos] = await Promise.all([
        api.get(`/api/membros/${usuario.id}/escalas`),
        api.get("/api/eventos"),
      ]);

      const eventos = new Map(
        respostaEventos.data.map((evento) => [String(evento.id), evento])
      );
      const escalasRecebidas = respostaEscalas.data;
      const respostasOpcoes = await Promise.all(
        escalasRecebidas.map((item) =>
          api.get(`/api/eventos/${item.evento.id}/troca-opcoes`)
        )
      );

      setEscalas(
        escalasRecebidas
          .map((item) => ({
            ...item,
            eventoCompleto: eventos.get(String(item.evento.id)),
          }))
          .sort((primeiro, segundo) => {
            const dataPrimeiro = `${primeiro.evento.data} ${primeiro.evento.hora || ""}`;
            const dataSegundo = `${segundo.evento.data} ${segundo.evento.hora || ""}`;
            return dataPrimeiro.localeCompare(dataSegundo);
          })
      );
      setOpcoesTroca(
        Object.fromEntries(
          escalasRecebidas.map((item, index) => [
            item.escala.id,
            respostasOpcoes[index].data,
          ])
        )
      );
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível carregar sua agenda individual."
      );
    } finally {
      setCarregando(false);
    }
  }, [ehAdmin, usuario?.id]);

  useEffect(() => {
    carregarAgenda();
  }, [carregarAgenda]);

  async function responder(item, status) {
    setErro("");
    setProcessandoId(item.escala.id);
    try {
      await api.post(`/api/eventos/${item.evento.id}/responder`, { status });
      await carregarAgenda();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível atualizar sua resposta."
      );
    } finally {
      setProcessandoId(null);
    }
  }

  async function solicitarTroca(item) {
    const opcoes = opcoesTroca[item.escala.id] || [];
    if (opcoes.length === 0) {
      setErro("Não há outro membro com a mesma função neste evento.");
      return;
    }

    const destinoId = destinoTroca[item.escala.id];
    if (!destinoId) {
      setErro("Selecione um membro da mesma função para solicitar a troca.");
      return;
    }

    const destino = opcoes.find(
      (opcao) => String(opcao.usuario_id) === String(destinoId)
    );
    if (!destino) {
      setErro("Selecione um membro válido da mesma função.");
      return;
    }

    setErro("");
    setProcessandoId(item.escala.id);
    try {
      await api.post(`/api/eventos/${item.evento.id}/troca`, {
        usuario_id: destino.usuario_id,
      });
      await carregarAgenda();
      setTrocaAbertaId(null);
      setDestinoTroca((anterior) => ({
        ...anterior,
        [item.escala.id]: "",
      }));
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível solicitar a troca."
      );
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <main className="minha-agenda-page">
      <header className="minha-agenda-header">
        <div>
          <span>Agenda individual</span>
          <h1>Minha agenda</h1>
          <p>
            Olá, {usuario?.nome || "membro"}! Aqui estão suas escalas publicadas.
          </p>
        </div>
        <div className="minha-agenda-header-actions">
          <button
            type="button"
            onClick={() => { window.location.href = "/agenda"; }}
          >
            ← Agenda
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = "/notificacoes"; }}
          >
            🔔 Notificações
          </button>
        </div>
      </header>

      {erro && <p className="minha-agenda-error">{erro}</p>}

      <section className="minha-agenda-panel">
        <div className="minha-agenda-section-title">
          <div>
            <span>Participação</span>
            <h2>Minhas próximas escalas</h2>
          </div>
          {!carregando && (
            <strong>
              {escalas.length} escala{escalas.length === 1 ? "" : "s"}
            </strong>
          )}
        </div>

        {carregando && <p>Carregando sua agenda...</p>}
        {!carregando && !erro && escalas.length === 0 && (
          <p className="minha-agenda-empty">
            Você ainda não possui escalas publicadas.
          </p>
        )}

        {!carregando && escalas.length > 0 && (
          <div className="minha-agenda-lista">
            {escalas.map((item) => {
              const evento = item.eventoCompleto;
              const louvores = evento?.louvores || [];

              return (
                <article className="minha-agenda-card" key={item.escala.id}>
                  <div className="minha-agenda-card-header">
                    <div>
                      <span className="minha-agenda-status">Escala publicada</span>
                      <h3>{item.evento.titulo}</h3>
                    </div>
                    <strong className="minha-agenda-funcao">
                      {FUNCOES_ESCALA[item.escala.funcao] || item.escala.funcao}
                    </strong>
                  </div>

                  <div className="minha-agenda-detalhes">
                    <div>
                      <span>Data</span>
                      <strong>{formatarData(item.evento.data) || "Não informada"}</strong>
                    </div>
                    <div>
                      <span>Horário</span>
                      <strong>{item.evento.hora || "Não informado"}</strong>
                    </div>
                    <div>
                      <span>Local</span>
                      <strong>{item.evento.local || "Não informado"}</strong>
                    </div>
                    <div>
                      <span>Confirmação</span>
                      <strong>
                        {STATUS_ESCALA[item.escala.status] || "Aguardando resposta"}
                      </strong>
                    </div>
                  </div>

                  <div className="minha-agenda-acoes">
                    <button
                      type="button"
                      disabled={processandoId === item.escala.id}
                      onClick={() => responder(item, "confirmado")}
                    >
                      Confirmar presença
                    </button>
                    <button
                      type="button"
                      disabled={processandoId === item.escala.id}
                      onClick={() => responder(item, "recusado")}
                    >
                      Recusar
                    </button>
                    <button
                      type="button"
                      disabled={processandoId === item.escala.id}
                      onClick={() => {
                        setErro("");
                        setTrocaAbertaId((atual) =>
                          atual === item.escala.id ? null : item.escala.id
                        );
                      }}
                    >
                      Solicitar troca
                    </button>
                  </div>
                  {trocaAbertaId === item.escala.id && (
                    <div className="minha-agenda-troca-form">
                      <label htmlFor={`troca-${item.escala.id}`}>
                        Membro da mesma função
                      </label>
                      <select
                        id={`troca-${item.escala.id}`}
                        value={destinoTroca[item.escala.id] || ""}
                        onChange={(event) => setDestinoTroca((anterior) => ({
                          ...anterior,
                          [item.escala.id]: event.target.value,
                        }))}
                      >
                        <option value="">Selecione um membro</option>
                        {(opcoesTroca[item.escala.id] || []).map((opcao) => (
                          <option key={opcao.usuario_id} value={opcao.usuario_id}>
                            {opcao.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={processandoId === item.escala.id}
                        onClick={() => solicitarTroca(item)}
                      >
                        Enviar solicitação
                      </button>
                    </div>
                  )}
                  {item.escala.troca_para && (
                    <p className="minha-agenda-troca">
                      Troca solicitada com {item.escala.troca_para.nome}.
                    </p>
                  )}

                  {evento?.descricao && <p>{evento.descricao}</p>}

                  <div className="minha-agenda-louvores">
                    <h4>Louvores relacionados</h4>
                    {louvores.length > 0 ? (
                      <ol>
                        {louvores.map((louvor) => (
                          <li key={louvor.id}>
                            <strong>{louvor.ordem}.</strong> {louvor.titulo}
                            {louvor.artista && ` — ${louvor.artista}`}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>Nenhum louvor relacionado a este evento.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default MinhaAgenda;
