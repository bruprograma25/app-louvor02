import { useEffect, useState } from "react";
import { api } from "../../api";
import "./GerenciarReunioes.css";

function localDateTime(offsetMinutes = 5) {
  const local = new Date(Date.now() + offsetMinutes * 60_000);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

function dataHoraParaApi(valor) {
  return new Date(valor).toISOString();
}

function dataHoraVisivel(valor) {
  if (!valor) return "Horário não informado";
  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function GerenciarReunioes({ evento, ehAdmin, onAtualizado }) {
  const [reunioes, setReunioes] = useState(evento.reunioes || []);
  const [membros, setMembros] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [reuniaoEmEdicao, setReuniaoEmEdicao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [formulario, setFormulario] = useState({
    titulo: "",
    descricao: "",
    inicio_em: localDateTime(),
    termino_em: localDateTime(65),
    participantes_ids: [],
    permite_compartilhar_tela: true,
  });

  useEffect(() => {
    setReunioes(evento.reunioes || []);
  }, [evento.reunioes]);

  useEffect(() => {
    if (!ehAdmin) return undefined;
    let ativo = true;
    api.get("/api/agenda/membros")
      .then((resposta) => {
        if (ativo) setMembros(resposta.data);
      })
      .catch((error) => {
        if (ativo) {
          setErro(
            error.response?.data?.erro ||
            "Não foi possível carregar os participantes disponíveis."
          );
        }
      });
    return () => {
      ativo = false;
    };
  }, [ehAdmin]);

  function abrirCriacao() {
    setReuniaoEmEdicao(null);
    setFormulario({
      titulo: evento.titulo,
      descricao: "",
      inicio_em: localDateTime(),
      termino_em: localDateTime(65),
      participantes_ids: [],
      permite_compartilhar_tela: true,
    });
    setErro("");
    setMensagem("");
    setMostrarFormulario(true);
  }

  function abrirEdicao(reuniao) {
    const converterParaInput = (valor) => {
      const data = new Date(valor);
      data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
      return data.toISOString().slice(0, 16);
    };
    setReuniaoEmEdicao(reuniao);
    setFormulario({
      titulo: reuniao.titulo,
      descricao: reuniao.descricao || "",
      inicio_em: converterParaInput(reuniao.inicio_em),
      termino_em: converterParaInput(reuniao.termino_em),
      participantes_ids: (reuniao.participantes || []).map(
        (participante) => participante.id
      ),
      permite_compartilhar_tela: reuniao.permite_compartilhar_tela,
    });
    setErro("");
    setMensagem("");
    setMostrarFormulario(true);
  }

  function alternarParticipante(id, selecionado) {
    setFormulario((anterior) => ({
      ...anterior,
      participantes_ids: selecionado
        ? [...new Set([...anterior.participantes_ids, id])]
        : anterior.participantes_ids.filter((item) => item !== id),
    }));
  }

  async function salvar(event) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    const inicio = new Date(formulario.inicio_em);
    const termino = new Date(formulario.termino_em);
    if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(termino.getTime()) ||
        termino <= inicio || termino - inicio > 12 * 60 * 60 * 1000) {
      setErro("Defina um intervalo válido de até 12 horas.");
      return;
    }

    setSalvando(true);
    try {
      const dados = {
        ...formulario,
        titulo: formulario.titulo.trim(),
        descricao: formulario.descricao.trim(),
        inicio_em: dataHoraParaApi(formulario.inicio_em),
        termino_em: dataHoraParaApi(formulario.termino_em),
      };
      const resposta = reuniaoEmEdicao
        ? await api.put(`/api/reunioes/${reuniaoEmEdicao.id}`, dados)
        : await api.post(`/api/eventos/${evento.id}/reunioes`, dados);
      setMensagem(resposta.data.mensagem);
      setMostrarFormulario(false);
      await onAtualizado();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível salvar a reunião."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(reuniao, status) {
    setErro("");
    setMensagem("");
    try {
      const resposta = await api.post(
        `/api/reunioes/${reuniao.id}/status`,
        { status }
      );
      setMensagem(resposta.data.mensagem);
      await onAtualizado();
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível atualizar o status da reunião."
      );
    }
  }

  return (
    <section className="reunioes-evento-panel">
      <div className="reunioes-evento-heading">
        <div>
          <span>Áudio e vídeo</span>
          <h2>Reuniões e ensaios online</h2>
          <p>Membros escalados e participantes autorizados recebem o acesso.</p>
        </div>
        {ehAdmin && (
          <button
            className="reunioes-evento-primary"
            type="button"
            onClick={abrirCriacao}
          >
            + Agendar reunião
          </button>
        )}
      </div>

      {erro && <p className="reunioes-evento-error" role="alert">{erro}</p>}
      {mensagem && <p className="reunioes-evento-success" role="status">{mensagem}</p>}

      {ehAdmin && mostrarFormulario && (
        <form className="reunioes-evento-form" onSubmit={salvar}>
          <h3>{reuniaoEmEdicao ? "Editar reunião" : "Nova reunião vinculada ao evento"}</h3>
          <label>
            Título
            <input
              value={formulario.titulo}
              maxLength={150}
              onChange={(event) => setFormulario({
                ...formulario,
                titulo: event.target.value,
              })}
              required
            />
          </label>
          <label>
            Orientações (opcional)
            <textarea
              value={formulario.descricao}
              maxLength={2000}
              onChange={(event) => setFormulario({
                ...formulario,
                descricao: event.target.value,
              })}
            />
          </label>
          <div className="reunioes-evento-datas">
            <label>
              Início
              <input
                type="datetime-local"
                value={formulario.inicio_em}
                onChange={(event) => setFormulario({
                  ...formulario,
                  inicio_em: event.target.value,
                })}
                required
              />
            </label>
            <label>
              Término
              <input
                type="datetime-local"
                value={formulario.termino_em}
                onChange={(event) => setFormulario({
                  ...formulario,
                  termino_em: event.target.value,
                })}
                required
              />
            </label>
          </div>
          <fieldset className="reunioes-evento-participantes">
            <legend>Participantes adicionais</legend>
            <p>Membros escalados para este evento também podem entrar automaticamente.</p>
            {membros.map((membro) => (
              <label key={membro.id}>
                <input
                  type="checkbox"
                  checked={formulario.participantes_ids.includes(membro.id)}
                  onChange={(event) =>
                    alternarParticipante(membro.id, event.target.checked)
                  }
                />
                <span>{membro.nome} · {membro.funcao_principal || membro.email}</span>
              </label>
            ))}
          </fieldset>
          <label className="reunioes-evento-checkbox">
            <input
              type="checkbox"
              checked={formulario.permite_compartilhar_tela}
              onChange={(event) => setFormulario({
                ...formulario,
                permite_compartilhar_tela: event.target.checked,
              })}
            />
            Permitir compartilhamento de tela
          </label>
          <div className="reunioes-evento-form-actions">
            <button className="reunioes-evento-primary" type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar reunião"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              disabled={salvando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {reunioes.length === 0 && (
        <p className="reunioes-evento-empty">
          Nenhuma reunião foi agendada para este evento.
        </p>
      )}
      <div className="reunioes-evento-list">
        {reunioes.map((reuniao) => (
          <article className="reunioes-evento-card" key={reuniao.id}>
            <div className="reunioes-evento-card-head">
              <div>
                <span className={`reunioes-evento-status status-${reuniao.status}`}>
                  {reuniao.status}
                </span>
                <h3>{reuniao.titulo}</h3>
              </div>
              <p>{dataHoraVisivel(reuniao.inicio_em)} – {dataHoraVisivel(reuniao.termino_em)}</p>
            </div>
            {reuniao.descricao && <p>{reuniao.descricao}</p>}
            {ehAdmin && reuniao.participantes?.length > 0 && (
              <p>
                Participantes adicionais: {reuniao.participantes
                  .map((participante) => participante.nome)
                  .join(", ")}
              </p>
            )}
            <div className="reunioes-evento-actions">
              {reuniao.status === "ativa" && (
                <a href={reuniao.url}>Entrar na reunião</a>
              )}
              {ehAdmin && reuniao.status === "agendada" && (
                <>
                  <button type="button" onClick={() => abrirEdicao(reuniao)}>
                    Editar
                  </button>
                  <button
                    className="reunioes-evento-primary"
                    type="button"
                    onClick={() => alterarStatus(reuniao, "ativa")}
                  >
                    Iniciar reunião
                  </button>
                  <button type="button" onClick={() => alterarStatus(reuniao, "encerrada")}>
                    Cancelar
                  </button>
                </>
              )}
              {ehAdmin && reuniao.status === "ativa" && (
                <button
                  type="button"
                  onClick={() => alterarStatus(reuniao, "encerrada")}
                >
                  Encerrar reunião
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default GerenciarReunioes;
