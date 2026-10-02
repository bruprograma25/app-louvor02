import assert from "node:assert/strict";
import test from "node:test";
import {
  analisarAudioVocal,
  classificarRegiaoVocal,
} from "./analisarAudioVocal.js";

function instalarAudioSintetico({
  frequencias = [220, 440],
  duracao = 4,
  duracaoMetadata = duracao,
} = {}) {
  const sampleRate = 11025;
  const amostras = new Float32Array(sampleRate * duracao);
  const divisao = Math.floor(amostras.length / frequencias.length);
  for (let i = 0; i < amostras.length; i += 1) {
    const indice = Math.min(
      frequencias.length - 1,
      Math.floor(i / divisao)
    );
    amostras[i] = .45 * Math.sin(
      (2 * Math.PI * frequencias[indice] * i) / sampleRate
    );
  }

  globalThis.window = {
    AudioContext: class {
      async decodeAudioData() {
        return {
          duration: duracao,
          length: amostras.length,
          numberOfChannels: 1,
          sampleRate,
          getChannelData: () => amostras,
        };
      }

      async close() {}
    },
    clearTimeout,
    setTimeout,
  };
  globalThis.document = {
    createElement() {
      return {
        duration: duracaoMetadata,
        load() {
          this.onloadedmetadata?.();
        },
        removeAttribute() {},
      };
    },
  };
}

test("detecta notas de um sinal de áudio sintético", async () => {
  instalarAudioSintetico();
  const resultado = await analisarAudioVocal(new Blob(["audio"]));

  assert.equal(resultado.nota_minima, "Lá3");
  assert.equal(resultado.nota_maxima, "Lá4");
  assert.ok(resultado.quadros_analisados >= 5);
  assert.ok(resultado.frequencia_minima >= 210);
  assert.ok(resultado.frequencia_maxima <= 455);
});

test("rejeita gravações que excedem vinte segundos", async () => {
  instalarAudioSintetico({ duracao: 21 });
  await assert.rejects(
    analisarAudioVocal(new Blob(["audio"])),
    /até 20 segundos/
  );
});

test("aceita duração WebM indefinida apenas para uma gravação limitada pelo app", async () => {
  instalarAudioSintetico({ duracaoMetadata: Infinity });
  const resultado = await analisarAudioVocal(
    new Blob(["audio"]),
    { duracaoGravadaConfiavel: true }
  );
  assert.equal(resultado.nota_minima, "Lá3");

  await assert.rejects(
    analisarAudioVocal(new Blob(["audio"])),
    /duração inválida/
  );
});

test("classifica regiões apenas por sobreposição de faixas aproximadas", () => {
  const resultado = classificarRegiaoVocal(55, 74);
  assert.equal(resultado.principal, "contralto");
  assert.ok(resultado.alternativas.includes("mezzo-soprano"));
});
