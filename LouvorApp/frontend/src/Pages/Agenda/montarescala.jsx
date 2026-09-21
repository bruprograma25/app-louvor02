import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import "./montarescala.css";

const FUNCOES_ESCALA = [
  ["vocal", "Vocal"],
  ["violao", "Violão"],
  ["guitarra", "Guitarra"],
  ["teclado", "Teclado"],
  ["bateria", "Bateria"],
  ["baixo", "Baixo"],
  ["som", "Som"],
  ["direcao musical", "Direção musical"],
  ["percussao", "Percussão"],
  ["projecao", "Projeção"],
  ["multimidia", "Multimídia"],
  ["outro", "Outro"],
];

const STATUS_ESCALA = {
  pendente: "Aguardando resposta",
  confirmado: "Confirmou",
  recusado: "Recusou",
  troca_solicitada: "Troca solicitada",
};

const FORMULARIO_VAZIO = {
  usuario_id: "",
  funcao: "",
};

function formatarData(data) {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data || "";
  }

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function nomeDoEvento(evento) {
  const detalhes = [
    formatarData(evento.data),
    evento.hora ? `às ${evento.hora}` : "",
    evento.local || "",
  ].filter(Boolean);

  return detalhes.length
    ? `${evento.titulo} · ${detalhes.join(" · ")}`
    : evento.titulo;
}

