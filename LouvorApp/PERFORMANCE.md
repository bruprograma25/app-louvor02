# Escala e teste de carga

## Ambiente de produção

`docker-compose.scalable.yml` substitui o SQLite por PostgreSQL 16, usa Redis para
limites compartilhados e executa a API em Gunicorn atrás de Traefik. A quantidade
de réplicas pode ser aumentada com `docker compose up -d --scale api=3 api`.
Configure domínio, certificados, LiveKit, banco, limites de CPU/memória e segredos
no `.env` antes de publicar; nunca reutilize as chaves do ambiente de carga.
Use senhas PostgreSQL URL-safe (por exemplo, letras, números, `-` e `_`) porque
elas são interpoladas na URL SQLAlchemy.
O certificado autoassinado do PostgreSQL no Compose cifra o tráfego, mas
`sslmode=require` não valida a identidade da CA; produção deve usar uma CA
confiável e validar o certificado conforme a política do provedor.

Depois de preparar o `.env`, aplique as migrações antes de subir a API:

```powershell
docker compose -f docker-compose.scalable.yml --profile migrate run --rm migrate
docker compose -f docker-compose.scalable.yml up -d --scale api=3 api frontend
```

Com 3 réplicas, 2 workers Gunicorn por réplica e pool SQLAlchemy de 5 conexões mais
2 de overflow por worker, o teto teórico das conexões abertas pela API é 42.
Isso não é uma promessa de capacidade: o hardware, as consultas, o banco, a rede
e a configuração real determinam o resultado.

No perfil de carga, os limites configurados somam até 5,5 vCPU e cerca de 4,7 GiB
para as três APIs, PostgreSQL e Redis; Locust e o sistema hospedeiro precisam de
recursos adicionais. Um host com pelo menos 8 vCPU e 12 GiB RAM é um ponto de
partida para medição, não uma garantia de capacidade.

## Teste isolado para 1.100+ usuários

Os serviços `postgres-loadtest`, `redis-loadtest`, `api-loadtest` e `locust`
usam uma rede interna e volumes próprios, sem portas públicas e sem compartilhar
o banco ou o Redis de produção. O seed se recusa a executar fora do host e do
banco de teste esperados, exige confirmação explícita, não apaga dados e cria
apenas usuários, eventos, escalas, louvores e reuniões sintéticos.

1. Copie `.env.scalable.example` para `.env` e defina senhas aleatórias distintas
   para produção e carga, bem como uma chave JWT de carga independente com pelo
   menos 32 bytes. Os campos de domínio/e-mail podem ser fictícios no teste
   isolado, que não inicia Traefik.
2. Defina `LOADTEST_SEED_CONFIRM=I_ACKNOWLEDGE_TEST_DATABASE_DATA_WILL_BE_CREATED`,
   escolha `LOADTEST_USERS` (padrão 1100; máximo 5000) e configure `LOADTEST_RUN_ID`.
3. Execute, a partir de `LouvorApp`:

   ```powershell
   docker compose -f docker-compose.scalable.yml --profile loadtest-seed run --rm migrate-loadtest
   docker compose -f docker-compose.scalable.yml --profile loadtest-seed run --rm seed-loadtest
   ```

   O seed grava tokens de curta duração em `backend/loadtests/reports/users.csv`.
   Esse arquivo contém credenciais de teste: não o compartilhe nem o versione.
   Se o banco de teste já tiver contas `loadtest-*`, o seed falha sem alterar
   nem apagar os dados; use um ambiente de teste limpo para gerar outra amostra.
4. Inicie o backend isolado com as réplicas desejadas:

   ```powershell
   docker compose -f docker-compose.scalable.yml --profile loadtest up -d --scale api-loadtest=3 api-loadtest
   ```

5. Em outro terminal, colete recursos e depois rode o teste:

   ```powershell
   .\infra\monitor-loadtest.ps1
   ```

   ```powershell
   docker compose -f docker-compose.scalable.yml --profile loadtest run --rm locust
   ```

   Locust usa a quantidade, a taxa de chegada e a duração configuradas por
   `LOADTEST_USERS`, `LOADTEST_SPAWN_RATE` e `LOADTEST_DURATION`. Repita em
   rampas (por exemplo 100, 250, 1.000 e 1.500 usuários), alterando o identificador
   da execução para preservar os relatórios. O cenário mede agenda/louvores
   paginados, escalas, reuniões autorizadas, notificações e health check.

6. Examine `backend/loadtests/reports/<LOADTEST_RUN_ID>_stats.csv`,
   `<LOADTEST_RUN_ID>.html`, o arquivo de falhas e `resources-*.csv`. Os relatórios
   Locust incluem usuários ativos, RPS, p50/p95/p99 e erros; o monitor grava
   CPU/memória dos containers de carga, conexões totais/ativas do PostgreSQL e
   clientes/memória do Redis. Registre também a máquina, sistema operacional,
   CPU/RAM, versão Docker, réplicas e valores de configuração com cada resultado.
7. Pare os serviços de carga:

   ```powershell
   docker compose -f docker-compose.scalable.yml --profile loadtest down
   ```

   Os volumes de carga são separados. Não use `down -v` em um projeto Compose que
   também contenha dados que devam ser preservados.

## Critério de aprovação e limitações

Não se deve declarar suporte a 1.000 usuários apenas porque o teste chegou a esse
número de usuários virtuais. Considere a meta atingida somente após rampas repetidas
no hardware-alvo, sem erros inesperados, com taxa de falhas, p95/p99, RPS e consumo
de recursos dentro dos limites acordados. Investigue 429 separadamente: o limitador
é intencional; um teste que o acione mede a política de proteção, não a capacidade
bruta da API.

O runner e a API compartilham o host Docker e geram carga sintética diretamente na
API interna; portanto, o resultado não inclui latência pública/TLS do Traefik,
tráfego real de mídia LiveKit, provedores externos ou a distribuição de conexões
em máquinas distintas. A infraestrutura Compose prepara replicação em um único
host, não substitui orquestração multi-host, backups, alertas, alta disponibilidade
ou tuning baseado em medições. Docker não está instalado no ambiente de
desenvolvimento atual; nenhum resultado de carga foi medido aqui.
