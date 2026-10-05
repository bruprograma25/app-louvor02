
import { useEffect, useState } from "react";
import "./Louvores.css";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import { api } from "../../api";

function DetalhesLouvor() {
  const usuario = getUsuarioLogado();
  const ehAdmin = usuarioEhAdmin(usuario);
  const [louvor, setLouvor] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // ============================================
  // PEGAR ID DA URL
  // ============================================

  const parametros = new URLSearchParams(
    window.location.search
  );

  const id = parametros.get("id");

  // ============================================
  // BUSCAR LOUVOR
  // ============================================

  useEffect(() => {
    async function carregarLouvor() {
      if (!id) {
        setErro("Louvor não informado.");
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        setErro("");

        const resposta = await api.get(
          `/api/louvores/${id}`
        );

        setLouvor(resposta.data);
      } catch (erro) {
        setErro(
          erro.response?.data?.erro ||
          "Não foi possível carregar o louvor."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarLouvor();
  }, [id]);

  // ============================================
  // VOLTAR
  // ============================================

  function voltar() {
    window.location.href = "/louvores";
  }

  // ============================================
  // EXCLUIR
  // ============================================

  async function excluirLouvor() {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este louvor?"
    );

    if (!confirmar) {
      return;
    }

    try {
      await api.delete(`/api/louvores/${id}`);

      alert("Louvor excluído com sucesso!");

      window.location.href = "/louvores";

    } catch (erro) {
      alert(
        erro.response?.data?.erro ||
        "Não foi possível excluir o louvor."
      );
    }
  }

  // ============================================
  // CARREGANDO
  // ============================================

  if (carregando) {
    return (
      <div className="louvor-page">

        <div className="louvores-message">

          <div className="message-icon">
            🎵
          </div>

          <h2>
            Carregando louvor...
          </h2>

          <p>
            Aguarde um momento.
          </p>

        </div>

      </div>
    );
  }

  // ============================================
  // ERRO
  // ============================================

  if (erro) {
    return (
      <div className="louvor-page">

        <div className="louvores-message error">

          <div className="message-icon">
            ⚠️
          </div>

          <h2>
            Ocorreu um erro
          </h2>

          <p>
            {erro}
          </p>

          <button
            className="back-button"
            onClick={voltar}
          >
            ← Voltar para louvores
          </button>

        </div>

      </div>
    );
  }

  // ============================================
  // TELA
  // ============================================

  return (
    <div className="louvor-page">

      {/* ========================================
          CABEÇALHO
      ======================================== */}

      <header className="louvor-header">

        <div>

          <span className="breadcrumb">
            Louvores / Detalhes
          </span>

          <h1>
            {louvor.titulo}
          </h1>

          <p>
            {louvor.artista ||
              "Artista não informado"}
          </p>

        </div>

        <button
          className="back-button"
          onClick={voltar}
        >
          ← Voltar
        </button>

      </header>

      {/* ========================================
          INFORMAÇÕES
      ======================================== */}

      <section className="form-section">

        <div className="section-title">

          <div className="section-number">
            1
          </div>

          <div>

            <h2>
              Informações do louvor
            </h2>

            <p>
              Informações principais da música.
            </p>

          </div>

        </div>

        <div className="form-grid">

          <div className="field field-large">

            <label>
              Título
            </label>

            <input
              value={louvor.titulo || ""}
              readOnly
            />

          </div>

          <div className="field">

            <label>
              Artista / Ministério
            </label>

            <input
              value={
                louvor.artista || "Não informado"
              }
              readOnly
            />

          </div>

          <div className="field">

            <label>
              Tom
            </label>

            <input
              value={
                louvor.tom || "Não informado"
              }
              readOnly
            />

          </div>

          <div className="field">

            <label>
              Local
            </label>

            <input
              value={louvor.local || "Não informado"}
              readOnly
            />

          </div>

        </div>

      </section>

      {/* ========================================
          IMAGEM
      ======================================== */}

      {louvor.imagem && (

        <section className="form-section">

          <div className="section-title">

            <div className="section-number">
              2
            </div>

            <div>

              <h2>
                Imagem
              </h2>

              <p>
                Capa do louvor.
              </p>

            </div>

          </div>

          <div className="image-preview">

            <img
              src={louvor.imagem}
              loading="lazy"
              decoding="async"
              alt={`Capa de ${louvor.titulo}`}
              onError={(e) => {
                e.currentTarget.style.display =
                  "none";
              }}
            />

          </div>

        </section>

      )}

      {/* ========================================
          PARTES DO LOUVOR
      ======================================== */}

      {louvor.estrutura_letra && (

        <section className="form-section">

          <div className="section-title">

            <div className="section-number">
              3
            </div>

            <div>

              <h2>
                Partes do louvor
              </h2>

              <p>
                Estrutura organizada da música.
              </p>

            </div>

          </div>

          <textarea
            className="full-lyrics"
            value={louvor.estrutura_letra}
            readOnly
          />

        </section>

      )}

      {/* ========================================
          LETRA
      ======================================== */}

      <section className="form-section">

        <div className="section-title">

          <div className="section-number">
            4
          </div>

          <div>

            <h2>
              Letra completa
            </h2>

            <p>
              Letra cadastrada para este louvor.
            </p>

          </div>

        </div>

        <textarea
          className="full-lyrics"
          value={
            louvor.letra ||
            "Nenhuma letra cadastrada."
          }
          readOnly
        />

      </section>

      {/* ========================================
          LINK
      ======================================== */}

      {louvor.link && (

        <section className="form-section">

          <div className="section-title">

            <div className="section-number">
              5
            </div>

            <div>

              <h2>
                Link do louvor
              </h2>

              <p>
                Acesse a música externamente.
              </p>

            </div>

          </div>

          <a
            href={louvor.link}
            target="_blank"
            rel="noopener noreferrer"
            className="add-button"
          >
            🔗 Abrir música
          </a>

        </section>

      )}

      {/* ========================================
          AÇÕES
      ======================================== */}

      <div className="form-actions">

        <button
          type="button"
          className="cancel-button"
          onClick={voltar}
        >
          ← Voltar
        </button>

        {(ehAdmin || louvor.dono_id === usuario?.id) && (
          <button
            type="button"
            className="delete-button"
            onClick={excluirLouvor}
          >
            🗑 Excluir louvor
          </button>
        )}

      </div>

    </div>
  );
}

export default DetalhesLouvor;
