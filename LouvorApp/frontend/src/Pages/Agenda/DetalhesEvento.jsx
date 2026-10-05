import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import "./DetalhesEvento.css";
import GerenciarReunioes from "./GerenciarReunioes";

const STATUS_ESCALA = {
  pendente: "Aguardando resposta",
  confirmado: "Confirmado",
  recusado: "Recusado",
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
    return data || "Não informada";
  }

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function DetalhesEvento() {
  const usuario = getUsuarioLogado();
  const ehAdmin = usuarioEhAdmin(usuario);
  const eventoId = new URLSearchParams(window.location.search).get("id");
  const [evento, setEvento] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarEvento = useCallback(async () => {
    if (!eventoId) {
      setErro("Nenhum evento foi informado.");
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro("");
      const resposta = await api.get(`/api/eventos/${eventoId}`);
      setEvento(resposta.data);
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível carregar os detalhes do evento."
      );
    } finally {
      setCarregando(false);
    }
  }, [eventoId]);

  useEffect(() => {
    carregarEvento();
  }, [carregarEvento]);

  return (
    <main className="detalhes-evento-page">
      <header className="detalhes-evento-header">
        <div>
          <span>Agenda</span>
          <h1>Detalhes do evento</h1>
          <p>Confira as informações, a escala e o repertório vinculados.</p>
        </div>
        <div className="detalhes-evento-header-actions">
          <button type="button" onClick={() => { window.location.href = "/agenda"; }}>
            ← Agenda
          </button>
          <button type="button" onClick={() => { window.location.href = "/"; }}>
            Dashboard
          </button>
        </div>
      </header>

      {erro && (
        <section className="detalhes-evento-panel detalhes-evento-feedback">
          <p className="detalhes-evento-error">{erro}</p>
        </section>
      )}

      {carregando && (
        <section className="detalhes-evento-panel">
          <p>Carregando detalhes do evento...</p>
        </section>
      )}

      {!carregando && evento && (
        <>
          <GerenciarReunioes
            evento={evento}
            ehAdmin={ehAdmin}
            onAtualizado={carregarEvento}
          />
          <section className="detalhes-evento-panel">
            <div className="detalhes-evento-title">
              <div>
                <span className="detalhes-evento-label">
                  {evento.publicado ? "Evento publicado" : "Rascunho"}
                </span>
                <h2>{evento.titulo}</h2>
              </div>
              {ehAdmin && (
                <div className="detalhes-evento-actions">
                  <button
                    type="button"
                    onClick={() => { window.location.href = `/agenda?editar=${evento.id}`; }}
                  >
                    Editar evento
                  </button>
                  <button
                    type="button"
                    onClick={() => { window.location.href = `/montar-escala?evento=${evento.id}`; }}
                  >
                    Gerenciar escala e louvores
                  </button>
                </div>
              )}
            </div>

            <div className="detalhes-evento-info">
              <div><span>Título</span><strong>{evento.titulo}</strong></div>
              <div><span>Data</span><strong>{formatarData(evento.data)}</strong></div>
              <div><span>Hora</span><strong>{evento.hora || "Não informada"}</strong></div>
              <div><span>Local</span><strong>{evento.local || "Não informado"}</strong></div>
            </div>

            <div className="detalhes-evento-descricao">
              <h3>Descrição</h3>
              <p>{evento.descricao || "Nenhuma descrição informada."}</p>
            </div>
          </section>

          <div className="detalhes-evento-grid">
            <section className="detalhes-evento-panel">
              <div className="detalhes-evento-section-title">
                <div>
                  <span>Participação</span>
                  <h2>Integrantes da escala</h2>
                </div>
                <strong>{evento.membros.length}</strong>
              </div>
              {evento.membros.length === 0 ? (
                <p className="detalhes-evento-muted">Nenhum integrante vinculado.</p>
              ) : (
                <div className="detalhes-evento-table-wrapper">
                  <table className="detalhes-evento-table">
                    <thead>
                      <tr>
                        <th>Integrante</th>
                        <th>Função</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evento.membros.map((membro) => (
                        <tr key={`${evento.id}-${membro.id}`}>
                          <td>
                            <strong>{membro.nome}</strong>
                            {ehAdmin && <small>{membro.email}</small>}
                          </td>
                          <td>{FUNCOES_ESCALA[membro.funcao] || membro.funcao}</td>
                          <td>
                            <span className={`detalhes-evento-status status-${membro.status || "pendente"}`}>
                              {STATUS_ESCALA[membro.status] ||
                                (membro.confirmado ? "Confirmado" : "Aguardando resposta")}
                            </span>
                            {membro.troca_para && (
                              <small>Com {membro.troca_para.nome}</small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="detalhes-evento-panel">
              <div className="detalhes-evento-section-title">
                <div>
                  <span>Repertório</span>
                  <h2>Louvores vinculados</h2>
                </div>
                <strong>{evento.louvores.length}</strong>
              </div>
              {evento.louvores.length === 0 ? (
                <p className="detalhes-evento-muted">Nenhum louvor vinculado.</p>
              ) : (
                <ol className="detalhes-evento-louvores">
                  {evento.louvores.map((louvor) => (
                    <li key={louvor.id}>
                      <strong>{louvor.ordem}. {louvor.titulo}</strong>
                      <span>
                        {louvor.artista || "Artista não informado"}
                        {louvor.tom ? ` · Tom: ${louvor.tom}` : " · Tom não informado"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}

export default DetalhesEvento;
