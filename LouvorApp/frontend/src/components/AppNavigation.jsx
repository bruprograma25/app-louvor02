import "./AppNavigation.css";
import { getUsuarioLogado, usuarioEhAdmin } from "../auth";

const links = [
  { href: "/", label: "Dashboard", icon: "⌂" },
  { href: "/louvores", label: "Louvores", icon: "♫" },
  { href: "/agenda", label: "Agenda", icon: "▦" },
  { href: "/equipe", label: "Equipe", icon: "♧" },
  { href: "/ia-musical", label: "IA Musical", icon: "♫" },
];

function AppNavigation() {
  const caminho = window.location.pathname;
  const exibirEquipe = usuarioEhAdmin(getUsuarioLogado());
  const linksVisiveis = exibirEquipe
    ? links
    : links.filter((link) => link.href !== "/equipe");
  const linkAtivo =
    caminho === "/minha-agenda" || caminho === "/montar-escala"
      ? "/agenda"
      : caminho.startsWith("/detalhes-louvor") ||
          caminho.includes("louvor")
        ? "/louvores"
        : caminho.startsWith("/detalhes-evento")
          ? "/agenda"
          : caminho;

  return (
    <header className="app-navigation">
      <a className="app-brand" href="/" aria-label="LouvorApp — Dashboard">
        <span className="app-brand-icon" aria-hidden="true">♫</span>
        <span>Louvor<span className="app-brand-highlight">App</span></span>
      </a>
      <nav className="app-navigation-links" aria-label="Navegação principal">
        {linksVisiveis.map((link) => (
          <a
            className="app-navigation-link"
            href={link.href}
            key={link.href}
            aria-current={linkAtivo === link.href ? "page" : undefined}
          >
            <span className="app-navigation-icon" aria-hidden="true">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </a>
        ))}
        <a
          className="app-navigation-link app-navigation-notifications"
          href="/notificacoes"
          aria-current={caminho === "/notificacoes" ? "page" : undefined}
        >
          <span className="app-navigation-icon" aria-hidden="true">♧</span>
          <span>Avisos</span>
        </a>
      </nav>
    </header>
  );
}

export default AppNavigation;
