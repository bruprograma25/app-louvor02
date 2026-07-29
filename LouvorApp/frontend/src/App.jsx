import Login from "./Pages/login/login";
import Dashboard from "./Pages/dashboard/dashboard";

function App() {
  const usuario = localStorage.getItem("usuario");

  return usuario ? <Dashboard /> : <Login />;
}

export default App;