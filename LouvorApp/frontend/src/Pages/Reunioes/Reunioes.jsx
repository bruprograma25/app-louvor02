import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { api } from "../../api";
import "./Reunioes.css";

const CODIGO_SALA_VALIDO = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;

function salaDaUrl() {
  const prefixo = "/reunioes/";
  if (!window.location.pathname.startsWith(prefixo)) {
    return "";
  }

  try {
    return decodeURIComponent(
      window.location.pathname.slice(prefixo.length).split("/")[0]
    );
  } catch {
    return "";
  }
}

function novoCodigoSala() {
  if (!window.crypto?.getRandomValues) {
    throw new Error(
      "Este navegador não permite criar um código seguro para a sala."
    );
  }

  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return `louvor-${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
}

function Reunioes() {
  const [codigo, setCodigo] = useState(() => salaDaUrl());
  const [codigoEntrada, setCodigoEntrada] = useState("");
  const [disponivel, setDisponivel] = useState(null);
  const [carregandoStatus, setCarregandoStatus] = useState(true);
  const [conectando, setConectando] = useState(false);
  const [conexao, setConexao] = useState(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [desconectada, setDesconectada] = useState(false);

  useEffect(() => {
    let ativo = true;
    api.get("/api/reunioes/status")
      .then((resposta) => {
        if (ativo) {
          setDisponivel(resposta.data.disponivel);
        }
      })
      .catch((error) => {
        if (ativo) {
          setErro(
            error.response?.data?.erro ||
            "Não foi possível verificar o serviço de reuniões."
          );
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregandoStatus(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const sala = salaDaUrl();
    if (sala) {
      void entrarNaSala(sala);
    }
  }, []);

  async function entrarNaSala(valor) {
    const nome = valor.trim();
    if (!CODIGO_SALA_VALIDO.test(nome)) {
      setErro("Informe um código de sala válido (3 a 64 caracteres).");
      return;
    }

    setErro("");
    setCopiado(false);
    setDesconectada(false);
    setConectando(true);
    setConexao(null);

    try {
      const resposta = await api.post("/api/reunioes/token", {
        room_name: nome,
      });
      setCodigo(nome);
      setConexao({
        token: resposta.data.token,
        serverUrl: resposta.data.server_url,
      });
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível entrar na sala. Verifique sua conexão e tente novamente."
      );
    } finally {
      setConectando(false);
    }
  }

  async function criarSala() {
    try {
      const nome = novoCodigoSala();
      window.history.pushState(null, "", `/reunioes/${nome}`);
      setCodigoEntrada("");
      await entrarNaSala(nome);
    } catch (error) {
      setErro(error.message || "Não foi possível criar a sala.");
    }
  }

  async function enviarCodigo(event) {
    event.preventDefault();
    const nome = codigoEntrada.trim();
    if (!CODIGO_SALA_VALIDO.test(nome)) {
      setErro("O código deve ter de 3 a 64 letras, números, hífens ou sublinhados.");
      return;
    }
    window.history.pushState(null, "", `/reunioes/${encodeURIComponent(nome)}`);
    await entrarNaSala(nome);
  }

  async function copiarConvite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setErro("");
    } catch {
      setCopiado(false);
      setErro(
        "Não foi possível copiar o convite. Copie o endereço da sala pela barra do navegador."
      );
    }
  }

  function sairDaSala() {
    window.history.pushState(null, "", "/reunioes");
    setConexao(null);
    setDesconectada(false);
    setCodigo("");
    setErro("");
  }

  const salaAtiva = Boolean(conexao) && !desconectada;

  return (
    <main className="reunioes-page">
      <header className="reunioes-header">
        <div>
          <span className="reunioes-eyebrow">LouvorApp</span>
          <h1>Sala de reunião</h1>
          <p>
            Converse por áudio e vídeo com outros usuários conectados.
            Compartilhe o código da sala para convidá-los.
          </p>
        </div>
        {salaAtiva && (
          <div className="reunioes-room-actions">
            <button type="button" onClick={copiarConvite}>
              {copiado ? "Convite copiado" : "Copiar convite"}
            </button>
            <button type="button" className="reunioes-leave" onClick={sairDaSala}>
              Sair da sala
            </button>
          </div>
        )}
      </header>

      {erro && <p className="reunioes-error" role="alert">{erro}</p>}

      {!salaAtiva && (
        <section className="reunioes-panel">
          {desconectada ? (
            <>
              <h2>Você saiu da reunião</h2>
              <p>A conexão foi encerrada.</p>
              <button type="button" onClick={sairDaSala}>Voltar às reuniões</button>
            </>
          ) : (
            <>
              <h2>Comece ou entre em uma sala</h2>
              {carregandoStatus ? (
                <p role="status">Verificando a configuração do serviço...</p>
              ) : !disponivel ? (
                <div className="reunioes-setup" role="status">
                  <strong>O serviço de vídeo ainda não está configurado.</strong>
                  <p>
                    Configure LIVEKIT_URL, LIVEKIT_API_KEY e
                    LIVEKIT_API_SECRET nos segredos do backend.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    className="reunioes-primary"
                    type="button"
                    onClick={criarSala}
                    disabled={conectando}
                  >
                    {conectando ? "Conectando..." : "Criar nova sala"}
                  </button>
                  <div className="reunioes-divider"><span>ou</span></div>
                  <form className="reunioes-join-form" onSubmit={enviarCodigo}>
                    <label htmlFor="codigo-reuniao">Código da sala</label>
                    <div>
                      <input
                        id="codigo-reuniao"
                        value={codigoEntrada}
                        onChange={(event) => setCodigoEntrada(event.target.value)}
                        maxLength={64}
                        autoComplete="off"
                        placeholder="Ex.: louvor-abc123"
                      />
                      <button type="submit" disabled={conectando || !codigoEntrada.trim()}>
                        {conectando ? "Conectando..." : "Entrar"}
                      </button>
                    </div>
                  </form>
                </>
              )}
              <p className="reunioes-note">
                Qualquer usuário autenticado pode entrar se tiver o código.
                Use HTTPS para câmera e microfone fora do localhost.
              </p>
            </>
          )}
        </section>
      )}

      {salaAtiva && (
        <section className="reunioes-live" aria-label={`Reunião ${codigo}`}>
          <div className="reunioes-live-heading">
            <div>
              <span>Sala</span>
              <h2>{codigo}</h2>
            </div>
            <p>Áudio e vídeo ativos. Use os controles para silenciar, desligar a câmera ou compartilhar a tela.</p>
          </div>
          <div className="reunioes-stage">
            <LiveKitRoom
              token={conexao.token}
              serverUrl={conexao.serverUrl}
              audio
              video
              connect
              onError={(error) => setErro(
                error.message || "A conexão com a sala foi interrompida."
              )}
              onDisconnected={() => {
                if (window.location.pathname.startsWith("/reunioes/")) {
                  setDesconectada(true);
                }
              }}
              data-lk-theme="default"
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          </div>
        </section>
      )}
    </main>
  );
}

export default Reunioes;
