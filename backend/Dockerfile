FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

# Comando para ejecutar Gunicorn (apuntando a tu carpeta config)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--max-requests", "1000", "--timeout", "60", "config.wsgi:application"]