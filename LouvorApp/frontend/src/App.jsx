import Dashboard from "./Pages/dashboard/dashboard";
import Cadastro from "./Pages/Login/Cadastro";
import Login from "./Pages/Login/login";
import Louvores from "./Pages/Louvores/Louvores";
import FormLouvor from "./Pages/Louvores/FormLouvor";
import DetalhesLouvor from "./Pages/Louvores/DetalhesLouvor";
import Agenda from "./Pages/Agenda/Agenda";
import {
  getUsuarioLogado,
  usuarioEhAdmin,
  usuarioEstaAutenticado,
} from "./auth";


function App() {

  const caminho = window.location.pathname;
  const idLouvor = new URLSearchParams(
    window.location.search
  ).get("id");
  const usuario = getUsuarioLogado();
  const rotaPublica =
    caminho === "/login" ||
    caminho === "/cadastro";

  if (
    (!usuario || !usuarioEstaAutenticado()) &&
    !rotaPublica
  ) {
    window.location.replace("/login");
    return null;
  }

  if (caminho === "/login") {
    if (usuario && usuarioEstaAutenticado()) {
      window.location.replace("/");
      return null;
    }

    return <Login />;
  }

  if (caminho === "/cadastro") {
    return <Cadastro />;
  }


  // =====================================================
  // DETALHES DO LOUVOR
  // =====================================================

  if (caminho === "/detalhes-louvor") {

    return <DetalhesLouvor />;

  }


  // =====================================================
  // LOUVORES
  // =====================================================

  if (caminho === "/louvores") {

    return <Louvores />;

  }

  if (caminho === "/agenda") {
    return <Agenda />;
  }


  // =====================================================
  // NOVO / EDITAR LOUVOR
  // =====================================================

  if (
    caminho === "/novo-louvor" ||
    caminho === "/editar-louvor"
  ) {
    if (!usuarioEhAdmin(usuario)) {
      window.location.replace("/louvores");
      return null;
    }

    if (caminho === "/editar-louvor" && !idLouvor) {
      window.location.replace("/louvores");
      return null;
    }

    return <FormLouvor />;

  }


  // =====================================================
  // DASHBOARD
  // =====================================================

  return <Dashboard />;

}


export default App;