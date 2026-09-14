import { useEffect, useState } from "react";

import "./Louvores.css";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import { apiFetch } from "../../api";


function Louvores() {
  const ehAdmin = usuarioEhAdmin(getUsuarioLogado());

  const [louvores, setLouvores] =
    useState([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");


  // =====================================================
  // BUSCAR LOUVORES
  // =====================================================

  async function carregarLouvores() {

    try {

      setCarregando(true);

      setErro("");


      const resposta = await apiFetch("/api/louvores");


      const dados =
        await resposta.json();


      if (!resposta.ok) {

        throw new Error(
          "Erro ao buscar louvores."
        );

      }


      setLouvores(dados);


    } catch (erro) {

      console.error(
        "Erro ao carregar louvores:",
        erro
      );


      setErro(
        "Não foi possível carregar os louvores."
      );


    } finally {

      setCarregando(false);

    }

  }


  // =====================================================
  // CARREGAR AO ABRIR
  // =====================================================

  useEffect(() => {

    carregarLouvores();

  }, []);


  // =====================================================
  // NOVO LOUVOR
  // =====================================================

  function novoLouvor() {

    window.location.href =
      "/novo-louvor";

  }


  // =====================================================
  // EDITAR LOUVOR
  // =====================================================

  function editarLouvor(id) {

    window.location.href =
      `/editar-louvor?id=${id}`;

  }


  // =====================================================
  // DETALHES
  // =====================================================

  function detalhesLouvor(id) {

    window.location.href =
      `/detalhes-louvor?id=${id}`;

  }


  // =====================================================
  // VOLTAR
  // =====================================================

  function voltar() {

    window.location.href =
      "/";

  }


  // =====================================================
  // EXCLUIR
  // =====================================================

  async function excluirLouvor(id) {

    const confirmar =
      window.confirm(
        "Tem certeza que deseja excluir este louvor?"
      );


    if (!confirmar) {

      return;

    }


    try {

      const resposta =
        await apiFetch(
          `/api/louvores/${id}`,

          {
            method: "DELETE"
          }

        );


      const dados =
        await resposta.json();


      if (!resposta.ok) {

        alert(
          dados.erro ||
          "Não foi possível excluir o louvor."
        );

        return;

      }


      setLouvores(
        (anterior) =>

          anterior.filter(
            (louvor) =>
              louvor.id !== id
          )

      );


    } catch (erro) {

      console.error(
        "Erro ao excluir louvor:",
        erro
      );


      alert(
        "Erro ao conectar com servidor."
      );

    }

  }


  // =====================================================
  // TELA
  // =====================================================

  return (

    <div className="louvores-page">


      {/* =================================================
          CABEÇALHO
      ================================================= */}

      <header className="louvores-header">


        <div>

          <span className="breadcrumb">
            Louvores
          </span>


          <h1>
            Meus Louvores
          </h1>


          <p>
            Gerencie os louvores da sua equipe.
          </p>

        </div>


        <div className="header-buttons">


          <button
            className="back-button"
            onClick={voltar}
          >

            ← Dashboard

          </button>


          {ehAdmin && (
            <button
              className="add-button"
              onClick={novoLouvor}
            >
              + Novo louvor
            </button>
          )}


        </div>


      </header>


      {/* =================================================
          CONTEÚDO
      ================================================= */}

      <main className="louvores-content">


        {/* CARREGANDO */}

        {carregando && (

          <div className="louvores-message">

            <div className="message-icon">
              🎵
            </div>


            <h2>
              Carregando louvores...
            </h2>


            <p>
              Aguarde um momento.
            </p>

          </div>

        )}


        {/* ERRO */}

        {!carregando &&
          erro && (

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
                className="add-button"
                onClick={
                  carregarLouvores
                }
              >

                Tentar novamente

              </button>

            </div>

          )}


        {/* NENHUM */}

        {!carregando &&
          !erro &&
          louvores.length === 0 && (

            <div className="louvores-message">


              <div className="message-icon">
                🎼
              </div>


              <h2>
                Nenhum louvor cadastrado
              </h2>


              <p>
                Comece adicionando o primeiro
                louvor da sua equipe.
              </p>


              {ehAdmin && (
                <button
                  className="add-button"
                  onClick={novoLouvor}
                >
                  + Adicionar primeiro louvor
                </button>
              )}


            </div>

          )}


        {/* LISTA */}

        {!carregando &&
          !erro &&
          louvores.length > 0 && (

            <div className="louvores-grid">


              {louvores.map(
                (louvor) => (

                  <article
                    className="louvor-card"
                    key={louvor.id}
                  >


                    {/* IMAGEM */}

                    <div
                      className="louvor-image"
                      onClick={() =>
                        detalhesLouvor(
                          louvor.id
                        )
                      }
                    >

                      {louvor.imagem ? (

                        <img
                          src={
                            louvor.imagem
                          }
                          alt={
                            `Capa de ${louvor.titulo}`
                          }
                          onError={(e) => {

                            e.currentTarget.style.display =
                              "none";

                          }}
                        />

                      ) : (

                        <span>
                          🎵
                        </span>

                      )}

                    </div>


                    {/* INFORMAÇÕES */}

                    <div className="louvor-info">


                      <h2>
                        {louvor.titulo}
                      </h2>


                      <p className="louvor-artista">

                        {louvor.artista ||
                          "Artista não informado"}

                      </p>


                      <div className="louvor-details">


                        {louvor.tom && (

                          <span>
                            🎼 Tom: {louvor.tom}
                          </span>

                        )}


                        {louvor.bpm && (

                          <span>
                            🥁 BPM: {louvor.bpm}
                          </span>

                        )}


                        {louvor.categoria && (

                          <span>
                            🏷️ {louvor.categoria}
                          </span>

                        )}

                      </div>


                      {/* AÇÕES */}

                      <div
                        className="louvor-actions"
                      >


                        <button
                          className="link-button"
                          onClick={() =>
                            detalhesLouvor(
                              louvor.id
                            )
                          }
                        >

                          👁 Ver detalhes

                        </button>


                        {ehAdmin && (
                          <button
                            className="link-button"
                            onClick={() =>
                              editarLouvor(louvor.id)
                            }
                          >
                            ✏️ Editar
                          </button>
                        )}


                        {louvor.link && (

                          <a
                            href={
                              louvor.link
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-button"
                          >

                            🔗 Abrir link

                          </a>

                        )}


                        {ehAdmin && (
                          <button
                            className="delete-button"
                            onClick={() =>
                              excluirLouvor(louvor.id)
                            }
                          >
                            🗑 Excluir
                          </button>
                        )}


                      </div>


                    </div>


                  </article>

                )

              )}


            </div>

          )}


      </main>


    </div>

  );

}


export default Louvores;