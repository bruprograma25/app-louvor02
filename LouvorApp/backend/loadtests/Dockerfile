FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /loadtests

RUN pip install --upgrade pip && pip install "locust>=2.32,<3"

COPY locustfile.py ./

CMD ["locust"]