function MontarEscala() {
  const usuario = getUsuarioLogado();
  const ehAdmin = usuarioEhAdmin(usuario);
  const eventoInicial = new URLSearchParams(window.location.search).get("evento") || "";
  const [eventos, setEventos] = useState([]);
  const [membros, setMembros] = useState([]);
  const [louvores, setLouvores] = useState([]);
  const [louvoresEvento, setLouvoresEvento] = useState([]);
  const [eventoId, setEventoId] = useState(eventoInicial);
  const [escala, setEscala] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoEscala, setCarregandoEscala] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [louvorSelecionado, setLouvorSelecionado] = useState("");
  const [editandoLouvorId, setEditandoLouvorId] = useState(null);
  const [ordemLouvor, setOrdemLouvor] = useState("");
  const [salvandoLouvor, setSalvandoLouvor] = useState(false);

  const eventoSelecionado = useMemo(
    () => eventos.find((evento) => String(evento.id) === String(eventoId)),
    [eventos, eventoId]
  );

  const membrosDisponiveis = useMemo(() => {
    const idsNaEscala = new Set(
      escala
        .filter((item) => item.usuario_id !== editandoId)
        .map((item) => String(item.usuario_id))
    );

    return membros.filter((membro) => !idsNaEscala.has(String(membro.id)));
  }, [escala, membros, editandoId]);

  const carregarEscala = useCallback(async (id) => {
    if (!id) {
      setEscala([]);
      return;
    }

    try {
      setCarregandoEscala(true);
      const resposta = await api.get(`/api/eventos/${id}/escala`);
      setEscala(resposta.data);
    } catch (error) {
      setEscala([]);
      setErro(
        error.response?.data?.erro ||
        "Não foi possível carregar a escala do evento."
      );
    } finally {
      setCarregandoEscala(false);
    }
  }, []);

  const carregarLouvoresEvento = useCallback(async (id) => {
    if (!id) {
      setLouvoresEvento([]);
      return;
    }

    try {
      const resposta = await api.get(`/api/eventos/${id}/louvores`);
      setLouvoresEvento(resposta.data);
    } catch (error) {
      setLouvoresEvento([]);
      setErro(
        error.response?.data?.erro ||
        "Não foi possível carregar os louvores do evento."
      );
    }
  }, []);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");
      const [respostaEventos, respostaMembros, respostaLouvores] = await Promise.all([
        api.get("/api/eventos"),
        api.get("/api/agenda/membros"),
        api.get("/api/louvores"),
      ]);

      const eventosRecebidos = respostaEventos.data;
      setEventos(eventosRecebidos);
      setMembros(respostaMembros.data);
      setLouvores(respostaLouvores.data);

      if (eventosRecebidos.length > 0) {
        setEventoId((valorAtual) => {
          const eventoAindaExiste = eventosRecebidos.some(
            (evento) => String(evento.id) === String(valorAtual)
          );
          return eventoAindaExiste ? valorAtual : String(eventosRecebidos[0].id);
        });
      } else {
        setEventoId("");
      }
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível carregar os dados da escala."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (ehAdmin) {
      carregarDados();
    } else {
      setCarregando(false);
    }
  }, [carregarDados, ehAdmin]);

  useEffect(() => {
    if (eventoId) {
      carregarEscala(eventoId);
      carregarLouvoresEvento(eventoId);
    } else {
      setEscala([]);
      setLouvoresEvento([]);
    }
    setEditandoId(null);
    setFormulario(FORMULARIO_VAZIO);
    setEditandoLouvorId(null);
    setLouvorSelecionado("");
    setOrdemLouvor("");
  }, [carregarEscala, carregarLouvoresEvento, eventoId]);

  function alterarFormulario(event) {
    setFormulario((anterior) => ({
      ...anterior,
      [event.target.name]: event.target.value,
    }));
  }

  function iniciarEdicao(item) {
    setMensagem("");
    setErro("");
    setEditandoId(item.usuario_id);
    setFormulario({
      usuario_id: String(item.usuario_id),
      funcao: item.funcao || "",
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setFormulario(FORMULARIO_VAZIO);
  }

  async function salvarIntegrante(event) {
    event.preventDefault();
    if (!eventoId) {
      setErro("Selecione um evento antes de montar a escala.");
      return;
    }

    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      const resposta = editandoId
        ? await api.put(
          `/api/eventos/${eventoId}/escala/${editandoId}`,
          { funcao: formulario.funcao }
        )
        : await api.post(
          `/api/eventos/${eventoId}/escala`,
          {
            usuario_id: Number(formulario.usuario_id),
            funcao: formulario.funcao,
          }
        );

      setMensagem(resposta.data.mensagem);
      cancelarEdicao();
      await carregarEscala(eventoId);
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível salvar o integrante da escala."
      );
    } finally {
      setSalvando(false);
    }
  }

    function iniciarEdicaoLouvor(item) {
      setEditandoLouvorId(item.louvor_id);
      setOrdemLouvor(String(item.ordem));
      setErro("");
      setMensagem("");
    }

    function cancelarEdicaoLouvor() {
      setEditandoLouvorId(null);
      setOrdemLouvor("");
    }

    async function adicionarLouvor() {
      if (!eventoId || !louvorSelecionado) {
        setErro("Selecione um louvor para adicionar.");
        return;
      }

      setSalvandoLouvor(true);
      setErro("");
      setMensagem("");
      try {
        const resposta = await api.post(`/api/eventos/${eventoId}/louvores`, {
          louvor_id: Number(louvorSelecionado),
        });
        setMensagem(resposta.data.mensagem);
        setLouvorSelecionado("");
        await carregarLouvoresEvento(eventoId);
      } catch (error) {
        setErro(
          error.response?.data?.erro ||
          "Não foi possível adicionar o louvor ao evento."
        );
      } finally {
        setSalvandoLouvor(false);
      }
    }

    async function salvarOrdemLouvor(item) {
      const ordem = Number(ordemLouvor);
      if (!Number.isInteger(ordem) || ordem < 1) {
        setErro("Informe uma ordem válida para o louvor.");
        return;
      }

      setSalvandoLouvor(true);
      setErro("");
      setMensagem("");
      try {
        const resposta = await api.put(
          `/api/eventos/${eventoId}/louvores/${item.louvor_id}`,
          { ordem }
        );
        setMensagem(resposta.data.mensagem);
        cancelarEdicaoLouvor();
        await carregarLouvoresEvento(eventoId);
      } catch (error) {
        setErro(
          error.response?.data?.erro ||
          "Não foi possível editar a ordem do louvor."
        );
      } finally {
        setSalvandoLouvor(false);
      }
    }

    async function removerLouvor(item) {
      if (!window.confirm(`Remover "${item.titulo}" deste evento?`)) {
        return;
      }

      setSalvandoLouvor(true);
      setErro("");
      setMensagem("");
      try {
        const resposta = await api.delete(
          `/api/eventos/${eventoId}/louvores/${item.louvor_id}`
        );
        setMensagem(resposta.data.mensagem);
        if (editandoLouvorId === item.louvor_id) {
          cancelarEdicaoLouvor();
        }
        await carregarLouvoresEvento(eventoId);
      } catch (error) {
        setErro(
          error.response?.data?.erro ||
          "Não foi possível remover o louvor do evento."
        );
      } finally {
        setSalvandoLouvor(false);
      }
    }

  async function removerIntegrante(item) {
    if (!window.confirm(`Remover ${item.nome} da escala?`)) {
      return;
    }

    setErro("");
    setMensagem("");
    try {
      const resposta = await api.delete(
        `/api/eventos/${eventoId}/escala/${item.usuario_id}`
      );
      setMensagem(resposta.data.mensagem);
      if (editandoId === item.usuario_id) {
        cancelarEdicao();
      }
      await carregarEscala(eventoId);
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível remover o integrante da escala."
      );
    }
  }

  if (!ehAdmin) {
    return (
      <main className="montar-escala-page">
        <section className="montar-escala-panel">
          <h1>Acesso restrito</h1>
          <p>Somente administradores podem montar e alterar escalas.</p>
          <button
            type="button"
            onClick={() => { window.location.href = "/agenda"; }}
          >
            ← Voltar para a agenda
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="montar-escala-page">
      <header className="montar-escala-header">
        <div>
          <span>Agenda</span>
          <h1>Montar escala</h1>
          <p>Selecione um evento e organize os integrantes e suas funções.</p>
        </div>
        <div className="montar-escala-header-actions">
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
        </div>
      </header>

      {mensagem && <p className="montar-escala-success">{mensagem}</p>}
      {erro && <p className="montar-escala-error">{erro}</p>}

      {carregando ? (
        <section className="montar-escala-panel">
          <p>Carregando eventos e membros...</p>
        </section>
      ) : (
        <div className="montar-escala-layout">
          <section className="montar-escala-panel">
            <label htmlFor="montar-escala-evento">Evento ou culto</label>
            <select
              id="montar-escala-evento"
              value={eventoId}
              onChange={(event) => {
                setMensagem("");
                setErro("");
                setEventoId(event.target.value);
              }}
            >
              <option value="">Selecione um evento</option>
              {eventos.map((evento) => (
                <option key={evento.id} value={evento.id}>
                  {nomeDoEvento(evento)}
                </option>
              ))}
            </select>

            {eventoSelecionado && (
              <div className="montar-escala-evento-resumo">
                <strong>{eventoSelecionado.titulo}</strong>
                <span>
                  {formatarData(eventoSelecionado.data)}
                  {eventoSelecionado.hora && ` às ${eventoSelecionado.hora}`}
                  {eventoSelecionado.local && ` · ${eventoSelecionado.local}`}
                </span>
              </div>
            )}
          </section>

          {eventoId && (
            <section className="montar-escala-panel">
              <div className="montar-escala-section-title">
                <div>
                  <span>Gerenciamento</span>
                  <h2>{editandoId ? "Editar integrante" : "Adicionar integrante"}</h2>
                </div>
                {editandoId && (
                  <button type="button" onClick={cancelarEdicao}>
                    Cancelar edição
                  </button>
                )}
              </div>

              <form className="montar-escala-form" onSubmit={salvarIntegrante}>
                <label htmlFor="montar-escala-membro">Membro cadastrado</label>
                <select
                  id="montar-escala-membro"
                  name="usuario_id"
                  value={formulario.usuario_id}
                  onChange={alterarFormulario}
                  disabled={Boolean(editandoId)}
                  required
                >
                  <option value="">Selecione o membro</option>
                  {membrosDisponiveis.map((membro) => (
                    <option key={membro.id} value={membro.id}>
                      {membro.nome} ({membro.email})
                    </option>
                  ))}
                  {editandoId && (
                    <option value={formulario.usuario_id}>
                      {escala.find((item) => item.usuario_id === editandoId)?.nome}
                    </option>
                  )}
                </select>

                <label htmlFor="montar-escala-funcao">Função</label>
                <select
                  id="montar-escala-funcao"
                  name="funcao"
                  value={formulario.funcao}
                  onChange={alterarFormulario}
                  required
                >
                  <option value="">Selecione a função</option>
                  {FUNCOES_ESCALA.map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>

                <button
                  className="montar-escala-primary"
                  type="submit"
                  disabled={salvando || !eventoId}
                >
                  {salvando
                    ? "Salvando..."
                    : editandoId
                      ? "Salvar função"
                      : "Adicionar à escala"}
                </button>
              </form>
            </section>
          )}

          {eventoId && (
            <section className="montar-escala-panel">
              <div className="montar-escala-section-title">
                <div>
                  <span>Repertório</span>
                  <h2>Louvores do evento</h2>
                </div>
                <strong>
                  {louvoresEvento.length} louvor{louvoresEvento.length === 1 ? "" : "es"}
                </strong>
              </div>

              <div className="montar-escala-louvor-form">
                <label htmlFor="montar-escala-louvor">Adicionar louvor cadastrado</label>
                <select
                  id="montar-escala-louvor"
                  value={louvorSelecionado}
                  onChange={(event) => setLouvorSelecionado(event.target.value)}
                >
                  <option value="">Selecione um louvor</option>
                  {louvores
                    .filter((louvor) => !louvoresEvento.some(
                      (item) => item.louvor_id === louvor.id
                    ))
                    .map((louvor) => (
                      <option key={louvor.id} value={louvor.id}>
                        {louvor.titulo} {louvor.artista ? `— ${louvor.artista}` : ""}
                        {louvor.tom ? ` · Tom: ${louvor.tom}` : ""}
                      </option>
                    ))}
                </select>
                <button
                  className="montar-escala-primary"
                  type="button"
                  disabled={salvandoLouvor}
                  onClick={adicionarLouvor}
                >
                  {salvandoLouvor ? "Salvando..." : "Adicionar louvor"}
                </button>
              </div>

              {louvoresEvento.length === 0 ? (
                <p className="montar-escala-empty">
                  Nenhum louvor foi vinculado a este evento.
                </p>
              ) : (
                <div className="montar-escala-louvores-lista">
                  {louvoresEvento.map((item) => (
                    <article className="montar-escala-louvor-item" key={item.louvor_id}>
                      <div className="montar-escala-louvor-info">
                        <strong>{item.ordem}. {item.titulo}</strong>
                        <span>
                          {item.artista || "Artista não informado"}
                          {item.tom ? ` · Tom: ${item.tom}` : " · Tom não informado"}
                        </span>
                      </div>
                      {editandoLouvorId === item.louvor_id ? (
                        <div className="montar-escala-louvor-edicao">
                          <input
                            type="number"
                            min="1"
                            value={ordemLouvor}
                            onChange={(event) => setOrdemLouvor(event.target.value)}
                            aria-label={`Ordem de ${item.titulo}`}
                          />
                          <button
                            type="button"
                            disabled={salvandoLouvor}
                            onClick={() => salvarOrdemLouvor(item)}
                          >
                            Salvar
                          </button>
                          <button type="button" onClick={cancelarEdicaoLouvor}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="montar-escala-item-actions">
                          <button type="button" onClick={() => iniciarEdicaoLouvor(item)}>
                            Editar ordem
                          </button>
                          <button type="button" onClick={() => removerLouvor(item)}>
                            Remover
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="montar-escala-panel">
            <div className="montar-escala-section-title">
              <div>
                <span>Participantes</span>
                <h2>Integrantes da escala</h2>
              </div>
              <strong>{escala.length} integrante{escala.length === 1 ? "" : "s"}</strong>
            </div>

            {!eventoId && (
              <p className="montar-escala-empty">
                Selecione um evento para visualizar e montar a escala.
              </p>
            )}
            {eventoId && carregandoEscala && <p>Carregando escala...</p>}
            {eventoId && !carregandoEscala && escala.length === 0 && (
              <p className="montar-escala-empty">
                Nenhum integrante foi adicionado a este evento.
              </p>
            )}
            {eventoId && !carregandoEscala && escala.length > 0 && (
              <div className="montar-escala-lista">
                {escala.map((item) => (
                  <article className="montar-escala-item" key={item.id}>
                    <div>
                      <strong>{item.nome}</strong>
                      <span>{item.email}</span>
                    </div>
                    <span className="montar-escala-funcao">
                      {FUNCOES_ESCALA.find(([valor]) => valor === item.funcao)?.[1] ||
                        item.funcao}
                    </span>
                    <span className={`montar-escala-status montar-escala-status-${item.status || "pendente"}`}>
                      {STATUS_ESCALA[item.status] || "Aguardando resposta"}
                      {item.troca_para && ` com ${item.troca_para.nome}`}
                    </span>
                    <div className="montar-escala-item-actions">
                      <button type="button" onClick={() => iniciarEdicao(item)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => removerIntegrante(item)}>
                        Remover
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default MontarEscala;
