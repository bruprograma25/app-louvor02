const AFINACAO_PADRAO = 440;
const TAXA_ANALISE = 11025;
const TAMANHO_JANELA = 2048;
const PASSO_JANELA = 1024;
const FREQUENCIA_MINIMA = 65;
const FREQUENCIA_MAXIMA = 1000;

const NOTAS = [
  "Dó", "Dó♯", "Ré", "Ré♯", "Mi", "Fá",
  "Fá♯", "Sol", "Sol♯", "Lá", "Lá♯", "Si",
];

function notaMidi(midi) {
  const nota = NOTAS[((midi % 12) + 12) % 12];
  const oitava = Math.floor(midi / 12) - 1;
  return `${nota}${oitava}`;
}

function percentil(valores, fracao) {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(
    ordenados.length - 1,
    Math.floor((ordenados.length - 1) * fracao)
  )];
}

function lerDuracaoAudio(arquivo, duracaoGravadaConfiavel) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const audio = document.createElement("audio");
    let finalizado = false;

    function limpar(erro, duracao) {
      if (finalizado) {
        return;
      }
      finalizado = true;
      window.clearTimeout(temporizador);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
      if (erro) {
        reject(erro);
      } else {
        resolve(duracao);
      }
    }

    const temporizador = window.setTimeout(() => {
      limpar(new Error("Não foi possível ler a duração do áudio selecionado."));
    }, 5000);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      if (audio.duration === Infinity && duracaoGravadaConfiavel) {
        limpar(null, null);
        return;
      }
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        limpar(new Error("O arquivo de áudio possui uma duração inválida."));
        return;
      }
      limpar(null, audio.duration);
    };
    audio.onerror = () => {
      limpar(new Error(
        "Não foi possível abrir este áudio. Tente WAV, MP3, M4A ou WebM."
      ));
    };
    audio.src = url;
    audio.load();
  });
}

function detectarFrequencia(janela, sampleRate) {
  let media = 0;
  for (let i = 0; i < janela.length; i += 1) {
    media += janela[i];
  }
  media /= janela.length;

  let energia = 0;
  for (let i = 0; i < janela.length; i += 1) {
    const amostra = janela[i] - media;
    energia += amostra * amostra;
  }
  const rms = Math.sqrt(energia / janela.length);
  if (rms < 0.012) {
    return null;
  }

  const atrasoMinimo = Math.max(
    2,
    Math.floor(sampleRate / FREQUENCIA_MAXIMA)
  );
  const atrasoMaximo = Math.min(
    Math.floor(sampleRate / FREQUENCIA_MINIMA),
    janela.length - 2
  );
  let melhorAtraso = 0;
  let melhorCorrelacao = 0;

  for (let atraso = atrasoMinimo; atraso <= atrasoMaximo; atraso += 1) {
    let produto = 0;
    let energiaInicial = 0;
    let energiaAtrasada = 0;
    const limite = janela.length - atraso;
    for (let i = 0; i < limite; i += 1) {
      const inicial = janela[i] - media;
      const atrasada = janela[i + atraso] - media;
      produto += inicial * atrasada;
      energiaInicial += inicial * inicial;
      energiaAtrasada += atrasada * atrasada;
    }
    const denominador = Math.sqrt(energiaInicial * energiaAtrasada);
    const correlacao = denominador ? produto / denominador : 0;
    if (correlacao > melhorCorrelacao) {
      melhorCorrelacao = correlacao;
      melhorAtraso = atraso;
    }
  }

  if (melhorCorrelacao < 0.68 || !melhorAtraso) {
    return null;
  }

  return {
    frequencia: sampleRate / melhorAtraso,
    confianca: melhorCorrelacao,
  };
}

