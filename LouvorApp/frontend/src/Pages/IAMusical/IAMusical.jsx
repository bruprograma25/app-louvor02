import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import {
  analisarAudioVocal,
} from "./analisarAudioVocal";
import "./IAMusical.css";

const BOAS_VINDAS = {
  role: "assistant",
  content: "Olá! Posso explicar BPM, tonalidade, acordes, cifras, compassos e as seções das músicas; também ajudo você a estudar e preparar uma ministração. Posso consultar os dados dos louvores disponíveis na sua pasta. O que você gostaria de aprender?",
};

const SUGESTOES = [
  "O que significa BPM?",
  "O que significa 4/4?",
  "Como ler uma cifra?",
  "O que é pré-refrão?",
  "Qual é a função da ponte?",
  "O que é o outro de uma música?",
  "Como estudar uma música para ministrar?",
  "Como encontro o tom de uma música?",
  "Qual é a diferença entre verso e refrão?",
];

function IAMusical() {
  const [mensagens, setMensagens] = useState([BOAS_VINDAS]);
  const [pergunta, setPergunta] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [statusIa, setStatusIa] = useState(null);
  const [erroStatusIa, setErroStatusIa] = useState("");
  const [audio, setAudio] = useState(null);
  const [audioGravado, setAudioGravado] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [analisandoAudio, setAnalisandoAudio] = useState(false);
  const [analiseVocal, setAnaliseVocal] = useState(null);
  const [erroAudio, setErroAudio] = useState("");
  const historicoRef = useRef(null);
  const entradaRef = useRef(null);
  const arquivoRef = useRef(null);
  const gravadorRef = useRef(null);
  const streamRef = useRef(null);
  const blocosAudioRef = useRef([]);
  const limiteGravacaoRef = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(limiteGravacaoRef.current);
    if (gravadorRef.current?.state === "recording") {
      gravadorRef.current.onstop = null;
      gravadorRef.current.ondataavailable = null;
      gravadorRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((trilha) => trilha.stop());
  }, []);

  useEffect(() => {
    let ativo = true;
    api.get("/api/ia-musical/status")
      .then((resposta) => {
        if (ativo) {
          setStatusIa(resposta.data);
          setErroStatusIa("");
        }
      })
      .catch(() => {
        if (ativo) {
          setErroStatusIa(
            "Não foi possível verificar a configuração da IA no servidor."
          );
        }
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    historicoRef.current?.scrollTo({
      top: historicoRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mensagens, carregando]);

  async function enviarMensagem(texto, analise = null) {
    texto = texto.trim();
    if (!texto || carregando) {
      return;
    }

    const novasMensagens = [
      ...mensagens,
      { role: "user", content: texto },
    ];
    setMensagens(novasMensagens);
    setPergunta("");
    setErro("");
    setCarregando(true);

    try {
      const resposta = await api.post("/api/ia-musical/conversar", {
        mensagens: novasMensagens.slice(-10).map(({ role, content }) => ({
          role,
          content,
        })),
        ...(analise ? { analise_vocal: analise } : {}),
      });
      setMensagens((anteriores) => [
        ...anteriores,
        {
          role: "assistant",
          content: resposta.data.resposta,
          louvores: resposta.data.louvores_consultados || [],
          modo: resposta.data.modo || "ia",
          aviso: resposta.data.aviso || "",
        },
      ]);
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
        "Não foi possível obter uma resposta agora. Tente novamente."
      );
      entradaRef.current?.focus();
    } finally {
      setCarregando(false);
    }
  }

  function enviarPergunta(event) {
    event.preventDefault();
    const texto = pergunta.trim();
    setPergunta("");
    enviarMensagem(texto);
  }

  function selecionarAudio(event) {
    const selecionado = event.target.files?.[0] || null;
    setErroAudio("");
    setAnaliseVocal(null);
    setAudioGravado(false);
    if (
      selecionado &&
      selecionado.type &&
      !selecionado.type.startsWith("audio/")
    ) {
      setErroAudio("Escolha um arquivo de áudio válido.");
      event.target.value = "";
      setAudio(null);
      return;
    }
    if (selecionado && selecionado.size > 15 * 1024 * 1024) {
      setErroAudio("O áudio precisa ter no máximo 15 MB.");
      event.target.value = "";
      setAudio(null);
      return;
    }
    setAudio(selecionado);
  }

  async function iniciarGravacao() {
    setErroAudio("");
    setAnaliseVocal(null);
    setAudio(null);
    setAudioGravado(false);
    if (arquivoRef.current) {
      arquivoRef.current.value = "";
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErroAudio(
        "Este navegador não oferece gravação de áudio. " +
        "Envie um arquivo de áudio ou tente em um navegador atualizado."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const formatos = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const formato = typeof MediaRecorder.isTypeSupported === "function"
        ? formatos.find((tipo) => MediaRecorder.isTypeSupported(tipo))
        : undefined;
      const gravador = formato
        ? new MediaRecorder(stream, { mimeType: formato })
        : new MediaRecorder(stream);
      blocosAudioRef.current = [];
      gravador.ondataavailable = (evento) => {
        if (evento.data.size > 0) {
          blocosAudioRef.current.push(evento.data);
        }
      };
      gravador.onerror = () => {
        setErroAudio("A gravação falhou. Verifique o microfone e tente novamente.");
        setGravando(false);
        stream.getTracks().forEach((trilha) => trilha.stop());
      };
      gravador.onstop = () => {
        const gravado = new Blob(blocosAudioRef.current, {
          type: gravador.mimeType || "audio/webm",
        });
        if (gravado.size > 15 * 1024 * 1024) {
          setErroAudio("A gravação excedeu o limite de 15 MB.");
          setAudio(null);
        } else if (gravado.size > 0) {
          setAudio(gravado);
          setAudioGravado(true);
        }
        blocosAudioRef.current = [];
        stream.getTracks().forEach((trilha) => trilha.stop());
        if (streamRef.current === stream) {
          streamRef.current = null;
        }
        setGravando(false);
      };
      gravadorRef.current = gravador;
      gravador.start(250);
      setGravando(true);
      limiteGravacaoRef.current = window.setTimeout(() => {
        if (gravador.state === "recording") {
          gravador.stop();
        }
      }, 15_000);
    } catch (error) {
      const mensagem = error.name === "NotAllowedError"
        ? "Permita o acesso ao microfone no navegador e tente novamente."
        : error.name === "NotFoundError"
          ? "Nenhum microfone foi encontrado. Você pode enviar um arquivo de áudio."
          : "Não foi possível iniciar a gravação. Verifique as permissões do microfone.";
      setErroAudio(mensagem);
      streamRef.current?.getTracks().forEach((trilha) => trilha.stop());
      streamRef.current = null;
    }
  }

  function pararGravacao() {
    window.clearTimeout(limiteGravacaoRef.current);
    if (gravadorRef.current?.state === "recording") {
      gravadorRef.current.stop();
    }
  }

  async function analisarGravacao() {
    if (!audio || analisandoAudio) {
      return;
    }
    setErroAudio("");
    setAnalisandoAudio(true);
    try {
      const resultado = await analisarAudioVocal(audio, {
        duracaoGravadaConfiavel: audioGravado,
      });
      setAnaliseVocal(resultado);
      setAudio(null);
      setAudioGravado(false);
      if (arquivoRef.current) {
        arquivoRef.current.value = "";
      }
    } catch (error) {
      setErroAudio(error.message || "Não foi possível analisar o áudio.");
    } finally {
      setAnalisandoAudio(false);
    }
  }

  function perguntarSobreVoz() {
    if (!analiseVocal) {
      return;
    }
    enviarMensagem(
      "Analise estes resultados aproximados da minha voz. Explique a região " +
      "que pode corresponder, sugira tons para eu experimentar e como testar " +
      "uma tonalidade confortável. Deixe claro que a classificação é apenas " +
      "uma estimativa e não pode ser definida por uma única gravação.",
      analiseVocal
    );
  }

  function iniciarConversa() {
    setMensagens([BOAS_VINDAS]);
    setErro("");
    setPergunta("");
    entradaRef.current?.focus();
  }

  return (
    <main className="ia-musical-page">
      <header className="ia-musical-header">
        <div>
          <span className="ia-musical-eyebrow">Seu parceiro de música</span>
          <h1>Assistente Musical</h1>
          <p>
            Aprenda conceitos musicais, prepare suas músicas e consulte os
            louvores disponíveis para sua conta.
          </p>
          <p
            className={`ia-musical-provider-status ${
              statusIa?.provedor_configurado
                ? "ia-musical-provider-status--configured"
                : "ia-musical-provider-status--local"
            }`}
            role="status"
          >
            {erroStatusIa ||
              (statusIa?.provedor_configurado
                ? "Serviço de IA configurado no backend."
                : statusIa
                  ? "Sem IA externa: respostas automáticas locais para conceitos musicais comuns. Configure AI_API_KEY no backend para perguntas abertas."
                  : "Verificando serviço de IA...")}
          </p>
        </div>
        <button
          className="ia-musical-reset"
          type="button"
          onClick={iniciarConversa}
          disabled={carregando}
        >
          Nova conversa
        </button>
      </header>

      <section className="ia-musical-chat" aria-label="Conversa com o assistente musical">
        <div
          className="ia-musical-messages"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          ref={historicoRef}
        >
          {mensagens.map((mensagem, index) => (
            <article
              className={`ia-musical-message ia-musical-message--${mensagem.role}`}
              key={`${index}-${mensagem.role}`}
            >
              <span className="ia-musical-message-label">
                {mensagem.role === "assistant"
                  ? mensagem.modo === "local"
                    ? "Assistente musical · resposta automática"
                    : "Assistente musical"
                  : "Você"}
              </span>
              <p>{mensagem.content}</p>
              {mensagem.aviso && (
                <small className="ia-musical-fallback-note">{mensagem.aviso}</small>
              )}
              {mensagem.louvores?.length > 0 && (
                <div className="ia-musical-sources">
                  <strong>Louvores encontrados nas pastas disponíveis</strong>
                  <ul>
                    {mensagem.louvores.map((louvor) => (
                      <li key={`${index}-${louvor.titulo}`}>
                        <span>{louvor.titulo}</span>
                        {louvor.artista && <span> · {louvor.artista}</span>}
                        {louvor.tom && <span> · Tom {louvor.tom}</span>}
                        {louvor.bpm && <span> · {louvor.bpm} BPM</span>}
                        {louvor.estrutura?.length > 0 && (
                          <span> · {louvor.estrutura.join(" → ")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
          {carregando && (
            <p className="ia-musical-loading" role="status">
              Preparando uma resposta...
            </p>
          )}
        </div>

        {mensagens.length === 1 && (
          <div className="ia-musical-suggestions" aria-label="Sugestões de perguntas">
            {SUGESTOES.map((sugestao) => (
              <button
                key={sugestao}
                type="button"
                onClick={() => {
                  setPergunta(sugestao);
                  entradaRef.current?.focus();
                }}
              >
                {sugestao}
              </button>
            ))}
          </div>
        )}

        {erro && <p className="ia-musical-error" role="alert">{erro}</p>}

        <section className="ia-musical-voice" aria-labelledby="ia-musical-voice-title">
          <div className="ia-musical-voice-heading">
            <div>
              <h2 id="ia-musical-voice-title">Analisar minha voz</h2>
              <p>Grave ou escolha um áudio cantando notas confortáveis.</p>
            </div>
            {!gravando ? (
              <button
                className="ia-musical-reset"
                type="button"
                onClick={iniciarGravacao}
                disabled={analisandoAudio || carregando}
              >
                ● Gravar voz (máx. 15 s)
              </button>
            ) : (
              <button
                className="ia-musical-stop"
                type="button"
                onClick={pararGravacao}
              >
                Parar gravação
              </button>
            )}
          </div>

          {gravando && (
            <p className="ia-musical-recording" role="status">
              Gravando. Cante algumas notas por 3 a 15 segundos.
            </p>
          )}

          <label className="ia-musical-audio-label" htmlFor="ia-musical-audio">
            Ou selecione um arquivo de áudio
          </label>
          <input
            ref={arquivoRef}
            id="ia-musical-audio"
            className="ia-musical-audio-input"
            type="file"
            accept="audio/*"
            onChange={selecionarAudio}
            disabled={gravando || analisandoAudio || carregando}
          />

          {audio && (
            <div className="ia-musical-audio-selected">
              <span>
                {audio.name || "Gravação de voz"} ·{" "}
                {(audio.size / (1024 * 1024)).toFixed(1)} MB
              </span>
              <button
                type="button"
                className="ia-musical-send"
                onClick={analisarGravacao}
                disabled={analisandoAudio}
              >
                {analisandoAudio ? "Analisando no dispositivo..." : "Analisar áudio"}
              </button>
            </div>
          )}

          {erroAudio && <p className="ia-musical-error" role="alert">{erroAudio}</p>}

          {analiseVocal && (
            <div className="ia-musical-analysis" aria-live="polite">
              <h3>Estimativa da gravação</h3>
              <dl>
                <div>
                  <dt>Notas detectadas</dt>
                  <dd>{analiseVocal.nota_minima} – {analiseVocal.nota_maxima}</dd>
                </div>
                <div>
                  <dt>Região com maior sobreposição</dt>
                  <dd>
                    {analiseVocal.regiao_estimada}
                    {analiseVocal.regioes_alternativas.length > 0 &&
                      ` · também pode se sobrepor a ${analiseVocal.regioes_alternativas.join(", ")}`}
                  </dd>
                </div>
              </dl>
              <p>
                Esta é apenas uma estimativa das notas detectadas, não um
                diagnóstico nem uma classificação definitiva. Soprano,
                contralto, tenor, barítono e baixo são classificações que
                dependem também da tessitura confortável, do timbre e da
                avaliação de um professor. Uma única gravação não determina
                sua classificação vocal.
              </p>
              <button
                className="ia-musical-send"
                type="button"
                onClick={perguntarSobreVoz}
                disabled={carregando}
              >
                Perguntar à IA sobre minha voz e tons
              </button>
            </div>
          )}
          <p className="ia-musical-privacy">
            Privacidade: o áudio é analisado neste dispositivo e não é enviado
            nem salvo. Ao consultar a IA, somente as notas e estimativas
            resultantes são enviadas ao backend.
          </p>
        </section>

        <form className="ia-musical-composer" onSubmit={enviarPergunta}>
          <label className="ia-musical-sr-only" htmlFor="ia-musical-pergunta">
            Sua pergunta musical
          </label>
          <textarea
            id="ia-musical-pergunta"
            ref={entradaRef}
            value={pergunta}
            onChange={(event) => setPergunta(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form.requestSubmit();
              }
            }}
            placeholder="Pergunte sobre tons, acordes, BPM ou uma música..."
            maxLength={2000}
            rows={2}
            disabled={carregando}
          />
          <div className="ia-musical-composer-footer">
            <span>Enter para enviar · Shift+Enter para nova linha</span>
            <button
              className="ia-musical-send"
              type="submit"
              disabled={carregando || !pergunta.trim()}
            >
              {carregando ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
        <p className="ia-musical-privacy">
          Quando a integração externa estiver configurada, as perguntas são
          enviadas ao provedor para gerar respostas. Sem ela, uso respostas
          musicais automáticas locais. Evite incluir dados pessoais ou
          informações confidenciais.
        </p>
      </section>
    </main>
  );
}

export default IAMusical;
