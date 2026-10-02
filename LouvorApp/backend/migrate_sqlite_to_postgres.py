import argparse
import os
import sqlite3
import sys
from contextlib import closing
from datetime import date, datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import Boolean, Date, DateTime, create_engine, inspect
from sqlalchemy.engine import make_url

from models import db


SOURCE_TABLES = {
    "eventos": ("eventos", "cultos"),
    "escalas": ("escalas", "escala_membros"),
}


class _DryRunRollback(Exception):
    def __init__(self, counts):
        self.counts = counts


def _quote_identifier(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def _converter_valor(coluna, valor):
    if valor is None:
        return None
    if isinstance(coluna.type, DateTime) and isinstance(valor, str):
        convertido = datetime.fromisoformat(valor)
        if convertido.tzinfo is not None:
            convertido = convertido.astimezone(timezone.utc).replace(tzinfo=None)
        return convertido
    if isinstance(coluna.type, Date) and isinstance(valor, str):
        return date.fromisoformat(valor)
    if isinstance(coluna.type, Boolean):
        if isinstance(valor, str):
            texto = valor.strip().lower()
            if texto in ("1", "true", "t", "yes", "y"):
                return True
            if texto in ("0", "false", "f", "no", "n"):
                return False
            raise ValueError("Valor booleano inválido durante a migração.")
        if valor in (0, 1, False, True):
            return bool(valor)
        raise ValueError("Valor booleano inválido durante a migração.")
    return valor


def _contagem_tabela(conexao, tabela):
    nome = _quote_identifier(tabela.name)
    return conexao.exec_driver_sql(f"SELECT COUNT(*) FROM {nome}").scalar_one()


def _normalizar_url_postgres(url):
    valor = url.strip()
    if valor.startswith("postgres://"):
        valor = "postgresql://" + valor[len("postgres://"):]
    parsed = make_url(valor)
    if parsed.get_backend_name() != "postgresql":
        raise ValueError("DATABASE_URL precisa apontar para PostgreSQL.")
    if "sslmode" not in parsed.query:
        parsed = parsed.update_query_dict({"sslmode": "require"})
    elif parsed.query["sslmode"].lower() != "require":
        raise ValueError("A migração remota exige sslmode=require.")
    return parsed


def migrate_sqlite_data(
    source_path,
    target_engine,
    backup_path=None,
    dry_run=False,
):
    source = Path(source_path).expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Banco SQLite de origem não encontrado: {source}")

    backup = None
    if backup_path is not None:
        if dry_run:
            raise ValueError("A simulação não deve criar cópias de segurança.")
        backup = Path(backup_path).expanduser().resolve()
        if backup == source or backup.exists():
            raise FileExistsError(
                "O backup precisa ser um caminho novo, diferente do banco de origem."
            )
        backup.parent.mkdir(parents=True, exist_ok=True)

    uri = f"file:{source.as_posix()}?mode=ro"
    origem = sqlite3.connect(uri, uri=True)
    origem.row_factory = sqlite3.Row
    try:
        verificacao = origem.execute("PRAGMA quick_check").fetchone()[0]
        if verificacao != "ok":
            raise RuntimeError(f"O banco SQLite não passou no quick_check: {verificacao}")

        tabelas_origem = {
            row["name"]
            for row in origem.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
            )
        }
        counts_source = {}

        if backup is not None:
            with closing(sqlite3.connect(str(backup))) as copia:
                origem.backup(copia)
                if copia.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                    raise RuntimeError("A cópia de segurança SQLite não passou no quick_check.")

        try:
            with target_engine.begin() as destino:
                tabelas_destino = set(inspect(destino).get_table_names())
                faltantes = set(db.metadata.tables) - tabelas_destino
                if faltantes:
                    raise RuntimeError(
                        "O schema PostgreSQL está incompleto. Execute `flask --app "
                        "wsgi:app db upgrade` antes da migração."
                    )

                counts_target = {
                    tabela.name: _contagem_tabela(destino, tabela)
                    for tabela in db.metadata.sorted_tables
                }
                ocupadas = [
                    nome for nome, total in counts_target.items() if total != 0
                ]
                if ocupadas:
                    raise RuntimeError(
                        "O banco de destino não está vazio; nenhuma linha foi alterada."
                    )

                for tabela in db.metadata.sorted_tables:
                    sources = [
                        nome
                        for nome in SOURCE_TABLES.get(tabela.name, (tabela.name,))
                        if nome in tabelas_origem
                    ]
                    if not sources:
                        raise RuntimeError(
                            f"A tabela de origem correspondente a {tabela.name} não existe."
                        )

                    primary_keys_seen = {}
                    for nome_origem in sources:
                        cursor = origem.execute(
                            f"SELECT * FROM {_quote_identifier(nome_origem)}"
                        )
                        for linha in cursor:
                            valores_origem = dict(linha)
                            if (
                                tabela.name == "eventos"
                                and "descricao" not in valores_origem
                                and "observacoes" in valores_origem
                            ):
                                valores_origem["descricao"] = valores_origem["observacoes"]

                            valores = {
                                coluna.name: _converter_valor(
                                    coluna, valores_origem[coluna.name]
                                )
                                for coluna in tabela.columns
                                if coluna.name in valores_origem
                            }
                            chave_primaria = tuple(
                                valores.get(coluna.name)
                                for coluna in tabela.primary_key.columns
                            )
                            anterior = primary_keys_seen.get(chave_primaria)
                            if anterior is not None:
                                if anterior != valores:
                                    raise RuntimeError(
                                        f"IDs conflitantes em {tabela.name}; "
                                        "nenhuma linha foi confirmada."
                                    )
                                continue
                            primary_keys_seen[chave_primaria] = valores
                            destino.execute(tabela.insert().values(**valores))

                    counts_source[tabela.name] = len(primary_keys_seen)
                    if _contagem_tabela(destino, tabela) != counts_source[tabela.name]:
                        raise RuntimeError(
                            f"A validação de contagem de {tabela.name} falhou."
                        )

                if dry_run:
                    raise _DryRunRollback(counts_source)

                if destino.dialect.name == "postgresql":
                    for tabela in db.metadata.sorted_tables:
                        if "id" in tabela.primary_key.columns.keys():
                            destino.exec_driver_sql(
                                "SELECT setval("
                                "pg_get_serial_sequence("
                                f"'{tabela.name}', 'id'), "
                                f"COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) "
                                f"FROM {_quote_identifier(tabela.name)}"
                            )
        except _DryRunRollback as simulacao:
            counts_source = simulacao.counts
    finally:
        origem.close()

    return counts_source


