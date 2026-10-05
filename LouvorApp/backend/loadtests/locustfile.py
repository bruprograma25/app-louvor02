import csv
import os
from itertools import cycle
from pathlib import Path

from locust import HttpUser, between, task


users_file = Path(os.environ.get("LOADTEST_USERS_FILE", "/reports/users.csv"))
with users_file.open(newline="", encoding="utf-8") as arquivo:
    test_users = list(csv.DictReader(arquivo))

if not test_users:
    raise RuntimeError(
        f"Nenhum usuário de carga disponível em {users_file}. "
        "Execute o seed no banco isolado antes do teste."
    )

test_user_cycle = cycle(test_users)


class LouvorAppUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        usuario = next(test_user_cycle)
        self.member_id = usuario["member_id"]
        self.event_id = usuario["event_id"]
        self.meeting_id = usuario["meeting_id"]
        self.headers = {"Authorization": f"Bearer {usuario['token']}"}

    @task(5)
    def agenda_paginada(self):
        with self.client.get(
            "/api/eventos?limit=50&offset=0",
            headers=self.headers,
            name="/api/eventos?limit=50",
            catch_response=True,
        ) as resposta:
            if resposta.status_code != 200:
                resposta.failure(f"HTTP {resposta.status_code}")
            elif not resposta.headers.get("X-Total-Count", "").isdigit():
                resposta.failure("Cabeçalho de paginação ausente ou inválido")

    @task(4)
    def louvores_paginados(self):
        with self.client.get(
            "/api/louvores?limit=30&offset=0",
            headers=self.headers,
            name="/api/louvores?limit=30",
            catch_response=True,
        ) as resposta:
            if resposta.status_code != 200:
                resposta.failure(f"HTTP {resposta.status_code}")
            elif not resposta.headers.get("X-Total-Count", "").isdigit():
                resposta.failure("Cabeçalho de paginação ausente ou inválido")

    @task(4)
    def minha_agenda(self):
        self.client.get(
            f"/api/membros/{self.member_id}/escalas",
            headers=self.headers,
            name="/api/membros/[id]/escalas",
        )

    @task(2)
    def detalhe_reuniao_autorizada(self):
        self.client.get(
            f"/api/reunioes/{self.meeting_id}",
            headers=self.headers,
            name="/api/reunioes/[id]",
        )

    @task(2)
    def notificacoes(self):
        self.client.get(
            "/api/notificacoes",
            headers=self.headers,
            name="/api/notificacoes",
        )

    @task(1)
    def health(self):
        self.client.get("/health", name="/health")