export function classificarRegiaoVocal(minMidi, maxMidi) {
  const regioes = [
    { nome: "baixo", minimo: 40, maximo: 60 },
    { nome: "barítono", minimo: 45, maximo: 65 },
    { nome: "tenor", minimo: 48, maximo: 69 },
    { nome: "contralto", minimo: 53, maximo: 74 },
    { nome: "mezzo-soprano", minimo: 55, maximo: 77 },
    { nome: "soprano", minimo: 60, maximo: 81 },
  ];

  const resultados = regioes.map((regiao) => {
    const intersecao = Math.max(
      0,
      Math.min(maxMidi, regiao.maximo) - Math.max(minMidi, regiao.minimo) + 1
    );
    const extensao = maxMidi - minMidi + 1;
    return {
      ...regiao,
      sobreposicao: intersecao / Math.max(1, extensao),
    };
  }).sort((a, b) => b.sobreposicao - a.sobreposicao);

  if (resultados[0].sobreposicao < 0.35) {
    return { principal: "região vocal ampla", alternativas: [] };
  }

  return {
    principal: resultados[0].nome,
    alternativas: resultados
      .slice(1)
      .filter((regiao) => regiao.sobreposicao >= 0.35)
      .slice(0, 2)
      .map((regiao) => regiao.nome),
  };
}

export async function analisarAudioVocal(
  arquivo,
  { duracaoGravadaConfiavel = false } = {}
) {
  if (!(arquivo instanceof Blob) || arquivo.size === 0) {
    throw new Error("Selecione ou grave um áudio antes de analisar.");
  }
  if (arquivo.size > 15 * 1024 * 1024) {
    throw new Error("O áudio precisa ter no máximo 15 MB.");
  }

  const AudioContextDisponivel =
    window.AudioContext || window.webkitAudioContext;
  if (!AudioContextDisponivel) {
    throw new Error("Este navegador não oferece suporte à análise de áudio.");
  }

  const contexto = new AudioContextDisponivel();
  try {
    const duracao = await lerDuracaoAudio(
      arquivo,
      duracaoGravadaConfiavel
    );
    if (duracao !== null && duracao > 20) {
      throw new Error("O áudio precisa ter até 20 segundos.");
    }
    const buffer = await contexto.decodeAudioData(await arquivo.arrayBuffer());
    if (buffer.duration > 20) {
      throw new Error("O áudio precisa ter até 20 segundos.");
    }

    const canais = Array.from(
      { length: buffer.numberOfChannels },
      (_, canal) => buffer.getChannelData(canal)
    );
    const fator = Math.max(1, Math.floor(buffer.sampleRate / TAXA_ANALISE));
    const taxaEfetiva = buffer.sampleRate / fator;
    const totalAmostras = Math.floor(buffer.length / fator);
    const mono = new Float32Array(totalAmostras);
    for (let i = 0; i < totalAmostras; i += 1) {
      let soma = 0;
      for (const canal of canais) {
        soma += canal[i * fator] || 0;
      }
      mono[i] = soma / canais.length;
    }

    const frequencias = [];
    for (
      let inicio = 0;
      inicio + TAMANHO_JANELA <= mono.length;
      inicio += PASSO_JANELA
    ) {
      const detectada = detectarFrequencia(
        mono.subarray(inicio, inicio + TAMANHO_JANELA),
        taxaEfetiva
      );
      if (detectada) {
        frequencias.push(detectada.frequencia);
      }
    }
    if (frequencias.length < 5) {
      throw new Error(
        "Não detectei voz cantada com clareza. Grave 3 a 15 segundos, " +
        "sustentando notas confortáveis e sem música de fundo."
      );
    }

    const midi = frequencias.map((frequencia) =>
      Math.round(69 + 12 * Math.log2(frequencia / AFINACAO_PADRAO))
    ).filter((nota) => nota >= 28 && nota <= 96);
    if (midi.length < 5) {
      throw new Error(
        "Não consegui identificar uma faixa de notas confiável. " +
        "Tente gravar novamente com a voz mais clara."
      );
    }

    const minimo = percentil(midi, 0.1);
    const maximo = percentil(midi, 0.9);
    const classificacao = classificarRegiaoVocal(minimo, maximo);

    return {
      nota_minima: notaMidi(minimo),
      nota_maxima: notaMidi(maximo),
      midi_minimo: minimo,
      midi_maximo: maximo,
      frequencia_minima: Math.round(percentil(frequencias, 0.1)),
      frequencia_maxima: Math.round(percentil(frequencias, 0.9)),
      quadros_analisados: midi.length,
      regiao_estimada: classificacao.principal,
      regioes_alternativas: classificacao.alternativas,
    };
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error(
      "Não foi possível ler este arquivo de áudio. Tente um arquivo WAV, " +
      "MP3, M4A ou WebM gravado neste navegador."
    );
  } finally {
    await contexto.close();
  }
}
