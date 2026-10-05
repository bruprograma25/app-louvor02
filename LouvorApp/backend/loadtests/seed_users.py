import csv
import math
import os
import secrets
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from sqlalchemy import func
from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import (
    Culto,
    EscalaMembro,
    Louvor,
    Reuniao,
    ReuniaoParticipante,
    Usuario,
    _criar_token,
    app,
    db,
)


CONFIRMACAO = "I_ACKNOWLEDGE_TEST_DATABASE_DATA_WILL_BE_CREATED"
EMAIL_PREFIXO = "loadtest-"
EMAIL_DOMINIO = "@loadtest.invalid"


def carregar_quantidade():
    try:
        quantidade = int(os.environ.get("LOADTEST_SEED_USERS", "1100"))
    except ValueError as erro:
        raise ValueError("LOADTEST_SEED_USERS deve ser um inteiro.") from erro
    if not 1 <= quantidade <= 5000:
        raise ValueError("LOADTEST_SEED_USERS deve estar entre 1 e 5000.")
    return quantidade


def validar_ambiente():
    if os.environ.get("LOADTEST_SEED_CONFIRM") != CONFIRMACAO:
        raise RuntimeError(
            "Seed bloqueado. Defina LOADTEST_SEED_CONFIRM com o valor "
            "de confirmação documentado para criar somente dados de teste."
        )
    banco = urlparse(os.environ.get("DATABASE_URL", ""))
    if banco.hostname != "postgres-loadtest" or banco.path != "/louvorapp_loadtest":
        raise RuntimeError(
            "Seed bloqueado: o destino precisa ser o banco Docker "
            "postgres-loadtest/louvorapp_loadtest."
        )
    if len(os.environ.get("JWT_SECRET_KEY", "").encode("utf-8")) < 32:
        raise RuntimeError("Configure uma chave JWT exclusiva para o teste.")


def main():
    validar_ambiente()
    quantidade = carregar_quantidade()
    arquivo_saida = Path(os.environ.get(
        "LOADTEST_USERS_OUTPUT",
        "reports/users.csv",
    ))

    with app.app_context():
        existentes = db.session.query(func.count(Usuario.id)).filter(
            Usuario.email.like(f"{EMAIL_PREFIXO}%{EMAIL_DOMINIO}")
        ).scalar()
        if existentes:
            raise RuntimeError(
                f"O banco isolado já contém {existentes} contas de carga. "
                "Use um volume de teste limpo; o seed nunca apaga dados."
            )

        senha_hash = generate_password_hash(secrets.token_urlsafe(32))
        usuarios = [
            Usuario(
                nome=f"Usuário {indice:05d}",
                sobrenome="Carga",
                email=f"{EMAIL_PREFIXO}{indice:05d}{EMAIL_DOMINIO}",
                senha=senha_hash,
                tipo_usuario="membro",
            )
            for indice in range(1, quantidade + 1)
        ]
        db.session.add_all(usuarios)
        db.session.flush()

        escalas_por_grupo = 5
        grupo_count = math.ceil(quantidade / escalas_por_grupo)
        eventos = []
        grupos = []
        hoje = date.today()
        for indice_grupo in range(grupo_count):
            inicio = indice_grupo * escalas_por_grupo
            grupo = usuarios[inicio:inicio + escalas_por_grupo]
            evento = Culto(
                titulo=f"Evento de carga {indice_grupo + 1:04d}",
                data=(hoje + timedelta(days=1 + indice_grupo // 30)).isoformat(),
                hora="19:00",
                local="Ambiente isolado de teste",
                descricao="Dado sintético criado pelo seed de carga.",
                publicado=True,
            )
            db.session.add(evento)
            eventos.append(evento)
            grupos.append(grupo)

        db.session.flush()
        agora = datetime.now(timezone.utc).replace(tzinfo=None)
        reunioes = []
        for indice_grupo, (evento, grupo) in enumerate(zip(eventos, grupos)):
            anfitriao = grupo[0]
            reuniao = Reuniao(
                codigo=f"loadtest-{uuid4().hex}",
                titulo=f"Reunião de carga {indice_grupo + 1:04d}",
                descricao="Reunião sintética do ambiente isolado de carga.",
                anfitriao_id=anfitriao.id,
                culto_id=evento.id,
                status="ativa",
                inicio_em=agora - timedelta(minutes=30),
                termino_em=agora + timedelta(hours=3),
                permite_compartilhar_tela=False,
                sfu_provider="livekit",
            )
            reunioes.append(reuniao)
            db.session.add(reuniao)
            for indice_usuario, usuario in enumerate(grupo):
                db.session.add(EscalaMembro(
                    culto_id=evento.id,
                    usuario_id=usuario.id,
                    funcao=f"Função {indice_usuario + 1}",
                    confirmado=True,
                    status="confirmado",
                ))
                db.session.add(Louvor(
                    titulo=f"Louvor de carga {usuario.id:05d}",
                    artista="Artista sintético",
                    tom="C",
                    bpm=100,
                    categoria="Teste",
                    dono_id=usuario.id,
                ))

        db.session.flush()
        for evento, reuniao, grupo in zip(eventos, reunioes, grupos):
            db.session.add_all(
                ReuniaoParticipante(
                    reuniao_id=reuniao.id,
                    usuario_id=usuario.id,
                )
                for usuario in grupo
            )

        db.session.flush()
        arquivo_saida.parent.mkdir(parents=True, exist_ok=True)
        arquivo_temporario = arquivo_saida.with_name(
            arquivo_saida.name + ".tmp"
        )
        with arquivo_temporario.open("w", newline="", encoding="utf-8") as arquivo:
            campos = ("email", "member_id", "event_id", "meeting_id", "token")
            escritor = csv.DictWriter(arquivo, fieldnames=campos)
            escritor.writeheader()
            for indice_usuario, usuario in enumerate(usuarios):
                indice_grupo = indice_usuario // escalas_por_grupo
                escritor.writerow({
                    "email": usuario.email,
                    "member_id": usuario.id,
                    "event_id": eventos[indice_grupo].id,
                    "meeting_id": reunioes[indice_grupo].id,
                    "token": _criar_token(usuario),
                })

        db.session.commit()
        arquivo_temporario.replace(arquivo_saida)
        print(
            f"Seed de teste concluído: {quantidade} usuários, "
            f"{len(eventos)} eventos/reuniões e {quantidade} louvores. "
            f"Tokens de teste: {arquivo_saida}"
        )


if __name__ == "__main__":
    try:
        main()
    except Exception as erro:
        print(f"Falha ao preparar o teste de carga: {erro}", file=sys.stderr)
        raise
