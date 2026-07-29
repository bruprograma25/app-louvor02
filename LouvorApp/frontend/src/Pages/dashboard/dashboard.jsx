import { useState } from "react";
import "./dashboard.css";
import logoIgreja from "../../assets/images/logo-igreja.png";

function Dashboard() {
  const [menuAberto, setMenuAberto] = useState(false);

  let usuario = null;

  try {
    const usuarioSalvo = localStorage.getItem("usuario");

    if (usuarioSalvo) {
      usuario = JSON.parse(usuarioSalvo);
    }
  } catch (erro) {
    console.error("Erro ao carregar usuário:", erro);
    localStorage.removeItem("usuario");
  }

  function sair() {
    localStorage.removeItem("usuario");
    window.location.href = "/";
  }

  // Se não tiver usuário, volta para o login
  if (!usuario) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="dashboard">

      {/* MENU LATERAL */}
      <aside className={`menu-lateral ${menuAberto ? "aberto" : ""}`}>

        <div className="logo-menu">
          <img src={logoIgreja} alt="Logo da Igreja" />

          <h2>Louvor App</h2>
        </div>

        <nav className="navegacao">

          <button className="item-menu ativo">
            🏠
            <span>Dashboard</span>
          </button>

          <button className="item-menu">
            🎵
            <span>Músicas</span>
          </button>

          <button className="item-menu">
            📅
            <span>Escalas</span>
          </button>

          <button className="item-menu">
            👥
            <span>Equipe</span>
          </button>

          <button className="item-menu">
            ⚙️
            <span>Configurações</span>
          </button>

        </nav>

        <button className="botao-sair" onClick={sair}>
          🚪
          <span>Sair</span>
        </button>

      </aside>

      {/* CONTEÚDO */}
      <main className="conteudo-dashboard">

        {/* TOPO */}
        <header className="topo-dashboard">

          <button
            className="botao-menu"
            onClick={() => setMenuAberto(!menuAberto)}
          >
            ☰
          </button>

          <div className="usuario-topo">

            <div className="texto-usuario">
              <span>Olá,</span>

              <strong>
                {usuario.nome || "Usuário"}
              </strong>
            </div>

            <div className="avatar">
              {(usuario.nome || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

          </div>

        </header>

        {/* BOAS-VINDAS */}
        <section className="boas-vindas">

          <h1>Bem-vindo ao Louvor App! 🎵</h1>

          <p>
            Organize músicas, escalas e sua equipe de louvor
            em um só lugar.
          </p>

        </section>

        {/* CARDS */}
        <section className="cards-dashboard">

          <div className="card-dashboard">
            <div className="icone-card">🎵</div>

            <div>
              <span>Músicas</span>
              <strong>0</strong>
            </div>
          </div>

          <div className="card-dashboard">
            <div className="icone-card">📅</div>

            <div>
              <span>Escalas</span>
              <strong>0</strong>
            </div>
          </div>

          <div className="card-dashboard">
            <div className="icone-card">👥</div>

            <div>
              <span>Membros</span>
              <strong>0</strong>
            </div>
          </div>

        </section>

        {/* ATIVIDADES */}
        <section className="area-dashboard">

          <div className="cabecalho-area">

            <div>
              <h2>Próximas atividades</h2>
              <p>Confira os próximos compromissos da equipe.</p>
            </div>

            <button className="botao-adicionar">
              + Adicionar
            </button>

          </div>

          <div className="atividade-vazia">

            <div className="icone-vazio">
              📋
            </div>

            <h3>Nenhuma atividade cadastrada</h3>

            <p>
              Quando você criar uma escala ou atividade,
              ela aparecerá aqui.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;