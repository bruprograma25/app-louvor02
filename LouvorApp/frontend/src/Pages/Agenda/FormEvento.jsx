import { useEffect, useState } from "react";
import { api } from "../../api";

const FORMULARIO_VAZIO = {
  titulo: "",
  data: "",
  hora: "",
  local: "",
  descricao: "",
  membros: [],
  louvor_ids: [],
};

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

function formularioDoEvento(evento) {
  if (!evento) {
    return FORMULARIO_VAZIO;
  }

  return {
    titulo: evento.titulo || "",
    data: evento.data || "",
    hora: evento.hora || "",
    local: evento.local || "",
    descricao: evento.descricao || "",
    membros: (evento.membros || []).map((membro) => ({
      usuario_id: String(membro.id),
      funcao: membro.funcao || "",
    })),
    louvor_ids: (evento.louvores || []).map((louvor) => louvor.id),
  };
}

function FormEvento({
  evento,
  membros,
  louvores,
  onSaved,
  onCancel,
}) {
  const [formulario, setFormulario] = useState(() =>
    formularioDoEvento(evento)
  );
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setFormulario(formularioDoEvento(evento));
    setErro("");
  }, [evento]);

  function alterarCampo(event) {
    setFormulario((anterior) => ({
      ...anterior,
      [event.target.name]: event.target.value,
    }));
  }

  function adicionarMembro() {
    setFormulario((anterior) => ({
      ...anterior,
      membros: [
        ...anterior.membros,
        { usuario_id: "", funcao: "" },
      ],
    }));
  }

  function alterarMembro(index, campo, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      membros: anterior.membros.map((membro, itemIndex) =>
        itemIndex === index
          ? { ...membro, [campo]: valor }
          : membro
      ),
    }));
  }

  function removerMembro(index) {
    setFormulario((anterior) => ({
      ...anterior,
      membros: anterior.membros.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  function alterarLouvor(louvorId, selecionado) {
    setFormulario((anterior) => ({
      ...anterior,
      louvor_ids: selecionado
        ? [...anterior.louvor_ids, louvorId]
        : anterior.louvor_ids.filter((id) => id !== louvorId),
    }));
  }

  async function salvar(event) {
    event.preventDefault();
    setErro("");

    const titulo = formulario.titulo.trim();
    if (!titulo) {
      setErro("Informe um nome para o culto ou evento.");
      return;
    }

    const membrosDuplicados = formulario.membros.some(
      (membro, index) =>
        membro.usuario_id &&
        formulario.membros.some(
          (outroMembro, outroIndex) =>
            outroIndex !== index &&
            outroMembro.usuario_id === membro.usuario_id
        )
    );
    if (membrosDuplicados) {
      setErro("Cada membro pode ocupar apenas uma função nesta escala.");
      return;
    }

    if (formulario.membros.some((membro) => !membro.usuario_id || !membro.funcao)) {
      setErro("Selecione um membro e uma função para cada linha da escala.");
      return;
    }

    setSalvando(true);

    try {
      const dados = { ...formulario, titulo };
      const resposta = evento
        ? await api.put(`/api/eventos/${evento.id}`, dados)
        : await api.post("/api/eventos", dados);

      onSaved(resposta.data.mensagem);
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível salvar o evento."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="agenda-form" onSubmit={salvar}>
      <h2>{evento ? "Editar evento" : "Novo culto ou evento"}</h2>

      {erro && <p className="agenda-error" role="alert">{erro}</p>}

      <div className="agenda-grid">
        <label className="agenda-field">
          Nome do culto ou evento
          <input
            name="titulo"
            placeholder="Ex.: Culto de domingo"
            maxLength={160}
            value={formulario.titulo}
            onChange={alterarCampo}
            required
          />
        </label>
        <label className="agenda-field">
          Data
          <input
            name="data"
            type="date"
            value={formulario.data}
            onChange={alterarCampo}
            required
          />
        </label>
        <label className="agenda-field">
          Horário
          <input
            name="hora"
            type="time"
            value={formulario.hora}
            onChange={alterarCampo}
          />
        </label>
        <label className="agenda-field">
          Local
          <input
            name="local"
            placeholder="Endereço ou nome do local"
            maxLength={200}
            value={formulario.local}
            onChange={alterarCampo}
          />
        </label>
      </div>

      <label className="agenda-field">
        Descrição
        <textarea
          name="descricao"
          placeholder="Informações adicionais (opcional)"
          maxLength={2000}
          value={formulario.descricao}
          onChange={alterarCampo}
        />
      </label>

      <fieldset className="agenda-louvores-field">
        <legend>Louvores do culto</legend>
        {louvores.length === 0 ? (
          <p>Nenhum louvor cadastrado para selecionar.</p>
        ) : (
          <div className="agenda-louvores-options">
            {louvores.map((louvor) => (
              <label key={louvor.id}>
                <input
                  type="checkbox"
                  checked={formulario.louvor_ids.includes(louvor.id)}
                  onChange={(event) =>
                    alterarLouvor(louvor.id, event.target.checked)
                  }
                />
                <span>
                  {louvor.titulo}
                  {louvor.dono_nome && ` · Pasta: ${louvor.dono_nome}`}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="agenda-members-title">
        <h3>Membros e funções</h3>
        <button type="button" onClick={adicionarMembro}>
          + Adicionar membro
        </button>
      </div>

      {formulario.membros.map((membro, index) => (
        <div
          className="agenda-member-row"
          key={`${index}-${membro.usuario_id}`}
        >
          <select
            aria-label={`Membro da equipe, linha ${index + 1}`}
            value={membro.usuario_id}
            onChange={(event) =>
              alterarMembro(index, "usuario_id", event.target.value)
            }
            required
          >
            <option value="">Selecione o membro</option>
            {membros.map((item) => (
              <option
                key={item.id}
                value={item.id}
                disabled={formulario.membros.some(
                  (outroMembro, outroIndex) =>
                    outroIndex !== index &&
                    outroMembro.usuario_id === String(item.id)
                )}
              >
                {item.nome} ({item.email})
              </option>
            ))}
          </select>
          <select
            aria-label={`Função do membro, linha ${index + 1}`}
            value={membro.funcao}
            onChange={(event) =>
              alterarMembro(index, "funcao", event.target.value)
            }
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
            type="button"
            onClick={() => removerMembro(index)}
          >
            Remover
          </button>
        </div>
      ))}

      <div className="agenda-form-actions">
        <button
          className="agenda-primary"
          type="submit"
          disabled={salvando}
        >
          {salvando
            ? "Salvando..."
            : evento
              ? "Salvar alterações"
              : "Salvar evento"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={salvando}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default FormEvento;
