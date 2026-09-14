import { useEffect, useState } from "react";
import { apiFetch } from "../../api";


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
    tom: "",
    bpm: "",
    categoria: "",
    letra: "",
    estrutura_letra: "",
    link: "",
    imagem: ""

  });


  const [mensagem, setMensagem] = useState("");

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
            JSON.stringify(formulario)

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
        onSubmit={salvarLouvor}
      >


        {/* TÍTULO */}

        <input

          name="titulo"

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

          placeholder="Ministério / Artista"

          value={
            formulario.artista
          }

          onChange={
            alterarCampo
          }

        />


        {/* TOM */}

        <input

          name="tom"

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
        >

          {editando
            ? "Salvar alterações"
            : "Salvar Louvor"}

        </button>


      </form>


      {/* MENSAGEM */}

      {mensagem && (

        <p>

          {mensagem}

        </p>

      )}


    </div>

  );

}


export default FormLouvor;