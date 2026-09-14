
import { useEffect, useState } from "react";
import "./dashboard.css";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import { api } from "../../api";

function Dashboard() {
  const usuario = getUsuarioLogado();
  const ehAdmin = usuarioEhAdmin(usuario);
  const [quantidadeLouvores, setQuantidadeLouvores] = useState(0);
  const [carregando, setCarregando] = useState(true);

  // =====================================================
  // BUSCAR QUANTIDADE DE LOUVORES
  // =====================================================

  async function carregarLouvores() {
    try {
      setCarregando(true);

      const resposta = await api.get("/api/louvores");

      setQuantidadeLouvores(resposta.data.length);
    } catch (erro) {
      console.error("Erro ao carregar louvores:", erro);
      setQuantidadeLouvores(0);
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
  // ABRIR LOUVORES
  // =====================================================

  function abrirLouvores() {
    window.location.href = "/louvores";
  }

  // =====================================================
  // NOVO LOUVOR
  // =====================================================

  function abrirNovoLouvor() {
    window.location.href = "/novo-louvor";
  }

  function abrirAgenda() {
    window.location.href = "/agenda";
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <div className="dashboard">

      {/* MENU LATERAL */}

      <aside className="sidebar">

        <div className="logo-area">

          <div className="logo-circle">
            ♫
          </div>

          <h1>
            Louvor App
          </h1>

        </div>

        <nav>

          <button
            className="menu-item active"
            type="button"
          >
            🏠 Dashboard
          </button>

          <button
            className="menu-item"
            type="button"
            onClick={abrirLouvores}
          >
            🎵 Louvores
          </button>

          <button
            className="menu-item"
            type="button"
            onClick={abrirAgenda}
          >
            📅 Agenda
          </button>

          <button
            className="menu-item"
            type="button"
          >
            👥 Equipe
          </button>

        </nav>

      </aside>


      {/* CONTEÚDO PRINCIPAL */}

      <main className="main-content">

        {/* TOPO */}

        <header className="topbar">

          <div>

            <p className="welcome">
              Bem-vindo(a) 👋
            </p>

            <h2>
              Dashboard
            </h2>

          </div>

          <div className="user-area">

            <div className="user-avatar">
              U
            </div>

            <span>
              {usuario?.nome || "Usuário"}
            </span>

          </div>

        </header>


        {/* CONTEÚDO */}

        <section className="content">

          {/* TÍTULO */}

          <div className="page-title">

            <div>

              <h3>
                Visão geral
              </h3>

              <p>
                Gerencie os louvores da sua equipe.
              </p>

            </div>

            {ehAdmin && (
              <button
                className="add-button"
                type="button"
                onClick={abrirNovoLouvor}
              >
                + Novo louvor
              </button>
            )}

          </div>


          {/* CARDS */}

          <div className="cards">

            {/* LOUVORES */}

            <div
              className="card"
              onClick={abrirLouvores}
              style={{ cursor: "pointer" }}
            >

              <span className="card-icon">
                🎵
              </span>

              <div>

                <strong>
                  {carregando
                    ? "..."
                    : quantidadeLouvores}
                </strong>

                <p>
                  Louvores cadastrados
                </p>

              </div>

            </div>


            {/* AGENDA */}

            <div className="card" onClick={abrirAgenda} style={{ cursor: "pointer" }}>

              <span className="card-icon">
                📅
              </span>

              <div>

                <strong>
                  0
                </strong>

                <p>
                  Próximas ministrações
                </p>

              </div>

            </div>


            {/* EQUIPE */}

            <div className="card">

              <span className="card-icon">
                👥
              </span>

              <div>

                <strong>
                  0
                </strong>

                <p>
                  Membros da equipe
                </p>

              </div>

            </div>

          </div>


          {/* ÁREA DE LOUVORES */}

          <div className="empty-state">

            <div className="empty-icon">
              🎼
            </div>

            <h3>
              Seus louvores
            </h3>

            <p>
              Acesse sua biblioteca de louvores cadastrados.
            </p>

            <button
              className="add-button"
              type="button"
              onClick={abrirLouvores}
            >
              🎵 Ver meus louvores
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;
