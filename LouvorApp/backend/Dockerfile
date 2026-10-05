FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requeriments.txt .
RUN pip install --upgrade pip && pip install -r requeriments.txt

COPY app.py models.py wsgi.py migrate_sqlite_to_postgres.py ./
COPY migrations ./migrations
COPY loadtests ./loadtests

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--worker-class", "gthread", "--threads", "4", "--timeout", "60", "--graceful-timeout", "30", "--max-requests", "2000", "--max-requests-jitter", "200", "--access-logfile", "-", "--error-logfile", "-", "wsgi:app"]
