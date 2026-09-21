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

  function alterarLouvores(event) {
    const valores = Array.from(
      event.target.selectedOptions,
      (option) => Number(option.value)
    );
    setFormulario((anterior) => ({
      ...anterior,
      louvor_ids: valores,
    }));
  }

  async function salvar(event) {
    event.preventDefault();
    setErro("");
    setSalvando(true);

    try {
      const resposta = evento
        ? await api.put(`/api/eventos/${evento.id}`, formulario)
        : await api.post("/api/eventos", formulario);

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

      {erro && <p className="agenda-error">{erro}</p>}

      <div className="agenda-grid">
        <input
          name="titulo"
          placeholder="Nome do culto ou evento"
          value={formulario.titulo}
          onChange={alterarCampo}
          required
        />
        <input
          name="data"
          type="date"
          value={formulario.data}
          onChange={alterarCampo}
          required
        />
        <input
          name="hora"
          type="time"
          value={formulario.hora}
          onChange={alterarCampo}
        />
        <input
          name="local"
          placeholder="Local"
          value={formulario.local}
          onChange={alterarCampo}
        />
      </div>

      <textarea
        name="descricao"
        placeholder="Descrição do evento"
        value={formulario.descricao}
        onChange={alterarCampo}
      />

      <label htmlFor="agenda-louvores">Louvores do culto</label>
      <select
        id="agenda-louvores"
        multiple
        value={formulario.louvor_ids.map(String)}
        onChange={alterarLouvores}
      >
        {louvores.map((louvor) => (
          <option key={louvor.id} value={louvor.id}>
            {louvor.titulo}
          </option>
        ))}
      </select>

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
            value={membro.usuario_id}
            onChange={(event) =>
              alterarMembro(index, "usuario_id", event.target.value)
            }
            required
          >
            <option value="">Selecione o membro</option>
            {membros.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} ({item.email})
              </option>
            ))}
          </select>
          <select
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
