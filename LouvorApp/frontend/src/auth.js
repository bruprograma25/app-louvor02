export function getUsuarioLogado() {
  try {
    const usuario = JSON.parse(
      localStorage.getItem("usuario") || "null"
    );

    return usuario && typeof usuario === "object"
      ? usuario
      : null;
  } catch (erro) {
    console.error("Não foi possível ler o usuário logado:", erro);
    localStorage.removeItem("usuario");
    return null;
  }
}

export function usuarioEhAdmin(usuario) {
  return (
    typeof usuario?.tipo_usuario === "string" &&
    usuario.tipo_usuario.toLowerCase() === "admin"
  );
}

export function usuarioEstaAutenticado() {
  return Boolean(localStorage.getItem("token"));
}
