import "./AppNavigation.css";
import {
  Bell,
  CalendarDays,
  Home,
  MoreHorizontal,
  Music2,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { getUsuarioLogado, usuarioEhAdmin } from "../auth";

const linksPrincipais = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/louvores", label: "Louvores", icon: Music2 },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/equipe", label: "Equipe", icon: Users, adminOnly: true },
];

const linksSecundarios = [
  { href: "/ia-musical", label: "IA Musical", icon: Sparkles },
  { href: "/reunioes", label: "Reuniões", icon: Video },
];

function AppNavigation() {
  const caminho = window.location.pathname;
  const exibirEquipe = usuarioEhAdmin(getUsuarioLogado());
  const secundarioAtivo = linksSecundarios.some(
    (link) => caminho === link.href || caminho.startsWith(`${link.href}/`)
  );
  const linksVisiveis = linksPrincipais.filter(
    (link) => !link.adminOnly || exibirEquipe
  );
  const linkAtivo =
    caminho === "/minha-agenda" || caminho === "/montar-escala"
      ? "/agenda"
      : caminho.startsWith("/detalhes-louvor") ||
          caminho === "/novo-louvor" ||
          caminho === "/editar-louvor"
        ? "/louvores"
        : caminho.startsWith("/detalhes-evento")
          ? "/agenda"
          : caminho.startsWith("/reunioes")
            ? "/reunioes"
            : caminho;

  return (
    <header className="app-navigation">
      <a className="app-brand" href="/" aria-label="LouvorApp — Dashboard">
        <span className="app-brand-icon" aria-hidden="true">
          <Music2 size={21} />
        </span>
        <span>Louvor<span className="app-brand-highlight">App</span></span>
      </a>
      <nav className="app-navigation-links" aria-label="Navegação principal">
        {linksVisiveis.map(({ href, label, icon: Icon }) => (
          <a
            className="app-navigation-link"
            href={href}
            key={href}
            aria-current={linkAtivo === href ? "page" : undefined}
          >
            <Icon className="app-navigation-icon" aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
        <a
          className="app-navigation-link app-navigation-notifications"
          href="/notificacoes"
          aria-current={caminho === "/notificacoes" ? "page" : undefined}
        >
          <Bell className="app-navigation-icon" aria-hidden="true" />
          <span>Avisos</span>
        </a>
        <details
          className="app-navigation-more"
          data-active={secundarioAtivo ? "true" : undefined}
        >
          <summary className="app-navigation-link">
            <MoreHorizontal className="app-navigation-icon" aria-hidden="true" />
            <span>Mais</span>
          </summary>
          <div className="app-navigation-more-menu">
            {linksSecundarios.map(({ href, label, icon: Icon }) => (
              <a
                className="app-navigation-link"
                href={href}
                key={href}
                aria-current={linkAtivo === href ? "page" : undefined}
              >
                <Icon className="app-navigation-icon" aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </details>
        {linksSecundarios.map(({ href, label, icon: Icon }) => (
          <a
            className="app-navigation-link app-navigation-secondary"
            href={href}
            key={href}
            aria-current={linkAtivo === href ? "page" : undefined}
          >
            <Icon className="app-navigation-icon" aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </header>
  );
}

export default AppNavigation;