def main():
    load_dotenv()
    parser = argparse.ArgumentParser(
        description=(
            "Copia dados SQLite para um schema PostgreSQL vazio sem modificar "
            "o banco de origem."
        )
    )
    parser.add_argument(
        "--source",
        default=str(Path(__file__).resolve().parent / "instance" / "louvor.db"),
        help="Caminho do arquivo SQLite de origem.",
    )
    parser.add_argument(
        "--backup-path",
        help="Caminho novo para uma cópia SQLite verificada antes da migração.",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Confirma a escrita no banco PostgreSQL remoto.",
    )
    args = parser.parse_args()

    target_url = os.environ.get("DATABASE_URL", "").strip()
    if not target_url:
        parser.error("Configure DATABASE_URL no ambiente ou no gerenciador de segredos.")
    if args.confirm and not args.backup_path:
        parser.error("--backup-path é obrigatório com --confirm.")

    try:
        postgres_url = _normalizar_url_postgres(target_url)
        engine = create_engine(
            postgres_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 10},
        )
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")

        if not args.confirm:
            contagens = migrate_sqlite_data(
                args.source,
                engine,
                dry_run=True,
            )
            print(
                "Simulação validada. Os dados de origem foram lidos e inseridos "
                "em uma transação PostgreSQL revertida."
            )
            for tabela, quantidade in contagens.items():
                print(f"{tabela}: {quantidade} registros validados")
            print("Nenhum dado foi mantido no banco de destino.")
            print("Para copiar, use --backup-path e --confirm.")
            engine.dispose()
            return 0

        contagens = migrate_sqlite_data(
            args.source,
            engine,
            backup_path=args.backup_path,
        )
        print("Migração concluída; o banco SQLite original foi mantido sem alterações.")
        for tabela, quantidade in contagens.items():
            print(f"{tabela}: {quantidade} registros validados")
        print(f"Backup SQLite verificado: {Path(args.backup_path).expanduser().resolve()}")
        engine.dispose()
        return 0
    except Exception as erro:
        print(
            f"Falha na migração ({type(erro).__name__}). "
            "A transação PostgreSQL foi revertida; confira os logs sem "
            "compartilhar URLs ou credenciais.",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
