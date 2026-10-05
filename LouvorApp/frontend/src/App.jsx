import { lazy, Suspense } from "react";
import AppNavigation from "./components/AppNavigation";
import "./styles/page-theme.css";
import {
  getUsuarioLogado,
  usuarioEhAdmin,
  usuarioEstaAutenticado,
} from "./auth";

const Reunioes = lazy(() => import("./Pages/Reunioes/Reunioes"));
const Dashboard = lazy(() => import("./Pages/dashboard/dashboard"));
const Cadastro = lazy(() => import("./Pages/Login/Cadastro"));
const Login = lazy(() => import("./Pages/Login/login"));
const Louvores = lazy(() => import("./Pages/Louvores/Louvores"));
const FormLouvor = lazy(() => import("./Pages/Louvores/FormLouvor"));
const DetalhesLouvor = lazy(() => import("./Pages/Louvores/DetalhesLouvor"));
const Agenda = lazy(() => import("./Pages/Agenda/Agenda"));
const MontarEscala = lazy(() => import("./Pages/Agenda/montarescala"));
const MinhaAgenda = lazy(() => import("./Pages/Agenda/MinhaAgenda"));
const Notificacoes = lazy(() => import("./Pages/Notificacoes/Notificacoes"));
const Equipe = lazy(() => import("./Pages/Equipe/Equipe"));
const DetalhesEvento = lazy(() => import("./Pages/Agenda/DetalhesEvento"));
const IAMusical = lazy(() => import("./Pages/IAMusical/IAMusical"));

function ProtectedRoutes({ caminho, usuario, idLouvor }) {
  if (caminho === "/detalhes-louvor") {
    return <DetalhesLouvor />;
  }

  if (caminho === "/louvores") {
    return <Louvores />;
  }

  if (caminho === "/agenda") {
    return <Agenda />;
  }

  if (caminho === "/minha-agenda") {
    if (usuarioEhAdmin(usuario)) {
      window.location.replace("/agenda");
      return null;
    }

    return <MinhaAgenda />;
  }

  if (caminho === "/notificacoes") {
    return <Notificacoes />;
  }

  if (caminho === "/ia-musical") {
    return <IAMusical />;
  }

  if (caminho === "/reunioes" || caminho.startsWith("/reunioes/")) {
    return <Reunioes />;
  }

  if (caminho === "/equipe") {
    return <Equipe />;
  }

  if (caminho === "/detalhes-evento") {
    return <DetalhesEvento />;
  }

  if (caminho === "/montar-escala") {
    if (!usuarioEhAdmin(usuario)) {
      window.location.replace("/agenda");
      return null;
    }

    return <MontarEscala />;
  }

  if (caminho === "/novo-louvor") {
    return <FormLouvor />;
  }

  if (caminho === "/editar-louvor") {
    if (!idLouvor) {
      window.location.replace("/louvores");
      return null;
    }

    return <FormLouvor />;
  }

  return <Dashboard />;
}

function App() {
  const caminho = window.location.pathname;
  const idLouvor = new URLSearchParams(window.location.search).get("id");
  const usuario = getUsuarioLogado();
  const rotaPublica = caminho === "/login" || caminho === "/cadastro";

  if ((!usuario || !usuarioEstaAutenticado()) && !rotaPublica) {
    window.location.replace("/login");
    return null;
  }

  if (caminho === "/login") {
    if (usuario && usuarioEstaAutenticado()) {
      window.location.replace("/");
      return null;
    }

    return (
      <Suspense fallback={<main className="app-loading" role="status">Carregando página...</main>}>
        <Login />
      </Suspense>
    );
  }

  if (caminho === "/cadastro") {
    return (
      <Suspense fallback={<main className="app-loading" role="status">Carregando página...</main>}>
        <Cadastro />
      </Suspense>
    );
  }

  return (
    <div className="app-layout">
      <AppNavigation />
      <div className="app-layout-content">
        <Suspense fallback={<main className="app-loading" role="status">Carregando página...</main>}>
          <ProtectedRoutes
            caminho={caminho}
            usuario={usuario}
            idLouvor={idLouvor}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default App;
