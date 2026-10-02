import { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import "./Louvores.css";


function FormLouvor() {

  const caminho = window.location.pathname;

  const parametros = new URLSearchParams(
    window.location.search
  );

  const id = parametros.get("id");

  const editando =
    caminho === "/editar-louvor" && Boolean(id);


  const [formulario, setFormulario] = useState({

    titulo: "",
    artista: "",
    local: "",
    tom: "",
    bpm: "",
    categoria: "",
    letra: "",
    estrutura_letra: "",
    link: "",
    imagem: ""

  });


  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [carregando, setCarregando] = useState(
    Boolean(editando)
  );


  // =====================================================
  // BUSCAR LOUVOR PARA EDITAR
  // =====================================================

  useEffect(() => {

    if (!editando) {
      return;
    }


    async function carregarLouvor() {

      try {

        const resposta = await apiFetch(
          `/api/louvores/${id}`
        );


        const dados = await resposta.json();


        if (!resposta.ok) {

          setMensagem(
            dados.erro ||
            "Não foi possível carregar o louvor."
          );

          return;

        }


        setFormulario({

          titulo: dados.titulo || "",
          artista: dados.artista || "",
          local: dados.local || "",
          tom: dados.tom || "",
          bpm: dados.bpm || "",
          categoria: dados.categoria || "",
          letra: dados.letra || "",
          estrutura_letra:
            dados.estrutura_letra || "",
          link: dados.link || "",
          imagem: dados.imagem || ""

        });


      } catch (erro) {

        console.error(erro);

        setMensagem(
          "Erro ao conectar com servidor."
        );


      } finally {

        setCarregando(false);

      }

    }


    carregarLouvor();

  }, [editando, id]);


  // =====================================================
  // ALTERAR CAMPO
  // =====================================================

  function alterarCampo(e) {

    setFormulario({

      ...formulario,

      [e.target.name]:
        e.target.value

    });

  }


  // =====================================================
  // SALVAR
  // =====================================================

  async function salvarLouvor(e) {

    e.preventDefault();

    setMensagem("");

    const titulo = formulario.titulo.trim();
    const bpm = formulario.bpm.trim();
    if (!titulo) {
      setMensagem("Informe o título do louvor.");
      return;
    }

    if (bpm && (!Number.isInteger(Number(bpm)) || Number(bpm) < 1)) {
      setMensagem("Informe um BPM válido, maior que zero.");
      return;
    }

    setSalvando(true);

    try {

      const url = editando
        ? `/api/louvores/${id}`
        : "/api/louvores";


      const resposta = await apiFetch(

        url,

        {

          method:
            editando
              ? "PUT"
              : "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({
              ...formulario,
              titulo,
              artista: formulario.artista.trim(),
              local: formulario.local.trim(),
              tom: formulario.tom.trim(),
              bpm,
              categoria: formulario.categoria.trim(),
              link: formulario.link.trim(),
              imagem: formulario.imagem.trim(),
            })

        }

      );


      const dados =
        await resposta.json();


      if (!resposta.ok) {

        setMensagem(

          dados.erro ||
          "Erro ao salvar louvor."

        );

        return;

      }


      setMensagem(

        editando

          ? "Louvor atualizado com sucesso!"

          : "Louvor cadastrado com sucesso!"

      );


      // =================================================
      // DEPOIS DE SALVAR
      // =================================================

      setTimeout(() => {

        window.location.href =
          "/louvores";

      }, 1000);


    } catch (erro) {

      console.error(
        "Erro:",
        erro
      );


      setMensagem(
        "Erro ao conectar com servidor."
      );

    }
    finally {
      setSalvando(false);
    }

  }


  // =====================================================
  // VOLTAR
  // =====================================================

  function voltar() {

    window.location.href =
      "/louvores";

  }


  // =====================================================
  // CARREGANDO
  // =====================================================

  if (carregando) {

    return (

      <div className="form-louvor">

        <h2>
          🎵 Carregando louvor...
        </h2>

      </div>

    );

  }


  // =====================================================
  // TELA
  // =====================================================

  return (

    <div className="form-louvor">


      <button
        type="button"
        onClick={voltar}
      >

        ← Voltar

      </button>


      <h2>

        {editando
          ? "✏️ Editar Louvor"
          : "➕ Adicionar Louvor"}

      </h2>


      <form
        className="form-louvor-fields"
        onSubmit={salvarLouvor}
      >


        {/* TÍTULO */}

        <input
          name="titulo"
          aria-label="Título do louvor"
          placeholder="Nome do louvor"

          value={
            formulario.titulo
          }

          onChange={
            alterarCampo
          }

          required

        />


        {/* ARTISTA */}

        <input
          name="artista"
          aria-label="Ministério ou artista"
          placeholder="Ministério / Artista"

          value={
            formulario.artista
          }

          onChange={
            alterarCampo
          }

        />

        <input
          name="local"
          aria-label="Local do louvor"
          placeholder="Local (opcional)"
          maxLength={200}
          value={formulario.local}
          onChange={alterarCampo}
        />


        {/* TOM */}

        <input
          name="tom"
          aria-label="Tom da música"
          placeholder="Tom da música"

          value={
            formulario.tom
          }

          onChange={
            alterarCampo
          }

        />


        {/* BPM */}

        <input
          name="bpm"
          aria-label="BPM"
          type="number"

          placeholder="BPM"

          min="1"

          value={
            formulario.bpm
          }

          onChange={
            alterarCampo
          }

        />


        {/* CATEGORIA */}

        <input
          name="categoria"
          aria-label="Categoria"
          placeholder="Categoria"

          value={
            formulario.categoria
          }

          onChange={
            alterarCampo
          }

        />


        {/* LETRA */}

        <textarea
          name="letra"
          aria-label="Letra do louvor"
          placeholder="Letra do louvor"

          value={
            formulario.letra
          }

          onChange={
            alterarCampo
          }

        />


        {/* ESTRUTURA */}

        <textarea
          name="estrutura_letra"
          aria-label="Estrutura da letra"
          placeholder="Estrutura da letra"

          value={
            formulario.estrutura_letra
          }

          onChange={
            alterarCampo
          }

        />


        {/* LINK */}

        <input
          name="link"
          aria-label="Link para ouvir ou consultar o louvor"
          placeholder="Link Spotify, YouTube ou Cifra Club"

          value={
            formulario.link
          }

          onChange={
            alterarCampo
          }

        />


        {/* IMAGEM */}

        <input
          name="imagem"
          aria-label="Link da imagem de capa"
          placeholder="Link da imagem"

          value={
            formulario.imagem
          }

          onChange={
            alterarCampo
          }

        />


        {/* BOTÃO */}

        <button
          type="submit"
          disabled={salvando}
        >

          {salvando
            ? "Salvando..."
            : editando
              ? "Salvar alterações"
              : "Salvar Louvor"}

        </button>


      </form>


      {/* MENSAGEM */}

      {mensagem && (

        <p role="status" aria-live="polite">

          {mensagem}

        </p>

      )}


    </div>

  );

}


export default FormLouvor;