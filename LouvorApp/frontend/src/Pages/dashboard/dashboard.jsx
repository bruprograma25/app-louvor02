
import { useCallback, useEffect, useState } from "react";
import "./dashboard.css";
import { getUsuarioLogado, usuarioEhAdmin } from "../../auth";
import { api } from "../../api";

function Dashboard() {
  const usuario = getUsuarioLogado();
  const ehAdmin = usuarioEhAdmin(usuario);
  const [quantidadeLouvores, setQuantidadeLouvores] = useState(0);
  const [quantidadeCultos, setQuantidadeCultos] = useState(0);
  const [quantidadeMembros, setQuantidadeMembros] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // =====================================================
  // BUSCAR QUANTIDADE DE LOUVORES
  // =====================================================

  const carregarResumo = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");
      const respostas = await Promise.all([
        api.get("/api/louvores"),
        api.get("/api/eventos"),
        ...(ehAdmin ? [api.get("/api/agenda/membros")] : []),
      ]);

      setQuantidadeLouvores(respostas[0].data.length);
      setQuantidadeCultos(respostas[1].data.length);
      if (ehAdmin) {
        setQuantidadeMembros(respostas[2].data.length);
      }
    } catch (erro) {
      setErro(
        erro.response?.data?.erro ||
        "Não foi possível carregar o resumo do dashboard."
      );
    } finally {
      setCarregando(false);
    }
  }, [ehAdmin]);

  // =====================================================
  // CARREGAR AO ABRIR
  // =====================================================

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

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

  function abrirNovoEvento() {
    window.location.href = "/agenda?novo=1";
  }

  function abrirNovoAviso() {
    window.location.href = "/notificacoes?novo=1";
  }

  function abrirEquipe() {
    window.location.href = "/equipe";
  }

  function abrirMinhaAgenda() {
    window.location.href = "/minha-agenda";
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <div className="dashboard">

      {/* CONTEÚDO PRINCIPAL */}

      <main className="main-content">

        {/* TOPO */}

        <header className="topbar">

          <div>

            <p className="welcome">
              {ehAdmin ? "Bem-vindo(a)" : `Olá, ${usuario?.nome || "membro"}`} 👋
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
                {ehAdmin
                  ? "Gerencie os louvores e a equipe."
                  : "Acompanhe os louvores e suas próximas escalas."}
              </p>

            </div>

            <button
              className="add-button"
              type="button"
              onClick={abrirNovoLouvor}
            >
              + Adicionar louvor
            </button>

          </div>

          <section className="quick-add" aria-label="Adicionar informações">
            <h3>Adicionar informações</h3>
            <div className="quick-add-actions">
              <button type="button" onClick={abrirNovoLouvor}>
                🎵 Adicionar louvor
              </button>
              {ehAdmin && (
                <>
                  <button type="button" onClick={abrirNovoEvento}>
                    📅 Adicionar evento à agenda
                  </button>
                  <button type="button" onClick={abrirNovoAviso}>
                    🔔 Adicionar aviso
                  </button>
                </>
              )}
            </div>
          </section>


          {/* CARDS */}

          <div className="cards">

            {/* LOUVORES */}

            <button
              className="card card-button"
              onClick={abrirLouvores}
              type="button"
              aria-label="Abrir louvores cadastrados"
            >

              <span className="card-icon">
                🎵
              </span>

              <div>

                <strong>
                  {carregando
                    ? "..."
                    : erro
                      ? "—"
                      : quantidadeLouvores}
                </strong>

                <p>
                  Louvores cadastrados
                </p>

            </div>

            </button>


            {/* AGENDA */}

            <button
              className="card card-button"
              onClick={abrirAgenda}
              type="button"
              aria-label="Abrir agenda de ministrações"
            >

              <span className="card-icon">
                📅
              </span>

              <div>

                <strong>
                  {carregando ? "..." : erro ? "—" : quantidadeCultos}
                </strong>

                <p>
                  {ehAdmin ? "Cultos cadastrados" : "Eventos publicados"}
                </p>

            </div>

            </button>


            {/* EQUIPE OU AGENDA PESSOAL */}

            <button
              className="card card-button"
              onClick={ehAdmin ? abrirEquipe : abrirMinhaAgenda}
              type="button"
              aria-label={ehAdmin ? "Abrir equipe de louvor" : "Abrir minha agenda"}
            >

              <span className="card-icon">
                {ehAdmin ? "👥" : "📋"}
              </span>

              <div>

                <strong>
                  {ehAdmin
                    ? carregando
                      ? "..."
                      : erro
                        ? "—"
                        : quantidadeMembros
                    : "→"}
                </strong>

                <p>
                  {ehAdmin ? "Membros da equipe" : "Minha agenda"}
                </p>

            </div>

            {erro && (
              <div className="dashboard-error" role="alert">
                <p>{erro}</p>
                <button type="button" onClick={carregarResumo}>
                  Tentar novamente
                </button>
              </div>
            )}

            </button>

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
